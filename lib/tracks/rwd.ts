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

  'rwd-responsive-workshop': {
    id: 'rwd-responsive-workshop',
    title: 'Build a phone layout step by step',
    theory: [
      'Workshop: assemble a responsive page exactly as instructed. Each step adds one real rule you already studied.',
    ],
    questions: [
      BUILD(
        'Step 1 — open a style block',
        ['<style>', '</style>'],
        ['<style>', '</style>', '<css>', '<script>'],
        'Page CSS lives in a style element in the head.'
      ),
      BUILD(
        'Step 2 — make .grid a grid container',
        ['.grid', '{', 'display:', 'grid;', '}'],
        ['.grid', '{', 'display:', 'grid;', 'flex;', '}'],
        'Selector, brace, declaration, close — the shape of every rule.'
      ),
      BUILD(
        'Step 3 — open the phone breakpoint',
        ['@media', '(max-width:', '600px)', '{'],
        ['@media', '(max-width:', '600px)', '{', '(min-width:', '}'],
        'At-rule, condition, opening brace — rules go inside.'
      ),
      MCQ(
        'Inside the breakpoint, one-column layout needs what?',
        'A single-column track so content stacks vertically',
        [
          'A single-column track so content stacks vertically',
          'A second stylesheet linked after the first',
          'Deleting the grid container from the HTML',
          'A wider max-width so phones zoom out',
        ],
        'One track on phones; multi-column returns on wide screens.'
      ),
    ],
  },

  'rwd-checkpoint': {
    id: 'rwd-checkpoint',
    title: 'Responsive Web Design checkpoint',
    theory: [
      'Final check across all five levels: markup, links, selectors, flexbox, and responsive behavior. Pass to prove the track.',
    ],
    questions: [
      MCQ(
        'One <h1> per page because…',
        'It names the document for readers and search engines',
        ['It names the document for readers and search engines', 'Browsers crash on a second h1', 'Headings only work inside forms', 'h1 is the smallest heading'],
        'Single top heading — the document name.'
      ),
      MCQ(
        'An image must describe itself to screen readers. Which attribute?',
        'alt',
        ['alt', 'src', 'href', 'title'],
        'alt text replaces the image when it cannot be seen.'
      ),
      MCQ(
        'Which declaration lays children out in a row that can wrap?',
        'display: flex with flex-wrap: wrap',
        ['display: flex with flex-wrap: wrap', 'display: block with float: none', 'position: static with clear: both', 'display: none with visibility: shown'],
        'Flex rows wrap onto new lines instead of overflowing.'
      ),
      MCQ(
        'A form needs a name, an email, and a submit. What wraps them?',
        'One form element containing labeled inputs and a submit button',
        [
          'One form element containing labeled inputs and a submit button',
          'Three separate forms, one per field',
          'A table with one row per field and no form',
          'A div with no inputs at all',
        ],
        'One form, labeled controls, submit — the accessible pattern.'
      ),
      BUILD(
        'Center the page heading with CSS',
        ['h1', '{', 'text-align:', 'center;', '}'],
        ['h1', '{', 'text-align:', 'center;', 'left;', '}'],
        'Target h1, center its inline content.'
      ),
      BUILD(
        'Start the phone breakpoint used in every responsive layout',
        ['@media', '(max-width:', '600px)', '{'],
        ['@media', '(max-width:', '600px)', '{', '@screen', '(min-width:'],
        'The 600px breakpoint opens every phone layout.'
      ),
    ],
  },
};
