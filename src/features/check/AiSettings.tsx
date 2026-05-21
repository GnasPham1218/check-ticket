import React from "react";
import { Field } from "../../components/Field";
import { inputClass } from "../../components/Input";

interface AiSettingsProps {
  provider: string;
  setProvider: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  apiKeyRef: React.MutableRefObject<string>;
  compact?: boolean;
}

export const AiSettings: React.FC<AiSettingsProps> = ({
  provider,
  setProvider,
  apiKey,
  setApiKey,
  apiKeyRef,
  compact = false,
}) => {
  return (
    <>
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
      <Field label={compact ? "API key để scan nhiều ảnh" : "API key Gemini hoặc OpenAI"}>
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
      </Field>
    </>
  );
};