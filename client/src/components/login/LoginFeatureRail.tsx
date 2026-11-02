import { cn } from '../../lib/cn';
import { IconDashboard, IconFirms, IconMap } from '../icons/NavIcons';
import { LOGIN_FEATURES, useLoginFeature, type LoginFeatureId } from './LoginFeatureContext';

const ICONS: Record<LoginFeatureId, typeof IconDashboard> = {
  dashboard: IconDashboard,
  firms: IconFirms,
  map: IconMap,
};

export function LoginFeatureRail() {
  const { activeId, setActiveId, cycleProgress, paused, pauseCycle, resumeCycle } = useLoginFeature();

  return (
    <div className="login-feature-rail login-feature-rail-compact">
      <div
        className="login-feature-tabs"
        role="tablist"
        aria-label="Portal modules"
        onMouseEnter={pauseCycle}
        onMouseLeave={resumeCycle}
      >
        {LOGIN_FEATURES.map((feature, index) => {
          const Icon = ICONS[feature.id];
          const isActive = feature.id === activeId;
          return (
            <button
              key={feature.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn('login-feature-tab', isActive && 'login-feature-tab-active')}
              onClick={() => setActiveId(feature.id)}
            >
              <span className="login-feature-tab-num">{index + 1}</span>
              <span className="login-feature-tab-icon">
                <Icon className="h-5 w-5" />
              </span>
              <span className="login-feature-tab-label">
                {index + 1}. {feature.title}
              </span>
              {isActive && (
                <span
                  className="login-feature-tab-progress"
                  style={{ transform: `scaleX(${paused ? 1 : cycleProgress})` }}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
