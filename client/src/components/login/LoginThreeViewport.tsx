import { useRef, useState } from 'react';
import { LoginThreeBackground } from './LoginThreeBackground';
import { LoginPreviewCaption, LoginPreviewOverlay } from './psto3d/LoginPreviewOverlay';

export function LoginThreeViewport() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [noWebgl, setNoWebgl] = useState(false);

  return (
    <div className="psto-preview-wrap">
      <div
        className={`login-three-viewport psto-stage${noWebgl ? ' psto-no-webgl' : ''}`}
        ref={stageRef}
        aria-label="Animated preview"
      >
        {!noWebgl && <LoginPreviewOverlay />}
        {!noWebgl && <LoginThreeBackground stageRef={stageRef} onUnavailable={() => setNoWebgl(true)} />}
        {noWebgl && (
          <div className="psto-fallback">
            3D preview is unavailable on this device. Use the tabs to switch modules.
          </div>
        )}
      </div>
      {!noWebgl && <LoginPreviewCaption />}
    </div>
  );
}
