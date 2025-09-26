const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = ["http://localhost:8080", "http://localhost:8081", "http://localhost:5173"];

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI || "mongodb+srv://tithi1610:tithi161004@agentdb.l1e56vx.mongodb.net/?retryWrites=true&w=majority&appName=AgentDB";
const client = new MongoClient(uri);

// Helper function to safely parse dates
function parseDate(dateString) {
    if (!dateString) return null;

    let parsedDate;
    parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) return parsedDate;

    if (typeof dateString === 'string') {
        parsedDate = new Date(dateString.replace(/\s/, 'T'));
        if (!isNaN(parsedDate.getTime())) return parsedDate;
    }

    return null;
}

// Helper function to calculate safe percentage growth
function calculateSafeGrowth(current, previous, decimalPlaces = 1) {
    if (typeof current !== 'number') current = 0;
    if (typeof previous !== 'number') previous = 0;

    if (previous === 0 && current === 0) return 0;
    if (previous === 0 && current > 0) return 100;
    if (previous > 0 && current === 0) return -100;

    const growth = ((current - previous) / previous) * 100;
    return Math.round(growth * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

async function run() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB Atlas!");

        const database = client.db("test");
        const collection = database.collection("agentlogs");

        const changeStream = collection.watch([], { fullDocument: 'updateLookup' });
        changeStream.on('change', () => {
            io.emit('dashboardUpdate', { message: "Data has been updated" });
        });

        // ----------------- ENHANCED OVERVIEW ENDPOINT -----------------
        app.get('/api/overview-data', async (req, res) => {
            try {
                console.log("📊 Fetching overview data...");

                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

                // ===========================================
                // BASIC KPIs
                // ===========================================
                const [kpiData] = await collection.aggregate([
                    {
                        $addFields: {
                            convertedDate: {
                                $cond: {
                                    if: { $type: "$query_time" },
                                    then: { $dateFromString: { dateString: "$query_time", onError: null } },
                                    else: null
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalUsers: { $addToSet: "$user_email" },
                            totalQueries: { $sum: 1 },
                            avgResponseTime: { $avg: "$time.total_time" },
                            successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } },
                            totalRestaurants: { $addToSet: "$restaurant_id" },
                            totalTokens: {
                                $sum: {
                                    $add: [
                                        { $toInt: { $ifNull: ["$token_usage.petpooja_dashboard.query_reformer_token_usage.total_tokens", 0] } },
                                        {
                                            $toInt: {
                                                $ifNull: [
                                                    {
                                                        $cond: {
                                                            if: { $isArray: "$token_usage.petpooja_dashboard.query_router_token_usage.total_tokens" },
                                                            then: { $arrayElemAt: ["$token_usage.petpooja_dashboard.query_router_token_usage.total_tokens", 0] },
                                                            else: "$token_usage.petpooja_dashboard.query_router_token_usage.total_tokens"
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        { $toInt: { $ifNull: [{ $arrayElemAt: ["$token_usage.petpooja_dashboard.request_type_identifier.total_tokens", 0] }, 0] } }
                                    ]
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            totalUsers: { $size: "$totalUsers" },
                            totalQueries: "$totalQueries",
                            successCount: "$successCount",
                            avgResponseTime: { $round: [{ $ifNull: ["$avgResponseTime", 0] }, 0] },
                            totalRestaurants: { $size: "$totalRestaurants" },
                            totalTokens: { $ifNull: ["$totalTokens", 0] }
                        }
                    },
                    {
                        $addFields: {
                            successRate: {
                                $cond: [
                                    { $eq: ["$totalQueries", 0] },
                                    0,
                                    { $round: [{ $multiply: [{ $divide: ["$successCount", "$totalQueries"] }, 100] }, 1] }
                                ]
                            }
                        }
                    }
                ]).toArray();

                // ===========================================
                // ENHANCED WEEKLY GROWTH CALCULATION
                // ===========================================
                const weeklyGrowthData = await collection.aggregate([
                    {
                        $addFields: {
                            convertedDate: {
                                $cond: [
                                    { $eq: [{ $type: "$query_time" }, "string"] },
                                    { $dateFromString: { dateString: "$query_time", onError: null } },
                                    "$query_time"
                                ]
                            }
                        }
                    },
                    {
                        $facet: {
                            currentWeek: [
                                {
                                    $match: {
                                        convertedDate: { $ne: null, $gte: sevenDaysAgo, $lt: now }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        queries: { $sum: 1 },
                                        users: { $addToSet: "$user_email" },
                                        returningUsers: {
                                            $addToSet: { $cond: [{ $ne: ["$user_type", 1] }, "$user_email", null] }
                                        },
                                        avgResponseTime: { $avg: "$time.total_time" },
                                        successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } },
                                        totalTokens: {
                                            $sum: {
                                                $add: [
                                                    { $ifNull: ["$token_usage.petpooja_dashboard.query_reformer_token_usage.total_tokens", 0] },
                                                    { $ifNull: ["$token_usage.petpooja_dashboard.query_router_token_usage.total_tokens", 0] },
                                                    {
                                                        $let: {
                                                            vars: { req: { $arrayElemAt: ["$token_usage.petpooja_dashboard.request_type_identifier", 0] } },
                                                            in: { $ifNull: ["$$req.total_tokens", 0] }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        queries: 1,
                                        users: { $size: "$users" },
                                        returningUsers: {
                                            $size: { $filter: { input: "$returningUsers", cond: { $ne: ["$$this", null] } } }
                                        },
                                        avgResponseTime: { $round: [{ $ifNull: ["$avgResponseTime", 0] }, 0] },
                                        totalTokens: { $ifNull: ["$totalTokens", 0] },
                                        successRate: {
                                            $cond: [
                                                { $eq: ["$queries", 0] },
                                                0,
                                                { $round: [{ $multiply: [{ $divide: ["$successCount", "$queries"] }, 100] }, 1] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            previousWeek: [
                                {
                                    $match: {
                                        convertedDate: { $ne: null, $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        queries: { $sum: 1 },
                                        users: { $addToSet: "$user_email" },
                                        returningUsers: {
                                            $addToSet: { $cond: [{ $ne: ["$user_type", 1] }, "$user_email", null] }
                                        },
                                        avgResponseTime: { $avg: "$time.total_time" },
                                        successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } },
                                        totalTokens: {
                                            $sum: {
                                                $add: [
                                                    { $ifNull: ["$token_usage.petpooja_dashboard.query_reformer_token_usage.total_tokens", 0] },
                                                    { $ifNull: ["$token_usage.petpooja_dashboard.query_router_token_usage.total_tokens", 0] },
                                                    {
                                                        $let: {
                                                            vars: { req: { $arrayElemAt: ["$token_usage.petpooja_dashboard.request_type_identifier", 0] } },
                                                            in: { $ifNull: ["$$req.total_tokens", 0] }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        queries: 1,
                                        users: { $size: "$users" },
                                        returningUsers: {
                                            $size: { $filter: { input: "$returningUsers", cond: { $ne: ["$$this", null] } } }
                                        },
                                        avgResponseTime: { $round: [{ $ifNull: ["$avgResponseTime", 0] }, 0] },
                                        totalTokens: { $ifNull: ["$totalTokens", 0] },
                                        successRate: {
                                            $cond: [
                                                { $eq: ["$queries", 0] },
                                                0,
                                                { $round: [{ $multiply: [{ $divide: ["$successCount", "$queries"] }, 100] }, 1] }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]).toArray();

                const currentWeek = weeklyGrowthData[0]?.currentWeek[0] || { queries: 0, users: 0, returningUsers: 0, avgResponseTime: 0, successRate: 0, totalTokens: 0 };
                const previousWeek = weeklyGrowthData[0]?.previousWeek[0] || { queries: 0, users: 0, returningUsers: 0, avgResponseTime: 0, successRate: 0, totalTokens: 0 };

                const weeklyGrowth = {
                    queries: calculateSafeGrowth(currentWeek.queries, previousWeek.queries),
                    users: calculateSafeGrowth(currentWeek.users, previousWeek.users),
                    returningUsers: calculateSafeGrowth(currentWeek.returningUsers, previousWeek.returningUsers),
                    responseTime: calculateSafeGrowth(currentWeek.avgResponseTime, previousWeek.avgResponseTime),
                    successRate: Math.round((currentWeek.successRate - previousWeek.successRate) * 10) / 10,
                    tokens: calculateSafeGrowth(currentWeek.totalTokens, previousWeek.totalTokens)
                };

                // ===========================================
                // QUERY VOLUME TRENDS (Last 30 days)
                // ===========================================
                const queryVolume = await collection.aggregate([
                    {
                        $addFields: {
                            convertedDate: {
                                $cond: [
                                    { $eq: [{ $type: "$query_time" }, "string"] },
                                    { $dateFromString: { dateString: "$query_time", onError: null } },
                                    "$query_time"
                                ]
                            }
                        }
                    },
                    {
                        $match: {
                            convertedDate: { $ne: null, $gte: thirtyDaysAgo }
                        }
                    },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$convertedDate" } },
                            queries: { $sum: 1 },
                            avgResponseTime: { $avg: "$time.total_time" },
                            successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } }
                        }
                    },
                    {
                        $addFields: {
                            successRate: {
                                $cond: [
                                    { $eq: ["$queries", 0] },
                                    0,
                                    { $round: [{ $multiply: [{ $divide: ["$successCount", "$queries"] }, 100] }, 1] }
                                ]
                            }
                        }
                    },
                    { $sort: { _id: 1 } },
                    {
                        $project: {
                            date: "$_id",
                            queries: 1,
                            avgResponseTime: { $round: [{ $ifNull: ["$avgResponseTime", 0] }, 0] },
                            successRate: 1,
                            _id: 0
                        }
                    }
                ]).toArray();

                // ===========================================
                // TOP PERFORMING RESTAURANTS
                // ===========================================
                const topRestaurants = await collection.aggregate([
                    {
                        $addFields: {
                            convertedDate: {
                                $cond: [
                                    { $eq: [{ $type: "$query_time" }, "string"] },
                                    { $dateFromString: { dateString: "$query_time", onError: null } },
                                    "$query_time"
                                ]
                            }
                        }
                    },
                    {
                        $match: {
                            convertedDate: { $ne: null, $gte: thirtyDaysAgo },
                            restaurant_id: { $exists: true, $ne: null }
                        }
                    },
                    {
                        $group: {
                            _id: "$restaurant_id",
                            queries: { $sum: 1 },
                            successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } },
                            avgResponseTime: { $avg: "$time.total_time" },
                            uniqueUsers: { $addToSet: "$user_email" }
                        }
                    },
                    {
                        $addFields: {
                            successRate: {
                                $cond: [
                                    { $eq: ["$queries", 0] },
                                    0,
                                    { $round: [{ $multiply: [{ $divide: ["$successCount", "$queries"] }, 100] }, 1] }
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            name: { $concat: ["Restaurant ", { $toString: "$_id" }] },
                            restaurantId: "$_id",
                            queries: 1,
                            successRate: 1,
                            avgResponseTime: { $round: [{ $ifNull: ["$avgResponseTime", 0] }, 0] },
                            uniqueUsers: { $size: "$uniqueUsers" },
                            _id: 0
                        }
                    },
                    { $sort: { queries: -1 } },
                    { $limit: 10 }
                ]).toArray();


                // ===========================================
                // REQUEST TYPE DISTRIBUTION
                // ===========================================
                const requestDistribution = await collection.aggregate([
                    { $unwind: { path: "$petpooja_dashboard.request_type_identifier", preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: "$petpooja_dashboard.request_type_identifier.raw_output",
                            count: { $sum: 1 },
                            avgResponseTime: { $avg: "$time.total_time" }
                        }
                    },
                    {
                        $project: {
                            name: { $ifNull: ["$_id", "Unknown"] },
                            value: "$count",
                            avgResponseTime: { $round: [{ $ifNull: ["$avgResponseTime", 0] }, 0] },
                            _id: 0
                        }
                    },
                    { $sort: { value: -1 } }
                ]).toArray();

                // ===========================================
                // USER GROWTH ANALYSIS (Last 30 days)
                // ===========================================
                const userGrowth = await collection.aggregate([
                    {
                        $addFields: {
                            convertedDate: {
                                $cond: [
                                    { $eq: [{ $type: "$query_time" }, "string"] },
                                    { $dateFromString: { dateString: "$query_time", onError: null } },
                                    "$query_time"
                                ]
                            }
                        }
                    },
                    {
                        $match: {
                            convertedDate: { $ne: null, $gte: thirtyDaysAgo }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                date: { $dateToString: { format: "%Y-%m-%d", date: "$convertedDate" } },
                                userType: {
                                    $cond: [
                                        { $eq: ["$user_type", 1] },
                                        "New",
                                        "Returning"
                                    ]
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $group: {
                            _id: "$_id.date",
                            newUsers: {
                                $sum: { $cond: [{ $eq: ["$_id.userType", "New"] }, "$count", 0] }
                            },
                            returningUsers: {
                                $sum: { $cond: [{ $eq: ["$_id.userType", "Returning"] }, "$count", 0] }
                            }
                        }
                    },
                    { $sort: { _id: 1 } },
                    {
                        $project: {
                            date: "$_id",
                            newUsers: 1,
                            returningUsers: 1,
                            _id: 0
                        }
                    }
                ]).toArray();

                // ===========================================
                // ACTIVE USERS (Last 5 minutes)
                // ===========================================
                const [activeUsersData] = await collection.aggregate([
                    {
                        $addFields: {
                            convertedDate: {
                                $cond: {
                                    if: { $type: "$query_time" },
                                    then: { $dateFromString: { dateString: "$query_time", onError: null } },
                                    else: null
                                }
                            }
                        }
                    },
                    {
                        $match: {
                            convertedDate: { $ne: null, $gte: fiveMinutesAgo }
                        }
                    },
                    { $group: { _id: "$user_email" } },
                    { $count: "count" }
                ]).toArray();

                // ===========================================
                // LATEST CRITICAL ERROR
                // ===========================================
                const [latestError] = await collection.aggregate([
                    {
                        $match: {
                            status: false,
                            $or: [
                                { error_message: { $exists: true, $ne: null } },
                                { message: { $exists: true, $ne: "" } }
                            ]
                        }
                    },
                    { $sort: { query_time: -1 } },
                    { $limit: 1 },
                    {
                        $project: {
                            error: {
                                $ifNull: [
                                    "$error_message",
                                    { $ifNull: ["$message", "Unknown error"] }
                                ]
                            },
                            timestamp: "$query_time",
                            _id: 0
                        }
                    }
                ]).toArray();

                // ===========================================
                // PEAK HOUR CALCULATION (Last 30 days)
                // ===========================================
                const [peakHourData] = await collection.aggregate([
                    {
                        $addFields: {
                            convertedDate: {
                                $cond: {
                                    if: { $eq: [{ $type: "$query_time" }, "string"] },
                                    then: { $dateFromString: { dateString: "$query_time", onError: null } },
                                    else: "$query_time"
                                }
                            }
                        }
                    },
                    {
                        $match: {
                            convertedDate: { $ne: null, $gte: thirtyDaysAgo }
                        }
                    },
                    {
                        $group: {
                            _id: { $hour: "$convertedDate" },
                            queries: { $sum: 1 }
                        }
                    },
                    { $sort: { queries: -1 } },
                    { $limit: 1 }
                ]).toArray();

                const peakHour = peakHourData?._id ?? null;

                // ===========================================
                // RESPONSE STRUCTURE
                // ===========================================
                const responseData = {
                    // Basic KPIs
                    kpis: kpiData || {
                        totalUsers: 0,
                        totalQueries: 0,
                        successRate: 0,
                        avgResponseTime: 0,
                        totalRestaurants: 0,
                        totalTokens: 0
                    },

                    // Enhanced growth metrics
                    weeklyGrowth: {
                        queries: weeklyGrowth.queries,
                        users: weeklyGrowth.users,
                        returningUsers: weeklyGrowth.returningUsers,
                        responseTime: weeklyGrowth.responseTime,
                        successRate: weeklyGrowth.successRate,
                        tokens: weeklyGrowth.tokens,
                        currentWeek,
                        previousWeek
                    },

                    // Charts data
                    queryVolume,
                    topRestaurants,
                    requestDistribution,
                    userGrowth,

                    // Live metrics
                    activeUsers: activeUsersData?.count || 0,
                    peakHour: peakHour || 'N/A',

                    // System health
                    latestError: latestError?.error || "No recent errors",
                    errorTimestamp: latestError?.timestamp || null,

                    // Metadata
                    timestamp: new Date().toISOString(),
                    dataRange: {
                        from: thirtyDaysAgo.toISOString(),
                        to: now.toISOString()
                    }
                };

                console.log("✅ Overview data prepared successfully");
                res.json(responseData);

            } catch (error) {
                console.error("❌ Error in /api/overview-data:", error);
                res.status(500).json({
                    message: error.message,
                    error: "Failed to fetch overview data"
                });
            }
        });

        // Keep existing endpoints unchanged
        app.get('/api/analytics-data', async (req, res) => {
            try {
                const [phaseBreakdown] = await collection.aggregate([
                    {
                        $group: {
                            _id: null,
                            query_reformer: { $avg: "$time.petpooja_dashboard.query_reformer.context_query_reforming_time" },
                            query_router: { $avg: "$time.petpooja_dashboard.query_router.query_routing_time" },
                            request_identifier: {
                                $avg: {
                                    $arrayElemAt: ["$time.petpooja_dashboard.request_type_identifier.request_type_identification_time", 0]
                                }
                            },
                            api_calling: {
                                $avg: {
                                    $arrayElemAt: ["$time.petpooja_dashboard.api_function_calling.api_function_calling_total_time", 0]
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            data: [
                                { name: "Query Reformer", time: { $round: [{ $ifNull: ["$query_reformer", 0] }, 2] } },
                                { name: "Query Router", time: { $round: [{ $ifNull: ["$query_router", 0] }, 2] } },
                                { name: "Request ID", time: { $round: [{ $ifNull: ["$request_identifier", 0] }, 2] } },
                                { name: "API Call", time: { $round: [{ $ifNull: ["$api_calling", 0] }, 2] } }
                            ]
                        }
                    }
                ]).toArray();

                const [tokenBreakdown] = await collection.aggregate([
                    {
                        $group: {
                            _id: null,
                            prompt_tokens: { $sum: "$token_usage.petpooja_dashboard.query_reformer_token_usage.prompt_tokens" },
                            completion_tokens: { $sum: "$token_usage.petpooja_dashboard.query_reformer_token_usage.completion_tokens" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            data: [
                                { name: "Prompt Tokens", value: { $ifNull: ["$prompt_tokens", 0] }, color: "#8B5CF6" },
                                { name: "Completion Tokens", value: { $ifNull: ["$completion_tokens", 0] }, color: "#F59E0B" }
                            ]
                        }
                    }
                ]).toArray();

                res.json({
                    phaseBreakdown: phaseBreakdown?.data || [],
                    tokenBreakdown: tokenBreakdown?.data || []
                });
            } catch (error) {
                console.error("Error in /api/analytics-data:", error);
                res.status(500).json({ message: error.message });
            }
        });

        app.get('/api/users-data', async (req, res) => {
            try {
                const userActivity = await collection.aggregate([
                    {
                        $group: {
                            _id: "$user_email",
                            queryCount: { $sum: 1 },
                            lastActivity: { $max: "$query_time" }
                        }
                    },
                    { $sort: { queryCount: -1 } },
                    { $limit: 20 },
                    { $project: { email: "$_id", queryCount: 1, lastActivity: 1, _id: 0 } }
                ]).toArray();

                const userTypes = await collection.aggregate([
                    {
                        $group: {
                            _id: {
                                $cond: {
                                    if: { $eq: ["$user_type", 1] },
                                    then: "First-time",
                                    else: "Returning"
                                }
                            },
                            count: { $sum: 1 }
                        }
                    }
                ]).toArray();

                res.json({ userActivity, userTypes });
            } catch (error) {
                console.error("Error in /api/users-data:", error);
                res.status(500).json({ message: error.message });
            }
        });

        app.get('/api/live-feed', async (req, res) => {
            try {
                const data = await collection.find().sort({ query_time: -1 }).limit(10).toArray();
                res.json(data);
            } catch (error) {
                console.error("Error in /api/live-feed:", error);
                res.status(500).json({ message: error.message });
            }
        });

        server.listen(port, () => {
            console.log(`✅ Backend server running at http://localhost:${port}`);
        });
    } catch (err) {
        console.error("❌ Backend startup error:", err);
    }
}

run().catch(console.dir);