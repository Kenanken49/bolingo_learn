/**
 * Track FED · Front End Development Libraries — leveled lesson banks.
 * Syllabus order: components and JSX first, then state and props, effects
 * and forms, data flow with Redux, and timers/lifecycle last (the Pomodoro
 * clock needs every earlier idea). All original.
 */

import { MCQ, BUILD, type CourseLesson } from '../quizBank';

export const TRACK_FED: Record<string, CourseLesson> = {
  'fed-react-components': {
    id: 'fed-react-components',
    title: 'Components and JSX',
    theory: [
      'React splits pages into components — small functions that return markup. JSX looks like HTML inside JavaScript: <h1>{quote}</h1> embeds a live value with curly braces.',
      'The quote machine is four identified elements: #text, #author, #new-quote, #tweet-quote. Tests find them by id, so exact ids are the contract.',
    ],
    questions: [
      MCQ(
        'What is a React component?',
        'A function that returns markup for one piece of the page',
        [
          'A function that returns markup for one piece of the page',
          'A CSS file that styles the whole app',
          'A database table holding user data',
          'A server route that returns JSON',
        ],
        'Components are functions: props in, markup out. Compose small ones into pages.'
      ),
      BUILD(
        'Render the quote variable inside a heading element',
        ['<h1>', '{quote}', '</h1>'],
        ['<h1>', '{quote}', '</h1>', '{{quote}}', '<p>'],
        'Curly braces embed JavaScript values inside JSX markup.'
      ),
      MCQ(
        'Why do the tests demand id="text" and id="author"?',
        'Fixed ids are the contract the grader uses to find elements',
        [
          'Fixed ids are the contract the grader uses to find elements',
          'React cannot render elements without ids',
          'Ids make the text load faster',
          'Browsers hide elements that lack ids',
        ],
        'Match the required ids exactly — graders and tweet links depend on them.'
      ),
      MCQ(
        'A new-quote button must fetch and display another quote. What does it need?',
        'A click handler that updates the displayed quote and author',
        [
          'A click handler that updates the displayed quote and author',
          'A second HTML page for each quote',
          'A database migration for the button',
          'A bigger font so quotes look new',
        ],
        'One button, one handler, fresh state: the whole quote machine.'
      ),
      BUILD(
        'Give the button the required new-quote identifier',
        ['<button', 'id=\"new-quote\"', '>'],
        ['<button', 'id=\"new-quote\"', '>', 'class', 'id=\"quote\"'],
        'Attributes live inside the opening tag: name equals quoted value.'
      ),
    ],
  },

  'fed-state-props': {
    id: 'fed-state-props',
    title: 'State and props',
    theory: [
      'State is a component\u2019s memory: the useState hook holds the current value and a setter that re-renders on change. Props flow downward — parents pass data to children.',
      'The markdown previewer is state in action: the editor textarea\u2019s state re-renders the preview pane on every keystroke.',
    ],
    questions: [
      MCQ(
        'What happens when you call a useState setter?',
        'The component re-renders with the new value',
        [
          'The component re-renders with the new value',
          'The page reloads from the server',
          'The old value is deleted from memory forever',
          'Nothing — setters only work on mount',
        ],
        'Setters schedule a re-render; the UI always reflects current state.'
      ),
      BUILD(
        'Declare text state defaulting to an empty string',
        ['const', '[text,', 'setText]', '=', 'useState(\"\");'],
        ['const', '[text,', 'setText]', '=', 'useState(\"\");', 'let', 'useEffect'],
        'Destructure the value and setter together; the argument is the default.'
      ),
      MCQ(
        'Editor (#editor) on the left, preview (#preview) on the right — how do they stay in sync?',
        'One shared state value rendered by both panes',
        [
          'One shared state value rendered by both panes',
          'Two separate states that each guess the other',
          'A server round-trip after every keystroke',
          'Copying text with the clipboard automatically',
        ],
        'Single source of truth: both panes read the same state.'
      ),
      MCQ(
        'Props flow which direction between components?',
        'Downward — parents pass data into children',
        [
          'Downward — parents pass data into children',
          'Upward — children configure their parents',
          'Sideways — siblings share props directly',
          'Nowhere — props are documentation only',
        ],
        'Data flows down; events bubble callbacks up. That one-way flow keeps apps debuggable.'
      ),
      BUILD(
        'Render the preview div with its required identifier',
        ['<div', 'id=\"preview\"', '>', '{html}', '</div>'],
        ['<div', 'id=\"preview\"', '>', '{html}', '</div>', '<span', 'id=\"editor\"'],
        'Required id plus live content: the grader checks both.'
      ),
    ],
  },

  'fed-effects-forms': {
    id: 'fed-effects-forms',
    title: 'Effects, input, and audio',
    theory: [
      'Effects run after render: useEffect with a keydown listener plays drum sounds on Q/W/E/A/S/D/Z/X/C. Each pad is a .drum-pad wrapping its own <audio> clip.',
      'The display (#display) names the last hit — feedback within milliseconds of the keypress is what makes it feel like an instrument.',
    ],
    questions: [
      MCQ(
        'Why attach the keyboard listener in an effect rather than during render?',
        'So exactly one listener exists and it cleans up on unmount',
        [
          'So exactly one listener exists and it cleans up on unmount',
          'So the keys play louder than clicks',
          'So React can skip rendering the pads',
          'So mobile devices disable their keyboards',
        ],
        'Effects own subscriptions: attach once, return a cleanup that removes it.'
      ),
      BUILD(
        'Play the clip inside the audio element with id Q',
        ['document.getElementById(\"Q\").play();'],
        ['document.getElementById(\"Q\").play();', '.pause();', 'getElementByClass', '(\"q\")'],
        'Grab the clip by its key-named id and call play.'
      ),
      MCQ(
        'All 9 pads must play different sounds. What distinguishes them?',
        'Each wraps its own <audio> element with a different source',
        [
          'Each wraps its own <audio> element with a different source',
          'Each uses a different background color',
          'Each has its volume set to a different decade',
          'Each sits in a different HTML file',
        ],
        'One pad, one clip: the .drum-pad class marks them for the grader.'
      ),
      MCQ(
        'The display should update on every hit AND every click. What pattern covers both?',
        'One play function called by both the key handler and the click handler',
        [
          'One play function called by both the key handler and the click handler',
          'Two copies of the sound logic that never talk',
          'A timer that guesses what the user pressed',
          'Reloading the page after each hit',
        ],
        'Share the handler; wire two triggers. Keyboard and mouse stay in sync for free.'
      ),
      BUILD(
        'Update the display with the name of the hit pad',
        ['document.getElementById(\"display\").textContent', '=', 'name;'],
        ['document.getElementById(\"display\").textContent', '=', 'name;', '.value', 'innerHTML()'],
        'Same verdict pattern as the JS track: grab, assign, done.'
      ),
    ],
  },

  'fed-redux-data': {
    id: 'fed-redux-data',
    title: 'Data flow with Redux',
    theory: [
      'Redux centralizes state in one store: components dispatch actions (plain objects describing what happened), reducers compute the next state. No component mutates shared state directly.',
      'The calculator needs this discipline: digits, operators, equals, and clear all funnel through one expression state, so chained operations never contradict the display.',
    ],
    questions: [
      MCQ(
        'What is a Redux action?',
        'A plain object describing something that happened, e.g. { type: "DIGIT", digit: "7" }',
        [
          'A plain object describing something that happened, e.g. { type: "DIGIT", digit: "7" }',
          'A CSS animation on the display',
          'A server request to save the calculation',
          'A promise that resolves to a number',
        ],
        'Actions are facts, not logic. Reducers decide what facts mean for state.'
      ),
      BUILD(
        'Dispatch a digit press carrying the digit 7',
        ['dispatch({', 'type:', '\"DIGIT\",', 'digit:', '\"7\"', '});'],
        ['dispatch({', 'type:', '\"DIGIT\",', 'digit:', '\"7\"', '});', 'return', 'commit'],
        'Every press becomes a described event the reducer can handle.'
      ),
      MCQ(
        'Why must reducers never mutate the old state?',
        'So time-travel, undo, and change detection keep working',
        [
          'So time-travel, undo, and change detection keep working',
          'So the code runs faster on old phones',
          'So actions can be written in any language',
          'So the display font stays the same',
        ],
        'New object in, new state out — mutation breaks every Redux guarantee.'
      ),
      MCQ(
        'The display defaults to 0 and ids like #zero…#nine, #add, #equals exist. Why fixed ids again?',
        'The grader suite locates each button by its contract id',
        [
          'The grader suite locates each button by its contract id',
          'Ids make buttons rounder in every browser',
          'React requires numeric ids for math buttons',
          'Without ids the buttons cannot be clicked',
        ],
        'Same contract lesson as the quote machine: exact ids, every project.'
      ),
      BUILD(
        'Evaluate the chained expression when equals is pressed',
        ['setDisplay(String(eval(expression)));'],
        ['setDisplay(String(eval(expression)));', 'eval', 'parseInt(', 'Number('],
        'Evaluate the whole chain at equals — never after each digit.'
      ),
    ],
  },

  'fed-timers-lifecycle': {
    id: 'fed-timers-lifecycle',
    title: 'Timers and lifecycle',
    theory: [
      'The Pomodoro clock is lifecycle management: adjustable session/break lengths, a mm:ss countdown in #time-left, session-break switching, and a #beep at zero. Intervals start, tick, and clean up.',
      'Controls carry contract ids (#break-increment, #session-decrement, #start_stop, #reset) — the full vocabulary of timers in one project.',
    ],
    questions: [
      MCQ(
        'Why must the countdown interval be cleared on pause and unmount?',
        'Orphaned intervals keep ticking and corrupt the next session',
        [
          'Orphaned intervals keep ticking and corrupt the next session',
          'Browsers limit pages to one interval ever',
          'Clearing intervals saves battery only on desktops',
          'Paused timers delete their own display element',
        ],
        'Every setInterval needs a matching clearInterval — lifecycle hygiene.'
      ),
      BUILD(
        'Tick the clock down by one second each second',
        ['setInterval(()', '=>', 'tick(),', '1000);'],
        ['setInterval(()', '=>', 'tick(),', '1000);', 'setTimeout', '500);', 'clear'],
        'setInterval schedules repeats; 1000ms is one second.'
      ),
      MCQ(
        'At 00:00 the clock must beep AND switch modes. What order is safe?',
        'Play the beep, then flip session to break (or back)',
        [
          'Play the beep, then flip session to break (or back)',
          'Flip modes first, then decide whether to beep',
          'Reset the whole clock and skip the beep',
          'Beep only when switching from break to session',
        ],
        'Signal first, then transition — the user hears exactly why the mode changed.'
      ),
      MCQ(
        'Time-left shows mm:ss. What must happen at 25:00 → 24:59?',
        'Minutes drop only when seconds wrap from 00 to 59',
        [
          'Minutes drop only when seconds wrap from 00 to 59',
          'Minutes and seconds both drop by one each tick',
          'The display resets to 00:00 immediately',
          'Seconds freeze at 00 while minutes drain',
        ],
        'Borrow like subtraction: seconds wrap, then minutes step down.'
      ),
      BUILD(
        'Sound the beep element when the timer hits zero',
        ['document.getElementById(\"beep\").play();'],
        ['document.getElementById(\"beep\").play();', '.stop();', 'getElementByClass', '(\"alarm\")'],
        'The #beep audio element exists for exactly this moment.'
      ),
    ],
  },

  'fed-react-workshop': {
    id: 'fed-react-workshop',
    title: 'Assemble a quote card step by step',
    theory: [
      'Workshop: build the quote machine markup exactly as instructed.',
    ],
    questions: [
      BUILD(
        'Step 1 — open a quote paragraph with the text id',
        ['<p', 'id="text"', '>'],
        ['<p', 'id="text"', '>', 'class', 'id="quote"'],
        'Tag, required id, closing bracket.'
      ),
      BUILD(
        'Step 2 — show the quote variable inside the heading',
        ['<h1>', '{quote}', '</h1>'],
        ['<h1>', '{quote}', '</h1>', '{{quote}}', '<p>'],
        'Braces embed live values in JSX.'
      ),
      BUILD(
        'Step 3 — add the new-quote button',
        ['<button', 'id="new-quote"', '>', 'New quote', '</button>'],
        ['<button', 'id="new-quote"', '>', 'New quote', '</button>', '<div>'],
        'Contract id plus a label the user understands.'
      ),
      MCQ(
        'The tweet link must share the current quote. How?',
        'Build its href from the same state the heading renders',
        [
          'Build its href from the same state the heading renders',
          'Hard-code one famous quote forever',
          'Open a blank tab and let the user type',
          'Copy the heading text with a screenshot',
        ],
        'One state, two consumers: heading and tweet link.'
      ),
    ],
  },

  'fed-state-workshop': {
    id: 'fed-state-workshop',
    title: 'Wire editor to preview step by step',
    theory: [
      'Workshop: connect the textarea state to the preview pane.',
    ],
    questions: [
      BUILD(
        'Step 1 — hold the markdown text in state',
        ['const', '[text,', 'setText]', '=', 'useState("");'],
        ['const', '[text,', 'setText]', '=', 'useState("");', 'let'],
        'Value plus setter, starting empty.'
      ),
      BUILD(
        'Step 2 — give the textarea its editor id',
        ['<textarea', 'id="editor"', '>'],
        ['<textarea', 'id="editor"', '>', '<input', 'id="preview"'],
        'The grader finds the editor by this exact id.'
      ),
      BUILD(
        'Step 3 — render state inside the preview pane',
        ['<div', 'id="preview"', '>', '{text}', '</div>'],
        ['<div', 'id="preview"', '>', '{text}', '</div>', '<span>'],
        'Required id plus live content.'
      ),
      MCQ(
        'Typing updates the preview instantly because…',
        'Each keystroke sets state, which re-renders both panes',
        [
          'Each keystroke sets state, which re-renders both panes',
          'The browser refreshes the page per key',
          'The preview polls the server every second',
          'Textareas and divs share memory natively',
        ],
        'State is the wire between input and output.'
      ),
    ],
  },

  'fed-effects-workshop': {
    id: 'fed-effects-workshop',
    title: 'Wire pads and keys step by step',
    theory: [
      'Workshop: connect keyboard, pads, clips, and display.',
    ],
    questions: [
      BUILD(
        'Step 1 — play the Q clip on demand',
        ['document.getElementById("Q").play();'],
        ['document.getElementById("Q").play();', '.pause();', 'getElementByClass'],
        'Grab the key-named clip and play it.'
      ),
      BUILD(
        'Step 2 — announce the hit on the display',
        ['document.getElementById("display").textContent', '=', 'name;'],
        ['document.getElementById("display").textContent', '=', 'name;', '.value'],
        'Same verdict pattern: grab, assign, done.'
      ),
      MCQ(
        'One play function serves keys AND clicks. Why is that better than two copies?',
        'One fix updates both triggers; they can never disagree',
        [
          'One fix updates both triggers; they can never disagree',
          'Functions cannot be called from two places',
          'Clicks are louder than key presses',
          'Key handlers cannot access the display',
        ],
        'Share the handler; wire two triggers.'
      ),
      MCQ(
        'The listener is added in an effect with a cleanup. What breaks without cleanup?',
        'Each re-render stacks another listener — one press plays many times',
        [
          'Each re-render stacks another listener — one press plays many times',
          'The pads lose their colors',
          'The clips download again per press',
          'Nothing — cleanups are documentation only',
        ],
        'Subscribe once, unsubscribe on unmount.'
      ),
    ],
  },

  'fed-redux-workshop': {
    id: 'fed-redux-workshop',
    title: 'Route a digit press step by step',
    theory: [
      'Workshop: dispatch the press, reduce the state, show the result.',
    ],
    questions: [
      BUILD(
        'Step 1 — describe the digit press as an action',
        ['dispatch({', 'type:', '"DIGIT",', 'digit:', '"7"', '});'],
        ['dispatch({', 'type:', '"DIGIT",', 'digit:', '"7"', '});', 'return'],
        'Facts, not logic: what happened, with payload.'
      ),
      BUILD(
        'Step 2 — evaluate the expression on equals',
        ['setDisplay(String(eval(expression)));'],
        ['setDisplay(String(eval(expression)));', 'parseInt(', 'Number('],
        'Whole-chain evaluation, exactly once, at equals.'
      ),
      MCQ(
        'The reducer must not mutate state. What does it return instead?',
        'A brand-new state object with the change applied',
        [
          'A brand-new state object with the change applied',
          'The same object with a hidden flag',
          'Nothing — reducers update the DOM directly',
          'A promise that resolves to the old state',
        ],
        'New object in, new state out — change detection survives.'
      ),
      MCQ(
        'Why does the display default to 0 instead of empty?',
        'Calculators always show a valid number, even before input',
        [
          'Calculators always show a valid number, even before input',
          'Zero renders faster than empty strings',
          'The grader cannot read empty elements',
          'Negative numbers are not supported',
        ],
        'Default state is a design decision: show 0, not nothing.'
      ),
    ],
  },

  'fed-timers-workshop': {
    id: 'fed-timers-workshop',
    title: 'Run a countdown step by step',
    theory: [
      'Workshop: schedule ticks, flip modes, sound the beep.',
    ],
    questions: [
      BUILD(
        'Step 1 — tick once per second',
        ['setInterval(()', '=>', 'tick(),', '1000);'],
        ['setInterval(()', '=>', 'tick(),', '1000);', 'setTimeout', '500);'],
        'Repeats forever until cleared.'
      ),
      BUILD(
        'Step 2 — stop the clock on pause',
        ['clearInterval(timerId);'],
        ['clearInterval(timerId);', 'stop();', 'pauseTimer'],
        'Every setInterval needs its clearing partner.'
      ),
      BUILD(
        'Step 3 — sound the beep at zero',
        ['document.getElementById("beep").play();'],
        ['document.getElementById("beep").play();', '.stop();', 'getElementByClass'],
        'The #beep element exists for this exact moment.'
      ),
      MCQ(
        '25:00 ticks once. What must the display read?',
        '24:59 — seconds wrap, then minutes step down',
        [
          '24:59 — seconds wrap, then minutes step down',
          '25:59 — minutes never change',
          '00:00 — any tick resets the clock',
          '24:00 — whole minutes only',
        ],
        'Borrow like subtraction: wrap, then decrement.'
      ),
    ],
  },

  'fed-checkpoint': {
    id: 'fed-checkpoint',
    title: 'Front End Libraries checkpoint',
    theory: [
      'Final check across all five levels: components, state, effects, data flow, and timers.',
    ],
    questions: [
      MCQ(
        'How do you show a live value inside JSX?',
        'Wrap it in curly braces: <h1>{quote}</h1>',
        ['Wrap it in curly braces: <h1>{quote}</h1>', 'Wrap it in quotes: <h1>"quote"</h1>', 'Use an HTML comment: <!--quote-->', 'Prefix it with a dollar sign'],
        'Braces embed JavaScript in markup.'
      ),
      BUILD(
        'Hold editor text in state',
        ['const', '[text,', 'setText]', '=', 'useState("");'],
        ['const', '[text,', 'setText]', '=', 'useState("");', 'let'],
        'Value plus setter.'
      ),
      MCQ(
        'Why share one play function between keys and clicks?',
        'One fix updates both — they can never disagree',
        ['One fix updates both — they can never disagree', 'Functions run only once', 'Clicks ignore shared functions', 'Keys cannot call functions'],
        'Share the handler.'
      ),
      MCQ(
        'What is a Redux action?',
        'A plain object describing what happened',
        ['A plain object describing what happened', 'A CSS animation', 'A server route', 'A database table'],
        'Facts in, reducer decides.'
      ),
      BUILD(
        'Tick the clock every second',
        ['setInterval(()', '=>', 'tick(),', '1000);'],
        ['setInterval(()', '=>', 'tick(),', '1000);', 'setTimeout'],
        'Repeats until cleared.'
      ),
      MCQ(
        'At 00:00 the clock must…',
        'Beep, then flip session to break (or back)',
        ['Beep, then flip session to break (or back)', 'Reset silently to 25:00', 'Delete the beep element', 'Freeze until reload'],
        'Signal first, then transition.'
      ),
    ],
  },

  'fed-quote-machine': {
    id: 'fed-quote-machine',
    title: 'Random Quote Machine',
    theory: [
      'Capstone 1 of 5: show a random quote with its author and a button for a new one. State holds the current quote; each click picks a different index and re-renders.',
      'A share link opens a pre-filled post carrying the quote text — encode it so punctuation survives the URL. Quote text and author render in dedicated elements the checks can find.',
      'New-quote logic must guarantee change: loop or filter until the index differs from the current one, so rapid clicks never show the same quote twice.',
    ],
    questions: [
      MCQ(
        'New Quote clicked twice fast shows the same quote. Fix?',
        'Re-pick until the index differs from current',
        ['Re-pick until the index differs from current', 'Disable the button forever', 'Show quotes alphabetically', 'Reload the page each click'],
        'Guarantee change, not just randomness.'
      ),
      MCQ(
        'Share link carries quote text with quotes and dashes. What protects it?',
        'encodeURIComponent on the text',
        ['encodeURIComponent on the text', 'Uppercase everything', 'Strip all punctuation', 'Shorten to 10 characters'],
        'Encoding keeps special characters URL-safe.'
      ),
      BUILD(
        'Random valid index for a quotes array',
        ['Math.floor(', 'Math.random()', '* quotes.length)'],
        ['Math.floor(', 'Math.random()', 'Math.ceil(', '* quotes.length)', '/ quotes.length)'],
        'Floor of random times length stays in range.'
      ),
      MCQ(
        'Quote and author must live in…',
        'Dedicated elements with stable ids',
        ['Dedicated elements with stable ids', 'The button label', 'A console.log', 'An alert popup'],
        'Checks read the rendered elements.'
      ),
    ],
  },

  'fed-markdown-previewer': {
    id: 'fed-markdown-previewer',
    title: 'Markdown Previewer',
    theory: [
      'Capstone 2 of 5: an editor textarea and a live preview side by side. Every keystroke updates state; the preview re-renders markdown as HTML instantly.',
      'Required markdown coverage: headings, bold, italic, links, inline code, code blocks, lists, blockquotes, images, and strikethrough. A parser library does the conversion — the app wires input to output.',
      'The editor ships pre-filled with a demo covering every element, so the preview is never empty on load. Rendered HTML goes in via the framework escape hatch for raw HTML.',
    ],
    questions: [
      MCQ(
        'Typing must update the preview on every keystroke. Which wiring?',
        'Controlled textarea: value from state, onChange writes state',
        ['Controlled textarea: value from state, onChange writes state', 'Uncontrolled input read once on submit', 'Preview polls the DOM every second', 'Two separate states never synced'],
        'Single state source drives both panes.'
      ),
      MCQ(
        'Preview must render <strong> from **text**. Who converts?',
        'A markdown parser library',
        ['A markdown parser library', 'CSS bold styling', 'The browser address bar', 'String.toUpperCase'],
        'Parse markdown to HTML, then render it.'
      ),
      BUILD(
        'Render parsed HTML inside React',
        ['dangerouslySetInnerHTML={{', '__html:', 'html }}'],
        ['dangerouslySetInnerHTML={{', 'innerText=', '__html:', 'html }}', 'children='],
        'The raw-HTML escape hatch.'
      ),
      MCQ(
        'Why ship the editor pre-filled?',
        'Preview demonstrates every element on first load',
        ['Preview demonstrates every element on first load', 'To slow down typing', 'Placeholders cannot be styled', 'State requires 500 characters'],
        'Demo content proves all coverage instantly.'
      ),
    ],
  },

  'fed-drum-machine': {
    id: 'fed-drum-machine',
    title: 'Drum Machine',
    theory: [
      'Capstone 3 of 5: nine pads (Q W E A S D Z X C) firing clips on click and keypress. Each pad owns an audio element; triggering resets playback and plays from zero.',
      'A display shows the name of the last-fired clip. Key handling listens at the window level and maps key codes to pads, ignoring repeats while held.',
      'Power and bank switches gate playback: off silences everything, bank swaps the clip set. Volume slider scales every clip.',
    ],
    questions: [
      MCQ(
        'Rapid-fire pad hits must restart the sound. Which step?',
        'Set currentTime to 0 before play()',
        ['Set currentTime to 0 before play()', 'Create a new Audio each hit', 'Wait for the clip to finish', 'Lower the volume to zero'],
        'Rewind-then-play makes hits machine-gun clean.'
      ),
      MCQ(
        'Pressing Q must fire the Q pad. Where does the listener live?',
        'Window keydown mapped to pad keys',
        ['Window keydown mapped to pad keys', 'On the footer element', 'In the page title', 'On mouse move'],
        'Global listener catches keys regardless of focus.'
      ),
      BUILD(
        'Play the pad clip from the top',
        ['clip.currentTime', '=', '0;', 'clip.play();'],
        ['clip.currentTime', 'clip.volume', '=', '0;', 'clip.play();', 'clip.stop();'],
        'Rewind, then play.'
      ),
      MCQ(
        'Power switch is off. Pad clicked. Result?',
        'Silence — gate blocks playback',
        ['Silence — gate blocks playback', 'Plays at double volume', 'Plays the wrong bank', 'Deletes the clip'],
        'Every trigger checks power first.'
      ),
    ],
  },

  'fed-calculator': {
    id: 'fed-calculator',
    title: 'Javascript Calculator',
    theory: [
      'Capstone 4 of 5: a calculator with digits, four operators, decimal, equals, and clear. The display shows the running expression and the result; consecutive operators collapse to the last one pressed (minus preserves negative signs).',
      'Decimal discipline: each number holds at most one dot. Equals evaluates with correct precedence — multiply and divide before add and subtract — and the result becomes the start of the next expression (chaining).',
      'Clear resets everything to the initial state. Leading zeros collapse: typing 0 then 5 shows 5, not 05.',
    ],
    questions: [
      MCQ(
        'User presses 5 × − + 5 (times, minus, plus, five). Expression?',
        '5 + 5 — last operator wins, minus kept for negatives',
        ['5 + 5 — last operator wins, minus kept for negatives', '5 × − + 5 literally', '5 × 5', 'Error, lock the pad'],
        'Collapse runs of operators to the final one.'
      ),
      MCQ(
        'Display shows 3.5 and user presses dot again. Result?',
        'Ignored — one dot per number',
        ['Ignored — one dot per number', '3.5.', '3..5', 'Clear the display'],
        'Dots attach to the current number only.'
      ),
      BUILD(
        'Evaluate 3 + 5 × 2 correctly',
        ['3 +', '5 * 2', '= 13'],
        ['3 +', '5 * 2', '= 13', '= 16', '3 + 5 first'],
        'Precedence: multiply before add.'
      ),
      MCQ(
        'After equals shows 13, user presses + 2 =. Result?',
        '15 — result chains into the next expression',
        ['15 — result chains into the next expression', '2 — starts over', '13 — equals locks', 'NaN'],
        'Answers become the next left operand.'
      ),
    ],
  },

  'fed-pomodoro-clock': {
    id: 'fed-pomodoro-clock',
    title: '25 + 5 Clock',
    theory: [
      'Capstone 5 of 5: a Pomodoro timer with adjustable session and break lengths (1–60), start/stop, and reset. The time display counts mm:ss down every second.',
      'At zero the beep sounds and the phase flips: session becomes break and back. Length controls work while paused; while running they pause adjustment or apply to the next phase.',
      'Reset restores defaults (25 session, 5 break), stops the tick, silences and rewinds the beep. The beep element must be an audio element the checks can trigger.',
    ],
    questions: [
      MCQ(
        'Timer hits 00:00 during a session. Exact sequence?',
        'Beep plays, label flips to Break, break length starts',
        ['Beep plays, label flips to Break, break length starts', 'Timer freezes at 00:00 silently', 'Session restarts immediately', 'Lengths reset to 25/5'],
        'Signal, flip phase, count the new length.'
      ),
      MCQ(
        'Session length controls while the clock is running should…',
        'Not corrupt the live countdown',
        ['Not corrupt the live countdown', 'Add minutes mid-tick freely', 'Delete the beep element', 'Skip the break phase'],
        'Adjust paused, or defer to next phase.'
      ),
      BUILD(
        'One-second tick that survives re-renders',
        ['setInterval(', 'tick,', '1000)'],
        ['setInterval(', 'tick,', '1000)', 'setTimeout(', 'tick(),'],
        'Interval id stored for stop and reset.'
      ),
      MCQ(
        'Reset pressed mid-session. Full result?',
        'Defaults restored, tick stopped, beep rewound',
        ['Defaults restored, tick stopped, beep rewound', 'Only the label changes', 'Beep loops forever', 'Lengths double'],
        'Reset is total: time, phase, sound, lengths.'
      ),
    ],
  },
};
