/**
 * Track RWD · Responsive Web Design — Level 5 lesson bank.
 * Levels 1–4 reuse the Complete HTML / CSS foundations banks
 * (html-tags → html-links → css-selectors → css-flexbox), matching the
 * real-world syllabus order: markup first, then style, then layout,
 * then responsive behavior. All content original.
 */

import { MCQ, BUILD, CODE, TEXT, type CourseLesson } from '../quizBank';

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
      TEXT(
        'Type the media query that applies rules at 600px and below.',
        ['@media (max-width: 600px)', '@media (max-width:600px)'],
        'max-width is inclusive: the rules apply at 600px and every narrower screen. Test it by resizing, not by guessing.',
        { misconceptions: { '@media (min-width: 600px)': 'min-width targets 600px and wider — the opposite direction.' } }
      ),
      CODE(
        'Build the responsive grid: .grid is a two-column CSS grid with a 16px gap, and a max-width 600px media query collapses it to one column.',
        {
          language: 'css',
          starter: '/* .grid and its cards are in the fixture. */\n',
          fixture: { html: '<main class="grid"><article>One</article><article>Two</article></main>\n' },
          tests: [
            {
              id: 'display',
              label: '.grid uses display: grid',
              run: "getComputedStyle(document.querySelector('.grid')).display === 'grid'",
              hint: '.grid { display: grid; }',
              pattern: '\\.grid\\s*\\{[^}]*display\\s*:\\s*grid',
            },
            {
              id: 'columns',
              label: '.grid has two equal columns',
              run: "getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ').length === 2",
              hint: 'grid-template-columns: 1fr 1fr;',
              pattern: '\\.grid\\s*\\{[^}]*grid-template-columns\\s*:\\s*1fr\\s+1fr',
            },
            {
              id: 'gap',
              label: '.grid has a 16px gap',
              run: "getComputedStyle(document.querySelector('.grid')).gap === '16px'",
              hint: 'gap: 16px;',
              pattern: '\\.grid\\s*\\{[^}]*gap\\s*:\\s*16px',
            },
            {
              id: 'breakpoint',
              label: 'A max-width 600px media query collapses it',
              run: "Array.from(document.styleSheets).some(function (sheet) { try { return Array.from(sheet.cssRules).some(function (rule) { return rule.type === 4 && /max-width\\s*:\\s*600px/.test(rule.conditionText || rule.media.mediaText); }); } catch (e) { return false; } })",
              hint: '@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }',
              pattern: '@media\\s*\\(max-width\\s*:\\s*600px\\)[^{]*\\{[\\s\\S]*grid-template-columns',
            },
          ],
        },
        '.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }\n@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }',
        'Grid handles the wide layout and the media query handles the narrow one. The tests read computed styles and the CSSOM, so a comment or a class name alone cannot pass: the browser has to agree that the two-column grid and its breakpoint exist.'
      ),
    ],
  },

  'rwd-cat-photo': {
    id: 'rwd-cat-photo',
    title: 'Cat Photo App',
    theory: [
      'Capstone 1 of 5: a single page that shows a cat photo with a heading, a paragraph, and links. The automated checks look for exactly one h1 naming the page, a main section, and an image with descriptive alt text.',
      'Links first: an anchor needs href to go somewhere — a real URL for the gallery link and #footer for the jump link. The image sits inside the figure with figcaption describing it.',
      'Lists close it out: one unordered list of things cats love, one ordered list of things cats hate, plus a form with a text input and a submit button.',
    ],
    questions: [
      MCQ(
        'The checks demand one element naming the page. Which?',
        'Exactly one h1',
        ['Exactly one h1', 'Two h1 elements', 'An h1 inside every section', 'No h1 — title tag is enough'],
        'One h1 per page: the document name.'
      ),
      MCQ(
        'The cat image must describe itself to screen readers. Which attribute?',
        'alt',
        ['alt', 'src', 'href', 'title'],
        'alt text replaces the image when it cannot be seen.'
      ),
      BUILD(
        'Jump link to the page footer',
        ['<a', 'href="#footer">', 'Jump', '</a>'],
        ['<a', 'href="#footer">', 'href="footer"', 'Jump', '</a>', '<link'],
        'Hash href targets the id below.'
      ),
      MCQ(
        'Things cats love: bullets, no order. Which list?',
        'ul with li items',
        ['ul with li items', 'ol with li items', 'dl with dt items', 'table with tr items'],
        'Unordered for love, ordered for the ranked hate list.'
      ),
    ],
  },

  'rwd-survey-form': {
    id: 'rwd-survey-form',
    title: 'Survey Form',
    theory: [
      'Capstone 2 of 5: a form page with a title, a short description, and a working form. Every input needs an id, a label pointing at it, and a name so the submission carries data.',
      'Variety matters: text, email, and number inputs plus a dropdown, radio group, checkboxes, a textarea, and a submit button. Email and number types bring free browser validation.',
      'The number input takes min and max; the submit button sends everything. Labels use for matching each input id — that pairing is what the checks verify.',
    ],
    questions: [
      MCQ(
        'A label must programmatically point at its input. How?',
        'for matching the input id',
        ['for matching the input id', 'for matching the input name', 'Nesting is forbidden', 'A title attribute'],
        'for + id is the verified pairing.'
      ),
      MCQ(
        'Which input type rejects "not-an-email" before submit?',
        'type="email"',
        ['type="email"', 'type="text"', 'type="string"', 'type="mail"'],
        'Email type brings format validation free.'
      ),
      BUILD(
        'Bounded number input, 1 to 120',
        ['<input', 'type="number"', 'min="1"', 'max="120">'],
        ['<input', 'type="number"', 'type="text"', 'min="1"', 'max="120">', 'min="0"'],
        'Type plus bounds, one element.'
      ),
      MCQ(
        'Pick exactly one of several options (size: small/medium/large). Which control?',
        'Radio group with one shared name',
        ['Radio group with one shared name', 'Checkboxes with different names', 'A textarea', 'Three submit buttons'],
        'Shared name makes radios mutually exclusive.'
      ),
    ],
  },

  'rwd-tech-doc': {
    id: 'rwd-tech-doc',
    title: 'Technical Documentation Page',
    theory: [
      'Capstone 3 of 5: documentation with a fixed navbar and scrollable content. The nav holds one link per section; each link href matches a section id exactly.',
      'Layout: navbar fixed to the left on desktop (position: fixed, full height), content pushed right with margin-left. A media query collapses the nav on narrow screens.',
      'Content rules: at least five sections, each with a header, paragraphs, and code samples in code elements. Clicking a nav link must scroll to its section.',
    ],
    questions: [
      MCQ(
        'Nav link "#loops" must scroll to the Loops section. What must exist?',
        'A section with id="loops"',
        ['A section with id="loops"', 'A section with class="loops"', 'A loops tag', 'Nothing — hashes scroll automatically'],
        'Hash links resolve against ids.'
      ),
      MCQ(
        'Desktop navbar stays visible while docs scroll. Which position?',
        'position: fixed',
        ['position: fixed', 'position: static', 'position: relative', 'float: left'],
        'Fixed removes it from scroll flow.'
      ),
      BUILD(
        'Push scrolled content clear of a 220px fixed nav',
        ['margin-left:', '220px;'],
        ['margin-left:', '220px;', 'padding-top:', 'float:'],
        'Content margin must clear the fixed rail.'
      ),
      MCQ(
        'Inline code samples inside docs paragraphs belong in…',
        'code elements',
        ['code elements', 'img elements', 'form elements', 'nav elements'],
        'code marks the samples the checks count.'
      ),
    ],
  },

  'rwd-portfolio': {
    id: 'rwd-portfolio',
    title: 'Personal Portfolio',
    theory: [
      'Capstone 4 of 5: your portfolio with a welcome section, a projects grid, and a contact link. The welcome section fills the first viewport (height: 100vh) with one h1.',
      'Navbar fixed to the viewport top with links to each section. The projects section shows tiles — each tile links out to a project and carries the project name.',
      'Contact closes the page: a profile link opening in a new tab. A media query keeps the grid readable on phones.',
    ],
    questions: [
      MCQ(
        'Welcome section must fill exactly the first viewport. Which declaration?',
        'height: 100vh',
        ['height: 100vh', 'height: 100px', 'height: 100%', 'min-height: 10vh'],
        'Viewport units size against the window.'
      ),
      MCQ(
        'Profile link must open in a new tab. Which attribute?',
        'target="_blank"',
        ['target="_blank"', 'target="_self"', 'open="new"', 'tab="true"'],
        'Blank target opens the new tab.'
      ),
      BUILD(
        'Pin the navbar to the viewport top',
        ['position:', 'fixed;', 'top:', '0;'],
        ['position:', 'fixed;', 'static;', 'top:', '0;', 'bottom:'],
        'Fixed plus top zero pins it.'
      ),
      MCQ(
        'Project tiles side by side, wrapping on small screens. Which layout?',
        'Flexbox with flex-wrap, or CSS grid',
        ['Flexbox with flex-wrap, or CSS grid', 'One table per tile', 'float on every tile', 'Inline text only'],
        'Flex or grid makes the wrapping tile wall.'
      ),
    ],
  },

  'rwd-product-landing': {
    id: 'rwd-product-landing',
    title: 'Product Landing Page',
    theory: [
      'Capstone 5 of 5: a landing page with a fixed header, a hero, feature cards, an embedded video, and a signup form. The header stays fixed with a logo image and nav links to page sections.',
      'The form needs an email input and a submit button; submitting sends to the endpoint the checks expect. The video embeds via iframe with a title for accessibility.',
      'Features lay out with flexbox; a media query reflows hero and cards into one column under 600px. Nav links must all point at real sections.',
    ],
    questions: [
      MCQ(
        'Signup form must send the address somewhere. What carries the destination?',
        'The form action attribute',
        ['The form action attribute', 'The button color', 'The input placeholder', 'The page title'],
        'Action is the submission target.'
      ),
      MCQ(
        'Embedded demo video, accessible. Which element and extra?',
        'iframe with a title attribute',
        ['iframe with a title attribute', 'video with no attributes', 'img with src video', 'audio with controls'],
        'Framed video plus a title the checks read.'
      ),
      BUILD(
        'Email capture: the input the checks demand',
        ['<input', 'type="email"', 'required>'],
        ['<input', 'type="email"', 'type="text"', 'required>', 'optional>'],
        'Email type plus required blocks empty submits.'
      ),
      MCQ(
        'Hero and cards stack vertically on phones. Which rule?',
        '@media (max-width: 600px) switching to column',
        ['@media (max-width: 600px) switching to column', '@media (min-width: 600px) switching to column', 'A second h1', 'display: none on the hero'],
        'The phone breakpoint reflows to one column.'
      ),
    ],
  },
};
