export type SessionDurationOption = {
  value: number;
  label: string;
};

export type FactoryScene = {
  id: string;
  label: string;
  location: string;
  cue: string;
  description: string;
  background: string;
  accent: string;
  castIds: string[];
  movement: string;
};

export type SegmentTemplate = {
  id: string;
  category: string;
  title: string;
  synopsis: string;
  castIds: string[];
  sceneId: string;
  movementCue: string;
  musicMood: string;
};

export type SessionBlock = {
  id: string;
  index: number;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  templateId: string;
  title: string;
  category: string;
  synopsis: string;
  sceneId: string;
  sceneLabel: string;
  castIds: string[];
  dogIncluded: boolean;
  movementCue: string;
  voiceIds: string[];
  musicTrackId: string | null;
  musicRightsStatus: string;
};

export type SessionPlan = {
  id: string;
  showId: string;
  seed: number;
  requestedMinutes: number;
  formattedDuration: string;
  blockMinutes: number;
  blockCount: number;
  exactDurationMinutes: number;
  categories: string[];
  castCoverage: string[];
  dogIncluded: boolean;
  dogBlockCount: number;
  musicStatuses: string[];
  blocks: SessionBlock[];
};

export type QualityCheck = {
  id: string;
  label: string;
  status: 'ready' | 'review-required' | 'blocked';
  detail: string;
};

export const CAST_IDS: string[];
export const SESSION_BLOCK_MINUTES: number;
export const SESSION_DURATION_OPTIONS: SessionDurationOption[];
export const FACTORY_SCENES: FactoryScene[];
export const SEGMENT_TEMPLATES: SegmentTemplate[];
export const MUSIC_RIGHTS: Array<Record<string, unknown>>;
export function normalizeSessionMinutes(value: unknown): number;
export function formatDuration(minutes: number): string;
export function assembleSession(minutes: unknown, seed?: unknown, options?: {
  scenes?: FactoryScene[];
  templates?: SegmentTemplate[];
  castIds?: string[];
  sceneId?: string | null;
  characterId?: string | null;
}): SessionPlan;
export function evaluateSessionQuality(session: SessionPlan, options?: {
  catalog?: { activeCastCount?: number; characters?: Array<Record<string, unknown>> } | null;
}): { status: QualityCheck['status']; checks: QualityCheck[] };
