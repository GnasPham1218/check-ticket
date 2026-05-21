export function parseJsonFromText<T = unknown>(text: unknown): T {
  if (!text) throw new Error('AI không trả về dữ liệu vé số.');

  const cleanText = String(text)
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

  try {
    return JSON.parse(cleanText) as T;
  } catch {
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Không đọc được JSON từ kết quả AI.');
    return JSON.parse(match[0]) as T;
  }
}
