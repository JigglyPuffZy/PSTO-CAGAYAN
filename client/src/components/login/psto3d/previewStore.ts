import type { LayoutKey } from './layouts';

export type LabelScreenPos = { x: number; y: number; visible: boolean };

export type PreviewOverlayState = {
  active: LayoutKey;
  moduleLabel: LabelScreenPos;
  pinLabels: LabelScreenPos[];
  caption: string;
};

const defaultLabel = (): LabelScreenPos => ({ x: 0, y: 0, visible: false });

let state: PreviewOverlayState = {
  active: 'dashboard',
  moduleLabel: defaultLabel(),
  pinLabels: [defaultLabel(), defaultLabel(), defaultLabel()],
  caption: '',
};

const listeners = new Set<() => void>();

export function getPreviewOverlayState() {
  return state;
}

export function setPreviewOverlayState(partial: Partial<PreviewOverlayState>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

export function subscribePreviewOverlay(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type TooltipState = { text: string; x: number; y: number; visible: boolean };

let tooltip: TooltipState = { text: '', x: 0, y: 0, visible: false };

export function getPreviewTooltip() {
  return tooltip;
}

export function setPreviewTooltip(next: TooltipState) {
  tooltip = next;
  listeners.forEach((l) => l());
}

export function subscribePreviewUi(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
