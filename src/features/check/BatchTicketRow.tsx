import React from "react";
import { inputClass } from "../../components/Input";
import { PROVINCES } from "../../config/constants";
import { Ticket } from "../../types/domain";
import { CalendarDatePicker } from "./CalendarDatePicker";

type ScanStatus = "idle" | "manual" | "scanning" | "success" | "partial" | "error";

interface BatchTicketRowProps {
  index: number;
  row: Ticket & {
    id: string;
    imagePreview?: string;
    scanStatus?: ScanStatus;
    scanMessage?: string;
  };
  onChange: (id: string, field: keyof Ticket, value: string) => void;
  onRemove: (id: string) => void;
}

function statusClass(status?: ScanStatus) {
  if (status === "scanning") return "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200";
  if (status === "success") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200";
  if (status === "partial") return "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200";
  if (status === "error") return "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200";
  return "bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-ink-300";
}

function statusLabel(status?: ScanStatus) {
  if (status === "scanning") return "Đang scan";
  if (status === "success") return "Đã đọc";
  if (status === "partial") return "Thiếu tin";
  if (status === "error") return "Lỗi scan";
  return "Thủ công";
}

export const BatchTicketRow: React.FC<BatchTicketRowProps> = ({
  index,
  row,
  onChange,
  onRemove,
}) => {
  const datalistId = `batch-province-options-${row.id}`;

  return (
    <article className="rounded-3xl border border-ink-200 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {row.imagePreview ? (
          <img
            alt={`Vé ${index + 1}`}
            className="h-28 w-full rounded-2xl border border-ink-100 object-cover dark:border-white/10 lg:w-32"
            src={row.imagePreview}
          />
        ) : (
          <div className="grid h-20 w-full place-items-center rounded-2xl border border-dashed border-ink-200 bg-ink-50 text-sm font-black text-ink-400 dark:border-white/10 dark:bg-white/5 lg:h-28 lg:w-32">
            #{index + 1}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wide text-ink-500 dark:text-ink-300">
                Vé {index + 1}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(row.scanStatus)}`}>
                {statusLabel(row.scanStatus)}
              </span>
            </div>
            <button
              className="rounded-2xl bg-ink-100 px-3 py-2 text-sm font-black text-ink-700 transition hover:bg-red-50 hover:text-red-700 dark:bg-white/10 dark:text-white dark:hover:bg-red-400/10 dark:hover:text-red-200"
              onClick={() => onRemove(row.id)}
              type="button"
            >
              Xóa
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_0.9fr_0.9fr]">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-ink-500 dark:text-ink-300">
                Tỉnh / đài
              </span>
              <input
                className={inputClass}
                list={datalistId}
                onChange={(event) => onChange(row.id, "province", event.target.value)}
                placeholder="VD: TP. HCM"
                value={row.province || ""}
              />
              <datalist id={datalistId}>
                {PROVINCES.map((province) => (
                  <option key={province} value={province} />
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-ink-500 dark:text-ink-300">
                Ngày xổ
              </span>
              <CalendarDatePicker
                onChange={(value) => onChange(row.id, "drawDate", value)}
                value={row.drawDate || ""}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-ink-500 dark:text-ink-300">
                Số vé
              </span>
              <input
                className={inputClass}
                inputMode="numeric"
                maxLength={6}
                onChange={(event) =>
                  onChange(row.id, "ticketNumber", event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="456789"
                value={row.ticketNumber || ""}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-ink-500 dark:text-ink-300">
                Seri
              </span>
              <input
                className={inputClass}
                onChange={(event) => onChange(row.id, "series", event.target.value)}
                placeholder="Tùy chọn"
                value={row.series || ""}
              />
            </label>
          </div>

          {row.scanMessage && (
            <p className={`rounded-2xl px-4 py-3 text-sm font-bold ${statusClass(row.scanStatus)}`}>
              {row.scanMessage}
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

export default BatchTicketRow;
