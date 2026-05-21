import React from "react";

const highlights = [
  "Tự nhập API key AI, app không lưu key",
  "Dò một vé hoặc nhiều vé cùng lúc",
  "Lưu lịch sử bằng TiDB để dùng lại sau",
  "Tối ưu cho điện thoại khi cần chụp vé",
];

export default function ExperienceCard() {
  return (
    <div className="rounded-4xl border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-soft-dark">
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-blue-600 p-6 text-white shadow-glow">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-white/70">
          Trải nghiệm mới
        </p>
        <h2 className="mt-3 text-3xl font-black">
          Dò vé nhanh, lưu lịch sử và xem lời lỗ trong một nơi.
        </h2>
      </div>
      <div className="mt-5 grid gap-3">
        {highlights.map((item) => (
          <div
            key={item}
            className="rounded-2xl bg-ink-50 px-4 py-3 font-bold text-ink-700 dark:bg-white/10 dark:text-ink-200"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
