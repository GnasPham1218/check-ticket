import React, { useRef } from "react";
import { inputClass } from "../../components/Input";
import { formatDate } from "../../utils/format";

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
}

export const CalendarDatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openCalendar = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openCalendar}
        className={`${inputClass} flex items-center justify-between gap-3 text-left hover:border-brand-500 hover:bg-brand-50/60 dark:hover:bg-white/15`}
      >
        <span className={value ? "text-ink-950 dark:text-white" : "text-ink-400 dark:text-ink-500"}>
          {formatDate(value) || "Chọn ngày xổ"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.preventDefault()}
        className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
        tabIndex={-1}
      />
    </div>
  );
};