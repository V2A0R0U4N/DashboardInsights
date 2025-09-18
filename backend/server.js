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
        changeStream.on('change', (change) => {
            io.emit('dashboardUpdate', { message: "Data has been updated" });
        });

        // --- Endpoint for Overview Page (Corrected and Stabilized) ---
        app.get('/api/dashboard-data', async (req, res) => {
            try {
                const { dateRange, requestType, userType } = req.query;
                const matchFilter = {};
                if (dateRange && dateRange !== 'all') {
                    const days = parseInt(dateRange.replace('d', ''));
                    if (!isNaN(days)) {
                        const startDate = new Date();
                        startDate.setDate(startDate.getDate() - days);
                        matchFilter.query_time = { $gte: startDate.toISOString() };
                    }
                }
                if (userType && userType !== 'all') {
                    matchFilter.user_type = parseInt(userType);
                }
                const requestTypeMatch = {};
                if (requestType && requestType !== 'all') {
                    requestTypeMatch['petpooja_dashboard.request_type_identifier.raw_output'] = requestType;
                }
                const basePipeline = [{ $match: matchFilter }, { $unwind: { path: "$petpooja_dashboard.request_type_identifier", preserveNullAndEmptyArrays: true } }, { $match: requestTypeMatch }];

                const [kpiData] = await collection.aggregate([...basePipeline, { $group: { _id: null, totalUsers: { $addToSet: "$user_email" }, totalSessions: { $addToSet: "$session_id" }, totalRestaurants: { $addToSet: "$restaurant_id" }, totalQueries: { $sum: 1 }, totalTokens: { $sum: "$token_usage.petpooja_dashboard.query_reformer_token_usage.total_tokens" }, avgResponseTime: { $avg: "$time.total_time" }, successCount: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } } } }, { $project: { _id: 0, totalUsers: { $size: "$totalUsers" }, totalSessions: { $size: "$totalSessions" }, restaurants: { $size: "$totalRestaurants" }, avgQueriesPerSession: { $divide: ["$totalQueries", { $ifNull: [{ $size: "$totalSessions" }, 1] }] }, successRatio: { $multiply: [{ $divide: ["$successCount", { $ifNull: ["$totalQueries", 1] }] }, 100] }, totalTokens: "$totalTokens", avgResponseTime: { $round: ["$avgResponseTime", 0] } } }]).toArray();
                const requestDistribution = await collection.aggregate([...basePipeline, { $group: { _id: "$petpooja_dashboard.request_type_identifier.raw_output", value: { $sum: 1 } } }, { $project: { name: "$_id", value: 1, _id: 0 } }]).toArray();
                const statusData = await collection.aggregate([...basePipeline, { $group: { _id: { $cond: { if: { $eq: ["$status", true] }, then: "Success", else: "Failed" } }, value: { $sum: 1 } } }, { $project: { name: "$_id", value: 1, _id: 0 } }]).toArray();
                const routeDistribution = await collection.aggregate([...basePipeline, { $unwind: { path: "$petpooja_dashboard.query_router.query_router_processed_results.tasks", preserveNullAndEmptyArrays: true } }, { $group: { _id: "$petpooja_dashboard.query_router.query_router_processed_results.tasks.route", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }, { $project: { route: "$_id", count: 1, _id: 0 } }]).toArray();
                const responseTimes = await collection.aggregate([...basePipeline, { $addFields: { query_hour: { $hour: { $toDate: "$query_time" } } } }, { $group: { _id: "$query_hour", avg: { $avg: "$time.total_time" } } }, { $sort: { "_id": 1 } }, { $project: { time: { $concat: [{ $cond: { if: { $lt: ["$_id", 10] }, then: "0", else: "" } }, { $toString: "$_id" }, ":00"] }, avg: { $round: ["$avg", 0] }, _id: 0 } }]).toArray();
                const geographicData = await collection.aggregate([...basePipeline, { $group: { _id: "$currency_html_code", requests: { $sum: 1 } } }, { $sort: { requests: -1 } }, { $limit: 5 }, { $project: { country: "$_id", requests: 1, _id: 0 } }]).toArray();
                const topRestaurants = await collection.aggregate([...basePipeline, { $group: { _id: "$restaurant_id", queries: { $sum: 1 } } }, { $sort: { queries: -1 } }, { $limit: 5 }, { $project: { id: "$_id", name: { $concat: ["Restaurant ", "$_id"] }, queries: 1, _id: 0 } }]).toArray();
                const userTypes = await collection.aggregate([...basePipeline, { $group: { _id: { $cond: { if: { $eq: ["$user_type", 1] }, then: "First-time", else: "Returning" } }, count: { $sum: 1 } } }]).toArray();
                const duplicateQueries = await collection.aggregate([...basePipeline, { $group: { _id: "$question", count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]).toArray();

                res.json({ kpis: kpiData || {}, requestDistribution, statusData, routeDistribution, responseTimes, geographicData, topRestaurants, userTypes, duplicateQueries });
            } catch (error) {
                console.error("Error in /api/dashboard-data:", error);
                res.status(500).json({ message: error.message });
            }
        });

        // --- Endpoint for Analytics Page (Corrected and Stabilized) ---
        app.get('/api/analytics-data', async (req, res) => {
            try {
                const [phaseBreakdown] = await collection.aggregate([ { $group: { _id: null, query_reformer: { $avg: "$time.petpooja_dashboard.query_reformer.context_query_reforming_time" }, query_router: { $avg: "$time.petpooja_dashboard.query_router.query_routing_time" }, request_identifier: { $avg: { $arrayElemAt: ["$time.petpooja_dashboard.request_type_identifier.request_type_identification_time", 0] } }, api_calling: { $avg: { $arrayElemAt: ["$time.petpooja_dashboard.api_function_calling.api_function_calling_total_time", 0] } } } }, { $project: { _id: 0, data: [ { name: "Query Reformer", time: { $round: [{ $ifNull: ["$query_reformer", 0] }, 2] } }, { name: "Query Router", time: { $round: [{ $ifNull: ["$query_router", 0] }, 2] } }, { name: "Request ID", time: { $round: [{ $ifNull: ["$request_identifier", 0] }, 2] } }, { name: "API Call", time: { $round: [{ $ifNull: ["$api_calling", 0] }, 2] } } ] } } ]).toArray();
                const [tokenBreakdown] = await collection.aggregate([ { $group: { _id: null, prompt_tokens: { $sum: "$token_usage.petpooja_dashboard.query_reformer_token_usage.prompt_tokens" }, completion_tokens: { $sum: "$token_usage.petpooja_dashboard.query_reformer_token_usage.completion_tokens" } } }, { $project: { _id: 0, data: [ { name: "Prompt Tokens", value: { $ifNull: ["$prompt_tokens", 0] }, color: "#8B5CF6" }, { name: "Completion Tokens", value: { $ifNull: ["$completion_tokens", 0] }, color: "#F59E0B" } ] } } ]).toArray();
                const latencyPercentiles = await collection.aggregate([ { $sort: { "time.total_time": 1 } }, { $group: { _id: null, times: { $push: "$time.total_time" } } }, { $project: { _id: 0, p50: { $arrayElemAt: ["$times", { $floor: { $multiply: [0.50, { $size: "$times" }] } }] }, p90: { $arrayElemAt: ["$times", { $floor: { $multiply: [0.90, { $size: "$times" }] } }] }, p95: { $arrayElemAt: ["$times", { $floor: { $multiply: [0.95, { $size: "$times" }] } }] } } } ]).toArray();
                const errorTrends = await collection.aggregate([ { $match: { status: false, error_message: { $exists: true, $ne: null } } }, { $group: { _id: "$error_message", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }, { $project: { name: "$_id", count: 1, _id: 0 } } ]).toArray();

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

        // --- Endpoint for Users Page (Your working version) ---
        app.get('/api/users-data', async (req, res) => {
            try {
                const userActivity = await collection.aggregate([ { $group: { _id: "$user_email", queryCount: { $sum: 1 }, lastActivity: { $max: "$query_time" } } }, { $sort: { queryCount: -1 } }, { $limit: 20 }, { $project: { email: "$_id", queryCount: 1, lastActivity: 1, _id: 0 } } ]).toArray();
                const userTypes = await collection.aggregate([ { $group: { _id: { $cond: { if: { $eq: ["$user_type", 1] }, then: "First-time", else: "Returning" } }, count: { $sum: 1 } } } ]).toArray();
                res.json({ userActivity, userTypes });
            } catch (error) {
                console.error("Error in /api/users-data:", error);
                res.status(500).json({ message: error.message });
            }
        });
        
        app.get('/api/live-feed', async (req, res) => {
            const data = await collection.find().sort({ query_time: -1 }).limit(10).toArray();
            res.json(data);
        });

        server.listen(port, () => {
            console.log(`✅ Backend server running at http://localhost:${port}`);
        });

    } catch (err) {
        console.error("❌ Backend startup error:", err);
    }
}
run().catch(console.dir);