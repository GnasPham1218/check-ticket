import React from "react";

interface StatusProps {
  tone: "info" | "error";
  children: React.ReactNode;
}

export const Status: React.FC<StatusProps> = ({ tone, children }) => {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
      : "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-200";
  return (
    <p className={`rounded-3xl border px-5 py-4 font-bold ${className}`}>
      {children}
    </p>
  );
};

export const LoadingLabel: React.FC<{ text: string }> = ({ text }) => (
  <span className="inline-flex items-center justify-center gap-2">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
    {text}
  </span>
);