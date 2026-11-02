import { useEffect, useRef, type RefObject } from 'react';
import { useLoginFeature } from './LoginFeatureContext';
import { featureToLayout } from './psto3d/layouts';
import { preloadPhilippinesOsmMap } from './psto3d/osmMapTexture';
import { mountPstoPreview, type PstoPreviewHandle } from './psto3d/mountPstoPreview';

preloadPhilippinesOsmMap();

type Props = {
  stageRef: RefObject<HTMLElement | null>;
  onUnavailable?: () => void;
};

export function LoginThreeBackground({ stageRef, onUnavailable }: Props) {
  const { activeId } = useLoginFeature();
  const handleRef = useRef<PstoPreviewHandle | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const initial = featureToLayout(activeId);
    const handle = mountPstoPreview(stage, initial);
    if (!handle) {
      onUnavailable?.();
      return;
    }
    handleRef.current = handle;

    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [stageRef, onUnavailable]);

  useEffect(() => {
    handleRef.current?.goTo(featureToLayout(activeId));
  }, [activeId]);

  return null;
}
