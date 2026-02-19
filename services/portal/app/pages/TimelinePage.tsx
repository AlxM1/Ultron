"use client";

import { useEffect, useState } from "react";
import { fetchTasks, Task } from "../lib/api";
import { Activity, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

export default function TimelinePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterService, setFilterService] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    async function loadTasks() {
      try {
        const params: any = { limit: 50 };
        if (filterService !== "all") params.service = filterService;
        if (filterStatus !== "all") params.status = filterStatus;

        const data = await fetchTasks(params);
        setTasks(data.tasks);
      } catch (error) {
        console.error("Failed to load tasks:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
    const interval = setInterval(loadTasks, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [filterService, filterStatus]);

  const services = Array.from(new Set(tasks.map((t) => t.service_name)));

  return (
    <div className="h-full overflow-y-auto p-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white/90">Activity Timeline</h1>
          <p className="text-white/50">Real-time task execution monitoring from Cortex</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-4 py-2 rounded-button bg-white/5 border border-white/10 text-white/90"
          >
            <option value="all">All Services</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-button bg-white/5 border border-white/10 text-white/90"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {loading ? (
          <div className="text-white/50 text-center py-12">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="glass-heavy rounded-panel p-12 text-center">
            <Activity className="mx-auto mb-4 text-white/30" size={48} />
            <p className="text-white/50">No tasks found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task List */}
            <div className="lg:col-span-2 space-y-3">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`w-full glass-heavy rounded-panel p-4 text-left hover:bg-white/5 transition-all ${
                    selectedTask?.id === task.id ? "ring-2 ring-accent" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {task.status === "completed" ? (
                        <CheckCircle2 className="text-green-500" size={20} />
                      ) : task.status === "failed" ? (
                        <XCircle className="text-red-500" size={20} />
                      ) : task.status === "running" ? (
                        <Activity className="text-accent animate-pulse" size={20} />
                      ) : (
                        <Clock className="text-white/30" size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-accent font-medium">{task.service_name}</span>
                        <span className="text-white/30">•</span>
                        <span className="text-white/70 text-sm truncate">{task.task_type}</span>
                      </div>
                      <div className="text-xs text-white/40">
                        {new Date(task.created_at).toLocaleString()}
                      </div>
                      {task.duration_ms && (
                        <div className="text-xs text-white/40 mt-1">
                          Duration: {task.duration_ms}ms
                        </div>
                      )}
                    </div>
                    <div
                      className={`px-2 py-1 rounded-button text-xs font-medium capitalize ${
                        task.status === "completed"
                          ? "bg-green-500/20 text-green-400"
                          : task.status === "failed"
                          ? "bg-red-500/20 text-red-400"
                          : task.status === "running"
                          ? "bg-accent/20 text-accent"
                          : "bg-white/5 text-white/50"
                      }`}
                    >
                      {task.status}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Task Detail Panel */}
            <div className="lg:col-span-1">
              {selectedTask ? (
                <div className="glass-heavy rounded-panel p-6 sticky top-6">
                  <h3 className="text-lg font-semibold mb-4 text-white/90">Task Details</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-white/40 mb-1">ID</div>
                      <div className="text-white/90 font-mono">{selectedTask.id}</div>
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Service</div>
                      <div className="text-accent">{selectedTask.service_name}</div>
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Task Type</div>
                      <div className="text-white/90">{selectedTask.task_type}</div>
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Status</div>
                      <div
                        className={`inline-block px-2 py-1 rounded-button text-xs font-medium capitalize ${
                          selectedTask.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : selectedTask.status === "failed"
                            ? "bg-red-500/20 text-red-400"
                            : selectedTask.status === "running"
                            ? "bg-accent/20 text-accent"
                            : "bg-white/5 text-white/50"
                        }`}
                      >
                        {selectedTask.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Started</div>
                      <div className="text-white/90">
                        {new Date(selectedTask.started_at).toLocaleString()}
                      </div>
                    </div>
                    {selectedTask.completed_at && (
                      <div>
                        <div className="text-white/40 mb-1">Completed</div>
                        <div className="text-white/90">
                          {new Date(selectedTask.completed_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedTask.duration_ms && (
                      <div>
                        <div className="text-white/40 mb-1">Duration</div>
                        <div className="text-white/90">{selectedTask.duration_ms}ms</div>
                      </div>
                    )}
                    {selectedTask.error_message && (
                      <div>
                        <div className="text-red-400 mb-1 flex items-center gap-1">
                          <AlertCircle size={14} />
                          Error
                        </div>
                        <div className="text-red-300 text-xs font-mono bg-red-500/10 p-2 rounded">
                          {selectedTask.error_message}
                        </div>
                      </div>
                    )}
                    {selectedTask.metadata && Object.keys(selectedTask.metadata).length > 0 && (
                      <div>
                        <div className="text-white/40 mb-1">Metadata</div>
                        <pre className="text-xs bg-white/5 p-2 rounded overflow-x-auto">
                          {JSON.stringify(selectedTask.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass-heavy rounded-panel p-12 text-center sticky top-6">
                  <p className="text-white/50">Select a task to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
