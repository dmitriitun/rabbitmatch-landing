import type { SVGProps } from 'react';

export function TelegramIcon({
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
      <path d="M21.94 4.36a1.4 1.4 0 0 0-1.46-.22L3.3 10.83a1.27 1.27 0 0 0 .07 2.39l3.83 1.25 2.12 6.34a1.27 1.27 0 0 0 2.05.5l2.36-2.16 4.27 3.13a1.27 1.27 0 0 0 2-.78l3.18-15.39a1.4 1.4 0 0 0-.24-1.75ZM10.1 14.66l-.36 3.7-1.32-3.96 8.51-6.6-6.83 6.86Z" />
    </svg>
  );
}
