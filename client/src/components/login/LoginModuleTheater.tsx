import type { CSSProperties } from 'react';
import { LOGIN_FEATURES, useLoginFeature } from './LoginFeatureContext';
import { cn } from '../../lib/cn';

const CHART_HEIGHTS = [42, 68, 38, 82, 55, 74, 48, 88];

function DashboardPanel({ visible }: { visible: boolean }) {
  return (
    <div className={cn('login-atlas-panel', visible && 'login-atlas-panel-on')} aria-hidden={!visible}>
      <div className="login-atlas-panel-head">
        <span className="login-atlas-panel-tag">Live preview</span>
        <h3 className="login-atlas-panel-title">Provincial analytics</h3>
      </div>
      <div className="login-atlas-kpi-row">
        {[
          { label: 'Registered firms', value: '107' },
          { label: 'This month', value: '+24' },
          { label: 'Districts', value: '3' },
        ].map((k) => (
          <div key={k.label} className="login-atlas-kpi">
            <span className="login-atlas-kpi-val">{k.value}</span>
            <span className="login-atlas-kpi-label">{k.label}</span>
          </div>
        ))}
      </div>
      <div className="login-atlas-chart">
        {CHART_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="login-atlas-chart-bar"
            style={
              {
                '--h': `${h}%`,
                '--d': `${i * 60}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

function FirmsPanel({ visible }: { visible: boolean }) {
  const firms = [
    { name: 'Nova Tech MSME', d: 'D1', sector: 'Food' },
    { name: 'Valley Agro Co.', d: 'D2', sector: 'Agri' },
    { name: 'Northwind Fab', d: 'D3', sector: 'Mfg' },
    { name: 'Cagayan Digital', d: 'D1', sector: 'ICT' },
  ];
  return (
    <div className={cn('login-atlas-panel', visible && 'login-atlas-panel-on')} aria-hidden={!visible}>
      <div className="login-atlas-panel-head">
        <span className="login-atlas-panel-tag">Registry</span>
        <h3 className="login-atlas-panel-title">Assisted firm records</h3>
      </div>
      <ul className="login-atlas-firm-list">
        {firms.map((f, i) => (
          <li key={f.name} className="login-atlas-firm-card" style={{ '--i': i } as CSSProperties}>
            <span className="login-atlas-firm-d">{f.d}</span>
            <div>
              <p className="login-atlas-firm-name">{f.name}</p>
              <p className="login-atlas-firm-meta">{f.sector}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MapPanel({ visible }: { visible: boolean }) {
  const pins = [
    { id: 'D1', left: '46%', top: '62%' },
    { id: 'D2', left: '52%', top: '54%' },
    { id: 'D3', left: '38%', top: '38%' },
  ];
  return (
    <div className={cn('login-atlas-panel login-atlas-panel-map', visible && 'login-atlas-panel-on')} aria-hidden={!visible}>
      <div className="login-atlas-panel-head">
        <span className="login-atlas-panel-tag">OpenStreetMap</span>
        <h3 className="login-atlas-panel-title">Cagayan · district pins</h3>
      </div>
      <div className="login-atlas-map-frame">
        <div className="login-atlas-map-stack">
          <img src="/maps/cagayan-8-214-114.png?v=cagayan214" alt="" draggable={false} />
          <img src="/maps/cagayan-8-214-115.png?v=cagayan214" alt="" draggable={false} />
        </div>
        {pins.map((p) => (
          <span key={p.id} className="login-atlas-map-pin" style={{ left: p.left, top: p.top }}>
            <span className="login-atlas-map-pin-dot" />
            <span className="login-atlas-map-pin-label">{p.id}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LoginModuleTheater() {
  const { activeId, active, focus } = useLoginFeature();

  return (
    <div className="login-atlas-theater" aria-live="polite">
      <div className="login-atlas-theater-copy" style={{ opacity: focus }}>
        <p className="login-atlas-eyebrow">{active.tagline}</p>
        <h2 className="login-atlas-headline">{active.title}</h2>
        <p className="login-atlas-lede">{active.detail}</p>
        <p className="login-atlas-opens">
          Opens as <strong>{active.opensAs}</strong>
        </p>
      </div>

      <div className="login-atlas-stage">
        {LOGIN_FEATURES.map((f) => (
          <div key={f.id}>
            {f.id === 'dashboard' && <DashboardPanel visible={activeId === 'dashboard'} />}
            {f.id === 'firms' && <FirmsPanel visible={activeId === 'firms'} />}
            {f.id === 'map' && <MapPanel visible={activeId === 'map'} />}
          </div>
        ))}
      </div>
    </div>
  );
}
