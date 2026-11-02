import { cn } from '../../lib/cn';
import { IconDashboard, IconFirms, IconMap } from '../icons/NavIcons';
import { LOGIN_FEATURES, useLoginFeature, type LoginFeatureId } from './LoginFeatureContext';

const ICONS: Record<LoginFeatureId, typeof IconDashboard> = {
  dashboard: IconDashboard,
  firms: IconFirms,
  map: IconMap,
};

export function LoginModuleRail() {
  const { activeId, setActiveId, cycleProgress, paused, pauseCycle, resumeCycle } = useLoginFeature();

  return (
    <nav
      className="login-atlas-rail"
      aria-label="Portal modules"
      onMouseEnter={pauseCycle}
      onMouseLeave={resumeCycle}
    >
      {LOGIN_FEATURES.map((feature) => {
        const Icon = ICONS[feature.id];
        const isActive = feature.id === activeId;
        return (
          <button
            key={feature.id}
            type="button"
            className={cn('login-atlas-rail-btn', isActive && 'login-atlas-rail-btn-active')}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => setActiveId(feature.id)}
          >
            <span className="login-atlas-rail-icon">
              <Icon className="h-5 w-5" />
            </span>
            <span className="login-atlas-rail-text">
              <span className="login-atlas-rail-title">{feature.title}</span>
              <span className="login-atlas-rail-sub">{feature.tagline}</span>
            </span>
            {isActive && (
              <span
                className="login-atlas-rail-progress"
                style={{ transform: `scaleX(${paused ? 1 : cycleProgress})` }}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
