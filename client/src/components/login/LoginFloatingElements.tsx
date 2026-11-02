import { DOST } from '../../lib/dost-colors';

type Zone = 'brand' | 'main';

export function LoginFloatingElements({ zone }: { zone: Zone }) {
  if (zone === 'brand') {
    return (
      <div className="login-float-layer login-float-layer-brand" aria-hidden>
        <div className="login-float-ring login-float-animated login-float-delay-1" />
        <div className="login-float-ring login-float-ring-sm login-float-animated login-float-delay-3" />

        <div className="login-float-glass login-float-card-brand login-float-animated login-float-delay-2 login-float-card-brand-lg">
          <div className="flex h-12 items-end gap-1.5">
            {[36, 58, 44, 72, 52].map((h, i) => (
              <span
                key={i}
                className="w-2 rounded-sm bg-white/90"
                style={{ height: `${h}%`, opacity: 0.55 + i * 0.08 }}
              />
            ))}
          </div>
        </div>

        <div className="login-float-glass login-float-dot-cluster login-float-animated login-float-delay-4">
          {[
            { x: '22%', y: '35%' },
            { x: '58%', y: '28%' },
            { x: '72%', y: '62%' },
            { x: '38%', y: '68%' },
          ].map((p, i) => (
            <span
              key={i}
              className="login-float-map-dot"
              style={{ left: p.x, top: p.y, opacity: 0.5 + i * 0.12 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="login-float-layer login-float-layer-main" aria-hidden>
      <div className="login-float-blob login-float-animated login-float-delay-2" />

      <div className="login-float-glass login-float-card-main-a login-float-animated login-float-delay-1">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `linear-gradient(145deg, ${DOST.wash}, white)` }}
          >
            <svg className="h-4 w-4 text-[var(--dost-primary)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
            </svg>
          </span>
          <span className="h-2 flex-1 rounded-full bg-[var(--dost-pale)]" />
        </div>
        <div className="mt-3 h-16 rounded-xl bg-[var(--dost-wash)]">
          <svg className="h-full w-full" viewBox="0 0 120 48" preserveAspectRatio="none">
            <path
              d="M0 38 L24 28 L48 32 L72 18 L96 24 L120 12"
              fill="none"
              stroke={DOST.primary}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.45"
            />
            <path
              d="M0 38 L24 28 L48 32 L72 18 L96 24 L120 12 V48 H0 Z"
              fill={DOST.primary}
              opacity="0.08"
            />
          </svg>
        </div>
      </div>

      <div className="login-float-glass login-float-card-main-b login-float-animated login-float-delay-3">
        <div className="grid grid-cols-3 gap-2">
          {[DOST.primary, DOST.mid, DOST.soft].map((c, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl"
              style={{
                background: `linear-gradient(160deg, ${c}22, ${c}08)`,
                boxShadow: `inset 0 0 0 1px ${c}28`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="login-float-pill login-float-animated login-float-delay-4">
        <span className="login-float-pill-dot" />
      </div>
    </div>
  );
}
