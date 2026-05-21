export function formatDate(date?: string): string {
  if (!date) return '';
  const [year, month, day] = String(date).split('-');
  return day && month && year ? `${day}/${month}/${year}` : date;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function compactMoney(value: number): string {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const sign = num >= 0 ? '+' : '-';
  if (abs >= 1e6) {
    const formatted = (abs / 1e6).toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}M`;
  }
  if (abs >= 1e3) {
    const formatted = (abs / 1e3).toFixed(0);
    return `${sign}${formatted}k`;
  }
  return `${sign}${abs} ₫`;
}

