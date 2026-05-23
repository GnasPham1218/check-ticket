import React from "react";
import { Field } from "../../components/Field";
import { inputClass } from "../../components/Input";

interface AiSettingsProps {
  provider: string;
  setProvider: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  apiKeyRef: React.MutableRefObject<string>;
}

export const AiSettings: React.FC<AiSettingsProps> = ({
  provider,
  setProvider,
  apiKey,
  setApiKey,
  apiKeyRef,
}) => {
  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <div className="space-y-4">
      <Field label="Nhà cung cấp AI">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className={inputClass}
        >
          <option value="gemini">Gemini</option>
          <option value="openai">ChatGPT / OpenAI</option>
        </select>
      </Field>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="block text-sm font-bold text-ink-700 dark:text-ink-200">
            API key Gemini hoặc OpenAI
          </span>
          <button
            type="button"
            onClick={() => setShowHelp((value) => !value)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-xs font-black text-ink-700 transition hover:bg-brand-100 hover:text-brand-700 dark:bg-white/10 dark:text-ink-200 dark:hover:bg-brand-400/20"
            aria-expanded={showHelp}
            aria-label="Hướng dẫn lấy API key"
            title="Hướng dẫn lấy API key"
          >
            ?
          </button>
        </div>

        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            apiKeyRef.current = e.target.value;
            setApiKey(e.target.value);
            sessionStorage.setItem("aiApiKey", e.target.value);
          }}
          placeholder="Dán API key của bạn"
          autoComplete="off"
          className={inputClass}
        />

        {showHelp && (
          <div className="mt-3 space-y-2 rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-200">
            <p className="font-black">Hướng dẫn lấy API key nhanh:</p>
            <p>
              <span className="font-bold">Gemini:</span> vào Google AI Studio, mở mục API keys, tạo key mới.
            </p>
            <p>
              <span className="font-bold">OpenAI:</span> vào platform.openai.com, mở mục API keys, tạo secret key mới.
            </p>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
              Lưu ý: key bảo mật thường chỉ hiện một lần, hãy lưu lại ngay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
