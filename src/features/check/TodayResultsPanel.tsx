import React, { useMemo, useState } from "react";
import type { DrawResult, Prize } from "../../types/domain";
import { formatDate } from "../../utils/format";

interface TodayResultItem {
  province: string;
  result?: DrawResult;
  error?: string;
}

interface TodayRegion {
  region: string;
  date: string;
  items: TodayResultItem[];
  error?: string;
}

interface TodayResultsPanelProps {
  data?: { regions?: TodayRegion[] } | null;
  loading: boolean;
  onReload: () => void;
}

const preferredRegions = ["Miền Nam", "Miền Bắc", "Miền Trung"];

export const TodayResultsPanel: React.FC<TodayResultsPanelProps> = ({
  data,
  loading,
  onReload,
}) => {
  const regions = data?.regions || [];
  const [activeRegion, setActiveRegion] = useState(preferredRegions[0]);
  const selectedRegion =
    regions.find((region) => region.region === activeRegion) || regions[0];

  return (
    <section className="rounded-4xl border border-white/70 bg-white/85 p-5 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-soft-dark">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">
            Kết quả hôm nay
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Bảng kết quả xổ số mới nhất
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid gap-2 sm:grid-cols-3">
            {preferredRegions.map((region) => (
              <button
                key={region}
                className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                  selectedRegion?.region === region
                    ? "bg-brand-600 text-white shadow-glow"
                    : "bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                }`}
                onClick={() => setActiveRegion(region)}
                type="button"
              >
                {region}
              </button>
            ))}
          </div>
          <button
            className="rounded-2xl bg-ink-100 px-4 py-2 text-sm font-black text-ink-700 transition hover:-translate-y-0.5 hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/10 dark:text-white"
            disabled={loading}
            onClick={onReload}
            type="button"
          >
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
      </div>

      <div className="mt-5">
        {selectedRegion ? (
          <RegionBoard region={selectedRegion} />
        ) : (
          <p className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 px-5 py-8 text-center text-sm font-bold text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-ink-300">
            {loading ? "Đang tải kết quả mới nhất..." : "Chưa tải được dữ liệu."}
          </p>
        )}
      </div>
    </section>
  );
};

function RegionBoard({ region }: { region: TodayRegion }) {
  const prizeNames = useMemo(() => getRegionPrizeNames(region.items || []), [region]);

  return (
    <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/10">
      <div className="bg-gradient-to-r from-red-700 to-red-500 px-4 py-3 text-white">
        <h3 className="text-center text-xl font-black uppercase">
          Kết quả xổ số {region.region} - {formatDate(region.date)}
        </h3>
        {region.error ? (
          <p className="mt-2 text-center text-sm font-bold text-white/80">
            {region.error}
          </p>
        ) : null}
      </div>

      {region.items?.length && prizeNames.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-center">
            <thead>
              <tr className="bg-amber-50 text-blue-700 dark:bg-white/10 dark:text-blue-200">
                <th className="w-24 border border-ink-200 px-2 py-3 font-black dark:border-white/10">
                  Thứ tự
                </th>
                {region.items.map((item) => (
                  <th
                    key={item.province}
                    className="border border-ink-200 px-3 py-3 dark:border-white/10"
                  >
                    <p className="font-black">{item.province}</p>
                    {item.result?.sourceUrl ? (
                      <a
                        className="mt-1 inline-flex text-xs font-black text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
                        href={item.result.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Trang nguồn
                      </a>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prizeNames.map((prizeName, index) => (
                <tr
                  key={prizeName}
                  className={
                    index % 2 === 0
                      ? "bg-white dark:bg-white/[0.04]"
                      : "bg-ink-50 dark:bg-sky-400/[0.08]"
                  }
                >
                  <td className="w-24 border border-ink-200 px-2 py-3 text-left text-sm font-bold dark:border-white/10">
                    {prizeName}
                  </td>
                  {region.items.map((item) => (
                    <td
                      key={`${item.province}-${prizeName}`}
                      className="border border-ink-200 px-3 py-3 dark:border-white/10"
                    >
                      {item.result ? (
                        <TodayPrizeNumbers
                          isSpecial={isSpecialPrize(prizeName)}
                          prize={findPrize(item.result, prizeName)}
                        />
                      ) : (
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-200">
                          {item.error || "Chưa có dữ liệu"}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-5 text-sm font-bold text-amber-700 dark:text-amber-200">
          {region.error || "Chưa có dữ liệu."}
        </p>
      )}
    </div>
  );
}

function TodayPrizeNumbers({
  prize,
  isSpecial,
}: {
  prize?: Prize;
  isSpecial?: boolean;
}) {
  const numbers = (prize?.numbers || [prize?.number]).filter(Boolean);

  if (!numbers.length) {
    return <span className="text-ink-400">-</span>;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      {numbers.map((number) => (
        <span
          key={`${prize?.prize}-${number}`}
          className={`font-mono font-black leading-tight ${
            isSpecial
              ? "text-3xl text-red-700 dark:text-red-300"
              : prize?.prize === "Giải tám"
              ? "text-4xl text-red-700 dark:text-red-300"
              : "text-2xl text-ink-900 dark:text-white"
          }`}
        >
          {number}
        </span>
      ))}
    </div>
  );
}

function getRegionPrizeNames(items: TodayResultItem[]) {
  const names = new Set<string>();
  items.forEach((item) =>
    item.result?.prizes?.forEach((prize) => names.add(prize.prize)),
  );
  return Array.from(names).sort((a, b) => prizeRank(a) - prizeRank(b));
}

function findPrize(result: DrawResult, prizeName: string) {
  return result.prizes.find((prize) => prize.prize === prizeName);
}

function isSpecialPrize(prizeName: string) {
  const value = stripVietnamese(prizeName);
  return value.includes("dac biet") || value.includes("db");
}

function prizeRank(prizeName: string) {
  const value = stripVietnamese(prizeName);
  if (value.includes("tam")) return 0;
  if (value.includes("bay")) return 1;
  if (value.includes("sau")) return 2;
  if (value.includes("nam")) return 3;
  if (value.includes("tu")) return 4;
  if (value.includes("ba")) return 5;
  if (value.includes("nhi")) return 6;
  if (value.includes("nhat")) return 7;
  if (value.includes("dac biet") || value.includes("db")) return 8;
  return 99;
}

function stripVietnamese(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export default TodayResultsPanel;
