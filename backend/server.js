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

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

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
                // Date calculations for different periods
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

                // ===========================================
                // BASIC KPIs (Enhanced)
                // ===========================================
                const [kpiData] = await collection.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalUsers: { $addToSet: "$user_email" },
                            totalQueries: { $sum: 1 },
                            avgResponseTime: { $avg: "$time.total_time" },
                            successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } },
                            totalRestaurants: { $addToSet: "$restaurant_id" },
                            // Token usage calculation
                            totalTokens: {
                                $sum: {
                                    $add: [
                                        { $ifNull: ["$token_usage.petpooja_dashboard.query_reformer_token_usage.total_tokens", 0] },
                                        { $ifNull: ["$token_usage.petpooja_dashboard.query_router_token_usage.total_tokens", 0] }
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
                            avgResponseTime: { $round: ["$avgResponseTime", 0] },
                            totalRestaurants: { $size: "$totalRestaurants" },
                            totalTokens: "$totalTokens"
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
                // FIXED WEEKLY GROWTH CALCULATION
                // ===========================================
                const weeklyGrowthData = await collection.aggregate([
                    {
                        $addFields: {
                            convertedDate: { $toDate: "$query_time" }
                        }
                    },
                    {
                        $facet: {
                            currentWeek: [
                                { 
                                    $match: { 
                                        convertedDate: { 
                                            $gte: sevenDaysAgo,
                                            $lt: now
                                        } 
                                    } 
                                },
                                {
                                    $group: {
                                        _id: null,
                                        queries: { $sum: 1 },
                                        users: { $addToSet: "$user_email" },
                                        avgResponseTime: { $avg: "$time.total_time" },
                                        successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } }
                                    }
                                },
                                {
                                    $project: {
                                        queries: 1,
                                        users: { $size: "$users" },
                                        avgResponseTime: { $round: ["$avgResponseTime", 0] },
                                        successRate: {
                                            $cond: [
                                                { $eq: ["$queries", 0] },
                                                0,
                                                { $multiply: [{ $divide: ["$successCount", "$queries"] }, 100] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            previousWeek: [
                                { 
                                    $match: { 
                                        convertedDate: { 
                                            $gte: fourteenDaysAgo,
                                            $lt: sevenDaysAgo
                                        } 
                                    } 
                                },
                                {
                                    $group: {
                                        _id: null,
                                        queries: { $sum: 1 },
                                        users: { $addToSet: "$user_email" },
                                        avgResponseTime: { $avg: "$time.total_time" },
                                        successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } }
                                    }
                                },
                                {
                                    $project: {
                                        queries: 1,
                                        users: { $size: "$users" },
                                        avgResponseTime: { $round: ["$avgResponseTime", 0] },
                                        successRate: {
                                            $cond: [
                                                { $eq: ["$queries", 0] },
                                                0,
                                                { $multiply: [{ $divide: ["$successCount", "$queries"] }, 100] }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]).toArray();

                // Calculate growth percentages
                const currentWeek = weeklyGrowthData[0]?.currentWeek[0] || { queries: 0, users: 0, avgResponseTime: 0, successRate: 0 };
                const previousWeek = weeklyGrowthData[0]?.previousWeek[0] || { queries: 0, users: 0, avgResponseTime: 0, successRate: 0 };

                const calculateGrowth = (current, previous) => {
                    if (previous === 0 && current > 0) return 100;
                    if (previous > 0 && current === 0) return -100;
                    if (previous === 0 && current === 0) return 0;
                    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
                };

                const weeklyGrowth = {
                    queries: calculateGrowth(currentWeek.queries, previousWeek.queries),
                    users: calculateGrowth(currentWeek.users, previousWeek.users),
                    responseTime: calculateGrowth(currentWeek.avgResponseTime, previousWeek.avgResponseTime),
                    successRate: Math.round((currentWeek.successRate - previousWeek.successRate) * 10) / 10
                };

                // ===========================================
                // QUERY VOLUME TRENDS (Last 30 days)
                // ===========================================
                const queryVolume = await collection.aggregate([
                    { $addFields: { convertedDate: { $toDate: "$query_time" } } },
                    { $match: { convertedDate: { $gte: thirtyDaysAgo } } },
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
                            avgResponseTime: { $round: ["$avgResponseTime", 0] },
                            successRate: 1,
                            _id: 0 
                        } 
                    }
                ]).toArray();

                // ===========================================
                // TOP PERFORMING RESTAURANTS
                // ===========================================
                const topRestaurants = await collection.aggregate([
                    { $addFields: { convertedDate: { $toDate: "$query_time" } } },
                    { $match: { convertedDate: { $gte: thirtyDaysAgo } } },
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
                            name: { $concat: ["Restaurant ", "$_id"] },
                            restaurantId: "$_id",
                            queries: 1,
                            successRate: 1,
                            avgResponseTime: { $round: ["$avgResponseTime", 0] },
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
                            avgResponseTime: { $round: ["$avgResponseTime", 0] },
                            _id: 0
                        }
                    },
                    { $sort: { value: -1 } }
                ]).toArray();

                // ===========================================
                // USER GROWTH ANALYSIS
                // ===========================================
                const userGrowth = await collection.aggregate([
                    { $addFields: { convertedDate: { $toDate: "$query_time" } } },
                    { $match: { convertedDate: { $gte: thirtyDaysAgo } } },
                    {
                        $group: {
                            _id: {
                                date: { $dateToString: { format: "%Y-%m-%d", date: "$convertedDate" } },
                                userType: {
                                    $cond: { if: { $eq: ["$user_type", 1] }, then: "New", else: "Returning" }
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
                    { $addFields: { convertedDate: { $toDate: "$query_time" } } },
                    { $match: { convertedDate: { $gte: fiveMinutesAgo } } },
                    { $group: { _id: "$user_email" } },
                    { $count: "count" }
                ]).toArray();

                // ===========================================
                // PEAK HOUR ANALYSIS
                // ===========================================
                const [peakHour] = await collection.aggregate([
                    { $addFields: { convertedDate: { $toDate: "$query_time" } } },
                    { $match: { convertedDate: { $gte: sevenDaysAgo } } },
                    {
                        $group: {
                            _id: { $hour: "$convertedDate" },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 1 }
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
                // RESPONSE STRUCTURE
                // ===========================================
                res.json({
                    // Basic KPIs
                    kpis: kpiData || { 
                        totalUsers: 0, 
                        totalQueries: 0, 
                        successRate: 0, 
                        avgResponseTime: 0,
                        totalRestaurants: 0,
                        totalTokens: 0
                    },

                    // Growth metrics
                    weeklyGrowth: {
                        queries: weeklyGrowth.queries,
                        users: weeklyGrowth.users,
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
                    peakHour: peakHour?._id || 'N/A',
                    
                    // System health
                    latestError: latestError?.error || "No recent errors",
                    errorTimestamp: latestError?.timestamp || null,

                    // Metadata
                    timestamp: new Date().toISOString(),
                    dataRange: {
                        from: thirtyDaysAgo.toISOString(),
                        to: now.toISOString()
                    }
                });

            } catch (error) {
                console.error("Error in /api/overview-data:", error);
                res.status(500).json({ message: error.message });
            }
        });

        // ----------------- ANALYTICS ENDPOINT (Keep existing) -----------------
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

        // ----------------- USERS ENDPOINT (Keep existing) -----------------
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

        // ----------------- LIVE FEED (Keep existing) -----------------
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