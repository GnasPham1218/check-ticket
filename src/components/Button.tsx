import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "tab" | "danger" | "secondary";
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  active,
  className,
  ...props
}) => {
  if (variant === "primary") {
    return (
      <button
        className={`w-full rounded-2xl bg-gradient-to-r from-brand-600 to-blue-600 px-5 py-4 font-black text-white shadow-glow transition duration-300 ease-smooth hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-ink-300 disabled:to-ink-400 disabled:shadow-none dark:disabled:from-ink-700 dark:disabled:to-ink-700 ${className || ""}`}
        {...props}
      >
        {children}
      </button>
    );
  }

  if (variant === "tab") {
    return (
      <button
        className={`rounded-3xl px-4 py-4 font-black transition ${
          active
            ? "bg-brand-600 text-white shadow-glow"
            : "bg-ink-50 text-ink-700 hover:bg-ink-100 dark:bg-white/5 dark:text-ink-200 dark:hover:bg-white/10"
        } ${className || ""}`}
        {...props}
      >
        {children}
      </button>
    );
  }

  // Khối nút Danger/Secondary hủy bỏ hành động
  return (
    <button
      className={`rounded-2xl px-4 py-2 font-black transition ${
        variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-white"
      } ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  );
};