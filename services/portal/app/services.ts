export interface Service {
  id: string;
  name: string;
  icon: string;
  url?: string;
  healthUrl?: string;
  description: string;
  port?: number;
}

export const services: Service[] = [
  {
    id: "cortex",
    name: "Cortex",
    icon: "🧠",
    url: "http://localhost:3011",
    healthUrl: "http://localhost:3011/health",
    description: "Activity tracking & monitoring",
    port: 3011,
  },
  {
    id: "agentsmith",
    name: "AgentSmith",
    icon: "🤖",
    url: "http://localhost:4000",
    healthUrl: "http://localhost:4000/api/v1/health",
    description: "Workflow orchestration platform",
    port: 4000,
  },
  {
    id: "content-intel",
    name: "Content Intel",
    icon: "📊",
    url: "http://localhost:3012",
    healthUrl: "http://localhost:3012/health",
    description: "Content intelligence & tracking",
    port: 3012,
  },
  {
    id: "voiceforge",
    name: "VoiceForge",
    icon: "🎙️",
    url: "http://localhost:3004",
    healthUrl: "http://localhost:3004/health",
    description: "Voice synthesis & audio processing",
    port: 3004,
  },
  {
    id: "whisperflow",
    name: "WhisperFlow",
    icon: "🎧",
    url: "http://localhost:3003",
    healthUrl: "http://localhost:3003/health",
    description: "Speech-to-text transcription",
    port: 3003,
  },
  {
    id: "krya",
    name: "Krya",
    icon: "📝",
    url: "http://localhost:3005",
    healthUrl: "http://localhost:3005/health",
    description: "Task automation & scheduling",
    port: 3005,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    icon: "📬",
    url: "http://localhost:3006",
    healthUrl: "http://localhost:3006/health",
    description: "Newsletter generation & distribution",
    port: 3006,
  },
  {
    id: "settings",
    name: "Settings",
    icon: "⚙️",
    description: "Portal configuration",
  },
];
