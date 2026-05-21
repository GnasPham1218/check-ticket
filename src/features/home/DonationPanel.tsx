import React, { useState } from "react";

const donateMethods = [
  {
    alt: "QR Vietcombank",
    label: "Vietcombank",
    src: "/donate/vietcombank-qr.png",
  },
  {
    alt: "QR MoMo",
    label: "MoMo",
    src: "/donate/momo-qr.png",
  },
];

export default function DonationPanel() {
  return (
    <section className="rounded-4xl border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-soft-dark">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-700 dark:text-brand-300">
            Buy me a lottery ticket
          </p>
          <h2 className="mt-3 text-3xl font-black text-ink-950 dark:text-white sm:text-4xl">
            Ủng hộ tiền mua vé số để duy trì web
          </h2>
          <p className="mt-4 max-w-2xl text-lg font-bold leading-8 text-ink-600 dark:text-ink-300">
            Nếu web giúp bạn dò vé nhanh hơn lúc cào lớp phủ may mắn, hãy quét nhẹ một
            chút tiền mua vé số tinh thần. Biết đâu bạn chưa trúng độc đắc hôm nay, nhưng
            server thì chắc chắn trúng thêm vài ngày được nuôi sống.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {donateMethods.map((method) => (
            <DonateQrCard key={method.label} {...method} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DonateQrCard({ alt, label, src }: { alt: string; label: string; src: string }) {
  const [missing, setMissing] = useState(false);

  return (
    <div className="rounded-3xl border border-ink-200 bg-ink-50 p-4 text-center dark:border-white/10 dark:bg-white/5">
      <div className="mx-auto flex aspect-square max-w-[260px] items-center justify-center overflow-hidden rounded-2xl bg-white p-3 sm:max-w-[300px]">
        {missing ? (
          <div className="px-3 text-sm font-black text-ink-400">
            Thêm ảnh QR vào {src}
          </div>
        ) : (
          <img
            alt={alt}
            className="h-full w-full object-contain"
            src={src}
            onError={() => setMissing(true)}
          />
        )}
      </div>
      <p className="mt-3 font-black text-ink-800 dark:text-white">{label}</p>
    </div>
  );
}
