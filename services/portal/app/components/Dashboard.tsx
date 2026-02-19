"use client";

import { useEffect, useState } from "react";
import { Service } from "../services";
import { fetchServiceStats, fetchTimeline, ServiceStats, Task } from "../lib/api";
import { Activity, CheckCircle2, XCircle, Clock } from "lucide-react";

type PageView = "home" | "services" | "content-intel" | "timeline" | "workflows";

interface DashboardProps {
  services: Service[];
  healthStatus: Record<string, boolean>;
  onSelect: (id: string) => void;
  onNavigate: (page: PageView) => void;
  bootComplete: boolean;
}

export default function Dashboard({
  services,
  healthStatus,
  onSelect,
  onNavigate,
  bootComplete,
}: DashboardProps) {
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [timeline, setTimeline] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, timelineData] = await Promise.all([
          fetchServiceStats(),
          fetchTimeline(10),
        ]);
        setStats(statsData);
        setTimeline(timelineData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (bootComplete) {
      loadData();
      const interval = setInterval(loadData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [bootComplete]);

  const totalTasks = stats.reduce((sum, s) => sum + s.total_tasks, 0);
  const completedToday = stats.reduce((sum, s) => sum + s.completed, 0);
  const failedToday = stats.reduce((sum, s) => sum + s.failed, 0);
  const activeServices = Object.values(healthStatus).filter(Boolean).length;

  return (
    <div className="h-full overflow-y-auto p-8 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-accent-deep bg-clip-text text-transparent mb-2">
            00raiser Portal
          </h1>
          <p className="text-white/50">System Overview & Control Center</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Activity className="text-accent" />}
            label="Active Services"
            value={`${activeServices}/${services.length - 1}`} // -1 for settings
            color="accent"
          />
          <StatCard
            icon={<CheckCircle2 className="text-green-500" />}
            label="Completed Today"
            value={completedToday.toString()}
            color="green"
          />
          <StatCard
            icon={<XCircle className="text-red-500" />}
            label="Failed Today"
            value={failedToday.toString()}
            color="red"
          />
          <StatCard
            icon={<Clock className="text-accent" />}
            label="Total Tasks"
            value={totalTasks.toString()}
            color="accent"
          />
        </div>

        {/* Services Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services
              .filter((s) => s.id !== "settings")
              .map((service) => {
                const isOnline = healthStatus[service.id];
                const serviceStat = stats.find((s) => s.service_name === service.id);

                return (
                  <button
                    key={service.id}
                    onClick={() => onSelect(service.id)}
                    className="glass-heavy rounded-panel p-6 text-left hover:bg-accent/5 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">{service.icon}</div>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isOnline ? "bg-green-500" : "bg-red-500/50"
                        } animate-pulse`}
                      />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white/90 group-hover:text-accent transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-sm text-white/50 mb-4">{service.description}</p>
                    {serviceStat && (
                      <div className="text-xs text-white/40 space-y-1">
                        <div>Tasks: {serviceStat.total_tasks}</div>
                        <div>Success: {serviceStat.success_rate.toFixed(1)}%</div>
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Quick Access */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => onNavigate("services")}
              className="glass-heavy rounded-panel p-6 text-left hover:bg-accent/5 transition-all group"
            >
              <div className="text-3xl mb-3">🔧</div>
              <h3 className="text-lg font-semibold text-white/90 group-hover:text-accent transition-colors">
                All Services
              </h3>
              <p className="text-sm text-white/50">Monitor & manage services</p>
            </button>
            <button
              onClick={() => onNavigate("timeline")}
              className="glass-heavy rounded-panel p-6 text-left hover:bg-accent/5 transition-all group"
            >
              <div className="text-3xl mb-3">📈</div>
              <h3 className="text-lg font-semibold text-white/90 group-hover:text-accent transition-colors">
                Activity Timeline
              </h3>
              <p className="text-sm text-white/50">Real-time task monitoring</p>
            </button>
            <button
              onClick={() => onNavigate("workflows")}
              className="glass-heavy rounded-panel p-6 text-left hover:bg-accent/5 transition-all group"
            >
              <div className="text-3xl mb-3">⚙️</div>
              <h3 className="text-lg font-semibold text-white/90 group-hover:text-accent transition-colors">
                Workflows
              </h3>
              <p className="text-sm text-white/50">AgentSmith orchestration</p>
            </button>
            <button
              onClick={() => onNavigate("content-intel")}
              className="glass-heavy rounded-panel p-6 text-left hover:bg-accent/5 transition-all group"
            >
              <div className="text-3xl mb-3">🧠</div>
              <h3 className="text-lg font-semibold text-white/90 group-hover:text-accent transition-colors">
                Content Intel
              </h3>
              <p className="text-sm text-white/50">Creators & ideas</p>
            </button>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white/90">Recent Activity</h2>
            <button
              onClick={() => onNavigate("timeline")}
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="glass-heavy rounded-panel p-6">
            {loading ? (
              <div className="text-white/50 text-center py-8">Loading...</div>
            ) : timeline.length === 0 ? (
              <div className="text-white/50 text-center py-8">No recent activity</div>
            ) : (
              <div className="space-y-3">
                {timeline.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        task.status === "completed"
                          ? "bg-green-500"
                          : task.status === "failed"
                          ? "bg-red-500"
                          : task.status === "running"
                          ? "bg-accent animate-pulse"
                          : "bg-white/30"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/90 truncate">
                        <span className="text-accent">{task.service_name}</span> • {task.task_type}
                      </div>
                      <div className="text-xs text-white/40">
                        {new Date(task.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-white/40 capitalize">{task.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass-heavy rounded-panel p-6">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <div className="text-sm text-white/50">{label}</div>
      </div>
      <div className="text-3xl font-bold text-white/90">{value}</div>
    </div>
  );
}
