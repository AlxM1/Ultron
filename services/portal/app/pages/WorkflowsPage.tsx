"use client";

import { useEffect, useState } from "react";
import {
  fetchWorkflows,
  fetchExecutions,
  fetchExecutionById,
  Workflow,
  Execution,
} from "../lib/api";
import { Workflow as WorkflowIcon, Play, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"workflows" | "executions">("workflows");

  useEffect(() => {
    async function loadData() {
      try {
        const [workflowsData, executionsData] = await Promise.all([
          fetchWorkflows(),
          fetchExecutions(30),
        ]);
        setWorkflows(workflowsData);
        setExecutions(executionsData);
      } catch (error) {
        console.error("Failed to load workflows:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  async function loadExecutionDetail(id: number) {
    try {
      const execution = await fetchExecutionById(id);
      setSelectedExecution(execution);
    } catch (error) {
      console.error("Failed to load execution:", error);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white/90">AgentSmith Workflows</h1>
          <p className="text-white/50">Workflow orchestration and execution monitoring</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("workflows")}
            className={`px-4 py-2 rounded-button transition-all ${
              activeTab === "workflows"
                ? "bg-accent text-black font-medium"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            Workflows
          </button>
          <button
            onClick={() => setActiveTab("executions")}
            className={`px-4 py-2 rounded-button transition-all ${
              activeTab === "executions"
                ? "bg-accent text-black font-medium"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            Executions
          </button>
        </div>

        {loading ? (
          <div className="text-white/50 text-center py-12">Loading...</div>
        ) : activeTab === "workflows" ? (
          // Workflows Tab
          <div className="space-y-4">
            {workflows.length === 0 ? (
              <div className="glass-heavy rounded-panel p-12 text-center">
                <WorkflowIcon className="mx-auto mb-4 text-white/30" size={48} />
                <p className="text-white/50">No workflows found</p>
              </div>
            ) : (
              workflows.map((workflow) => (
                <div key={workflow.id} className="glass-heavy rounded-panel p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white/90 mb-2">
                        {workflow.name}
                      </h3>
                      {workflow.description && (
                        <p className="text-sm text-white/50 mb-3">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <div>ID: {workflow.id}</div>
                        <div>Nodes: {workflow.nodes?.length || 0}</div>
                        <div>Updated: {new Date(workflow.updated_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          workflow.active
                            ? "bg-green-500/20 text-green-400"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {workflow.active ? "Active" : "Inactive"}
                      </div>
                      <button className="p-2 rounded-button bg-accent/20 text-accent hover:bg-accent/30 transition-colors">
                        <Play size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Executions Tab
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {executions.length === 0 ? (
                <div className="glass-heavy rounded-panel p-12 text-center">
                  <Clock className="mx-auto mb-4 text-white/30" size={48} />
                  <p className="text-white/50">No executions found</p>
                </div>
              ) : (
                executions.map((execution) => (
                  <button
                    key={execution.id}
                    onClick={() => loadExecutionDetail(execution.id)}
                    className={`w-full glass-heavy rounded-panel p-4 text-left hover:bg-white/5 transition-all ${
                      selectedExecution?.id === execution.id ? "ring-2 ring-accent" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {execution.status === "success" ? (
                          <CheckCircle2 className="text-green-500" size={20} />
                        ) : execution.status === "error" ? (
                          <XCircle className="text-red-500" size={20} />
                        ) : execution.status === "running" ? (
                          <Play className="text-accent animate-pulse" size={20} />
                        ) : (
                          <Clock className="text-white/30" size={20} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white/90 font-medium mb-1">
                          Execution #{execution.id}
                        </div>
                        {execution.workflow && (
                          <div className="text-sm text-accent mb-1">
                            {execution.workflow.name}
                          </div>
                        )}
                        <div className="text-xs text-white/40">
                          Started: {new Date(execution.started_at).toLocaleString()}
                        </div>
                        {execution.finished_at && (
                          <div className="text-xs text-white/40">
                            Finished: {new Date(execution.finished_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div
                        className={`px-2 py-1 rounded-button text-xs font-medium capitalize ${
                          execution.status === "success"
                            ? "bg-green-500/20 text-green-400"
                            : execution.status === "error"
                            ? "bg-red-500/20 text-red-400"
                            : execution.status === "running"
                            ? "bg-accent/20 text-accent"
                            : "bg-white/5 text-white/50"
                        }`}
                      >
                        {execution.status}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Execution Detail */}
            <div className="lg:col-span-1">
              {selectedExecution ? (
                <div className="glass-heavy rounded-panel p-6 sticky top-6">
                  <h3 className="text-lg font-semibold mb-4 text-white/90">
                    Execution Details
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-white/40 mb-1">Execution ID</div>
                      <div className="text-white/90 font-mono">{selectedExecution.id}</div>
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Workflow</div>
                      <div className="text-accent">
                        {selectedExecution.workflow?.name || `#${selectedExecution.workflow_id}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Status</div>
                      <div
                        className={`inline-block px-2 py-1 rounded-button text-xs font-medium capitalize ${
                          selectedExecution.status === "success"
                            ? "bg-green-500/20 text-green-400"
                            : selectedExecution.status === "error"
                            ? "bg-red-500/20 text-red-400"
                            : selectedExecution.status === "running"
                            ? "bg-accent/20 text-accent"
                            : "bg-white/5 text-white/50"
                        }`}
                      >
                        {selectedExecution.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Started</div>
                      <div className="text-white/90">
                        {new Date(selectedExecution.started_at).toLocaleString()}
                      </div>
                    </div>
                    {selectedExecution.finished_at && (
                      <div>
                        <div className="text-white/40 mb-1">Finished</div>
                        <div className="text-white/90">
                          {new Date(selectedExecution.finished_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedExecution.error && (
                      <div>
                        <div className="text-red-400 mb-1">Error</div>
                        <div className="text-red-300 text-xs font-mono bg-red-500/10 p-2 rounded">
                          {selectedExecution.error}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass-heavy rounded-panel p-12 text-center sticky top-6">
                  <p className="text-white/50">Select an execution to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
