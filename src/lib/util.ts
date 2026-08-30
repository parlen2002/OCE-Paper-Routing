export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const timeAgo = (ts: number): string => {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)}d ago`;
  return fmtDate(ts);
};

export const fmtDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

export const fmtDT = (ts: number): string =>
  new Date(ts).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export const fmtCoord = (lat: number, lng: number): string =>
  `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;

export const mapsLink = (lat: number, lng: number): string =>
  `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

export const osmEmbed = (lat: number, lng: number): string => {
  const d = 0.0038;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d * 0.72}%2C${
    lng + d
  }%2C${lat + d * 0.72}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
};

export const initials = (name: string): string =>
  name
    .replace(/^(Engr|Mr|Ms|Mrs|Dr)\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const readAsDataURL = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Could not read file'));
    r.readAsDataURL(f);
  });

export const fmtSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const dayLabel = (ts: number): string => {
  const d = new Date(ts);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const truncate = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Maps Unicode punctuation to ASCII so PDF string literals stay in the Latin1 range for btoa(). */
const toLatin1 = (s: string): string =>
  s
    .replace(/[\u2014\u2013\u2212]/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\u00B0/g, ' deg')
    .replace(/\u2026/g, '...')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00B1/g, '+/-')
    .replace(/\u00D7/g, 'x')
    .replace(/[^\u0000-\u00FF]/g, '');

/** Builds a tiny valid single-page PDF (data URL) — used for seeded paperwork attachments. */
export function makeStubPdf(title: string, lines: string[]): string {
  const esc = (s: string) =>
    toLatin1(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  let stream = `BT /F1 15 Tf 56 758 Td (${esc(title)}) Tj ET\n`;
  stream += `BT /F2 9 Tf 56 742 Td (Republic of the Philippines - City of Puerto Princesa - Office of the City Engineer) Tj ET\n`;
  lines.forEach((l, i) => {
    stream += `BT /F2 10 Tf 56 ${712 - i * 16} Td (${esc(l)}) Tj ET\n`;
  });
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += off.toString().padStart(10, '0') + ' 00000 n \n';
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  try {
    return 'data:application/pdf;base64,' + btoa(pdf);
  } catch {
    // Never let attachment generation take the app down at startup.
    const bytes = new TextEncoder().encode(pdf);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    try {
      return 'data:application/pdf;base64,' + btoa(bin);
    } catch {
      return 'data:text/plain;charset=utf-8,' + encodeURIComponent('[Attachment data unavailable]');
    }
  }
}
