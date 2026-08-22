type P = { className?: string };

const base = "h-[1.15em] w-[1.15em]";

export function IconCompass({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChat({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M20 12a7.5 7.5 0 0 1-7.5 7.5H8L4 22v-4.2A7.5 7.5 0 0 1 12.5 4.5 7.5 7.5 0 0 1 20 12Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDoc({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}

export function IconBook({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" strokeLinejoin="round" />
      <path d="M19 18v3H6.5A2.5 2.5 0 0 1 4 18.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPen({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" strokeLinejoin="round" />
      <path d="M14 6l4 4" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlus({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={`${base} ${className}`}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function IconSend({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`${base} ${className}`}>
      <path d="M12 19V6M6 12l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconStop({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

export function IconCopy({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheck({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${base} ${className}`}>
      <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTrash({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSettings({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h5M13 12h7" strokeLinecap="round" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
      <circle cx="11" cy="12" r="2" />
    </svg>
  );
}

export function IconMenu({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`${base} ${className}`}>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function IconClose({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`${base} ${className}`}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

export function IconDownload({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M12 4v11M8 11l4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRefresh({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconKey({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M15.5 12v2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconCalendar({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
    </svg>
  );
}

export function IconList({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M9 6h11M9 12h11M9 18h11" strokeLinecap="round" />
      <path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBookmark({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevron({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={`${base} ${className}`}>
      <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPrint({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M7 9V4h10v5M7 19H5.5A1.5 1.5 0 0 1 4 17.5v-5A1.5 1.5 0 0 1 5.5 11h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" strokeLinejoin="round" />
      <rect x="7" y="15" width="10" height="5.5" rx="1" />
    </svg>
  );
}

export function IconInbox({ className = "" }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={`${base} ${className}`}>
      <path d="M4 13.5 6 5h12l2 8.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
      <path d="M4 13.5h4l1 2.5h6l1-2.5h4" strokeLinejoin="round" />
    </svg>
  );
}

export const MODE_ICONS: Record<string, (p: P) => React.ReactElement> = {
  compass: IconCompass,
  chat: IconChat,
  doc: IconDoc,
  book: IconBook,
  pen: IconPen,
};
