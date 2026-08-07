"use client";

import React from "react";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";

export function DashboardShellClient({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <InnerShell sidebar={sidebar}>{children}</InnerShell>
    </SidebarProvider>
  );
}

function InnerShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const { isOpen, close, toggle } = useSidebar();

  return (
    <div className={`dashboard-shell${isOpen ? " sidebar-open" : ""}`}>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggle}
        className="mobile-sidebar-toggle"
        aria-label="Toggle sidebar menu"
      >
        ☰
      </button>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && <div className="sidebar-backdrop" onClick={close} />}

      {sidebar}

      <div className="dashboard-main">{children}</div>
    </div>
  );
}
