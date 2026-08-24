import { ImageResponse } from 'next/og';

export const alt = 'RabbitMatch — padel, tennis and racket sports';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Social preview card.
 *
 * Deliberately locale-neutral and Latin-only: `ImageResponse` has to be handed
 * a font file to render Cyrillic, and loading one per request on a
 * memory-billed container is a poor trade for a card that is mostly read as a
 * wordmark. Everything here renders in the built-in font.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#B9E901',
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 700, color: '#0B0B0B' }}>RabbitMatch</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 78,
              fontWeight: 700,
              color: '#0B0B0B',
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Find a game. Book a court. Play tonight.
          </div>
          <div style={{ fontSize: 30, color: '#454545' }}>
            Padel · Tennis · Table tennis · Badminton · Squash
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px solid #E3E2DD',
            paddingTop: 28,
            fontSize: 26,
            color: '#7A7A78',
          }}
        >
          <div>rabbitmatch.pro</div>
          <div>iOS · Android · Web · Telegram</div>
        </div>
      </div>
    ),
    size,
  );
}
