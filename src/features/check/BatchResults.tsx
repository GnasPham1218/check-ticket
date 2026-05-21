import React from "react";
import type { TicketCheckResult } from "../../types/domain";
import { formatDate } from "../../utils/format";

interface BatchResultItem extends Partial<TicketCheckResult> {
  ok?: boolean;
  error?: string;
}

export const BatchResults: React.FC<{ results: BatchResultItem[] }> = ({
  results,
}) => {
  const winners = results.filter((result) => result.ok !== false && result.isWinner).length;
  const failed = results.filter((result) => result.ok === false).length;

  return (
    <section className="rounded-3xl border border-ink-200 bg-ink-50/80 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Kết quả dò nhiều vé
          </p>
          <h3 className="mt-1 text-2xl font-black">
            {winners > 0 ? `${winners} vé có giải` : "Chưa có vé trúng"}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-2xl bg-white px-3 py-2 dark:bg-white/10">
            <p className="font-black">{results.length}</p>
            <p className="font-bold text-ink-500 dark:text-ink-300">Tổng</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
            <p className="font-black">{winners}</p>
            <p className="font-bold">Trúng</p>
          </div>
          <div className="rounded-2xl bg-red-50 px-3 py-2 text-red-700 dark:bg-red-400/15 dark:text-red-200">
            <p className="font-black">{failed}</p>
            <p className="font-bold">Lỗi</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {results.map((result, index) => {
          const ticket = result.ticket;
          const matched = result.matchedPrizes || [];
          const hasError = result.ok === false;

          return (
            <article
              key={`${ticket?.ticketNumber || "ticket"}-${index}`}
              className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-black text-ink-950 dark:text-white">
                      {ticket?.ticketNumber || "------"}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        hasError
                          ? "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200"
                          : result.isWinner
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200"
                      }`}
                    >
                      {hasError ? "Lỗi" : result.isWinner ? "Có giải" : "Không trúng"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-ink-500 dark:text-ink-300">
                    {ticket?.province || "Chưa rõ đài"} - {formatDate(ticket?.drawDate)}
                    {ticket?.series ? ` - seri ${ticket.series}` : ""}
                  </p>
                </div>
              </div>

              {hasError ? (
                <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-400/10 dark:text-red-200">
                  {result.error || "Không dò được vé này."}
                </p>
              ) : matched.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {matched.map((prize) => (
                    <div
                      key={`${ticket?.ticketNumber}-${prize.prize}`}
                      className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-400/10"
                    >
                      <span className="font-black text-emerald-700 dark:text-emerald-200">
                        {prize.prize}
                      </span>
                      <span className="ml-2 font-bold text-ink-700 dark:text-ink-200">
                        {(prize.numbers || [prize.number]).filter(Boolean).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm font-bold text-ink-500 dark:text-ink-300">
                  Vé này chưa khớp giải nào trong dữ liệu hiện có.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default BatchResults;
