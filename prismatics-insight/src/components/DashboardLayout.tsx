import { BarChart3, Users, TrendingUp, Globe, Clock, Zap, Settings, Home, Activity } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import FilterBar from "./FilterBar";

const sidebarItems = [
  { title: "Overview", url: "/", icon: Home },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Users", url: "/users", icon: Users },
  { title: "Performance", url: "/performance", icon: TrendingUp },
  { title: "Geographic", url: "/geographic", icon: Globe },
  { title: "Real-time", url: "/realtime", icon: Activity },
  { title: "Token Usage", url: "/tokens", icon: Zap },
  { title: "Response Times", url: "/times", icon: Clock },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className="w-72 glass border-r border-white/10">
      <SidebarContent className="bg-transparent">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Analytics Pro
              </h1>
              <p className="text-xs text-muted-foreground">Premium Dashboard</p>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-6 pb-3">
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title} className="px-3">
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300
                        ${isActive(item.url) 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <FilterBar />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}