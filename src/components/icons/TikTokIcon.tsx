import type { SVGProps } from 'react';

export function TikTokIcon({
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M19.6 6.7a5.7 5.7 0 0 1-3.4-1.1 5.7 5.7 0 0 1-2.3-3.5h-3v13.4a2.8 2.8 0 1 1-2-2.7V9.6a5.9 5.9 0 1 0 5 5.8V9.5a8.5 8.5 0 0 0 5 1.6V8.2a5.8 5.8 0 0 1-1.3-.1c.4 0 .7-.3 1-.4v-1Z" />
    </svg>
  );
}
