import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Clock, User, MessageSquare, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface LiveFeedItem {
  _id: string;
  query_time: string;
  restaurant_id: string;
  user_email: string;
  question: string;
  status: boolean;
  time: { total_time: number };
  token_usage: { petpooja_dashboard: { query_reformer_token_usage: { total_tokens: number } } };
}

export default function LiveFeed() {
  const [feedItems, setFeedItems] = useState<LiveFeedItem[]>([]);

  const fetchLiveFeedData = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/live-feed');
        const data = await res.json();
        setFeedItems(data);
    } catch (error) {
        console.error("Failed to fetch live feed data:", error);
    }
  };

  useEffect(() => {
    fetchLiveFeedData(); // Fetch initial data

    const socket = io("http://localhost:5000");
    // Listen for the 'dashboardUpdate' event to refetch data
    socket.on('dashboardUpdate', fetchLiveFeedData);

    return () => {
      socket.disconnect();
    };
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status 
      ? <CheckCircle className="w-4 h-4 text-green-500" />
      : <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusColor = (status: boolean) => {
    return status ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50";
  };

  return (
    <div className="card-premium p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <h3 className="text-lg font-semibold">Live Query Feed</h3>
        <span className="text-sm text-muted-foreground">Real-time updates</span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {feedItems.map((item, index) => (
          <div
            key={item._id}
            className={`p-4 rounded-2xl border transition-all duration-500 hover:scale-[1.02] ${getStatusColor(item.status)}`}
            style={{ 
              animation: `slideUp 0.5s ease-out ${index * 0.1}s both`
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(item.status)}
                <span className="font-medium text-sm">Restaurant {item.restaurant_id}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(item.query_time).toLocaleTimeString()}
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{item.user_email}</span>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5" />
                <p className="text-sm">{item.question}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {Math.round(item.time.total_time)}ms response
              </span>
              <span className="text-muted-foreground">
                {item.token_usage.petpooja_dashboard.query_reformer_token_usage.total_tokens} tokens
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}