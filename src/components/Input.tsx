import React from "react";

export const inputClass =
  "w-full rounded-2xl border border-ink-200 bg-white/90 px-4 py-3 text-ink-950 outline-none transition duration-300 ease-smooth placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-ink-500";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return <input className={`${inputClass} ${className || ""}`} {...props} />;
};
