"use client";

import { Service } from "../services";

interface DockProps {
  services: Service[];
  activeApp: string | null;
  onSelect: (id: string) => void;
  healthStatus: Record<string, boolean>;
}

export default function Dock({ services, activeApp, onSelect, healthStatus }: DockProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-heavy rounded-dock px-3 py-2 flex items-center gap-2">
        {services.map((service) => {
          const isActive = activeApp === service.id;
          const isOnline = healthStatus[service.id];

          return (
            <button
              key={service.id}
              onClick={() => onSelect(service.id)}
              className={`relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110 ${
                isActive
                  ? "bg-accent/20 shadow-lg shadow-accent/50"
                  : "hover:bg-white/5"
              }`}
              title={service.name}
            >
              {service.icon}
              {service.id !== "settings" && (
                <div
                  className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-red-500/50"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
