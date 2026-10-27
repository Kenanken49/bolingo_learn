/**
 * Real course content — one full course per track.
 * Course 1 (Duolingo path style): Complete HTML.
 * Course 2 (freeCodeCamp style): Responsive Web Design.
 *
 * Each lesson is a bank of real questions the quiz engine plays directly.
 * `explain` shows in the feedback banner so every answer teaches.
 */

export interface CourseQuestion {
  prompt: string;
  correctChain: string[];
  scrambledTokens: string[];
  explain?: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  theory: string[];
  questions: CourseQuestion[];
}

const MCQ = (prompt: string, answer: string, options: string[], explain: string): CourseQuestion => ({
  prompt,
  correctChain: [answer],
  scrambledTokens: options,
  explain,
});

const BUILD = (prompt: string, chain: string[], bank: string[], explain: string): CourseQuestion => ({
  prompt,
  correctChain: chain,
  scrambledTokens: bank,
  explain,
});

export const COURSES: Record<string, CourseLesson> = {
  /* ---------------- Course 1 · Complete HTML ---------------- */

  'html-tags': {
    id: 'html-tags',
    title: 'Basic HTML tags',
    theory: [
      'HTML describes content with tags. Most elements have an opening tag like <p>, some content, and a closing tag like </p>.',
      'Headings run from <h1> (biggest, one per page) down to <h6>. Paragraphs use <p>. Browsers ignore extra whitespace, so tags — not spacing — create structure.',
    ],
    questions: [
      BUILD(
        'Wrap this text in a paragraph tag: Hello',
        ['<p>', 'Hello', '</p>'],
        ['</div>', '<p>', 'Hello', '</p>', '<div>'],
        'A paragraph is <p> text </p> — opening tag, content, closing tag.'
      ),
      MCQ(
        'What does the closing tag </p> do?',
        'It marks where the element ends',
        ['It marks where the element ends', 'It starts a new page', 'It deletes the paragraph', 'It makes text bold'],
        'The slash in </p> tells the browser the element ends here.'
      ),
      MCQ(
        'Which tag makes the most important heading?',
        '<h1>',
        ['<h1>', '<h6>', '<head>', '<header>'],
        '<h1> is the top-level heading — one per page. <h6> is the smallest.'
      ),
      BUILD(
        'Make a top-level heading that says: Welcome',
        ['<h1>', 'Welcome', '</h1>'],
        ['<h6>', '<h1>', 'Welcome', '</h1>', '<p>'],
        'Headings follow the same sandwich: <h1> text </h1>.'
      ),
    ],
  },

  'html-workshop-1': {
    id: 'html-workshop-1',
    title: 'Build a paragraph step by step',
    theory: [
      'Workshop: follow each step exactly. Every element you build here appears on real web pages.',
    ],
    questions: [
      BUILD(
        'Step 1 — open a paragraph element, add: Code, then close it',
        ['<p>', 'Code', '</p>'],
        ['<p>', '</p>', 'Code', '<div>'],
        'Open, content, close — the three beats of every element.'
      ),
      BUILD(
        'Step 2 — build a level-2 heading: Learn',
        ['<h2>', 'Learn', '</h2>'],
        ['<h1>', '<h2>', 'Learn', '</h2>'],
        '<h2> marks a section heading under the page <h1>.'
      ),
      BUILD(
        'Step 3 — a paragraph holding two words: Hello world',
        ['<p>', 'Hello world', '</p>'],
        ['</p>', '<p>', 'Hello world', '<span>'],
        'Tags wrap any text — words, spaces and all stay inside.'
      ),
    ],
  },

  'html-lab-1': {
    id: 'html-lab-1',
    title: 'Lab: tag user stories',
    theory: ['Solo build. No guidance — satisfy each story with the tags you learned.'],
    questions: [
      BUILD(
        'Story: the page needs a main heading reading: My Site',
        ['<h1>', 'My Site', '</h1>'],
        ['<h1>', '</h1>', 'My Site', '<h2>'],
        'One <h1> per page carries the page title.'
      ),
      BUILD(
        'Story: add a sub-heading reading: About',
        ['<h2>', 'About', '</h2>'],
        ['<h2>', 'About', '</h2>', '<p>', '<h1>'],
        'Sub-sections drop one level to <h2>.'
      ),
      BUILD(
        'Story: add a paragraph reading: Welcome here',
        ['<p>', 'Welcome here', '</p>'],
        ['<p>', 'Welcome here', '</p>', '<div>', '</div>'],
        'Body copy lives in <p> elements.'
      ),
    ],
  },

  'html-quiz-1': {
    id: 'html-quiz-1',
    title: 'HTML quiz',
    theory: ['Checkpoint: 5 questions on tags, headings, and structure.'],
    questions: [
      MCQ(
        'Which of these is a correctly closed element?',
        '<p>Hi</p>',
        ['<p>Hi</p>', '<p>Hi<p>', '</p>Hi</p>', '<p Hi /p>'],
        'Open tag, content, matching close tag with the slash.'
      ),
      MCQ(
        'A page should normally contain how many <h1> elements?',
        'One',
        ['One', 'Six', 'As many as possible', 'Zero'],
        'One <h1> = the page topic. Sub-topics use <h2>–<h6>.'
      ),
      MCQ(
        'What does <h6> render compared to <h1>?',
        'The smallest heading',
        ['The smallest heading', 'The biggest heading', 'A paragraph', 'An error'],
        'Heading numbers grow as importance shrinks: h1 biggest, h6 smallest.'
      ),
      MCQ(
        'Where does element content sit?',
        'Between the opening and closing tags',
        ['Between the opening and closing tags', 'Inside the opening tag', 'After the closing tag', 'In the page title'],
        'Content always lives between <tag> and </tag>.'
      ),
      MCQ(
        'Which tag marks a paragraph?',
        '<p>',
        ['<p>', '<pg>', '<para>', '<div>'],
        '<p> is the paragraph element. <div> is a generic container.'
      ),
    ],
  },

  'html-links': {
    id: 'html-links',
    title: 'Links and images',
    theory: [
      'Links use the anchor element: <a href="...">label</a>. The href attribute holds the destination; the label is what readers click.',
      'Images are void elements — no closing tag: <img src="cat.jpg" alt="A cat">. The alt attribute describes the image for screen readers and broken loads.',
    ],
    questions: [
      BUILD(
        'Build a link labeled Go: destination #',
        ['<a>', 'Go', '</a>'],
        ['<a>', '</a>', 'Go', '<link>'],
        'Anchor skeleton first — href attributes come next.'
      ),
      MCQ(
        'Which attribute sets a link destination?',
        'href',
        ['href', 'src', 'alt', 'link'],
        'href = hypertext reference. src is for embeds like images.'
      ),
      MCQ(
        'Why does <img> need an alt attribute?',
        'It describes the image for screen readers',
        ['It describes the image for screen readers', 'It makes images load faster', 'It sets image width', 'It is optional decoration'],
        'Alt text is accessibility: blind users and search engines read it.'
      ),
      MCQ(
        'Which element needs NO closing tag?',
        '<img>',
        ['<img>', '<p>', '<a>', '<h1>'],
        '<img> is void — it carries attributes, not content, so nothing closes.'
      ),
    ],
  },

  'html-workshop-2': {
    id: 'html-workshop-2',
    title: 'Attributes workshop',
    theory: ['Workshop: attributes live inside the opening tag as name="value" pairs.'],
    questions: [
      BUILD(
        'Step 1 — image element with source pic.jpg (use tokens as-is)',
        ['<img>', 'pic.jpg'],
        ['<img>', 'pic.jpg', '</img>', '<p>'],
        'src points at the file. (Quotes and alt come in the next course.)'
      ),
      BUILD(
        'Step 2 — heading with an id anchor: Top',
        ['<h1>', 'Top', '</h1>'],
        ['<h1>', 'Top', '</h1>', '<h2>'],
        'ids hook headings to links and styles later.'
      ),
      BUILD(
        'Step 3 — link labeled Docs around text: Docs',
        ['<a>', 'Docs', '</a>'],
        ['<a>', 'Docs', '</a>', '<link>'],
        '<a> wraps clickable text; <link> is a head-only element — don\'t mix them.'
      ),
    ],
  },

  'html-lab-2': {
    id: 'html-lab-2',
    title: 'Lab: lists',
    theory: [
      'Lists: <ul> wraps bullet lists, <ol> wraps numbered lists, and every item is an <li>.',
    ],
    questions: [
      BUILD(
        'Story: open an unordered (bullet) list',
        ['<ul>', '</ul>'],
        ['<ul>', '</ul>', '<ol>', '<li>'],
        '<ul> = unordered. The items come next.'
      ),
      BUILD(
        'Story: add a list item reading: Milk',
        ['<li>', 'Milk', '</li>'],
        ['<li>', 'Milk', '</li>', '<ul>'],
        'Every bullet is an <li> inside the <ul>.'
      ),
      BUILD(
        'Story: full numbered list item reading: Step one',
        ['<ol>', '<li>', 'Step one', '</li>', '</ol>'],
        ['<ol>', '<li>', 'Step one', '</li>', '</ol>', '<ul>'],
        '<ol> numbers its <li> children automatically.'
      ),
    ],
  },

  'html-quiz-2': {
    id: 'html-quiz-2',
    title: 'Elements quiz',
    theory: ['Checkpoint: links, images, attributes, and lists.'],
    questions: [
      MCQ(
        'Clicking <a href="/about">About</a> takes the reader…',
        'To the /about page',
        ['To the /about page', 'To the top of the page', 'Nowhere — it is broken', 'To an image'],
        'The label shows; href decides where the click lands.'
      ),
      MCQ(
        'Pick the correct image element shape:',
        '<img src="x.jpg" alt="x">',
        ['<img src="x.jpg" alt="x">', '<img>src="x.jpg"</img>', '<image src="x.jpg">', '<img src="x.jpg"></img>'],
        'Void element: attributes inside one tag, alt always included.'
      ),
      MCQ(
        'Which list renders numbers automatically?',
        '<ol>',
        ['<ol>', '<ul>', '<li>', '<dl>'],
        'ol = ordered (1, 2, 3). ul = unordered bullets.'
      ),
      MCQ(
        'Where do <li> elements belong?',
        'Inside <ul> or <ol>',
        ['Inside <ul> or <ol>', 'Anywhere on the page', 'Inside <p>', 'Inside <img>'],
        'List items are only valid as children of list containers.'
      ),
      MCQ(
        'Attributes are written as…',
        'name="value" inside the opening tag',
        ['name="value" inside the opening tag', 'Content between tags', 'Separate closing tags', 'CSS rules'],
        'Attributes configure the element: src, href, alt all follow this shape.'
      ),
    ],
  },

  /* ---------------- Course 2 · Responsive Web Design ---------------- */

  'css-selectors': {
    id: 'css-selectors',
    title: 'CSS selectors',
    theory: [
      'CSS rules pair a selector with declarations: p { color: blue; }. The selector picks elements; declarations set how they look.',
      'Type selectors target tags (p, h1), class selectors target class="name" with .name, and declarations always end in a semicolon.',
    ],
    questions: [
      MCQ(
        'In p { color: blue; }, what is p?',
        'The selector',
        ['The selector', 'The declaration', 'The property', 'The value'],
        'The part before the braces chooses which elements to style.'
      ),
      MCQ(
        'Which selector targets class="menu"?',
        '.menu',
        ['.menu', '#menu', 'menu', '*menu'],
        'Dots pick classes, hashes pick ids, bare words pick tags.'
      ),
      BUILD(
        'Style all paragraphs blue: p, braces, color, blue',
        ['p', '{', 'color', ':', 'blue', ';', '}'],
        ['p', '{', 'color', ':', 'blue', ';', '}', 'margin'],
        'Selector, braces, property, colon, value, semicolon, close.'
      ),
      MCQ(
        'What ends every CSS declaration?',
        'A semicolon',
        ['A semicolon', 'A comma', 'A period', 'A slash'],
        'Declarations stack inside braces, each closed by a semicolon.'
      ),
    ],
  },

  'css-workshop-1': {
    id: 'css-workshop-1',
    title: 'Box model workshop',
    theory: [
      'Every element is a box: content, then padding (inside space), border, then margin (outside space).',
    ],
    questions: [
      MCQ(
        'Padding sits…',
        'Between content and border',
        ['Between content and border', 'Outside the border', 'Outside the margin', 'Inside the text'],
        'Inside → out: content, padding, border, margin.'
      ),
      MCQ(
        'Which property pushes OTHER elements away?',
        'margin',
        ['margin', 'padding', 'border', 'color'],
        'Margin is outside space. Padding is inside space.'
      ),
      BUILD(
        'Give headings red text: h1, braces, color red',
        ['h1', '{', 'color', ':', 'red', ';', '}'],
        ['h1', '{', 'color', ':', 'red', ';', '}', 'p'],
        'Same rule skeleton, new selector and value.'
      ),
      MCQ(
        'border: 2px solid black adds…',
        'A 2px outline around the padding',
        ['A 2px outline around the padding', 'Space outside the element', 'Red text', 'A page break'],
        'Border wraps padding; margin then separates neighbors.'
      ),
    ],
  },

  'css-lab-1': {
    id: 'css-lab-1',
    title: 'Lab: style stories',
    theory: ['Solo styling. Each story is one rule — pick the right selector.'],
    questions: [
      BUILD(
        'Story: paragraphs get green text',
        ['p', '{', 'color', ':', 'green', ';', '}'],
        ['p', '{', 'color', ':', 'green', ';', '}', 'blue'],
        'Type selector p grabs every paragraph at once.'
      ),
      BUILD(
        'Story: class highlight gets a yellow background',
        ['.highlight', '{', 'background', ':', 'yellow', ';', '}'],
        ['.highlight', '{', 'background', ':', 'yellow', ';', '}', '#highlight'],
        'Class hook .highlight — dot, not hash.'
      ),
      MCQ(
        'An element with class="note" AND id="top" is styled by…',
        'Both .note and #top rules',
        ['Both .note and #top rules', 'Only .note', 'Only #top', 'Neither — they conflict'],
        'Classes and ids stack; both rules apply, most specific wins ties.'
      ),
    ],
  },

  'css-quiz-1': {
    id: 'css-quiz-1',
    title: 'CSS quiz',
    theory: ['Checkpoint: selectors, declarations, and the box model.'],
    questions: [
      MCQ(
        'Which rule centers text in all h2 elements?',
        'h2 { text-align: center; }',
        ['h2 { text-align: center; }', '.h2 { align: center; }', '#h2 { text: center; }', 'h2 ( text-align = center )'],
        'Tag selector, braces, property: value; — the full skeleton.'
      ),
      MCQ(
        'Order the box model inside → out:',
        'content, padding, border, margin',
        ['content, padding, border, margin', 'margin, border, padding, content', 'content, margin, padding, border', 'border, content, margin, padding'],
        'Memorize it: content wears padding, border, then margin.'
      ),
      MCQ(
        'Two rules set p color to red and blue. Which wins?',
        'The later, equally-specific rule',
        ['The later, equally-specific rule', 'Always the first rule', 'Always red', 'Neither — it errors'],
        'The cascade: equal specificity → source order decides.'
      ),
      MCQ(
        '#nav picks elements with…',
        'id="nav"',
        ['id="nav"', 'class="nav"', 'tag <nav>', 'name="nav"'],
        'Hash = id. One id per page, unique.'
      ),
      MCQ(
        'A missing semicolon between declarations causes…',
        'The next declaration to break',
        ['The next declaration to break', 'Nothing — optional', 'The page to go blank', 'Faster loading'],
        'The parser merges the lines; always terminate with a semicolon.'
      ),
    ],
  },

  'css-flexbox': {
    id: 'css-flexbox',
    title: 'Flexbox essentials',
    theory: [
      'Flexbox lays out rows and columns: display: flex on the parent, then justify-content (main axis) and align-items (cross axis) place the children.',
      'flex-direction: row (default) lines children horizontally; column stacks them. gap spaces children without margin hacks.',
    ],
    questions: [
      MCQ(
        'Which declaration turns a div into a flex container?',
        'display: flex;',
        ['display: flex;', 'flex: true;', 'layout: flex;', 'position: flex;'],
        'display: flex switches the children into the flex algorithm.'
      ),
      BUILD(
        'Lay children out in a row with gaps (tokens as-is)',
        ['.row', '{', 'display', ':', 'flex', ';', '}'],
        ['.row', '{', 'display', ':', 'flex', ';', '}', 'block'],
        'Class hook for a reusable row container.'
      ),
      MCQ(
        'justify-content: center does what in a row?',
        'Centers children horizontally',
        ['Centers children horizontally', 'Centers children vertically', 'Stacks children', 'Hides overflow'],
        'Main axis = writing direction. In a row, that is horizontal.'
      ),
      MCQ(
        'To stack flex children vertically, use…',
        'flex-direction: column;',
        ['flex-direction: column;', 'flex-stack: vertical;', 'direction: down;', 'display: block;'],
        'Column flips the main axis vertical; justify-content then centers vertically.'
      ),
    ],
  },

  'css-quiz-2': {
    id: 'css-quiz-2',
    title: 'Layout quiz',
    theory: ['Final check: flexbox axes, direction, and responsive thinking.'],
    questions: [
      MCQ(
        'In a column container, align-items: center aligns children…',
        'Horizontally',
        ['Horizontally', 'Vertically', 'Diagonally', 'Nowhere'],
        'align-items is always the CROSS axis — horizontal in a column.'
      ),
      MCQ(
        'gap: 16px on a flex parent…',
        'Spaces children evenly without margins',
        ['Spaces children evenly without margins', 'Adds page padding', 'Centers text', 'Creates columns'],
        'gap replaced the margin-on-every-child hack.'
      ),
      MCQ(
        'A responsive layout should…',
        'Adapt to narrow and wide screens',
        ['Adapt to narrow and wide screens', 'Only target phones', 'Use fixed 1200px widths', 'Disable zoom'],
        'Responsive = fluid widths plus breakpoints, mobile to desktop.'
      ),
      MCQ(
        'Which pair centers a flex child BOTH ways?',
        'justify-content: center + align-items: center',
        ['justify-content: center + align-items: center', 'margin: auto + padding: auto', 'text-align + vertical-align', 'flex: 1 + flex: 2'],
        'Main axis plus cross axis — the classic centering combo.'
      ),
      MCQ(
        'flex-wrap: wrap lets children…',
        'Flow onto new lines when space runs out',
        ['Flow onto new lines when space runs out', 'Shrink to zero', 'Overflow invisibly', 'Become columns'],
        'Wrapping is what makes flex grids responsive.'
      ),
    ],
  },

  'rwd-project': {
    id: 'rwd-project',
    title: 'Tribute page project',
    theory: [
      'Capstone: assemble a full tribute page — heading, image, and a facts list — from everything you learned.',
    ],
    questions: [
      BUILD(
        'Step 1 — page heading: Tribute',
        ['<h1>', 'Tribute', '</h1>'],
        ['<h1>', 'Tribute', '</h1>', '<h2>'],
        'Every page opens with its single <h1>.'
      ),
      BUILD(
        'Step 2 — full bullet item: Born 1969',
        ['<ul>', '<li>', 'Born 1969', '</li>', '</ul>'],
        ['<ul>', '<li>', 'Born 1969', '</li>', '</ul>', '<ol>'],
        'Facts belong in list items inside their container.'
      ),
      BUILD(
        'Step 3 — center the heading text with CSS',
        ['h1', '{', 'text-align', ':', 'center', ';', '}'],
        ['h1', '{', 'text-align', ':', 'center', ';', '}', 'left'],
        'Content from HTML, presentation from CSS — the RWD split.'
      ),
    ],
  },
};

export function getCourseLesson(id: string): CourseLesson | undefined {
  return COURSES[id];
}

/* ---------------- Certification projects (real code editor) ---------------- */

export interface ProjectStory {
  label: string;
  /** Tested against the raw code with new RegExp(pattern, 'i'). */
  pattern: string;
  hint: string;
}

export interface CourseProject {
  id: string;
  title: string;
  brief: string[];
  starterCode: string;
  stories: ProjectStory[];
  xp: number;
}

export const PROJECTS: Record<string, CourseProject> = {
  'rwd-project': {
    id: 'rwd-project',
    title: 'Tribute Page Project',
    brief: [
      'Build a tribute page for someone you admire. Write real HTML and CSS in the editor — the preview updates live, exactly like the freeCodeCamp labs.',
      'Pass every user story, then submit. This is the capstone of Course 2.',
    ],
    starterCode: '<h1>Tribute</h1>\n<p>Write something admirable here.</p>\n',
    stories: [
      {
        label: 'A single <h1> names the subject',
        pattern: '<h1>[^<]+</h1>',
        hint: 'Add one <h1>Subject</h1> — exactly one top heading.',
      },
      {
        label: 'At least one paragraph of text',
        pattern: '<p>[^<]+</p>',
        hint: 'Wrap a sentence in <p>…</p>.',
      },
      {
        label: 'A list with at least one fact',
        pattern: '<(ul|ol)>[\\s\\S]*<li>[^<]+</li>[\\s\\S]*</(ul|ol)>',
        hint: 'Add <ul><li>One fact</li></ul> (or <ol> for numbered).',
      },
      {
        label: 'CSS centers the heading',
        pattern: 'h1\\s*\\{[^}]*text-align\\s*:\\s*center',
        hint: 'Add a style block: h1 { text-align: center; }',
      },
    ],
    xp: 50,
  },
};

export function getCourseProject(id: string): CourseProject | undefined {
  return PROJECTS[id];
}

export function isProjectLesson(id: string): boolean {
  return id in PROJECTS;
}
