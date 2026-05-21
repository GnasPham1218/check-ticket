import React from "react";

interface StatCardProps {
  label: string;
  value: string;
  tone?: "blue" | "green" | "red" | "amber";
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, tone = "blue" }) => {
  const toneClass =
    tone === "green"
      ? "from-emerald-50 to-green-100 text-emerald-700 dark:from-emerald-400/15 dark:to-green-400/5 dark:text-emerald-200"
      : tone === "red"
      ? "from-red-50 to-rose-100 text-red-700 dark:from-red-400/15 dark:to-rose-400/5 dark:text-red-200"
      : tone === "amber"
      ? "from-amber-50 to-orange-100 text-amber-700 dark:from-amber-400/15 dark:to-orange-400/5 dark:text-amber-200"
      : "from-sky-50 to-blue-100 text-blue-700 dark:from-sky-400/15 dark:to-blue-400/5 dark:text-blue-200";

  return (
    <div className={`rounded-3xl bg-gradient-to-br p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-3 text-2xl font-black text-ink-950 dark:text-white">{value}</p>
    </div>
  );
};