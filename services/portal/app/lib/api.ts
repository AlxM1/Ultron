// API client utilities for 00raiser Portal
// Uses server-side API routes that inject API keys securely

const AGENTSMITH_URL = "/api/agentsmith";

export interface Task {
  id: number;
  service_name: string;
  task_type: string;
  status: "pending" | "running" | "completed" | "failed";
  metadata?: any;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  created_at: string;
}

export interface ServiceStats {
  service_name: string;
  total_tasks: number;
  completed: number;
  failed: number;
  success_rate: number;
  avg_duration_ms: number;
  last_activity: string;
}

export interface Timeline { tasks: Task[]; total: number; }

// Cortex via server-side proxy (API key injected server-side)
async function cortexGet(path: string) {
  const res = await fetch(`/api/brain?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`Cortex error: ${res.statusText}`);
  return res.json();
}

export async function fetchTasks(params?: {
  service?: string; status?: string; limit?: number; offset?: number;
}): Promise<Timeline> {
  const query = new URLSearchParams();
  if (params?.service) query.set("service", params.service);
  if (params?.status) query.set("status", params.status);
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());
  return cortexGet(`/api/tasks?${query}`);
}

export async function fetchTaskById(id: number): Promise<Task> {
  return cortexGet(`/api/tasks/${id}`);
}

export async function fetchServiceStats(): Promise<ServiceStats[]> {
  const data = await cortexGet("/api/tasks/stats");
  return data.services || [];
}

export async function fetchTimeline(limit = 20): Promise<Task[]> {
  const data = await cortexGet(`/api/timeline?limit=${limit}`);
  return data.tasks || data.timeline || [];
}

export async function fetchServices(): Promise<ServiceStats[]> {
  const data = await cortexGet("/api/services");
  return Array.isArray(data) ? data : data.services || [];
}

// AgentSmith API (no auth needed for read operations via proxy)
export interface Workflow {
  id: string; name: string; description?: string; active: boolean;
  nodes: any[]; connections: any[]; created_at: string; updated_at: string;
}
export interface Execution {
  id: string; workflowId: string;
  status: "pending" | "running" | "success" | "failed" | "error" | "stopped";
  startedAt: string; finishedAt?: string; error?: string; workflow?: Workflow;
}

export async function fetchWorkflows(): Promise<Workflow[]> {
  const res = await fetch(`${AGENTSMITH_URL}/api/v1/workflows`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.workflows || data || [];
}

export async function fetchExecutions(limit = 20): Promise<Execution[]> {
  const res = await fetch(`${AGENTSMITH_URL}/api/v1/executions?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.executions || data || [];
}

export async function fetchExecutionById(id: string | number): Promise<Execution> {
  const res = await fetch(`${AGENTSMITH_URL}/api/v1/executions/${id}`);
  if (!res.ok) throw new Error("Failed to fetch execution");
  return res.json();
}

// Content Intelligence via server-side proxy (API key injected server-side)
export interface Creator {
  id: string; name: string; platform: string; handle: string;
  subscriber_count?: number; content_count?: number; last_scraped_at?: string;
}
export interface ContentIdea {
  id: string; title: string; description: string; score: number;
  topics: string[]; status: "pending" | "approved" | "rejected"; created_at: string;
}

export async function fetchCreators(): Promise<Creator[]> {
  const res = await fetch("/api/intel?path=/api/creators");
  if (!res.ok) return [];
  const data = await res.json();
  return data.creators || data || [];
}

export async function fetchContentIdeas(): Promise<ContentIdea[]> {
  const res = await fetch("/api/intel?path=/api/ideas");
  if (!res.ok) return [];
  const data = await res.json();
  return data.ideas || data || [];
}

export async function updateIdeaStatus(id: string, status: "approved" | "rejected"): Promise<void> {
  await fetch(`/api/intel?path=/api/ideas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
