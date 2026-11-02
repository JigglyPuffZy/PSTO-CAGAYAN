import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type LoginFeatureId = 'dashboard' | 'firms' | 'map';

export type LoginFeature = {
  id: LoginFeatureId;
  title: string;
  tagline: string;
  detail: string;
  opensAs: string;
};

export const LOGIN_FEATURES: LoginFeature[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    tagline: 'Home · analytics',
    detail: 'See total firms, district breakdowns, monthly intake, and project status charts.',
    opensAs: 'Home screen after login',
  },
  {
    id: 'firms',
    title: 'Firm registry',
    tagline: 'MSME database',
    detail: 'Look up assisted businesses, edit records, and keep provincial firm data current.',
    opensAs: 'Firms menu',
  },
  {
    id: 'map',
    title: 'Location maps',
    tagline: 'Geography · districts',
    detail: 'View firm locations on the map across District 1, 2, and 3 in Cagayan.',
    opensAs: 'Maps menu',
  },
];

type LoginFeatureContextValue = {
  activeId: LoginFeatureId;
  activeIndex: number;
  active: LoginFeature;
  focus: number;
  cycleProgress: number;
  paused: boolean;
  setActiveId: (id: LoginFeatureId) => void;
  pauseCycle: () => void;
  resumeCycle: () => void;
};

const LoginFeatureContext = createContext<LoginFeatureContextValue | null>(null);

export const LOGIN_FEATURE_CYCLE_MS = 6000;

export function LoginFeatureProvider({ children }: { children: ReactNode }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [focus, setFocus] = useState(1);
  const [paused, setPaused] = useState(false);
  const [cycleProgress, setCycleProgress] = useState(0);
  const cycleStart = useRef(Date.now());

  const active = LOGIN_FEATURES[activeIndex]!;
  const activeId = active.id;

  const setActiveId = useCallback((id: LoginFeatureId) => {
    const idx = LOGIN_FEATURES.findIndex((f) => f.id === id);
    if (idx >= 0) {
      setActiveIndex(idx);
      setFocus(1);
      cycleStart.current = Date.now();
      setCycleProgress(0);
    }
  }, []);

  useEffect(() => {
    setFocus(0);
    cycleStart.current = Date.now();
    setCycleProgress(0);
    const r = requestAnimationFrame(() => setFocus(1));
    return () => cancelAnimationFrame(r);
  }, [activeIndex]);

  useEffect(() => {
    if (paused) return;
    const timer = globalThis.setInterval(() => {
      setActiveIndex((i) => (i + 1) % LOGIN_FEATURES.length);
    }, LOGIN_FEATURE_CYCLE_MS);
    return () => globalThis.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (!paused) {
        const elapsed = Date.now() - cycleStart.current;
        setCycleProgress(Math.min(1, elapsed / LOGIN_FEATURE_CYCLE_MS));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, paused]);

  const value = useMemo(
    () => ({
      activeId,
      activeIndex,
      active,
      focus,
      cycleProgress,
      paused,
      setActiveId,
      pauseCycle: () => setPaused(true),
      resumeCycle: () => {
        setPaused(false);
        cycleStart.current = Date.now();
      },
    }),
    [active, activeId, activeIndex, cycleProgress, focus, paused, setActiveId]
  );

  return <LoginFeatureContext.Provider value={value}>{children}</LoginFeatureContext.Provider>;
}

export function useLoginFeature() {
  const ctx = useContext(LoginFeatureContext);
  if (!ctx) throw new Error('useLoginFeature must be used within LoginFeatureProvider');
  return ctx;
}
