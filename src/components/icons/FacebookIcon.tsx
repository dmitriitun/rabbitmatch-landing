import type { SVGProps } from 'react';

export function FacebookIcon({
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
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.6-1.5h1.4V4.4c-.2 0-1-.1-2-.1-2 0-3.4 1.2-3.4 3.5v2.7H8.5v3h2.6V21h2.4Z" />
    </svg>
  );
}
