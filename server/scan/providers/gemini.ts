import { parseJsonFromText } from '../utils.ts';

interface ScanProviderInput {
  apiKey: string;
  imageBase64: string;
  prompt: string;
}

export async function scanWithGemini({ apiKey, imageBase64, prompt }: ScanProviderInput): Promise<unknown> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  let response: Response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      },
    );
  } catch (error) {
    throw new Error(
      `Không kết nối được Gemini API. Kiểm tra internet, API key, firewall/VPN hoặc thử lại sau. Chi tiết: ${getErrorMessage(error)}`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'Gemini không scan được ảnh.');

  const text = payload.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('');
  return parseJsonFromText(text);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || '');
}
