// Mock data for the analytics dashboard

export const mockKPIs = {
  totalUsers: 12847,
  totalSessions: 8934,
  restaurants: 247,
  avgQueriesPerSession: 3.2,
  successRatio: 94.7,
  totalTokens: 2847392,
  avgResponseTime: 847
};

export const mockRequestDistribution = [
  { name: "API Actions", value: 45, color: "#8B5CF6" },
  { name: "Product Guidance", value: 32, color: "#06B6D4" },
  { name: "Sales Analytics", value: 23, color: "#F59E0B" }
];

export const mockStatusData = [
  { name: "Success", value: 94.7, color: "#10B981" },
  { name: "Failed", value: 5.3, color: "#EF4444" }
];

export const mockRouteDistribution = [
  { route: "product_search", count: 1247, percentage: 35 },
  { route: "sales_analytics", count: 890, percentage: 25 },
  { route: "menu_analysis", count: 623, percentage: 18 },
  { route: "customer_insights", count: 445, percentage: 12 },
  { route: "inventory_check", count: 356, percentage: 10 }
];

export const mockResponseTimes = [
  { time: "00:00", avg: 234 },
  { time: "04:00", avg: 189 },
  { time: "08:00", avg: 456 },
  { time: "12:00", avg: 789 },
  { time: "16:00", avg: 923 },
  { time: "20:00", avg: 567 }
];

export const mockGeographicData = [
  { country: "United States", requests: 4567, currency: "USD" },
  { country: "United Kingdom", requests: 2341, currency: "GBP" },
  { country: "Canada", requests: 1789, currency: "CAD" },
  { country: "Australia", requests: 1456, currency: "AUD" },
  { country: "Germany", requests: 1234, currency: "EUR" }
];

export const mockTopRestaurants = [
  { id: "rest_001", name: "The Golden Spoon", queries: 1234, revenue: 45678 },
  { id: "rest_002", name: "Bella Vista", queries: 987, revenue: 38902 },
  { id: "rest_003", name: "Ocean Blue", queries: 876, revenue: 34567 },
  { id: "rest_004", name: "Mountain Peak", queries: 743, revenue: 29834 },
  { id: "rest_005", name: "City Lights", queries: 654, revenue: 25691 }
];

export const mockTokenUsage = {
  total: 2847392,
  prompt: 1847392,
  completion: 1000000,
  breakdown: [
    { task: "query_reformer", tokens: 567834 },
    { task: "query_router", tokens: 423567 },
    { task: "sales_analytics", tokens: 789456 },
    { task: "api_function_calling", tokens: 356789 }
  ]
};

export const mockLiveFeed = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 5000),
    restaurant: "The Golden Spoon",
    user: "user@example.com",
    question: "What are today's best selling items?",
    status: "success" as const,
    responseTime: 234,
    tokens: 567
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 12000),
    restaurant: "Bella Vista",
    user: "chef@bellavista.com",
    question: "Show me inventory levels for pasta",
    status: "success" as const,
    responseTime: 456,
    tokens: 432
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 18000),
    restaurant: "Ocean Blue",
    user: "manager@oceanblue.com",
    question: "Generate weekly sales report",
    status: "failed" as const,
    responseTime: 1200,
    tokens: 234
  }
];

export const mockQueriesPerSession = [
  { queries: 1, sessions: 2341 },
  { queries: 2, sessions: 1876 },
  { queries: 3, sessions: 1423 },
  { queries: 4, sessions: 987 },
  { queries: 5, sessions: 654 },
  { queries: 6, sessions: 432 },
  { queries: 7, sessions: 234 },
  { queries: 8, sessions: 123 }
];

export const mockUserTypes = [
  { type: "First-time", count: 3456, percentage: 38 },
  { type: "Returning", count: 5478, percentage: 62 }
];

export const mockDuplicateQueries = [
  { question: "What are today's specials?", count: 234 },
  { question: "Check inventory levels", count: 187 },
  { question: "Generate sales report", count: 156 },
  { question: "Show customer feedback", count: 143 },
  { question: "Update menu prices", count: 98 }
];

export const mockPhaseBreakdown = [
  { phase: "Query Reformer", time: 45, percentage: 15 },
  { phase: "Query Router", time: 67, percentage: 22 },
  { phase: "Request Identifier", time: 123, percentage: 41 },
  { phase: "API Function Call", time: 67, percentage: 22 }
];