"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SimpleLoader from "@/app/Components/SimpleLoader";

/**
 * Window-isolated authentication guard layout for Policyholder portal.
 * Ensures that if a logged-in URL is copied and opened in a new window or tab,
 * the new window does not share the session and immediately redirects to /Login.
 */
export default function PolicyHolderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userStr = sessionStorage.getItem("logged_in_user");

    // 1. If no session exists in this window, block rendering and redirect to login
    if (!userStr) {
      setIsAuthenticated(false);
      const redirectParam = pathname ? `&redirect=${encodeURIComponent(pathname)}` : "";
      window.location.href = `/Login?message=${encodeURIComponent("Please log in to access this window.")}${redirectParam}`;
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (!user || (!user.nic && !user._id)) {
        setIsAuthenticated(false);
        sessionStorage.removeItem("logged_in_user");
        sessionStorage.removeItem("policyholder_window_id");
        window.location.href = `/Login?message=${encodeURIComponent("Invalid session. Please log in again.")}`;
        return;
      }

      // 2. Window isolation verification:
      // Ensure that duplicate tabs or cloned windows also require independent login
      const storedWindowId = sessionStorage.getItem("policyholder_window_id");
      if (!storedWindowId) {
        // Initialize window ID for existing active session in this window
        const winId = window.name && window.name.startsWith("ph_win_")
          ? window.name
          : "ph_win_" + Date.now() + "_" + Math.random().toString(36).slice(2);
        window.name = winId;
        sessionStorage.setItem("policyholder_window_id", winId);
      } else {
        // Verify window.name matches this window's session ID
        if (!window.name || window.name !== storedWindowId) {
          // This window is a cloned or detached window; require a fresh login
          sessionStorage.removeItem("logged_in_user");
          sessionStorage.removeItem("policyholder_window_id");
          setIsAuthenticated(false);
          const redirectParam = pathname ? `&redirect=${encodeURIComponent(pathname)}` : "";
          window.location.href = `/Login?message=${encodeURIComponent("New window detected. Please log in to continue.")}${redirectParam}`;
          return;
        }
      }

      setIsAuthenticated(true);
    } catch (e) {
      setIsAuthenticated(false);
      sessionStorage.removeItem("logged_in_user");
      sessionStorage.removeItem("policyholder_window_id");
      window.location.href = "/Login";
    }
  }, [pathname]);

  // While verifying authentication, render a clean loader instead of leaking content
  if (isAuthenticated !== true) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 select-none">
        <SimpleLoader
          message="Verifying session security..."
          subMessage="Connecting to your isolated window session"
          theme="slate"
          size="lg"
          className="min-h-[220px]"
        />
      </div>
    );
  }

  return <>{children}</>;
}
