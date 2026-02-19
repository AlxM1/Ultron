"use client";

import { Service } from "../services";

interface AppFrameProps {
  service: Service;
}

export default function AppFrame({ service }: AppFrameProps) {
  if (!service.url) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white/50 text-center">
          <div className="text-6xl mb-4">{service.icon}</div>
          <div className="text-xl font-semibold mb-2">{service.name}</div>
          <div className="text-sm">No URL configured</div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={service.url}
      className="w-full h-full border-0"
      title={service.name}
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
    />
  );
}
