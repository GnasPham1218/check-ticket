import React from "react";
import { Link, NavLink } from "react-router-dom";

interface AppNavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  user: any;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  isDark,
  onToggleTheme,
  user,
}) => {
  const navItems = [
    { to: "/", label: "Trang chủ" },
    { to: "/check", label: "Dò vé" },
    { to: "/account", label: "Tài khoản" },
  ];

  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-3xl bg-gradient-to-br from-brand-600 to-blue-600 font-black text-white shadow-glow">
            CT
          </span>
          <span className="hidden text-xl font-black tracking-tight text-ink-950 dark:text-white sm:block">
            CheckTicket
          </span>
        </Link>
        <nav className="hidden items-center gap-2 rounded-3xl border border-white/70 bg-white/75 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `rounded-2xl px-4 py-2 text-sm font-black transition ${
                  isActive
                    ? "bg-brand-600 text-white shadow-glow"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-950 dark:text-ink-300 dark:hover:bg-white/10 dark:hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <div className="hidden max-w-44 truncate rounded-2xl bg-white/80 px-3 py-2 text-sm font-bold text-ink-700 shadow-sm dark:bg-white/10 dark:text-ink-200 sm:block">
            {user.name || user.email}
          </div>
        ) : null}
        <button
          className="rounded-2xl border border-ink-200 bg-white/85 px-4 py-2 text-sm font-black text-ink-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 dark:border-white/10 dark:bg-white/10 dark:text-white"
          onClick={onToggleTheme}
          type="button"
        >
          {isDark ? "Sáng" : "Tối"}
        </button>
      </div>
    </header>
  );
};

export default AppNavbar;
