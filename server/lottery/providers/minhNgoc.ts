import { badRequest } from '../../shared/httpError.ts';
import type { Prize, Ticket } from '../../types.ts';

const PRIZE_LABELS: Array<[string, string[]]> = [
  ['Giải ĐB', ['giai db', 'giai dac biet']],
  ['Giải nhất', ['giai nhat', 'g. nhat']],
  ['Giải nhì', ['giai nhi', 'g. nhi']],
  ['Giải ba', ['giai ba', 'g. ba']],
  ['Giải tư', ['giai tu', 'g. tu']],
  ['Giải năm', ['giai nam', 'g. nam']],
  ['Giải sáu', ['giai sau', 'g. sau']],
  ['Giải bảy', ['giai bay', 'g. bay']],
  ['Giải tám', ['giai 8', 'giai tam', 'g. tam']],
];

type ProvinceRouteTuple = [province: string, region: string, slug: string, aliases?: string[]];

const PROVINCES: ProvinceRouteTuple[] = [
  ['An Giang', 'mien-nam', 'an-giang'],
  ['Bạc Liêu', 'mien-nam', 'bac-lieu'],
  ['Bến Tre', 'mien-nam', 'ben-tre'],
  ['Bình Dương', 'mien-nam', 'binh-duong'],
  ['Bình Phước', 'mien-nam', 'binh-phuoc'],
  ['Bình Thuận', 'mien-nam', 'binh-thuan'],
  ['Cà Mau', 'mien-nam', 'ca-mau'],
  ['Cần Thơ', 'mien-nam', 'can-tho'],
  ['Đà Lạt', 'mien-nam', 'da-lat'],
  ['Đồng Nai', 'mien-nam', 'dong-nai'],
  ['Đồng Tháp', 'mien-nam', 'dong-thap'],
  ['Hậu Giang', 'mien-nam', 'hau-giang'],
  ['Kiên Giang', 'mien-nam', 'kien-giang'],
  ['Long An', 'mien-nam', 'long-an'],
  ['Sóc Trăng', 'mien-nam', 'soc-trang'],
  ['Tây Ninh', 'mien-nam', 'tay-ninh'],
  ['Tiền Giang', 'mien-nam', 'tien-giang'],
  ['TP. HCM', 'mien-nam', 'tp-hcm', ['Hồ Chí Minh', 'TP HCM', 'TPHCM', 'Sài Gòn', 'Sai Gon']],
  ['Trà Vinh', 'mien-nam', 'tra-vinh'],
  ['Vĩnh Long', 'mien-nam', 'vinh-long'],
  ['Vũng Tàu', 'mien-nam', 'vung-tau', ['Bà Rịa Vũng Tàu', 'Ba Ria Vung Tau']],
  ['Bình Định', 'mien-trung', 'binh-dinh'],
  ['Đà Nẵng', 'mien-trung', 'da-nang'],
  ['Đắk Lắk', 'mien-trung', 'dak-lak', ['Đắc Lắc', 'Dak Lak']],
  ['Đắk Nông', 'mien-trung', 'dak-nong', ['Đắc Nông', 'Dak Nong']],
  ['Gia Lai', 'mien-trung', 'gia-lai'],
  ['Khánh Hòa', 'mien-trung', 'khanh-hoa'],
  ['Kon Tum', 'mien-trung', 'kon-tum'],
  ['Ninh Thuận', 'mien-trung', 'ninh-thuan'],
  ['Phú Yên', 'mien-trung', 'phu-yen'],
  ['Quảng Bình', 'mien-trung', 'quang-binh'],
  ['Quảng Nam', 'mien-trung', 'quang-nam'],
  ['Quảng Ngãi', 'mien-trung', 'quang-ngai'],
  ['Quảng Trị', 'mien-trung', 'quang-tri'],
  ['Huế', 'mien-trung', 'hue', ['Thừa Thiên Huế', 'Thua Thien Hue']],
  ['Bắc Ninh', 'mien-bac', 'bac-ninh'],
  ['Hà Nội', 'mien-bac', 'ha-noi', ['Miền Bắc', 'Mien Bac', 'Xổ số miền Bắc']],
  ['Hải Phòng', 'mien-bac', 'hai-phong'],
  ['Nam Định', 'mien-bac', 'nam-dinh'],
  ['Quảng Ninh', 'mien-bac', 'quang-ninh'],
  ['Thái Bình', 'mien-bac', 'thai-binh'],
];

interface ProvinceRoute {
  province: string;
  region: string;
  slug: string;
}

const PROVINCE_ROUTES = buildProvinceRoutes();

export async function fetchMinhNgocResult(ticket: Ticket) {
  const route = getProvinceRoute(ticket.province);
  if (!route) throw badRequest(`Chưa hỗ trợ Minh Ngọc cho tỉnh "${ticket.province}".`);

  const datePath = formatDatePath(ticket.drawDate);
  const url = `https://www.minhngoc.net.vn/ket-qua-xo-so/${route.region}/${route.slug}/${datePath}.html`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 LotteryChecker/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw badRequest(`Không lấy được kết quả Minh Ngọc cho ${route.province} ngày ${ticket.drawDate}.`);
  }

  const html = await response.text();
  const text = htmlToText(html);
  const actualDrawDate = extractDrawDate(text) || ticket.drawDate;
  const prizes = normalizePrizeCounts(parsePrizes(text), route.region);
  if (!prizes.length) throw new Error('Không phân tích được bảng kết quả từ Minh Ngọc.');

  return {
    province: route.province,
    drawDate: actualDrawDate,
    source: 'Minh Ngọc',
    sourceUrl: url,
    prizes,
    raw: {
      sourceUrl: url,
      text: text.slice(0, 5000),
    },
  };
}

function extractDrawDate(text: string): string | undefined {
  const match = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function buildProvinceRoutes(): Record<string, ProvinceRoute> {
  return PROVINCES.reduce<Record<string, ProvinceRoute>>((routes, [province, region, slug, aliases = []]) => {
    const route = { province, region, slug };
    for (const name of [province, slug, ...aliases]) routes[normalizeName(name)] = route;
    return routes;
  }, {});
}

function getProvinceRoute(province: string): ProvinceRoute | undefined {
  return PROVINCE_ROUTES[normalizeName(province)];
}

function formatDatePath(date: string): string {
  const [year, month, day] = String(date || '').split('-');
  if (!year || !month || !day) throw badRequest('Ngày xổ phải có dạng YYYY-MM-DD.');
  return `${day}-${month}-${year}`;
}

function parsePrizes(text: string): Prize[] {
  const compactText = text.replace(/\s+/g, ' ').trim();
  const searchableText = getPrimaryResultBlock(stripMarks(compactText));

  return PRIZE_LABELS.map(([prize, aliases], index) => {
    const startAlias = aliases.find((alias) => searchableText.includes(alias));
    if (!startAlias) return null;
    const start = searchableText.indexOf(startAlias) + startAlias.length;
    const nextAliases = PRIZE_LABELS.slice(index + 1).flatMap(([, nextPrizeAliases]) => nextPrizeAliases);
    const nextPositions = nextAliases
      .map((alias) => searchableText.indexOf(alias, start))
      .filter((position) => position !== -1);
    const end = nextPositions.length ? Math.min(...nextPositions) : findResultTableEnd(searchableText, start);
    const content = searchableText.slice(start, end);
    const numbers = content.match(/\b\d{2,6}\b/g) || [];
    return numbers.length ? { prize, numbers } : null;
  }).filter(Boolean) as Prize[];
}

function normalizePrizeCounts(prizes: Prize[], region: string): Prize[] {
  if (region === 'mien-bac') return prizes;
  const byName = new Map(prizes.map((prize) => [prize.prize, [...(prize.numbers || [])]]));
  if (!byName.has('Giải nhì') && (byName.get('Giải nhất')?.length || 0) > 1) {
    const numbers = byName.get('Giải nhất') || [];
    byName.set('Giải nhất', numbers.slice(0, 1));
    byName.set('Giải nhì', numbers.slice(1, 2));
  }
  if (!byName.has('Giải sáu') && (byName.get('Giải năm')?.length || 0) > 1) {
    const numbers = byName.get('Giải năm') || [];
    byName.set('Giải năm', numbers.slice(0, 1));
    byName.set('Giải sáu', numbers.slice(1, 4));
  }
  const order = ['Giải ĐB', 'Giải nhất', 'Giải nhì', 'Giải ba', 'Giải tư', 'Giải năm', 'Giải sáu', 'Giải bảy', 'Giải tám'];
  return order
    .filter((prize) => byName.get(prize)?.length)
    .map((prize) => ({ prize, numbers: byName.get(prize) || [] }));
}

function findResultTableEnd(text: string, start: number): number {
  const endMarkers = [
    'chuc so',
    'doi so trung',
    'xsmt thu',
    'xsmn thu',
    'xsmb thu',
    'kqxs mien',
    'so dau duoi',
    'ket qua xo so mien',
    'tuong thuat truc tiep',
    'lich quay so',
  ];
  const positions = endMarkers.map((marker) => text.indexOf(marker, start)).filter((position) => position !== -1);
  return positions.length ? Math.min(...positions) : text.length;
}

function getPrimaryResultBlock(text: string): string {
  const startMarkers = [
    'giai db',
    'giai dac biet',
    'thu hai ngay',
    'thu ba ngay',
    'thu tu ngay',
    'thu nam ngay',
    'thu sau ngay',
    'thu bay ngay',
    'chu nhat ngay',
  ];
  const startPositions = startMarkers.map((marker) => text.indexOf(marker)).filter((position) => position !== -1);
  const start = startPositions.length ? Math.min(...startPositions) : 0;
  const end = findResultTableEnd(text, start);
  return text.slice(start, end);
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(td|th|tr|div|p|li|h1|h2|h3)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\u00a0/g, ' '),
  );
}

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&Ecirc;': 'Ê',
  '&agrave;': 'à',
  '&egrave;': 'è',
  '&aacute;': 'á',
  '&igrave;': 'ì',
  '&uacute;': 'ú',
  '&eacute;': 'é',
  '&ograve;': 'ò',
  '&Yacute;': 'Ý',
  '&Acirc;': 'Â',
  '&ocirc;': 'ô',
  '&Uacute;': 'Ú',
  '&Ocirc;': 'Ô',
  '&ecirc;': 'ê',
  '&trade;': '™',
  '&copy;': '©'
};

function decodeHtmlEntities(value: string): string {
  let decoded = value;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.replaceAll(entity, char);
  }
  return decoded.replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function normalizeName(value: string): string {
  return stripMarks(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMarks(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
