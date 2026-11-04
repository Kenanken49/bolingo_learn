/**
 * Avatar studio: a layered avatar with a 3D tilt, dressed from items earned
 * by learning (levels, streaks, certifications). Nothing is bought. Pure
 * module, tested by the gate; the look is saved on the device.
 */
export type Slot = 'skin' | 'outfit' | 'hat' | 'eyes' | 'backdrop';

export type Requirement =
  | { kind: 'free' }
  | { kind: 'level'; n: number }
  | { kind: 'streak'; n: number }
  | { kind: 'certs'; n: number };

export interface AvatarItem {
  id: string;
  slot: Slot;
  label: string;
  /** Primary colour (hats and outfits) or tone (skin). */
  color: string;
  requires: Requirement;
}

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: 'skin-1', slot: 'skin', label: 'Ebony', color: '#5A3825', requires: { kind: 'free' } },
  { id: 'skin-2', slot: 'skin', label: 'Umber', color: '#8D5A3B', requires: { kind: 'free' } },
  { id: 'skin-3', slot: 'skin', label: 'Sienna', color: '#B07650', requires: { kind: 'free' } },
  { id: 'skin-4', slot: 'skin', label: 'Sand', color: '#D9A57A', requires: { kind: 'free' } },
  { id: 'skin-5', slot: 'skin', label: 'Ivory', color: '#F1CBA6', requires: { kind: 'free' } },
  { id: 'fit-sunset', slot: 'outfit', label: 'Sunset hoodie', color: '#FF8A3D', requires: { kind: 'free' } },
  { id: 'fit-lagoon', slot: 'outfit', label: 'Lagoon jacket', color: '#38C6A0', requires: { kind: 'free' } },
  { id: 'fit-dusk', slot: 'outfit', label: 'Dusk blazer', color: '#7C8CFF', requires: { kind: 'level', n: 5 } },
  { id: 'fit-gold', slot: 'outfit', label: 'Savanna gold', color: '#F2C14E', requires: { kind: 'level', n: 10 } },
  { id: 'fit-kente', slot: 'outfit', label: 'Kente pattern', color: '#C0392B', requires: { kind: 'certs', n: 1 } },
  { id: 'hat-none', slot: 'hat', label: 'No hat', color: 'transparent', requires: { kind: 'free' } },
  { id: 'hat-cap', slot: 'hat', label: 'Explorer cap', color: '#38C6A0', requires: { kind: 'level', n: 3 } },
  { id: 'hat-crown', slot: 'hat', label: 'Boss crown', color: '#FFC94D', requires: { kind: 'streak', n: 7 } },
  { id: 'hat-grad', slot: 'hat', label: 'Graduate cap', color: '#1E293B', requires: { kind: 'certs', n: 1 } },
  { id: 'eyes-bright', slot: 'eyes', label: 'Bright', color: '#1A0F08', requires: { kind: 'free' } },
  { id: 'eyes-shades', slot: 'eyes', label: 'Sun shades', color: '#111827', requires: { kind: 'streak', n: 3 } },
  { id: 'bg-dawn', slot: 'backdrop', label: 'Dawn', color: '#4B2A8F', requires: { kind: 'free' } },
  { id: 'bg-reef', slot: 'backdrop', label: 'Reef', color: '#0E7490', requires: { kind: 'level', n: 8 } },
  { id: 'bg-comet', slot: 'backdrop', label: 'Comet night', color: '#111827', requires: { kind: 'streak', n: 30 } },
];

export type AvatarLook = Record<Slot, string>;

export const DEFAULT_LOOK: AvatarLook = {
  skin: 'skin-2',
  outfit: 'fit-sunset',
  hat: 'hat-none',
  eyes: 'eyes-bright',
  backdrop: 'bg-dawn',
};

export interface LearnerStats {
  level: number;
  streak: number;
  certs: number;
}

export function isUnlocked(item: AvatarItem, s: LearnerStats): boolean {
  const r = item.requires;
  if (r.kind === 'free') return true;
  if (r.kind === 'level') return s.level >= r.n;
  if (r.kind === 'streak') return s.streak >= r.n;
  return s.certs >= r.n;
}

export function requirementLabel(r: Requirement): string {
  if (r.kind === 'free') return 'Free';
  if (r.kind === 'level') return `Reach level ${r.n}`;
  if (r.kind === 'streak') return `${r.n}-day streak`;
  return r.n === 1 ? 'Earn a certification' : `Earn ${r.n} certifications`;
}

export function item(id: string): AvatarItem | undefined {
  return AVATAR_ITEMS.find((i) => i.id === id);
}

/** Drop anything locked, unknown or in the wrong slot; fall back to defaults. */
export function resolveLook(saved: Partial<Record<string, unknown>> | null | undefined, s: LearnerStats): AvatarLook {
  const out = { ...DEFAULT_LOOK };
  for (const slot of Object.keys(DEFAULT_LOOK) as Slot[]) {
    const id = saved?.[slot];
    const it = typeof id === 'string' ? item(id) : undefined;
    if (it && it.slot === slot && isUnlocked(it, s)) out[slot] = it.id;
  }
  return out;
}
