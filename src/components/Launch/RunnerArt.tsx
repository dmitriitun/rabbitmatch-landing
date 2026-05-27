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

        {/* Neck + spine to hips */}
        <polyline points="210,106 205,150 200,200 200,235" />

        {/* Leading leg: hips → bent knee on next step → foot planted on step (y=275) */}
        <polyline points="200,235 235,255 230,275" />

        {/* Trailing leg: hips → knee → foot planted on lower step (y=340) */}
        <polyline points="200,235 180,290 170,340" />

        {/* Trailing arm swung back */}
        <polyline points="205,150 175,170 160,205" />

        {/* Leading arm swung forward */}
        <polyline points="205,150 240,168 258,200" />
      </g>
    </svg>
  );
}
