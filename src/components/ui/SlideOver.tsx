"use client";

import { useEffect } from "react";

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SlideOver({ isOpen, onClose, title, children, footer }: SlideOverProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="slideover-overlay" onClick={onClose} />
      <div className="slideover" role="dialog" aria-modal="true">
        <div className="slideover-header">
          <span className="font-semibold" style={{ fontSize: "0.9375rem" }}>
            {title}
          </span>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Close panel"
            style={{ padding: "0.25rem 0.375rem" }}
          >
            ✕
          </button>
        </div>
        <div className="slideover-body">{children}</div>
        {footer && <div className="slideover-footer">{footer}</div>}
      </div>
    </>
  );
}
