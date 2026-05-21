import React from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, subtitle, children }) => {
  return (
    <section className="rounded-4xl border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-soft-dark">
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      {subtitle && (
        <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-400">
          {subtitle}
        </p>
      )}
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
};