import { parseJsonFromText } from '../utils.ts';

interface ScanProviderInput {
  apiKey: string;
  imageBase64: string;
  prompt: string;
}

export async function scanWithOpenAI({ apiKey, imageBase64, prompt }: ScanProviderInput): Promise<unknown> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  let response: Response;

  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });
  } catch (error) {
    throw new Error(
      `Không kết nối được OpenAI API. Kiểm tra internet, API key, firewall/VPN hoặc thử lại sau. Chi tiết: ${getErrorMessage(error)}`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'OpenAI không scan được ảnh.');

  return parseJsonFromText(payload.choices?.[0]?.message?.content);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || '');
}
