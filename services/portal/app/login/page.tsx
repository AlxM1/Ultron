"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col items-center gap-8 p-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl w-full max-w-sm">
        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl font-bold tracking-tight text-white">
            00raiser
          </div>
          <div className="text-xs text-gray-400 tracking-widest uppercase">
            Portal
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/10" />

        {/* Sign in section */}
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-gray-400 text-sm text-center">
            Sign in to access the platform
          </p>
          <button
            onClick={() => signIn("authentik", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-black"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Sign in with Authentik
          </button>
        </div>
      </div>
    </div>
  );
}
