import { supabase } from './supabase';
import { CURRICULUM, COURSES_META, type CurriculumBlock } from './curriculum';
import { CERTIFICATIONS, trackProgress, type CertTrack } from './certifications';
import { nextUpBlock } from './onboarding';
import { getDueCount } from './srs';
import { loadLatestAudiobook } from './audiobook';

/**
 * Dashboard catalog — the wireframe's Home/Explore/My learning IA backed only
 * by real catalog data. Language courses come from CURRICULUM + COURSES_META,
 * pro tracks from CERTIFICATIONS (bundled; remote catalog would need a route
 * param the certifications screen does not accept yet).
 */

export interface DashTrack {
  id: string;
  title: string;
  lessons: number;
  lessonLabel: string;
  kind: 'course' | 'cert';
  /** Emoji badge rendered on the card — catalog-owned, never invented. */
  icon: string;
  blurb: string;
  /** Where the card goes. Cert cards open the certifications hub; course cards open the course's first unit. */
  route: string;
  params?: Record<string, string>;
  progress: number;
  total: number;
}

export function languageTracks(completed: Set<string>): DashTrack[] {
  return COURSES_META.map((c) => {
    const units = CURRICULUM.filter((u) => u.course === c.id);
    const blocks = units.flatMap((u) => u.blocks);
    const done = blocks.filter((b) => completed.has(b.lessonId) || completed.has(b.id)).length;
    const first = units[0];
    return {
      // Namespaced: certification tracks reuse bare course ids (rwd, …).
      id: `course:${c.id}`,
      title: c.name.replace(/^Course \d+ · /, ''),
      lessons: blocks.length,
      lessonLabel: `${blocks.length} lessons`,
      kind: 'course' as const,
      icon: c.icon,
      blurb: c.blurb,
      route: first ? `/curriculum/${first.id}` : '/',
      params: undefined,
      progress: done,
      total: blocks.length,
    };
  });
}

export function certTracks(completed: Set<string>): DashTrack[] {
  return CERTIFICATIONS.map((t: CertTrack) => ({
    // Namespaced: certification tracks reuse bare course ids (rwd, …).
    id: `cert:${t.id}`,
    title: t.name,
    lessons: t.projects.length,
    lessonLabel: `${t.projects.length} projects`,
    kind: 'cert' as const,
    icon: t.icon || '🎓',
    blurb: t.blurb,
    route: '/certifications',
    params: undefined,
    progress: trackProgress(t, completed),
    total: t.projects.length,
  }));
}

/** Every track: language courses first, then certification tracks. */
export function allTracks(completed: Set<string>): DashTrack[] {
  return [...languageTracks(completed), ...certTracks(completed)];
}

/** "Curated for you" — the three least-finished cert tracks with real progress. */
export function curatedTracks(completed: Set<string>): (DashTrack & { level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'; number: string })[] {
  const levels: ('BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')[] = ['INTERMEDIATE', 'ADVANCED', 'BEGINNER'];
  const ranked = [...certTracks(completed)].sort((a, b) => {
    const pa = a.total ? a.progress / a.total : 1;
    const pb = b.total ? b.progress / b.total : 1;
    return pa - pb;
  });
  return ranked.slice(0, 3).map((t, i) => ({
    ...t,
    level: levels[i % levels.length],
    number: `0${i + 1}`,
  }));
}

/** Time-aware greeting — the wireframe's "Good afternoon, Amina". */
export function greeting(name: string | null, now = new Date()): string {
  const h = now.getHours();
  const part = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}` : `${part}`;
}

export function firstName(display: string | null | undefined): string | null {
  if (!display) return null;
  const first = display.trim().split(/\s+/)[0];
  return first || null;
}

export interface DayCount {
  /** 'M'..'S' label for the bar chart. */
  label: string;
  count: number;
}

/**
 * Last-7-days lesson completions (oldest → newest) for the momentum chart,
 * plus the prior-7-days total for the vs-last-week delta. Empty when signed
 * out or on error — the widget hides instead of showing invented bars.
 */
export async function weeklyMomentum(userId: string | null): Promise<{ days: DayCount[]; total: number; deltaPct: number | null }> {
  const empty = { days: [] as DayCount[], total: 0, deltaPct: null as number | null };
  if (!userId) return empty;
  try {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    const { data, error } = await supabase
      .from('lesson_completions')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', since.toISOString());
    if (error || !data) return empty;
    const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const buckets = new Array<number>(14).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const row of data as { completed_at: string }[]) {
      const d = new Date(row.completed_at);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff < 14) buckets[13 - diff] += 1;
    }
    const last7 = buckets.slice(7);
    const prev7 = buckets.slice(0, 7);
    const days: DayCount[] = last7.map((count, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return { label: labels[d.getDay()], count };
    });
    const total = last7.reduce((a, b) => a + b, 0);
    const prev = prev7.reduce((a, b) => a + b, 0);
    const deltaPct = prev > 0 ? Math.round(((total - prev) / prev) * 100) : total > 0 ? 100 : null;
    return { days, total, deltaPct };
  } catch {
    return empty;
  }
}

export interface ScheduleItem {
  id: string;
  dateLabel: string;
  kindLabel: string;
  title: string;
  sub: string;
  route: string;
  params?: Record<string, string>;
}

/**
 * "Your schedule" — only items backed by real state: the next lesson block
 * and due SRS reviews. No invented live classes or deadlines.
 */
export async function scheduleItems(
  userId: string | null,
  completed: Set<string>,
): Promise<ScheduleItem[]> {
  const items: ScheduleItem[] = [];
  const next: CurriculumBlock | null = nextUpBlock(completed);
  if (next) {
    const day = new Date();
    items.push({
      id: `next:${next.id}`,
      dateLabel: day.getDate().toString().padStart(2, '0'),
      kindLabel: `UP NEXT · ${next.minutes} MIN`,
      title: next.lessonTitle || next.title,
      sub: `${next.title} · +${next.xp} XP`,
      route: next.kind === 'project' ? `/project/${next.lessonId}` : `/quiz/${next.lessonId}`,
      params: { lessonId: next.lessonId, title: next.lessonTitle || next.title },
    });
  }
  if (userId) {
    try {
      const due = await getDueCount(userId).catch(() => 0);
      if (due > 0) {
        const day = new Date();
        items.push({
          id: 'srs:due',
          dateLabel: day.getDate().toString().padStart(2, '0'),
          kindLabel: 'REVIEW DUE',
          title: 'Daily Review',
          sub: `${due} card${due === 1 ? '' : 's'} slipping — ~2 min`,
          route: '/quiz/srs-review',
          params: { lessonId: 'srs-review', title: 'Daily Review' },
        });
      }
    } catch {}
  }
  return items;
}

/** Resume target for the hero card — null when the path is fully done. */
export function resumeBlock(completed: Set<string>): CurriculumBlock | null {
  return nextUpBlock(completed);
}

/** Latest audiobook for the Library hero — null when none exists yet. */
export async function latestBookTitle(): Promise<string | null> {
  try {
    const book = await loadLatestAudiobook();
    return book?.title ?? null;
  } catch {
    return null;
  }
}
