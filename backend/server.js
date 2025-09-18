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

        // ⚠️ update db/collection names if different
        const database = client.db("test");
        const collection = database.collection("agentlogs");

        const changeStream = collection.watch([], { fullDocument: 'updateLookup' });
        changeStream.on('change', () => {
            io.emit('dashboardUpdate', { message: "Data has been updated" });
        });

        // ----------------- OVERVIEW ENDPOINT -----------------
        app.get('/api/overview-data', async (req, res) => {
            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                // KPIs
                const [kpiData] = await collection.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalUsers: { $addToSet: "$user_email" },
                            totalQueries: { $sum: 1 },
                            avgResponseTime: { $avg: "$time.total_time" },
                            successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            totalUsers: { $size: "$totalUsers" },
                            totalQueries: "$totalQueries",
                            successRate: {
                                $multiply: [
                                    { $divide: ["$successCount", { $ifNull: ["$totalQueries", 1] }] },
                                    100
                                ]
                            },
                            avgResponseTime: { $round: ["$avgResponseTime", 0] }
                        }
                    }
                ]).toArray();

                // Query volume (30d)
                const queryVolume = await collection.aggregate([
                    { $addFields: { convertedDate: { $toDate: "$query_time" } } },
                    { $match: { convertedDate: { $gte: thirtyDaysAgo } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$convertedDate" } },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } },
                    { $project: { date: "$_id", queries: "$count", _id: 0 } }
                ]).toArray();

                // Peak hour
                const [peakHour] = await collection.aggregate([
                    { $group: { _id: { $hour: { $toDate: "$query_time" } }, count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 1 }
                ]).toArray();

                // Top request type
                const [topRequestType] = await collection.aggregate([
                    {
                        $group: {
                            _id: "$petpooja_dashboard.request_type_identifier.raw_output",
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 1 }
                ]).toArray();

                // Request distribution
                const requestDistribution = await collection.aggregate([
                    {
                        $group: {
                            _id: "$petpooja_dashboard.request_type_identifier.raw_output",
                            value: { $sum: 1 }
                        }
                    },
                    { $project: { name: "$_id", value: 1, _id: 0 } }
                ]).toArray();

                // Top restaurants
                const topRestaurants = await collection.aggregate([
                    { $group: { _id: "$restaurant_id", queries: { $sum: 1 } } },
                    { $sort: { queries: -1 } },
                    { $limit: 5 },
                    { $project: { name: { $concat: ["Restaurant ", "$_id"] }, queries: 1, _id: 0 } }
                ]).toArray();

                res.json({
                    kpis: kpiData || { totalUsers: 0, totalQueries: 0, successRate: 0, avgResponseTime: 0 },
                    queryVolume,
                    peakHour: peakHour?._id ?? 'N/A',
                    topRequestType: topRequestType?._id || 'N/A',
                    requestDistribution,
                    topRestaurants
                });
            } catch (error) {
                console.error("Error in /api/overview-data:", error);
                res.status(500).json({ message: error.message });
            }
        });

        // ----------------- ANALYTICS ENDPOINT -----------------
        app.get('/api/analytics-data', async (req, res) => {
            try {
                const [phaseBreakdown] = await collection.aggregate([
                    {
                        $group: {
                            _id: null,
                            query_reformer: { $avg: "$time.petpooja_dashboard.query_reformer.context_query_reforming_time" },
                            query_router: { $avg: "$time.petpooja_dashboard.query_router.query_routing_time" },
                            request_identifier: { $avg: { $arrayElemAt: ["$time.petpooja_dashboard.request_type_identifier.request_type_identification_time", 0] } },
                            api_calling: { $avg: { $arrayElemAt: ["$time.petpooja_dashboard.api_function_calling.api_function_calling_total_time", 0] } }
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

                const latencyPercentiles = await collection.aggregate([
                    { $sort: { "time.total_time": 1 } },
                    { $group: { _id: null, times: { $push: "$time.total_time" } } },
                    {
                        $project: {
                            _id: 0,
                            p50: { $arrayElemAt: ["$times", { $floor: { $multiply: [0.50, { $size: "$times" }] } }] },
                            p90: { $arrayElemAt: ["$times", { $floor: { $multiply: [0.90, { $size: "$times" }] } }] },
                            p95: { $arrayElemAt: ["$times", { $floor: { $multiply: [0.95, { $size: "$times" }] } }] }
                        }
                    }
                ]).toArray();

                const errorTrends = await collection.aggregate([
                    { $match: { status: false, error_message: { $exists: true, $ne: null } } },
                    { $group: { _id: "$error_message", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 5 },
                    { $project: { name: "$_id", count: 1, _id: 0 } }
                ]).toArray();

                res.json({
                    phaseBreakdown: phaseBreakdown?.data || [],
                    tokenBreakdown: tokenBreakdown?.data || [],
                    latencyPercentiles: latencyPercentiles[0] || { p50: 0, p90: 0, p95: 0 },
                    errorTrends
                });
            } catch (error) {
                console.error("Error in /api/analytics-data:", error);
                res.status(500).json({ message: error.message });
            }
        });

        // ----------------- USERS ENDPOINT -----------------
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

        // ----------------- LIVE FEED -----------------
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
