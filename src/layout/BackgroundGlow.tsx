import React from "react";

export const BackgroundGlow: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 -z-10">
    <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-600/20" />
    <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl dark:bg-indigo-600/20" />
  </div>
);