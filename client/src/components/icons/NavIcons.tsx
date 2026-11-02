import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function IconDashboard(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path strokeLinecap="round" d="M4 14h4v6H4zM10 4h4v16h-4zM16 9h4v11h-4z" />
    </svg>
  );
}

export function IconFirms(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"
      />
    </svg>
  );
}

export function IconMap(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 20l-6-3V4l6 3m0 13l6-3m-6 3V7m6 10l6-3V4l-6 3m0 13V7"
      />
    </svg>
  );
}

export function IconMonitor(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 16V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10" />
      <path strokeLinecap="round" d="M8 11h3M8 14h5" />
      <circle cx="16.5" cy="12.5" r="2.5" />
    </svg>
  );
}

export function IconAbout(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4M21 5v14" />
    </svg>
  );
}
