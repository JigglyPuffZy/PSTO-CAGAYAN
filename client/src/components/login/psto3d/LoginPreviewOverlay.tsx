import { useSyncExternalStore } from 'react';
import { LAYOUTS, MAP_PINS } from './layouts';
import { getPreviewOverlayState, getPreviewTooltip, subscribePreviewUi } from './previewStore';

export function LoginPreviewOverlay() {
  const overlay = useSyncExternalStore(subscribePreviewUi, getPreviewOverlayState, getPreviewOverlayState);
  const tip = useSyncExternalStore(subscribePreviewUi, getPreviewTooltip, getPreviewTooltip);
  const moduleText = LAYOUTS[overlay.active].label;

  return (
    <>
      <div className="psto-labels" aria-hidden>
        <div
          className={`psto-label ${overlay.moduleLabel.visible ? 'psto-label-on' : ''}`}
          style={{
            left: overlay.moduleLabel.x,
            top: overlay.moduleLabel.y,
          }}
        >
          {moduleText}
        </div>
        {MAP_PINS.map((pin, i) => {
          const pos = overlay.pinLabels[i];
          if (!pos?.visible) return null;
          return (
            <div
              key={pin.name}
              className="psto-label psto-pin-label psto-label-on"
              style={{ left: pos.x, top: pos.y }}
            >
              {pin.name}
            </div>
          );
        })}
      </div>
      <div
        className="psto-tip"
        style={{
          left: tip.x,
          top: tip.y,
          opacity: tip.visible ? 1 : 0,
        }}
      >
        {tip.text}
      </div>
    </>
  );
}

export function LoginPreviewCaption() {
  const overlay = useSyncExternalStore(subscribePreviewUi, getPreviewOverlayState, getPreviewOverlayState);
  return (
    <p className="psto-caption" aria-live="polite">
      {overlay.caption || LAYOUTS.dashboard.caption}
    </p>
  );
}
