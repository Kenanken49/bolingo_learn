import { COURSES } from '../courses';
import { CURRICULUM } from '../curriculum';
import { loadLanguageCatalog } from '../languageCatalog';
import type { CourseLesson } from '../quizBank';
import { buildIndex, search, type Passage, type SearchHit, type VectorIndex } from './retrieval';

/**
 * The offline tutor's knowledge pack: every theory paragraph from the coding
 * courses and the language catalog (bundled lessons plus any course updates
 * Smart Sync downloaded), and the blurb of every Path block.
 *
 * The index lives in memory only. It is rebuilt from content that already
 * ships inside the app (or was downloaded by Smart Sync), in well under a
 * second, so no embedding is ever written to device storage. There is
 * nothing at rest to encrypt or to leak.
 */

export function lessonPassages(lessons: Record<string, CourseLesson>): Passage[] {
  const out: Passage[] = [];
  for (const lesson of Object.values(lessons)) {
    (lesson.theory ?? []).forEach((text, i) => {
      if (typeof text === 'string' && text.trim().length >= 20) {
        out.push({ id: `${lesson.id}#${i}`, source: lesson.title, text: text.trim() });
      }
    });
  }
  return out;
}

export function curriculumPassages(): Passage[] {
  return CURRICULUM.flatMap((unit) =>
    unit.blocks
      .filter((b) => b.blurb && b.blurb.length >= 20)
      .map((b) => ({ id: `block:${b.id}`, source: `${unit.title} · ${b.title}`, text: b.blurb }))
  );
}

let built: { index: VectorIndex; catalogAt: number; source: string } | null = null;
let building: Promise<VectorIndex> | null = null;

export async function getKnowledgeIndex(): Promise<VectorIndex> {
  const catalog = await loadLanguageCatalog();
  if (built && built.catalogAt === catalog.fetchedAt && built.source === catalog.source) return built.index;
  if (building) return building;
  building = (async () => {
    const passages = [...lessonPassages(COURSES), ...lessonPassages(catalog.lessons), ...curriculumPassages()];
    const index = buildIndex(passages);
    built = { index, catalogAt: catalog.fetchedAt, source: catalog.source };
    return index;
  })().finally(() => {
    building = null;
  });
  return building;
}

export async function searchKnowledge(query: string, k = 3): Promise<SearchHit[]> {
  return search(await getKnowledgeIndex(), query, k);
}

export async function knowledgeStats(): Promise<{ passages: number; source: string }> {
  const index = await getKnowledgeIndex();
  return { passages: index.passages.length, source: built?.source ?? 'builtin' };
}
