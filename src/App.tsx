import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

// --- IMPORT INTERNAL COMPONENTS ---
import { Panel } from "./components/Panel";
import { Button } from "./components/Button";
import { Status, LoadingLabel } from "./components/Status";
import { inputClass } from "./components/Input";
import { Field } from "./components/Field";

import { BackgroundGlow } from "./layout/BackgroundGlow";

import { AiSettings } from "./features/check/AiSettings";
import { TicketForm } from "./features/check/TicketForm";
import { CalendarDatePicker } from "./features/check/CalendarDatePicker";

import BatchResults from "./features/check/BatchResults";

import { StatCard } from "./features/account/StatCard";

// --- IMPORT UTILS & SERVICES ---
import { API_BASE, ENV_API_BASE, GOOGLE_CLIENT_ID } from "./config/constants";
import {
  checkSingleTicket,
  checkTicketsBatch,
  clearHistory,
  fetchStats,
  fetchTodayDrawResults,
  getFetchErrorMessage,
  scanTicketImage,
} from "./services/apiClient";
import type { AppUser, DrawResult, Prize, Ticket, TicketCheckResult, Stats } from "./types/domain";
import { fileToDataUrl } from "./utils/file";
import { formatCompactVnd, formatDate, formatMoney } from "./utils/format";
import StatsLineChart from "./features/account/StatsLineChart";
import AppNavbar from "./layout/AppNavbar";
import BottomNav from "./layout/BottomNav";
import HistoryList from "./features/account/HistoryList";
import TodayResultsPanel from "./features/check/TodayResultsPanel";
import BatchTicketRow from "./features/check/BatchTicketRow";
import DonationPanel from "./features/home/DonationPanel";
import ExperienceCard from "./features/home/ExperienceCard";
import HomeHero from "./features/home/HomeHero";
// --- CONSTANTS & TYPES ---
const emptyTicket: Ticket = {
  province: "",
  drawDate: "",
  ticketNumber: "",
  series: "",
};

type ScanStatus =
  | "idle"
  | "manual"
  | "scanning"
  | "success"
  | "partial"
  | "error";
type TabKey = "single" | "batch";

interface BatchTicket extends Ticket {
  id: string;
  imagePreview: string;
  scanStatus: ScanStatus;
  scanMessage: string;
}

function createBatchTicket(overrides: Partial<BatchTicket> = {}): BatchTicket {
  return {
    id: crypto.randomUUID(),
    province: "",
    drawDate: "",
    ticketNumber: "",
    series: "",
    imagePreview: "",
    scanStatus: "manual",
    scanMessage: "",
    ...overrides,
  };
}

function guestUser(): AppUser {
  return { id: "guest", name: "Khách", email: "" };
}

function getMissingTicketFields(row: Partial<Ticket>) {
  const missing = [];
  if (!String(row.province || "").trim()) missing.push("tỉnh / đài");
  if (!String(row.drawDate || "").trim()) missing.push("ngày xổ");
  if (
    !String(row.ticketNumber || "")
      .replace(/\D/g, "")
      .slice(-6)
  ) {
    missing.push("số vé");
  }
  return missing;
}

function getScanMessageClass(status: ScanStatus) {
  if (status === "scanning")
    return "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200";
  if (status === "error")
    return "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-200";
  if (status === "partial")
    return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200";
  if (status === "success")
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200";
  return "bg-ink-50 text-ink-600 dark:bg-white/5 dark:text-ink-300";
}

// --- MAIN WRAPPER COMPONENT ---
export default function App() {
  return (
    <BrowserRouter>
      <LotteryApp />
    </BrowserRouter>
  );
}

// --- APP MANAGEMENT HUB ---
function LotteryApp() {
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState(
    () => sessionStorage.getItem("aiApiKey") || "",
  );
  const apiKeyRef = useRef(apiKey);
  const [imagePreview, setImagePreview] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [ticket, setTicket] = useState<Ticket>(emptyTicket);
  const [result, setResult] = useState<TicketCheckResult | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [user, setUser] = useState<AppUser | null>(() =>
    JSON.parse(localStorage.getItem("checkTicketUser") || "null"),
  );
  const [ticketCost, setTicketCost] = useState(
    () => localStorage.getItem("ticketCost") || "10000",
  );
  const [ticketQuantity, setTicketQuantity] = useState(
    () => localStorage.getItem("ticketQuantity") || "1",
  );
  const [saveHistory, setSaveHistory] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedStatsMonth, setSelectedStatsMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyLimit, setHistoryLimit] = useState("20");
  const [batchTickets, setBatchTickets] = useState<BatchTicket[]>([
    createBatchTicket(),
  ]);
  const [batchResults, setBatchResults] = useState<TicketCheckResult[]>([]);
  const [googleLoginError, setGoogleLoginError] = useState("");
  const [singleScanStatus, setSingleScanStatus] = useState<ScanStatus>("idle");
  const [singleScanMessage, setSingleScanMessage] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("single");
  const [todayResults, setTodayResults] = useState<any>(null);
  const [todayLoading, setTodayLoading] = useState(false);

  const runtimeInfo = useMemo(
    () => ({
      origin: window.location.origin,
      apiBase: API_BASE || "/api",
      viteApiBase: ENV_API_BASE,
    }),
    [],
  );

  const canScan = Boolean(apiKey.trim() && imageBase64);
  const canCheck = Boolean(
    ticket.province && ticket.drawDate && ticket.ticketNumber,
  );

  const prizeSummary = useMemo(() => {
    if (!result?.matchedPrizes?.length)
      return "Chưa trúng theo dữ liệu hiện có";
    return result.matchedPrizes
      .map(
        (item) =>
          `${item.prize}: ${(item.numbers || [item.number]).filter(Boolean).join(", ")}`,
      )
      .join(" • ");
  }, [result]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    apiKeyRef.current = apiKey;
    sessionStorage.setItem("aiApiKey", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("ticketCost", ticketCost);
  }, [ticketCost]);

  useEffect(() => {
    localStorage.setItem("ticketQuantity", ticketQuantity);
  }, [ticketQuantity]);

  const refreshStats = async () => {
    try {
      setStats(
        await fetchStats(user?.id || "guest", selectedStatsMonth, {
          historyFrom,
          historyTo,
          historyLimit,
        }),
      );
    } catch {
      setStats(null);
    }
  };

  useEffect(() => {
    refreshStats();
  }, [user?.id, selectedStatsMonth, historyFrom, historyTo, historyLimit]);

  useEffect(() => {
    const handler = () => refreshStats();
    window.addEventListener("refresh-stats", handler);
    return () => window.removeEventListener("refresh-stats", handler);
  }, [user?.id, selectedStatsMonth, historyFrom, historyTo, historyLimit]);

  const loadTodayResults = async () => {
    setTodayLoading(true);
    try {
      setTodayResults(await fetchTodayDrawResults());
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setTodayLoading(false);
    }
  };

  useEffect(() => {
    loadTodayResults();
  }, []);

  function updateTicket(field: keyof Ticket, value: string) {
    setTicket((current) => ({ ...current, [field]: value }));
  }

  function updateBatchTicket(id: string, field: keyof Ticket, value: string) {
    setBatchTickets((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function addBatchTicket() {
    setBatchTickets((current) => [
      ...current,
      createBatchTicket({
        province: ticket.province,
        drawDate: ticket.drawDate,
      }),
    ]);
  }

  function removeBatchTicket(id: string) {
    setBatchTickets((current) =>
      current.length === 1
        ? [createBatchTicket()]
        : current.filter((row) => row.id !== id),
    );
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setSingleScanStatus("idle");
    setSingleScanMessage("");
    const dataUrl = String(await fileToDataUrl(file));
    setImagePreview(dataUrl);
    setImageBase64(dataUrl.split(",")[1]);
    event.target.value = "";
  }

  async function scanTicket() {
    setError("");
    setSingleScanStatus("scanning");
    setSingleScanMessage("Đang scan ảnh vé số...");
    try {
      const payload = await scanTicketImage({ provider, apiKey, imageBase64 });
      const nextTicket = { ...emptyTicket, ...payload.ticket };
      const missing = getMissingTicketFields(nextTicket);
      setTicket(nextTicket);
      setSingleScanStatus(missing.length ? "partial" : "success");
      setSingleScanMessage(
        missing.length
          ? `AI đọc được một phần, còn thiếu: ${missing.join(", ")}. Vui lòng bổ sung trước khi dò.`
          : "AI đã đọc đủ thông tin vé. Bạn có thể bấm dò vé.",
      );
    } catch (err) {
      setSingleScanStatus("error");
      const message = getFetchErrorMessage(err);
      setSingleScanMessage(
        `AI không đọc được ảnh này. Bạn có thể nhập thủ công. Chi tiết: ${message}`,
      );
      setError(message);
    }
  }

  async function checkTicket() {
    setError("");
    setResult(null);
    setLoading("Đang dò kết quả xổ số...");
    try {
      setResult(
        await checkSingleTicket({
          ...ticket,
          user: user || guestUser(),
          ticketCost,
          ticketQuantity,
          saveHistory,
        }),
      );
      refreshStats();
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setLoading("");
    }
  }

  async function handleBatchImagesChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const currentApiKey = apiKeyRef.current.trim();
    if (!currentApiKey) {
      setError("Vui lòng nhập API key Gemini/OpenAI trước khi scan nhiều ảnh.");
      event.target.value = "";
      return;
    }
    setError("");
    setLoading(`Đang scan ${files.length} ảnh vé số...`);
    const queued = files.slice(0, 20).map((file) =>
      createBatchTicket({
        scanStatus: "scanning",
        scanMessage: `Ðang scan ${file.name}`,
      }),
    );
    setBatchTickets((current) => [
      ...current.filter(
        (row) =>
          row.province ||
          row.drawDate ||
          row.ticketNumber ||
          row.series ||
          row.imagePreview,
      ),
      ...queued,
    ]);

    try {
      for (const [index, file] of files.slice(0, 20).entries()) {
        const rowId = queued[index].id;
        const dataUrl = String(await fileToDataUrl(file));
        setBatchTickets((current) =>
          current.map((row) =>
            row.id === rowId
              ? {
                  ...row,
                  imagePreview: dataUrl,
                  scanMessage: "Đang đọc thông tin vé...",
                }
              : row,
          ),
        );
        try {
          const payload = await scanTicketImage({
            provider,
            apiKey: currentApiKey,
            imageBase64: dataUrl.split(",")[1],
          });
          const nextTicket = {
            province: payload.ticket.province || ticket.province,
            drawDate: payload.ticket.drawDate || ticket.drawDate,
            ticketNumber: payload.ticket.ticketNumber || "",
            series: payload.ticket.series || "",
          };
          const missing = getMissingTicketFields(nextTicket);
          setBatchTickets((current) =>
            current.map((row) =>
              row.id === rowId
                ? {
                    ...row,
                    ...nextTicket,
                    imagePreview: dataUrl,
                    scanStatus: missing.length ? "partial" : "success",
                    scanMessage: missing.length
                      ? `AI đọc được một phần, còn thiếu: ${missing.join(", ")}. Vui lòng bổ sung.`
                      : "AI đã đọc đủ thông tin vé.",
                  }
                : row,
            ),
          );
        } catch (err) {
          setBatchTickets((current) =>
            current.map((row) =>
              row.id === rowId
                ? {
                    ...row,
                    imagePreview: dataUrl,
                    scanStatus: "error",
                    scanMessage: `AI không đọc được ảnh này. Nhập thủ công. Chi tiết: ${getFetchErrorMessage(err)}`,
                  }
                : row,
            ),
          );
        }
      }
    } catch (err) {
      setError(getFetchErrorMessage(err));
    }
    {
      setLoading("");
      event.target.value = "";
    }
  }

  async function checkBatchTickets() {
    const rows = batchTickets.filter(
      (row) =>
        row.province ||
        row.drawDate ||
        row.ticketNumber ||
        row.series ||
        row.imagePreview,
    );
    const invalid = rows
      .map((row) => ({ row, missing: getMissingTicketFields(row) }))
      .filter((item) => item.missing.length);

    if (invalid.length) {
      setError(
        `Có ${invalid.length} vé thiếu thông tin. Vui lòng bổ sung các dòng đang cảnh báo.`,
      );
      setBatchTickets((current) =>
        current.map((row) => {
          const found = invalid.find((item) => item.row.id === row.id);
          return found
            ? {
                ...row,
                scanStatus:
                  row.scanStatus === "success" ? "partial" : row.scanStatus,
                scanMessage: `Thiếu ${found.missing.join(", ")}. Vui lòng bổ sung trước khi dò.`,
              }
            : row;
        }),
      );
      return;
    }

    const tickets = rows.map((row) => ({
      province: row.province,
      drawDate: row.drawDate,
      ticketNumber: String(row.ticketNumber || "")
        .replace(/\D/g, "")
        .slice(-6),
      series: row.series || "",
    }));

    if (!tickets.length) {
      setError("Vui lòng nhập ít nhất 1 vé có đủ tỉnh, ngày xổ và số vé.");
      return;
    }
    setError("");
    setLoading(`Ðang dò ${tickets.length} vé...`);
    try {
      const payload = await checkTicketsBatch({
        user: user || guestUser(),
        ticketCost,
        ticketQuantity,
        saveHistory,
        tickets,
      });
      setBatchResults(payload.results || []);
      refreshStats();
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setLoading("");
    }
  }

  async function loginGoogle() {
    setGoogleLoginError("");
    const email = prompt(
      "Nhập email Google để lưu thống kê. Thêm VITE_GOOGLE_CLIENT_ID để bật Google OAuth thật.",
    );
    if (!email) return;
    const nextUser = {
      id: email.trim().toLowerCase(),
      email: email.trim(),
      name: email.split("@")[0],
    };
    localStorage.setItem("checkTicketUser", JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function handleGoogleCredential(response: { credential: string }) {
    try {
      const payload = response.credential.split(".")[1];
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const profile = JSON.parse(decodeURIComponent(escape(atob(normalized))));
      const nextUser = {
        id: profile.email,
        email: profile.email,
        name: profile.name || profile.email,
        picture: profile.picture,
      };
      localStorage.setItem("checkTicketUser", JSON.stringify(nextUser));
      setUser(nextUser);
      setGoogleLoginError("");
    } catch (err: any) {
      setGoogleLoginError(`Không đọc được thông tin Google: ${err.message}`);
    }
  }

  async function handleClearHistory() {
    if (
      !confirm(
        "Bạn chắc chắn muốn xóa toàn bộ lịch sử dò vé của tài khoản hiện tại?",
      )
    )
      return;
    setLoading("Đang xóa lịch sử...");
    try {
      await clearHistory(user?.id || "guest");
      await refreshStats();
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ink-50 pb-24 text-ink-950 transition-colors duration-500 ease-smooth dark:bg-ink-950 dark:text-white md:pb-0">
      <BackgroundGlow />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <AppNavbar
          isDark={isDark}
          onToggleTheme={() => setIsDark((v) => !v)}
          user={user}
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/check"
            element={
              <CheckPage
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                provider={provider}
                setProvider={setProvider}
                apiKey={apiKey}
                setApiKey={setApiKey}
                apiKeyRef={apiKeyRef}
                imagePreview={imagePreview}
                ticket={ticket}
                result={result}
                prizeSummary={prizeSummary}
                loading={loading}
                error={error}
                runtimeInfo={runtimeInfo}
                canScan={canScan}
                canCheck={canCheck}
                isScanningSingle={singleScanStatus === "scanning"}
                singleScanStatus={singleScanStatus}
                singleScanMessage={singleScanMessage}
                handleFileChange={handleFileChange}
                scanTicket={scanTicket}
                updateTicket={updateTicket}
                checkTicket={checkTicket}
                batchTickets={batchTickets}
                batchResults={batchResults}
                handleBatchImagesChange={handleBatchImagesChange}
                updateBatchTicket={updateBatchTicket}
                addBatchTicket={addBatchTicket}
                removeBatchTicket={removeBatchTicket}
                checkBatchTickets={checkBatchTickets}
                todayResults={todayResults}
                todayLoading={todayLoading}
                reloadTodayResults={loadTodayResults}
              />
            }
          />
          <Route
            path="/account"
            element={
              <AccountPage
                user={user}
                loginGoogle={loginGoogle}
                logout={() => {
                  localStorage.removeItem("checkTicketUser");
                  setUser(null);
                }}
                googleLoginError={googleLoginError}
                stats={stats}
                ticketCost={ticketCost}
                setTicketCost={setTicketCost}
                ticketQuantity={ticketQuantity}
                setTicketQuantity={setTicketQuantity}
                saveHistory={saveHistory}
                setSaveHistory={setSaveHistory}
                clearHistory={handleClearHistory}
                loading={loading}
                error={error}
                onGoogleCredential={handleGoogleCredential}
                selectedStatsMonth={selectedStatsMonth}
                setSelectedStatsMonth={setSelectedStatsMonth}
                historyFrom={historyFrom}
                setHistoryFrom={setHistoryFrom}
                historyTo={historyTo}
                setHistoryTo={setHistoryTo}
                historyLimit={historyLimit}
                setHistoryLimit={setHistoryLimit}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </main>
  );
}

// --- SUB PAGES SYSTEM ---
function HomePage() {
  return (
    <div className="space-y-8 py-10">
      <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <HomeHero />
        <ExperienceCard />
      </section>
      <DonationPanel />
    </div>
  );
}

function LegacyHomePage() {
  const navigate = useNavigate();
  return (
    <section className="grid items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
          Trước 4h chiều, chưa biết ai giàu hơn ai...
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-600 dark:text-ink-300">
          Chụp hoặc tải ảnh vé số lên, AI tự động đọc đài, ngày và số để dò kết
          quả tức thì. Cùng xem chiều nay vận may có gọi tên bạn không nhé!
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-2xl bg-gradient-to-r from-brand-600 to-blue-600 px-6 py-4 font-black text-white shadow-glow"
            onClick={() => navigate("/check")}
          >
            Bắt đầu dò vé
          </button>
          <Link
            className="rounded-2xl border border-ink-200 bg-white px-6 py-4 text-center font-black text-ink-700 dark:border-white/10 dark:bg-white/10 dark:text-white"
            to="/account"
          >
            Xem thống kê
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-2xl font-black text-brand-700 dark:text-brand-300">
              01
            </p>
            <p className="mt-1 text-sm font-bold text-ink-600 dark:text-ink-300">
              Chụp hoặc chọn ảnh vé
            </p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-2xl font-black text-brand-700 dark:text-brand-300">
              02
            </p>
            <p className="mt-1 text-sm font-bold text-ink-600 dark:text-ink-300">
              AI đọc tỉnh, ngày, số vé
            </p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-2xl font-black text-brand-700 dark:text-brand-300">
              03
            </p>
            <p className="mt-1 text-sm font-bold text-ink-600 dark:text-ink-300">
              Dò kết quả và lưu lịch sử
            </p>
          </div>
        </div>
      </div>
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
          {[
            "Tự nhập API key AI, app không lưu key",
            "Dò một vé hoặc nhiều vé cùng lúc",
            "Lưu lịch sử bằng TiDB để dùng lại sau",
            "Tối ưu cho điện thoại khi cần chụp vé",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl bg-ink-50 px-4 py-3 font-bold text-ink-700 dark:bg-white/10 dark:text-ink-200"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-3xl border border-ink-200 bg-white/80 p-5 dark:border-white/10 dark:bg-white/10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700 dark:text-brand-300">
            Buy me a coffee
          </p>
          <h3 className="mt-2 text-2xl font-black text-ink-950 dark:text-white">
            Ủng hộ app duy trì server
          </h3>
          <p className="mt-2 text-sm font-bold text-ink-500 dark:text-ink-300">
            Quét Vietcombank hoặc MoMo nếu app giúp bạn dò vé nhanh hơn.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DonateQrCard
              alt="QR Vietcombank"
              label="Vietcombank"
              src="/donate/vietcombank-qr.png"
            />
            <DonateQrCard
              alt="QR MoMo"
              label="MoMo"
              src="/donate/momo-qr.png"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function DonateQrCard({ alt, label, src }: { alt: string; label: string; src: string }) {
  const [missing, setMissing] = useState(false);

  return (
    <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4 text-center dark:border-white/10 dark:bg-white/5">
      <div className="mx-auto flex aspect-square max-w-[180px] items-center justify-center overflow-hidden rounded-2xl bg-white p-3">
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

function CheckPage(props: any) {
  return (
    <div className="space-y-6">
      <div className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-soft-dark">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">
          Check Ticket
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          Dò vé số
        </h1>
        <p className="mt-3 max-w-3xl text-ink-600 dark:text-ink-300">
          Dò một vé, dò nhiều vé, và xem nhanh kết quả hôm nay theo 3 miền.
        </p>
      </div>

      <TodayResultsPanel
        data={props.todayResults}
        loading={props.todayLoading}
        onReload={props.reloadTodayResults}
      />

      <div className="rounded-4xl border border-white/70 bg-white/80 p-3 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="tab"
            active={props.activeTab === "single"}
            onClick={() => props.setActiveTab("single")}
          >
            Dò 1 vé
          </Button>
          <Button
            variant="tab"
            active={props.activeTab === "batch"}
            onClick={() => props.setActiveTab("batch")}
          >
            Dò nhiều vé
          </Button>
        </div>
      </div>

      {props.activeTab === "single" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="1. Scan ảnh vé số"
            subtitle="API key chỉ dùng cho request hiện tại, không lưu trong server."
          >
            <AiSettings {...props} />
            <div>
              <span className="mb-2 block text-sm font-bold text-ink-700 dark:text-ink-200">
                Ảnh vé số
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="cursor-pointer rounded-2xl border border-ink-200 bg-white/90 px-4 py-4 text-center font-black text-ink-800 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-white">
                  Chụp ảnh mới
                  <input
                    accept="image/*"
                    capture="environment"
                    type="file"
                    onChange={props.handleFileChange}
                    className="sr-only"
                  />
                </label>
                <label className="cursor-pointer rounded-2xl border border-ink-200 bg-white/90 px-4 py-4 text-center font-black text-ink-800 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-soft dark:border-white/10 dark:bg-white/10 dark:text-white">
                  Chọn ảnh cũ
                  <input
                    accept="image/*"
                    type="file"
                    onChange={props.handleFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
            {props.imagePreview && (
              <img
                className="max-h-72 w-full rounded-3xl border border-ink-100 object-contain dark:border-white/10"
                src={props.imagePreview}
                alt="Vé đã chọn"
              />
            )}
            <Button
              disabled={
                !props.canScan ||
                Boolean(props.loading) ||
                props.isScanningSingle
              }
              onClick={props.scanTicket}
            >
              {props.isScanningSingle ? (
                <LoadingLabel text="Đang scan vé số..." />
              ) : (
                "Scan ảnh"
              )}
            </Button>
            {props.singleScanMessage && (
              <p
                className={`rounded-2xl px-4 py-3 text-sm font-bold ${getScanMessageClass(props.singleScanStatus)}`}
              >
                {props.singleScanMessage}
              </p>
            )}
          </Panel>

          <Panel
            title="2. Xác nhận và dò vé"
            subtitle="Sửa lỗi thông tin nếu AI đọc chưa chính xác."
          >
            <TicketForm ticket={props.ticket} onChange={props.updateTicket} />
            <Button
              disabled={!props.canCheck || Boolean(props.loading)}
              onClick={props.checkTicket}
            >
              Dò vé
            </Button>
          </Panel>
        </section>
      ) : (
        <Panel
          title="Dò nhiều vé nâng cao"
          subtitle="Mỗi dòng là một vé riêng, có thể khác tỉnh và khác ngày xổ."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <AiSettings {...props} compact />
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <button
              className="rounded-3xl border border-dashed border-ink-300 bg-white/80 px-5 py-4 text-left font-black text-ink-700 transition hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-700 hover:shadow-soft dark:border-white/10 dark:bg-white/5 dark:text-white"
              onClick={props.addBatchTicket}
              type="button"
            >
              <span className="block text-lg">+ Thêm vé thủ công</span>
              <span className="mt-1 block text-sm font-bold text-ink-500 dark:text-ink-300">
                Tạo thêm một dòng nhập vé mới.
              </span>
            </button>
            <label className="cursor-pointer rounded-3xl bg-gradient-to-r from-brand-600 to-blue-600 px-5 py-4 text-left font-black text-white shadow-glow transition hover:-translate-y-0.5 hover:brightness-110">
              <span className="block text-lg">Scan nhiều ảnh vé</span>
              <span className="mt-1 block text-sm font-bold text-white/75">
                Chọn tối đa 20 ảnh, AI sẽ điền từng dòng.
              </span>
              <input
                accept="image/*"
                multiple
                type="file"
                onChange={props.handleBatchImagesChange}
                className="sr-only"
              />
            </label>
            <div className="rounded-3xl bg-ink-50 px-5 py-4 dark:bg-white/5">
              <p className="text-sm font-black uppercase tracking-wide text-ink-500 dark:text-ink-300">
                Số vé
              </p>
              <p className="mt-1 text-3xl font-black">{props.batchTickets.length}</p>
            </div>
          </div>
          <div className="space-y-3">
            {props.batchTickets.map((row: BatchTicket, idx: number) => (
              <BatchTicketRow
                key={row.id}
                index={idx}
                row={row}
                onChange={props.updateBatchTicket}
                onRemove={props.removeBatchTicket}
              />
            ))}
          </div>
          <Button
            disabled={Boolean(props.loading)}
            onClick={props.checkBatchTickets}
          >
            Dò {props.batchTickets.length} vé
          </Button>
          {props.batchResults.length > 0 && (
            <BatchResults results={props.batchResults} />
          )}
        </Panel>
      )}

      {props.loading && <Status tone="info">{props.loading}</Status>}
      {props.error && <Status tone="error">{props.error}</Status>}
      {props.error && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          <p className="font-black">Thông tin kết nối hiện tại</p>
          <p className="mt-1">
            Trang đang mở:{" "}
            <span className="font-mono font-bold">
              {props.runtimeInfo.origin}
            </span>
          </p>
          <p>
            API đang gọi:{" "}
            <span className="font-mono font-bold">
              {props.runtimeInfo.apiBase}
            </span>
          </p>
        </div>
      )}

      {props.result && (
        <ResultSection
          imagePreview={props.imagePreview}
          prizeSummary={props.prizeSummary}
          result={props.result}
        />
      )}
    </div>
  );
}

function ResultSection({
  result,
  imagePreview,
  prizeSummary,
}: {
  result: TicketCheckResult;
  imagePreview: string;
  prizeSummary: string;
}) {
  const matchedCount = result.matchedPrizes?.length || 0;

  return (
    <section className="rounded-4xl border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-soft-dark">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">
            Kết quả
          </p>
          <h2 className="mt-2 text-3xl font-black">
            {result.isWinner
              ? `Chúc mừng, vé trúng ${matchedCount} giải!`
              : "Chưa tìm thấy giải trúng"}
          </h2>
        </div>
        <div
          className={`rounded-full px-5 py-3 text-sm font-black ${
            result.isWinner
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
              : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200"
          }`}
        >
          {result.isWinner ? "Có giải" : "Không trúng"}
        </div>
      </div>

      <p
        className={`mt-5 rounded-3xl p-4 font-bold ${
          result.isWinner
            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-100 dark:ring-emerald-400/20"
            : "bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-ink-200"
        }`}
      >
        {prizeSummary}
      </p>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.35fr]">
        <TicketPreview imagePreview={imagePreview} ticket={result.ticket} />
        <LotteryResultTable result={result} />
      </div>
    </section>
  );
}

function TicketPreview({
  imagePreview,
  ticket,
}: {
  imagePreview: string;
  ticket: Ticket;
}) {
  return (
    <aside className="rounded-3xl border border-ink-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700 dark:text-brand-300">
            Vé đang dò
          </p>
          <h3 className="mt-1 font-mono text-3xl font-black">
            {ticket.ticketNumber || "------"}
          </h3>
        </div>
        <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-600 dark:bg-white/10 dark:text-ink-300">
          {ticket.series || "Không seri"}
        </span>
      </div>

      {imagePreview ? (
        <img
          alt="Ảnh vé số đang dò"
          className="max-h-[520px] w-full rounded-2xl border border-ink-100 object-contain dark:border-white/10"
          src={imagePreview}
        />
      ) : (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-ink-300 bg-ink-50 text-center dark:border-white/10 dark:bg-white/5">
          <p className="font-bold text-ink-500 dark:text-ink-400">
            Không có ảnh vé số
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <InfoPill label="Tỉnh / đài" value={ticket.province} />
        <InfoPill label="Ngày xổ" value={formatDate(ticket.drawDate)} />
      </div>
    </aside>
  );
}

function LotteryResultTable({ result }: { result: TicketCheckResult }) {
  const drawResult = result.drawResult || ({} as DrawResult);
  const prizes = Array.isArray(drawResult.prizes) ? drawResult.prizes : [];

  return (
    <section className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/10">
      <div className="bg-gradient-to-r from-red-600 to-orange-500 px-5 py-4 text-white">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">
          Bảng kết quả xổ số
        </p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="text-2xl font-black">
            {drawResult.province || result.ticket.province}
          </h3>
          <p className="font-bold text-white/90">
            {formatDate(drawResult.drawDate || result.ticket.drawDate)}
          </p>
        </div>
      </div>

      <div className="divide-y divide-ink-100 dark:divide-white/10">
        {prizes.length ? (
          prizes.map((prize, index) => (
            <PrizeRow
              index={index}
              key={prize.prize}
              matchedPrizes={result.matchedPrizes}
              prize={prize}
              ticketNumber={result.ticket.ticketNumber}
            />
          ))
        ) : (
          <p className="p-5 text-sm font-bold text-ink-500 dark:text-ink-300">
            Chưa có bảng kết quả để hiển thị.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 bg-ink-50 px-5 py-4 text-sm text-ink-500 dark:bg-ink-950/40 dark:text-ink-400 sm:flex-row sm:items-center sm:justify-between">
        <span>Nguồn: {drawResult.source || "Kết quả xổ số"}</span>
        {drawResult.sourceUrl ? (
          <a
            className="font-bold text-brand-700 hover:underline dark:text-brand-300"
            href={drawResult.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Mở trang nguồn
          </a>
        ) : null}
      </div>
    </section>
  );
}

function PrizeRow({
  prize,
  index,
  ticketNumber,
  matchedPrizes,
}: {
  prize: Prize;
  index: number;
  ticketNumber: string;
  matchedPrizes: Prize[];
}) {
  const numbers = (prize.numbers || [prize.number]).filter(Boolean) as string[];
  const rowClass =
    index % 2 === 0
      ? "bg-white dark:bg-white/[0.04]"
      : "bg-sky-50/70 dark:bg-sky-400/[0.08]";

  return (
    <div
      className={`grid grid-cols-[90px_1fr] px-3 py-3 transition-colors sm:grid-cols-[120px_1fr] ${rowClass}`}
    >
      <div className="flex items-center justify-start border-r border-ink-200 pr-3 dark:border-white/10">
        <span className="rounded-2xl bg-ink-100 px-3 py-2 text-sm font-black text-ink-700 dark:bg-white/10 dark:text-ink-200">
          {prize.prize}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pl-3 text-center">
        {numbers.map((number) => {
          const isMatched = isMatchedNumber(
            number,
            ticketNumber,
            matchedPrizes,
            prize.prize,
          );

          return (
            <span
              key={`${prize.prize}-${number}`}
              className={`inline-flex min-w-24 items-center justify-center rounded-2xl px-3 py-2 text-center font-mono text-lg font-black tracking-wide sm:text-xl ${
                isMatched
                  ? "bg-red-600 text-white shadow-glow ring-4 ring-red-200 dark:ring-red-500/25"
                  : "bg-ink-50 text-ink-900 dark:bg-ink-950/60 dark:text-white"
              }`}
            >
              {number}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-ink-50 p-3 dark:bg-white/5">
      <p className="text-xs font-bold text-ink-400">{label}</p>
      <p className="mt-1 font-black text-ink-800 dark:text-white">
        {value || "-"}
      </p>
    </div>
  );
}

function isMatchedNumber(
  number: string,
  ticketNumber = "",
  matchedPrizes: Prize[] = [],
  prizeName = "",
) {
  const cleanNumber = String(number || "").replace(/\D/g, "");
  const cleanTicket = String(ticketNumber || "").replace(/\D/g, "");
  if (!cleanNumber || !cleanTicket) return false;

  const matchedByServer = matchedPrizes.some((matchedPrize) => {
    const matchedNumbers = (
      matchedPrize.numbers || [matchedPrize.number]
    ).filter(Boolean);
    return (
      matchedPrize.prize === prizeName &&
      matchedNumbers.some(
        (matchedNumber) =>
          String(matchedNumber).replace(/\D/g, "") === cleanNumber,
      )
    );
  });

  return matchedByServer || cleanTicket.endsWith(cleanNumber);
}

function AccountPage({
  user,
  loginGoogle,
  logout,
  googleLoginError,
  stats,
  ticketCost,
  setTicketCost,
  ticketQuantity,
  setTicketQuantity,
  saveHistory,
  setSaveHistory,
  clearHistory,
  loading,
  error,
  onGoogleCredential,
  selectedStatsMonth,
  setSelectedStatsMonth,
  historyFrom,
  setHistoryFrom,
  historyTo,
  setHistoryTo,
  historyLimit,
  setHistoryLimit,
}: any) {
  const totalProfit =
    (stats?.total?.totalWon || 0) - (stats?.total?.totalSpent || 0);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return;

    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onGoogleCredential,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 260,
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [user, onGoogleCredential]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-4xl border border-white/70 bg-white/85 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-soft-dark">
        <div className="bg-gradient-to-br from-brand-600 via-blue-600 to-indigo-700 p-6 text-white">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-white/70">
            Tài khoản
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              {user?.picture ? (
                <img
                  className="h-16 w-16 rounded-3xl border border-white/30 object-cover"
                  src={user.picture}
                  alt={user.email || "Tài khoản"}
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/15 text-2xl font-black ring-1 ring-white/20">
                  G
                </div>
              )}
              <div>
                <h1 className="text-3xl font-black">
                  {user ? user.name || user.email : "Chế độ khách"}
                </h1>
                <p className="mt-1 text-sm font-bold text-white/75">
                  {user
                    ? user.email
                    : "Đăng nhập Google để lưu thống kê theo tài khoản."}
                </p>
              </div>
            </div>
            <div className="rounded-3xl bg-white/10 p-3 ring-1 ring-white/15">
              {user ? (
                <button
                  className="rounded-2xl bg-white/15 px-5 py-3 font-black text-white ring-1 ring-white/25 transition hover:bg-white/25"
                  onClick={logout}
                  type="button"
                >
                  Đăng xuất
                </button>
              ) : GOOGLE_CLIENT_ID ? (
                <div className="space-y-2">
                  <p className="text-sm font-black text-white">Đăng nhập Google</p>
                  <div
                    ref={googleButtonRef}
                    className="min-h-10 min-w-[260px] rounded-2xl bg-white p-1"
                  />
                </div>
              ) : (
                <button
                  className="rounded-2xl bg-white px-5 py-3 font-black text-brand-700 shadow-soft"
                  onClick={loginGoogle}
                  type="button"
                >
                  Đăng nhập Google
                </button>
              )}
            </div>
          </div>
        </div>
        {googleLoginError && (
          <p className="m-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:bg-red-400/10 dark:text-red-300">
            {googleLoginError}
          </p>
        )}
      </section>

      {loading && <Status tone="info">{loading}</Status>}
      {error && <Status tone="error">{error}</Status>}

      <Panel
        title="Cài đặt dò vé"
        subtitle="Thiết lập chi phí và cách lưu dữ liệu."
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr_auto_auto]">
          <Field label="Giá 1 vé mặc định">
            <input
              value={ticketCost}
              inputMode="numeric"
              className={inputClass}
              onChange={(e) => setTicketCost(e.target.value.replace(/\D/g, ""))}
              onBlur={(e) => {
                if (!e.target.value) setTicketCost("10000");
              }}
            />
          </Field>
          <Field label="Số lượng vé">
            <input
              value={ticketQuantity}
              inputMode="numeric"
              className={inputClass}
              onChange={(e) => setTicketQuantity(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onBlur={(e) => {
                const nextValue = Math.max(1, Number(e.target.value) || 1);
                setTicketQuantity(String(nextValue));
              }}
            />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl bg-ink-50 px-5 py-4 font-bold text-ink-700 dark:bg-white/5 dark:text-ink-200">
            <input
              type="checkbox"
              checked={saveHistory}
              onChange={(e) => setSaveHistory(e.target.checked)}
            />
            Lưu lịch sử
          </label>
          <Button variant="danger" onClick={clearHistory}>
            Xóa toàn bộ lịch sử
          </Button>
        </div>
      </Panel>

      <Panel
        title="Tổng quan"
        subtitle="Số liệu nhanh của tháng đang chọn và tổng cộng."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard
            label="Tháng này đã dò"
            value={`${stats?.month?.checkedTickets || 0} vé`}
            tone="blue"
          />
          <StatCard
            label="Tháng này trúng"
            value={`${stats?.month?.winningTickets || 0} vé`}
            tone="green"
          />
          <StatCard
            label="Tiền mua tháng này"
            value={formatCompactVnd(stats?.month?.totalSpent || 0)}
            tone="amber"
          />
          <StatCard
            label="Tiền trúng tháng này"
            value={formatCompactVnd(stats?.month?.totalWon || 0)}
            tone="green"
          />
          <StatCard
            label="Tổng vé đã dò"
            value={`${stats?.total?.checkedTickets || 0} vé`}
            tone="blue"
          />
          <StatCard
            label="Tổng lãi/lỗ"
            value={formatCompactVnd(totalProfit)}
            tone={totalProfit >= 0 ? "green" : "red"}
          />
        </div>
      </Panel>

      <Panel
        title="Thống kê theo ngày"
        subtitle="Biểu đồ lãi/lỗ theo từng ngày trong tháng đã chọn."
      >
        <div className="rounded-3xl bg-ink-50 p-4 dark:bg-white/5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink-700 dark:text-ink-200">
              Chọn tháng thống kê
            </span>
            <input
              type="month"
              value={selectedStatsMonth}
              onChange={(e) => setSelectedStatsMonth(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <TypographyChart stats={stats} selectedMonth={selectedStatsMonth} />
      </Panel>

      <Panel
        title="Lịch sử vé"
        subtitle="Chọn một hoặc nhiều vé để xóa khỏi lịch sử."
      >
        <HistoryList
          historyFrom={historyFrom}
          historyLimit={historyLimit}
          historyTo={historyTo}
          items={stats?.recent || []}
          onChangeHistoryFrom={setHistoryFrom}
          onChangeHistoryLimit={setHistoryLimit}
          onChangeHistoryTo={setHistoryTo}
          userId={user?.id || "guest"}
          onChanged={() => window.dispatchEvent(new Event("refresh-stats"))}
        />
      </Panel>
    </div>
  );
}

// Gọi bọc tạm SVG Wrapper của biểu đồ để tránh phình mã nguồn
function TypographyChart({ stats, selectedMonth }: any) {
  return <StatsLineChart stats={stats} selectedMonth={selectedMonth} />;
}
