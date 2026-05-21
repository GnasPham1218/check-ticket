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

  const themeLabel = isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";

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
          aria-label={themeLabel}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-ink-200 bg-white/85 text-ink-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 dark:border-white/10 dark:bg-white/10 dark:text-white"
          onClick={onToggleTheme}
          title={themeLabel}
          type="button"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
};

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M20.99 13.46A8.5 8.5 0 1 1 10.54 3.01 6.5 6.5 0 1 0 20.99 13.46Z" />
    </svg>
  );
}

export default AppNavbar;
