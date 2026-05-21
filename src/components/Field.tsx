import React from "react";

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, children }) => {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-ink-700 dark:text-ink-200">
        {label}
      </span>
      {children}
    </label>
  );
};