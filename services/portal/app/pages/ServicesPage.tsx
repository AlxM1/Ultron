"use client";

import { useEffect, useState } from "react";
import { Service } from "../services";
import { fetchServices, ServiceStats } from "../lib/api";
import { Activity, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

interface ServicesPageProps {
  services: Service[];
  healthStatus: Record<string, boolean>;
}

export default function ServicesPage({ services, healthStatus }: ServicesPageProps) {
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchServices();
        setStats(data);
      } catch (error) {
        console.error("Failed to load service stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full overflow-y-auto p-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white/90">Services</h1>
          <p className="text-white/50">Monitor and manage all 00raiser services</p>
        </div>

        {loading ? (
          <div className="text-white/50 text-center py-12">Loading services...</div>
        ) : (
          <div className="space-y-4">
            {services
              .filter((s) => s.id !== "settings")
              .map((service) => {
                const isOnline = healthStatus[service.id];
                const serviceStat = stats.find((s) => s.service_name === service.id);

                return (
                  <div key={service.id} className="glass-heavy rounded-panel p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{service.icon}</div>
                        <div>
                          <h3 className="text-xl font-semibold text-white/90">
                            {service.name}
                          </h3>
                          <p className="text-sm text-white/50">{service.description}</p>
                          {service.port && (
                            <p className="text-xs text-white/30 mt-1">Port: {service.port}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                            isOnline
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isOnline ? "bg-green-500" : "bg-red-500"
                            } animate-pulse`}
                          />
                          {isOnline ? "Online" : "Offline"}
                        </div>
                      </div>
                    </div>

                    {serviceStat && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
                        <StatItem
                          icon={<Activity size={16} />}
                          label="Total Tasks"
                          value={serviceStat.total_tasks.toString()}
                        />
                        <StatItem
                          icon={<CheckCircle2 size={16} />}
                          label="Completed"
                          value={serviceStat.completed.toString()}
                          color="green"
                        />
                        <StatItem
                          icon={<XCircle size={16} />}
                          label="Failed"
                          value={serviceStat.failed.toString()}
                          color="red"
                        />
                        <StatItem
                          icon={<Clock size={16} />}
                          label="Avg Duration"
                          value={`${serviceStat.avg_duration_ms.toFixed(0)}ms`}
                        />
                      </div>
                    )}

                    {serviceStat && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-white/50">
                            Success Rate:{" "}
                            <span className="text-accent font-medium">
                              {serviceStat.success_rate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-xs text-white/30">
                            Last activity:{" "}
                            {serviceStat.last_activity
                              ? new Date(serviceStat.last_activity).toLocaleString()
                              : "Never"}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button className="px-4 py-2 rounded-button bg-white/5 hover:bg-white/10 transition-colors text-sm flex items-center gap-2">
                        <RefreshCw size={14} />
                        Restart
                      </button>
                      <button className="px-4 py-2 rounded-button bg-white/5 hover:bg-white/10 transition-colors text-sm">
                        View Logs
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  color = "white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  const colorClass =
    color === "green"
      ? "text-green-400"
      : color === "red"
      ? "text-red-400"
      : "text-accent";

  return (
    <div>
      <div className="flex items-center gap-2 text-white/50 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}
