import React from 'react';

export type IconName =
  | 'grid' | 'board' | 'file' | 'sitemap' | 'pulse' | 'users' | 'user' | 'bell'
  | 'search' | 'pin' | 'clip' | 'cam' | 'clock' | 'check' | 'checkc' | 'arr'
  | 'x' | 'plus' | 'out' | 'flag' | 'eye' | 'dl' | 'ext' | 'chevD' | 'chevR'
  | 'route' | 'note' | 'send' | 'alert' | 'wrench' | 'refresh' | 'lock' | 'cal'
  | 'layers' | 'shield' | 'inbox' | 'trash' | 'printer' | 'history';

const P: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="4" width="5.2" height="12" rx="1" />
      <rect x="9.4" y="4" width="5.2" height="16" rx="1" />
      <rect x="15.8" y="4" width="5.2" height="9" rx="1" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  sitemap: (
    <>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v3.5M12 11.5H6V16M12 11.5h6V16" />
    </>
  ),
  pulse: <path d="M3 12h4l2.2-6.5L13.5 18l2.2-6H21" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.4 2.8-5.2 5.5-5.2s4.9 1.8 5.5 5.2" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.2 14.6c2.4.2 4 1.9 4.5 4.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20.5c.7-3.9 3.3-6 6.5-6s5.8 2.1 6.5 6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10 19a2.1 2.1 0 0 0 4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.2" />
      <path d="m15.6 15.6 4.6 4.6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.4-6.5-10.2a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.3" />
    </>
  ),
  clip: (
    <path d="M20 11.5 12.6 19a5 5 0 0 1-7.1-7.1l7.9-7.8a3.35 3.35 0 0 1 4.7 4.7l-7.6 7.6a1.7 1.7 0 0 1-2.4-2.4l6.5-6.4" />
  ),
  cam: (
    <>
      <path d="M4 8h3l2-2.5h6L17 8h3a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.5V12l3 2.2" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5L19.5 7" />,
  checkc: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m8.5 12.3 2.6 2.6 4.9-5.4" />
    </>
  ),
  arr: <path d="M4 12h15M13.5 6 19.5 12l-6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  out: (
    <>
      <path d="M14 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H14" />
      <path d="m16 8 4 4-4 4M20 12H9.5" />
    </>
  ),
  flag: (
    <>
      <path d="M5.5 21V4" />
      <path d="M5.5 4.5c4-2.2 7.5 2 12.5 0V13c-5 2-8.5-2.2-12.5 0" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  dl: (
    <>
      <path d="M12 3.5V15M7.5 10.8 12 15.3l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  ext: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10.5 13.5" />
      <path d="M19 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.5" />
    </>
  ),
  chevD: <path d="m6 9.5 6 6 6-6" />,
  chevR: <path d="m9.5 6 6 6-6 6" />,
  route: (
    <>
      <circle cx="6" cy="18.5" r="2.4" />
      <circle cx="18" cy="5.5" r="2.4" />
      <path d="M8.4 18.5H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.4" />
    </>
  ),
  note: (
    <>
      <path d="M4 20h4.2L19.5 8.7a2.15 2.15 0 0 0-3-3L5.2 17z" />
      <path d="m13.6 6.6 3 3" />
      <path d="M4 20l1.2-3" />
    </>
  ),
  send: (
    <>
      <path d="M21 3 3.5 10.4l6.9 2.7L13 20z" />
      <path d="M21 3 10.4 13.1" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 2.5 20h19z" />
      <path d="M12 10v4.2M12 17.2v.1" />
    </>
  ),
  wrench: (
    <path d="M20.2 6.6a5 5 0 0 1-6.5 6.2l-6 6a2.05 2.05 0 0 1-2.9-2.9l6-6a5 5 0 0 1 6.2-6.5l-3 3 .4 2.8 2.8.4z" />
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 3.5V8h-4.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.6" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </>
  ),
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m4.5 13.8 7.5 4.2 7.5-4.2" />
      <path d="m4.5 17.3 7.5 4.2 7.5-4.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 5.8v5.4c0 4.5 3 8.1 7 9.8 4-1.7 7-5.3 7-9.8V5.8z" />
      <path d="m9 11.8 2.2 2.2 4-4.4" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13.5h5l1.8 2.8h4.4l1.8-2.8h5" />
      <path d="M5 5.5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5 7.3 19a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V3.5h10V8" />
      <rect x="3.5" y="8" width="17" height="8.5" rx="1.4" />
      <path d="M7 13.5h10V21H7z" />
      <path d="M17.4 10.8h.1" />
    </>
  ),
  history: (
    <>
      <path d="M4 5v4h4" />
      <path d="M4.6 9A8 8 0 1 1 4 12" />
      <path d="M12 8v4.2l2.8 1.8" />
    </>
  ),
};

export function I({
  n,
  className = 'w-4 h-4',
  sw = 1.7,
}: {
  n: IconName;
  className?: string;
  sw?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[n]}
    </svg>
  );
}

/** Office seal: hex nut + road vanishing into a pin — the City Engineering mark. */
export function Seal({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M24 3.5 41.5 13.6v20.2L24 43.9 6.5 33.8V13.6z" fill="#0d1d31" stroke="#ff6b1c" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M17.5 34.5 21.5 16h1.6l-2 18.5zM30.5 34.5 26.5 16h-1.6l2 18.5z" fill="#56c8f0" opacity="0.9" />
      <path d="M24 17v18" stroke="#f6f2e7" strokeWidth="1.7" strokeDasharray="2.6 3.4" strokeLinecap="round" />
      <circle cx="24" cy="12.4" r="2.6" fill="#ff6b1c" />
      <circle cx="24" cy="12.4" r="1.05" fill="#0d1d31" />
    </svg>
  );
}
