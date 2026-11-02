import { useState } from 'react';
import { Link } from 'react-router-dom';
import { parseAmount, pesoCompact } from '../../lib/format';
import type { FirmLocation } from '../../types';

type Props = {
  loc: FirmLocation;
  lat: number;
  lng: number;
  registryHref: string;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
};

function initials(name: string): string {
  const words = name.replace(/['’]s\b/g, '').split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

/** Spotlight card for the pin selected on the map. Render with `key={loc.id}` so state resets per pin. */
export function FirmLocationCard({ loc, lat, lng, registryHref, onClose, onEdit, onRemove }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const amount = parseAmount(loc.amount);

  async function copy() {
    try {
      await navigator.clipboard.writeText(coords);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard can be blocked; the coordinates stay visible either way */
    }
  }

  return (
    <article className="flc">
      <header className={loc.photo ? 'flc-head flc-head-photo' : 'flc-head'}>
        {loc.photo && <img src={loc.photo} alt="" className="flc-photo" />}
        <button type="button" className="flc-close" onClick={onClose} aria-label="Close firm preview">
          ×
        </button>
        <div className="flc-id">
          {!loc.photo && (
            <span className="flc-mono" aria-hidden>
              {initials(loc.firm)}
            </span>
          )}
          <div className="min-w-0">
            <p className="flc-kicker">
              District {loc.district} · {loc.sector}
            </p>
            <h3 className="flc-title">{loc.firm}</h3>
            <p className="flc-owner">{loc.beneficiary}</p>
          </div>
        </div>
      </header>

      <div className="flc-body">
        {loc.project_title && <p className="flc-project">{loc.project_title}</p>}

        <dl className="flc-stats">
          <div>
            <dt>Assistance</dt>
            <dd>{amount ? pesoCompact(amount) : '—'}</dd>
          </div>
          <div>
            <dt>Employees</dt>
            <dd>{loc.employee || '—'}</dd>
          </div>
          <div>
            <dt>District</dt>
            <dd>D{loc.district}</dd>
          </div>
        </dl>

        {loc.equipment && (
          <p className="flc-line">
            <span>Equipment</span>
            {loc.equipment}
          </p>
        )}

        <button type="button" className="flc-coords" onClick={copy} title="Copy coordinates">
          <span className="flc-dot" aria-hidden />
          <span className="flex-1 text-left">{coords}</span>
          <span className="flc-copy">{copied ? 'Copied ✓' : 'Copy'}</span>
        </button>
      </div>

      <footer className="flc-foot">
        {confirming ? (
          <div className="flc-confirm" role="alertdialog" aria-label="Confirm removal">
            <p>Remove this pin? The firm stays in the registry.</p>
            <div className="flc-actions">
              <button type="button" className="flc-btn flc-btn-ghost" onClick={() => setConfirming(false)}>
                Keep pin
              </button>
              <button type="button" className="flc-btn flc-btn-danger" onClick={onRemove} autoFocus>
                Yes, remove
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flc-actions">
              <Link to={registryHref} className="flc-btn flc-btn-primary">
                Open in registry
              </Link>
              <button type="button" className="flc-btn flc-btn-ghost" onClick={onEdit}>
                Edit pin
              </button>
            </div>
            <button type="button" className="flc-remove" onClick={() => setConfirming(true)}>
              Remove pin from map
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
