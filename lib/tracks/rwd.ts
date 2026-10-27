/**
 * Track RWD · Responsive Web Design — Level 5 lesson bank.
 * Levels 1–4 reuse the Complete HTML / CSS foundations banks
 * (html-tags → html-links → css-selectors → css-flexbox), matching the
 * real-world syllabus order: markup first, then style, then layout,
 * then responsive behavior. All content original.
 */

import { MCQ, BUILD, type CourseLesson } from '../quizBank';

export const TRACK_RWD: Record<string, CourseLesson> = {
  'rwd-responsive': {
    id: 'rwd-responsive',
    title: 'Responsive grids and media queries',
    theory: [
      'Responsive pages adapt to any screen. The two tools are fluid layout (Grid/Flexbox with flexible tracks) and media queries that restyle at breakpoints like 600px.',
      'A media query is @media (max-width: 600px) { … } — rules inside apply only on narrow screens. Grid places items with display: grid plus column tracks.',
    ],
    questions: [
      MCQ(
        'What does @media (max-width: 600px) { … } do?',
        'Applies the rules only on screens 600px wide or narrower',
        [
          'Applies the rules only on screens 600px wide or narrower',
          'Loads a new web font at 600px',
          'Hides every image on desktop screens',
          'Makes the page exactly 600px tall',
        ],
        'max-width: 600px means "when the viewport is at most 600px" — the phone layout.'
      ),
      BUILD(
        'Start a phone breakpoint block: @media (max-width: 600px)',
        ['@media', '(max-width:', '600px)'],
        ['@media', '(min-width:', '(max-width:', '600px)', '768px)'],
        'Breakpoints read like English: at media, when max-width is 600px.'
      ),
      MCQ(
        'Which declaration turns an element into a grid container?',
        'display: grid',
        ['display: grid', 'display: flex', 'position: grid', 'float: grid'],
        'display: grid creates column/row tracks; children flow into cells.'
      ),
      BUILD(
        'Make a two-column grid: display: grid with equal columns',
        ['display:', 'grid;'],
        ['display:', 'grid;', 'flex;', 'block;'],
        'display: grid switches the layout engine; column sizes come next.'
      ),
      MCQ(
        'On a phone layout, why move from two columns to one?',
        'Narrow screens make multi-column text hard to read and tap',
        [
          'Narrow screens make multi-column text hard to read and tap',
          'Phones cannot render CSS grid at all',
          'One column loads fonts faster than two',
          'Media queries delete extra columns from the HTML',
        ],
        'Responsive design serves the small screen first: single column, big tap targets.'
      ),
    ],
  },
};
