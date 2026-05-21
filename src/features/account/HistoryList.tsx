import React, { useMemo, useState } from "react";
import { deleteHistoryItems } from "../../services/apiClient";
import { formatDate, formatMoney } from "../../utils/format";

interface HistoryRecord {
  id: string;
  checkedAt: string;
  ticketCost: number;
  winningAmount: number;
  ticket: {
    province: string;
    drawDate: string;
    ticketNumber: string;
    series?: string;
  };
  isWinner: boolean;
  matchedPrizes: Array<{ prize: string; number?: string; numbers?: string[] }>;
}

interface HistoryListProps {
  items: HistoryRecord[];
  userId: string;
  onChanged: () => void;
  historyFrom: string;
  historyTo: string;
  historyLimit: string;
  onChangeHistoryFrom: (value: string) => void;
  onChangeHistoryTo: (value: string) => void;
  onChangeHistoryLimit: (value: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items = [],
  userId,
  onChanged,
  historyFrom,
  historyTo,
  historyLimit,
  onChangeHistoryFrom,
  onChangeHistoryTo,
  onChangeHistoryLimit,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const visibleIds = useMemo(() => items.map((item) => item.id), [items]);
  const selectedVisibleIds = selectedIds.filter((id) =>
    visibleIds.includes(id),
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const winnerCount = useMemo(
    () => items.filter((item) => item.isWinner).length,
    [items],
  );

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function removeSelected(ids: string[]) {
    if (!ids.length) return;
    if (!confirm(`Xóa ${ids.length} vé đã chọn?`)) return;

    setDeleting(true);
    setError("");
    try {
      await deleteHistoryItems(userId, ids);
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được lịch sử.");
    } finally {
      setDeleting(false);
    }
  }

  function resetFilter() {
    onChangeHistoryFrom("");
    onChangeHistoryTo("");
    onChangeHistoryLimit("20");
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="border-b border-ink-100 px-4 py-4 dark:border-white/10 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-[1fr_1fr_0.8fr_auto_auto] xl:min-w-full">
            <HistoryFilterField label="Từ ngày dò">
              <input
                className={historyInputClass}
                onChange={(event) => onChangeHistoryFrom(event.target.value)}
                type="date"
                value={historyFrom}
              />
            </HistoryFilterField>

            <HistoryFilterField label="Đến ngày dò">
              <input
                className={historyInputClass}
                onChange={(event) => onChangeHistoryTo(event.target.value)}
                type="date"
                value={historyTo}
              />
            </HistoryFilterField>

            <HistoryFilterField label="Số lượng">
              <select
                className={historyInputClass}
                onChange={(event) => onChangeHistoryLimit(event.target.value)}
                value={historyLimit}
              >
                {[10, 20, 50, 100, 200].map((value) => (
                  <option key={value} value={value}>
                    {value} vé
                  </option>
                ))}
              </select>
            </HistoryFilterField>

            <button
              className="rounded-2xl bg-ink-100 px-4 py-3 text-sm font-black text-ink-700 transition hover:bg-ink-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 lg:self-end"
              onClick={resetFilter}
              type="button"
            >
              Đặt lại
            </button>

            <button
              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:bg-ink-300 dark:disabled:bg-ink-700 lg:self-end"
              disabled={!selectedVisibleIds.length || deleting}
              onClick={() => removeSelected(selectedVisibleIds)}
              type="button"
            >
              {deleting ? "Đang xóa..." : `Xóa (${selectedVisibleIds.length})`}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="px-4 pt-4 sm:px-5">
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-400/10 dark:text-red-200">
            {error}
          </p>
        </div>
      ) : null}

      <div className="px-3 py-3 sm:px-5 sm:py-4">
        <div className="mb-3 flex flex-col gap-3 rounded-2xl bg-ink-50 px-3 py-3 dark:bg-ink-950/50 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-black text-ink-700 dark:text-ink-200">
            <input
              checked={allVisibleSelected}
              className="h-5 w-5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              disabled={!items.length}
              onChange={toggleAllVisible}
              type="checkbox"
            />
            Chọn tất cả
          </label>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-ink-500 dark:text-ink-400">
            <span>
              Hiển thị{" "}
              <b className="text-ink-800 dark:text-white">{items.length}</b> vé
            </span>
            <span>
              Trúng{" "}
              <b className="text-emerald-600 dark:text-emerald-300">
                {winnerCount}
              </b>{" "}
              vé
            </span>
            {selectedVisibleIds.length ? (
              <span>Đã chọn {selectedVisibleIds.length}</span>
            ) : null}
          </div>
        </div>

        <div className="hidden border-b border-ink-100 px-3 pb-2 text-xs font-black uppercase tracking-wide text-ink-400 dark:border-white/10 dark:text-ink-500 md:grid md:grid-cols-[2rem_1.4fr_1fr_1fr_auto] md:gap-4">
          <span />
          <span>Vé</span>
          <span>Thông tin</span>
          <span>Kết quả</span>
          <span className="text-right">Thao tác</span>
        </div>

        <div className="max-h-[34rem] overflow-auto">
          {items.length ? (
            <div className="divide-y divide-ink-100 dark:divide-white/10">
              {items.map((item) => (
                <HistoryTransactionItem
                  checked={selectedIds.includes(item.id)}
                  item={item}
                  key={item.id}
                  onDelete={() => removeSelected([item.id])}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </section>
  );
};

function HistoryFilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-ink-500 dark:text-ink-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function HistoryTransactionItem({
  item,
  checked,
  onToggle,
  onDelete,
}: {
  item: HistoryRecord;
  checked: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const checkedAt = item.checkedAt
    ? new Date(item.checkedAt).toLocaleString("vi-VN")
    : "-";

  const prizeText = getMatchedPrizeText(item);

  return (
    <article
      className={`group px-1 py-3 transition hover:bg-ink-50/80 dark:hover:bg-white/5 sm:px-3 ${
        checked ? "bg-brand-50/70 dark:bg-brand-500/10" : ""
      }`}
    >
      <div className="grid grid-cols-[auto_1fr] gap-3 md:grid-cols-[2rem_1.4fr_1fr_1fr_auto] md:items-center md:gap-4">
        <div className="pt-1 md:pt-0">
          <input
            checked={checked}
            className="h-5 w-5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            onChange={onToggle}
            type="checkbox"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3 md:block">
            <div className="min-w-0">
              <p className="truncate font-mono text-2xl font-black leading-none text-ink-950 dark:text-white sm:text-3xl md:text-2xl">
                {item.ticket?.ticketNumber || "-"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-ink-400 dark:text-ink-500">
                <span>{item.ticket?.province || "Chưa rõ đài"}</span>
                {item.ticket?.series ? (
                  <span>Seri {item.ticket.series}</span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 text-right md:hidden">
              <TransactionAmount item={item} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-ink-500 dark:text-ink-400 md:hidden">
            <span>Ngày xổ: {formatDate(item.ticket?.drawDate) || "-"}</span>
            <span>Dò lúc: {checkedAt}</span>
          </div>
        </div>

        <div className="col-start-2 min-w-0 md:col-start-auto">
          <p className="text-sm font-black text-ink-800 dark:text-ink-100">
            Ngày xổ {formatDate(item.ticket?.drawDate) || "-"}
          </p>
          <p className="mt-1 hidden text-xs font-bold text-ink-500 dark:text-ink-400 md:block">
            Dò lúc {checkedAt}
          </p>
          <p className="mt-2 line-clamp-2 text-sm font-bold text-ink-500 dark:text-ink-400 md:hidden">
            {prizeText}
          </p>
        </div>

        <div className="col-start-2 hidden min-w-0 md:col-start-auto md:block">
          <TransactionAmount item={item} />
          <p className="mt-1 line-clamp-2 text-xs font-bold text-ink-500 dark:text-ink-400">
            {prizeText}
          </p>
        </div>

        <div className="col-start-2 flex items-center justify-between gap-3 md:col-start-auto md:justify-end">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-black md:hidden ${
              item.isWinner
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                : "bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-ink-300"
            }`}
          >
            {item.isWinner ? "Trúng thưởng" : "Không trúng"}
          </span>

          <button
            className="rounded-xl px-3 py-2 text-sm font-black text-red-600 transition hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-400/10"
            onClick={onDelete}
            type="button"
          >
            Xóa
          </button>
        </div>
      </div>
    </article>
  );
}

function TransactionAmount({ item }: { item: HistoryRecord }) {
  return (
    <div>
      <p
        className={`text-base font-black leading-none sm:text-lg ${
          item.isWinner
            ? "text-emerald-600 dark:text-emerald-300"
            : "text-ink-500 dark:text-ink-400"
        }`}
      >
        {item.isWinner ? `+${formatMoney(item.winningAmount)}` : "Không trúng"}
      </p>
      <p className="mt-1 text-xs font-bold text-ink-400 dark:text-ink-500">
        Tiền vé {formatMoney(item.ticketCost || 0)}
      </p>
    </div>
  );
}

function getMatchedPrizeText(item: HistoryRecord) {
  if (!item.matchedPrizes?.length) {
    return "Không tìm thấy giải trúng";
  }

  return item.matchedPrizes
    .map((prize) => {
      const numbers = (prize.numbers || (prize.number ? [prize.number] : []))
        .filter(Boolean)
        .join(", ");

      return `${prize.prize}${numbers ? `: ${numbers}` : ""}`;
    })
    .join(" • ");
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-4 py-8 text-center dark:border-white/10 dark:bg-ink-950/50">
      <p className="text-base font-black text-ink-800 dark:text-white">
        Chưa có lịch sử dò vé
      </p>
      <p className="mt-1 text-sm font-bold text-ink-500 dark:text-ink-400">
        Khi bạn dò vé, kết quả sẽ được hiển thị tại đây.
      </p>
    </div>
  );
}

const historyInputClass =
  "w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-ink-950/50 dark:text-white";

export default HistoryList;
