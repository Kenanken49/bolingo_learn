/**
 * Live study rooms: shared focus sessions over Supabase Realtime presence.
 * Nothing is stored. There is deliberately no free text: learners pick a
 * status and send fixed reactions, so rooms are safe for every age.
 * Pure module (no React Native imports), tested by the gate.
 */
export interface StudyRoom {
  id: string;
  title: string;
  blurb: string;
}

export const STUDY_ROOMS: StudyRoom[] = [
  { id: 'web', title: 'HTML & CSS', blurb: 'Layouts, selectors, responsive pages' },
  { id: 'js', title: 'JavaScript', blurb: 'Arrays, functions, the DOM' },
  { id: 'linux', title: 'Linux & Git', blurb: 'Terminal labs and commits' },
  { id: 'lang', title: 'Languages', blurb: 'Swahili, French, Spanish, German' },
  { id: 'exam', title: 'Exam revision', blurb: 'School and university prep' },
  { id: 'career', title: 'Career skills', blurb: 'Interviews, portfolios, management' },
];

export const STATUSES = ['Focusing', 'Taking notes', 'Practising a lab', 'Revising', 'Stuck, reading back', 'On a break'] as const;
export type RoomStatus = (typeof STATUSES)[number];

export const REACTIONS = ['Nice work', 'Same here', 'Keep going', 'Done!'] as const;
export type Reaction = (typeof REACTIONS)[number];

export const FOCUS_MIN = 25;
export const BREAK_MIN = 5;

/**
 * Everyone shares one wall-clock timer: 25 min focus + 5 min break, aligned to
 * the half hour, so a room is in sync without any server.
 */
export function pomodoro(nowMs: number): { phase: 'focus' | 'break'; remainingSec: number } {
  const cycle = (FOCUS_MIN + BREAK_MIN) * 60;
  const t = Math.floor(nowMs / 1000) % cycle;
  return t < FOCUS_MIN * 60
    ? { phase: 'focus', remainingSec: FOCUS_MIN * 60 - t }
    : { phase: 'break', remainingSec: cycle - t };
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export interface RoomMember {
  key: string;
  name: string;
  room: string;
  status: RoomStatus;
}

/** Count members per room from a presence snapshot, ignoring unknown rooms/statuses. */
export function roomCounts(members: RoomMember[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of members) {
    if (!STUDY_ROOMS.some((r) => r.id === m.room)) continue;
    out[m.room] = (out[m.room] ?? 0) + 1;
  }
  return out;
}

/** Only accept presence payloads that use the fixed vocab (no free text gets rendered). */
export function sanitizeMember(key: string, raw: unknown): RoomMember | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name.replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 24) : '';
  const room = typeof r.room === 'string' ? r.room : '';
  const status = STATUSES.find((s) => s === r.status);
  if (!name || !status || !STUDY_ROOMS.some((x) => x.id === room)) return null;
  return { key, name, room, status };
}
