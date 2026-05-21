import React from "react";
import type { Stats } from "../../types/domain";
import { formatCompactVnd } from "../../utils/format";

interface StatsLineChartProps {
  stats: Stats | null;
  selectedMonth: string;
}

const width = 900;
const height = 320;
const paddingX = 64;
const paddingTop = 34;
const paddingBottom = 54;

export const StatsLineChart: React.FC<StatsLineChartProps> = ({
  stats,
  selectedMonth,
}) => {
  const points = stats?.dailyTrend || [];
  const values = points.map((item) => item.cumulativeProfit || 0);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = Math.max(1, maxValue - minValue);
  const chartHeight = height - paddingTop - paddingBottom;
  const zeroY = paddingTop + ((maxValue - 0) / range) * chartHeight;

  const coords = points.map((item, index) => {
    const x =
      points.length <= 1
        ? width / 2
        : paddingX + (index * (width - paddingX * 2)) / (points.length - 1);
    const y =
      paddingTop +
      ((maxValue - (item.cumulativeProfit || 0)) / range) * chartHeight;
    return { ...item, x, y };
  });

  const linePath = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = coords.length
    ? `${linePath} L ${coords[coords.length - 1].x} ${zeroY} L ${coords[0].x} ${zeroY} Z`
    : "";
  const latest = coords[coords.length - 1]?.cumulativeProfit || 0;
  const best = coords.reduce(
    (max, item) =>
      !max || item.cumulativeProfit > max.cumulativeProfit ? item : max,
    null as (typeof coords)[number] | null,
  );
  const worst = coords.reduce(
    (min, item) =>
      !min || item.cumulativeProfit < min.cumulativeProfit ? item : min,
    null as (typeof coords)[number] | null,
  );
  const tickStep = Math.max(1, Math.ceil(points.length / 8));
  const lineColorStart = latest >= 0 ? "#16a34a" : "#dc2626";
  const lineColorEnd = latest >= 0 ? "#22c55e" : "#ef4444";

  return (
    <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white dark:border-white/10 dark:bg-white/10">
      <div className="flex flex-col gap-3 bg-gradient-to-r from-brand-600 to-blue-600 px-5 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
            Biểu đồ lãi / lỗ
          </p>
          <h3 className="text-xl font-black">Số tiền kiếm được theo ngày</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <ChartBadge label="Hiện tại" positive={latest >= 0} value={formatCompactVnd(latest, { signed: true })} />
          <ChartBadge
            label="Cao nhất"
            positive={(best?.cumulativeProfit || 0) >= 0}
            value={formatCompactVnd(best?.cumulativeProfit || 0, { signed: true })}
          />
          <ChartBadge
            label="Thấp nhất"
            positive={(worst?.cumulativeProfit || 0) >= 0}
            value={formatCompactVnd(worst?.cumulativeProfit || 0, { signed: true })}
          />
        </div>
      </div>

      {points.length ? (
        <div className="p-4">
          <div className="overflow-x-auto">
            <svg className="min-w-[820px]" viewBox={`0 0 ${width} ${height}`}>
              <defs>
                <linearGradient id="profitChartLine" x1="0" x2="1">
                  <stop offset="0%" stopColor={lineColorStart} />
                  <stop offset="100%" stopColor={lineColorEnd} />
                </linearGradient>
                <linearGradient id="profitChartArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={lineColorEnd} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={lineColorEnd} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              <rect
                className="fill-ink-50 dark:fill-white/[0.03]"
                height={chartHeight}
                rx="18"
                width={width - paddingX * 2}
                x={paddingX}
                y={paddingTop}
              />
              <line
                className="text-red-300 dark:text-red-400/40"
                stroke="currentColor"
                strokeDasharray="6 6"
                x1={paddingX}
                x2={width - paddingX}
                y1={zeroY}
                y2={zeroY}
              />
              <text
                className="fill-red-500 text-xs font-black"
                x={paddingX + 8}
                y={Math.max(18, zeroY - 8)}
              >
                0đ
              </text>
              <path d={areaPath} fill="url(#profitChartArea)" />
              <path
                d={linePath}
                fill="none"
                stroke="url(#profitChartLine)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5"
              />

              {coords.map((point, index) => (
                <g key={point.date}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill={(point.cumulativeProfit || 0) >= 0 ? "#16a34a" : "#dc2626"}
                    r={index === coords.length - 1 ? 8 : 4}
                    stroke="white"
                    strokeWidth="2"
                  />
                  {index === coords.length - 1 ? (
                    <g>
                      <rect
                        fill={(point.cumulativeProfit || 0) >= 0 ? "#16a34a" : "#dc2626"}
                        height="24"
                        rx="12"
                        width="108"
                        x={point.x - 54}
                        y={point.y - 36}
                      />
                      <text
                        className="fill-white text-xs font-black"
                        textAnchor="middle"
                        x={point.x}
                        y={point.y - 20}
                      >
                        {formatCompactVnd(point.cumulativeProfit || 0, { signed: true })}
                      </text>
                    </g>
                  ) : null}
                  {index % tickStep === 0 || index === coords.length - 1 ? (
                    <text
                      className="fill-ink-500 text-xs font-bold dark:fill-ink-300"
                      textAnchor="middle"
                      x={point.x}
                      y={height - 18}
                    >
                      {point.date.slice(8)}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ChartSummary label="Tháng" value={selectedMonth} />
            <ChartSummary
              label="Tổng tiền mua"
              value={formatCompactVnd(
                points.reduce((sum, item) => sum + (item.totalSpent || 0), 0),
              )}
            />
            <ChartSummary
              label="Tổng tiền trúng"
              value={formatCompactVnd(
                points.reduce((sum, item) => sum + (item.totalWon || 0), 0),
              )}
            />
          </div>
        </div>
      ) : (
        <p className="p-5 text-sm font-bold text-ink-500 dark:text-ink-400">
          Chưa có dữ liệu trong tháng này để vẽ biểu đồ.
        </p>
      )}
    </div>
  );
};

function ChartBadge({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-2 text-right">
      <p className="text-xs font-bold text-white/70">{label}</p>
      <p className={positive ? "font-black text-green-100" : "font-black text-red-100"}>
        {value}
      </p>
    </div>
  );
}

function ChartSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink-50 px-4 py-3 dark:bg-white/5">
      <p className="text-xs font-black uppercase tracking-wide text-ink-400">
        {label}
      </p>
      <p className="mt-1 font-black text-ink-900 dark:text-white">{value}</p>
    </div>
  );
}

export default StatsLineChart;
