import React from "react";
import { NavLink } from "react-router-dom";

export const BottomNav: React.FC = () => {
  const items = [
    { to: "/", label: "Home" },
    { to: "/check", label: "Dò vé" },
    { to: "/account", label: "Tài khoản" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200 bg-white/95 px-3 py-2 shadow-soft backdrop-blur dark:border-white/10 dark:bg-ink-950/95 md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `rounded-2xl px-3 py-3 text-center text-xs font-black transition ${
                isActive
                  ? "bg-brand-600 text-white shadow-glow"
                  : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/10"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
