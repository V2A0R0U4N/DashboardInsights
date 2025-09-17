import { useState } from "react";
import { Calendar, Filter, Users } from "lucide-react";

const dateRanges = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Custom", value: "custom" }
];

const requestTypes = [
  { label: "All Types", value: "all" },
  { label: "API Actions", value: "api_actions" },
  { label: "Product Guidance", value: "product_guidance" },
  { label: "Sales Analytics", value: "sales_analytics" }
];

const userTypes = [
    { label: "All Users", value: "all" },
    { label: "First-time", value: "1" },
    { label: "Returning", value: "3" }
];

export default function FilterBar() {
  const [activeFilters, setActiveFilters] = useState({
    dateRange: "30d",
    requestType: "all",
    userType: "all",
  });

  const updateFilter = (key: string, value: string) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
    console.log(`Filter updated: ${key} = ${value}`);
    // In a real application, you would trigger a data refetch here
    // e.g., fetchData({ ...activeFilters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-6 glass rounded-3xl mb-8 animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="w-4 h-4" />
        Filters:
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-2">
          {dateRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => updateFilter("dateRange", range.value)}
              className={`filter-pill ${activeFilters.dateRange === range.value ? "active" : ""}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request Type */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-2">
          {requestTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => updateFilter("requestType", type.value)}
              className={`filter-pill ${activeFilters.requestType === type.value ? "active" : ""}`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Type */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-2">
          {userTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => updateFilter("userType", type.value)}
              className={`filter-pill ${activeFilters.userType === type.value ? "active" : ""}`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}