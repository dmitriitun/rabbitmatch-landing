import styles from './Launch.module.css';

export function RunnerArt({ ariaLabel }: { ariaLabel: string }) {
  return (
    <svg
      className={styles.runnerSvg}
      viewBox="0 0 320 420"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      strokeLinecap="square"
      strokeLinejoin="miter"
      fill="none"
      stroke="currentColor"
      strokeWidth="8"
    >
      <defs>
        <filter id="runner-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#runner-glow)">
        {/* Steps under the runner */}
        <polyline points="40,400 100,400 100,340 175,340 175,275 260,275 260,205 305,205" />

        {/* Head */}
        <circle cx="210" cy="80" r="26" />

        {/* Spine + torso */}
        <polyline points="208,105 195,150 180,205 168,260" />

        {/* Hips → leading leg (lifted to the next step) */}
        <polyline points="168,260 222,235 250,210" />

        {/* Trailing leg planted on the lower step */}
        <polyline points="168,260 165,310 175,340" />

        {/* Trailing arm swung back */}
        <polyline points="195,150 162,138 134,162" />

        {/* Leading arm swung forward */}
        <polyline points="195,150 230,140 252,170" />
      </g>
    </svg>
  );
}
