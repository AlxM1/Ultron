// API client utilities for connecting to 00raiser services

const CORTEX_URL = process.env.NEXT_PUBLIC_CORTEX_URL || "http://localhost:3011";
const CORTEX_API_KEY = process.env.CORTEX_API_KEY || "";
const AGENTSMITH_URL = process.env.NEXT_PUBLIC_AGENTSMITH_URL || "http://localhost:4000";
const CONTENT_INTEL_URL = process.env.NEXT_PUBLIC_CONTENT_INTEL_URL || "http://localhost:3012";

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

export interface Timeline {
  tasks: Task[];
  total: number;
}

// Cortex API
export async function fetchTasks(params?: {
  service?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Timeline> {
  const query = new URLSearchParams();
  if (params?.service) query.set("service", params.service);
  if (params?.status) query.set("status", params.status);
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());

  const url = `${CORTEX_URL}/api/tasks?${query}`;
  const res = await fetch(url, {
    headers: CORTEX_API_KEY ? { "X-API-Key": CORTEX_API_KEY } : {},
  });
  
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.statusText}`);
  return res.json();
}

export async function fetchTaskById(id: number): Promise<Task> {
  const res = await fetch(`${CORTEX_URL}/api/tasks/${id}`, {
    headers: CORTEX_API_KEY ? { "X-API-Key": CORTEX_API_KEY } : {},
  });
  
  if (!res.ok) throw new Error(`Failed to fetch task: ${res.statusText}`);
  return res.json();
}

export async function fetchServiceStats(): Promise<ServiceStats[]> {
  const res = await fetch(`${CORTEX_URL}/api/tasks/stats`, {
    headers: CORTEX_API_KEY ? { "X-API-Key": CORTEX_API_KEY } : {},
  });
  
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  const data = await res.json();
  return data.services || [];
}

export async function fetchTimeline(limit = 20): Promise<Task[]> {
  const res = await fetch(`${CORTEX_URL}/api/timeline?limit=${limit}`, {
    headers: CORTEX_API_KEY ? { "X-API-Key": CORTEX_API_KEY } : {},
  });
  
  if (!res.ok) throw new Error(`Failed to fetch timeline: ${res.statusText}`);
  const data = await res.json();
  return data.tasks || [];
}

export async function fetchServices(): Promise<ServiceStats[]> {
  const res = await fetch(`${CORTEX_URL}/api/services`, {
    headers: CORTEX_API_KEY ? { "X-API-Key": CORTEX_API_KEY } : {},
  });
  
  if (!res.ok) throw new Error(`Failed to fetch services: ${res.statusText}`);
  return res.json();
}

// AgentSmith API
export interface Workflow {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  nodes: any[];
  edges: any[];
  created_at: string;
  updated_at: string;
}

export interface Execution {
  id: number;
  workflow_id: number;
  status: "pending" | "running" | "success" | "error" | "stopped";
  started_at: string;
  finished_at?: string;
  error?: string;
  workflow?: Workflow;
}

export async function fetchWorkflows(): Promise<Workflow[]> {
  const res = await fetch(`${AGENTSMITH_URL}/api/v1/workflows`);
  if (!res.ok) return []; // Graceful degradation
  return res.json();
}

export async function fetchExecutions(limit = 20): Promise<Execution[]> {
  const res = await fetch(`${AGENTSMITH_URL}/api/v1/executions?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchExecutionById(id: number): Promise<Execution> {
  const res = await fetch(`${AGENTSMITH_URL}/api/v1/executions/${id}`);
  if (!res.ok) throw new Error("Failed to fetch execution");
  return res.json();
}

// Content Intelligence API (mock for now)
export interface Creator {
  id: string;
  name: string;
  platform: string;
  subscribers?: number;
  avg_views?: number;
  last_checked: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  description: string;
  score: number;
  topics: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export async function fetchCreators(): Promise<Creator[]> {
  // Mock data for now
  return [
    {
      id: "1",
      name: "TechLead",
      platform: "YouTube",
      subscribers: 1200000,
      avg_views: 85000,
      last_checked: new Date().toISOString(),
    },
    {
      id: "2",
      name: "Fireship",
      platform: "YouTube",
      subscribers: 3500000,
      avg_views: 650000,
      last_checked: new Date().toISOString(),
    },
  ];
}

export async function fetchContentIdeas(): Promise<ContentIdea[]> {
  // Mock data for now
  return [
    {
      id: "1",
      title: "AI Code Review Tools in 2026",
      description: "Comprehensive review of AI-powered code review tools",
      score: 85,
      topics: ["AI", "Developer Tools", "Code Review"],
      status: "pending",
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      title: "The Future of Edge Computing",
      description: "Exploring edge computing trends and use cases",
      score: 72,
      topics: ["Cloud", "Edge", "Infrastructure"],
      status: "pending",
      created_at: new Date().toISOString(),
    },
  ];
}

export async function updateIdeaStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<void> {
  // Mock implementation
  console.log(`Updated idea ${id} to ${status}`);
}
