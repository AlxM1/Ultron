"use client";

import { useState } from "react";
import { Service } from "../services";

// Services that block iframes (X-Frame-Options / CSP)
const OPEN_IN_TAB: Set<string> = new Set([
  "innotion",     // X-Frame-Options: SAMEORIGIN
  "authentik",    // HTTPS + redirects
]);

interface AppFrameProps {
  service: Service;
}

export default function AppFrame({ service }: AppFrameProps) {
  const [iframeError, setIframeError] = useState(false);

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

  if (OPEN_IN_TAB.has(service.id) || service.openInTab || iframeError) {
    return (
      <div className="h-full flex items-center justify-center bg-black/20">
        <div className="text-white/80 text-center">
          <div className="text-6xl mb-4">{service.icon}</div>
          <div className="text-xl font-semibold mb-2">{service.name}</div>
          <div className="text-sm text-white/50 mb-4">Opens in a new tab</div>
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors inline-block"
          >
            Open {service.name} ↗
          </a>
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
      onError={() => setIframeError(true)}
    />
  );
}
