import React from "react";
import { Link } from "react-router-dom";

const steps = [
  { number: "01", label: "Chụp hoặc chọn ảnh vé" },
  { number: "02", label: "AI đọc tỉnh, ngày, số vé" },
  { number: "03", label: "Dò kết quả và lưu lịch sử" },
];

export default function HomeHero() {
  return (
    <div>
      <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
        Trước 4h chiều, chưa biết ai giàu hơn ai...
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-600 dark:text-ink-300">
        Chụp hoặc tải ảnh vé số lên, AI tự động đọc đài, ngày và số để dò kết quả tức thì.
        Cùng xem chiều nay vận may có gọi tên bạn không nhé!
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          className="rounded-2xl bg-gradient-to-r from-brand-600 to-blue-600 px-6 py-4 text-center font-black text-white shadow-glow"
          to="/check"
        >
          Bắt đầu dò vé
        </Link>
        <Link
          className="rounded-2xl border border-ink-200 bg-white px-6 py-4 text-center font-black text-ink-700 dark:border-white/10 dark:bg-white/10 dark:text-white"
          to="/account"
        >
          Xem thống kê
        </Link>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-2xl font-black text-brand-700 dark:text-brand-300">
              {step.number}
            </p>
            <p className="mt-1 text-sm font-bold text-ink-600 dark:text-ink-300">
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
