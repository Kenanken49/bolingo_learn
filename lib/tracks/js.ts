/**
 * Track JS · JavaScript Algorithms & Data Structures — leveled lesson banks.
 * Syllabus order mirrors the real-world path: variables and loops before
 * functions and objects, array methods before regex, DOM last (every
 * certification project renders its verdict on the page). All original.
 */

import { MCQ, BUILD, CODE, TEXT, type CourseLesson } from '../quizBank';

export const TRACK_JS: Record<string, CourseLesson> = {
  'js-variables-loops': {
    id: 'js-variables-loops',
    title: 'Variables and loops',
    theory: [
      'Variables store values: const for bindings you never reassign, let when the value changes. A for loop repeats with an initializer, a condition, and an update: for (let i = 0; i < n; i++).',
      'Palindrome checking needs both: normalize the string into a variable, then loop to compare characters from both ends.',
    ],
    questions: [
      MCQ(
        'Which declaration fits a value that will be reassigned?',
        'let',
        ['let', 'const', 'var is the only option', 'function'],
        'let allows reassignment; const forbids it. Prefer const until change is needed.'
      ),
      BUILD(
        'Declare a changeable counter starting at zero',
        ['let', 'count', '=', '0;'],
        ['let', 'count', '=', 'const', '0;', '1;'],
        'let count = 0; — keyword, name, assignment, starting value.'
      ),
      MCQ(
        'How many times does for (let i = 0; i < 3; i++) run its body?',
        '3 times',
        ['3 times', '4 times', '2 times', 'Forever — it never stops'],
        'i takes 0, 1, 2 — the loop stops when i < 3 is false.'
      ),
      MCQ(
        'What does str.length tell you about a string?',
        'How many characters it holds',
        [
          'How many characters it holds',
          'How many words it holds',
          'How much memory it uses in bytes',
          'Whether it is a palindrome',
        ],
        'Loop bounds come from length: the last index is str.length - 1.'
      ),
      BUILD(
        'Loop i from 0 while i is below n',
        ['for', '(let', 'i', '=', '0;', 'i', '<', 'n;', 'i++)'],
        ['for', '(let', 'i', '=', '0;', 'i', '<', '>', 'n;', 'i++)', 'while'],
        'For-loops bundle start, keep-going test, and step in one line.'
      ),
    ],
  },

  'js-functions-objects': {
    id: 'js-functions-objects',
    title: 'Functions and lookup objects',
    theory: [
      'Functions package logic: function name(input) { return output; }. Objects map keys to values — a Roman numeral converter is just a value map plus a loop that subtracts.',
      'Write the map once ({ M: 1000, CM: 900, … }), then loop over it from largest to smallest, appending symbols.',
    ],
    questions: [
      MCQ(
        'What does return do inside a function?',
        'Sends a value back to the caller and exits the function',
        [
          'Sends a value back to the caller and exits the function',
          'Prints the value to the page',
          'Restarts the function from the top',
          'Deletes the function after one call',
        ],
        'return hands the result back; code after it never runs.'
      ),
      CODE(
        'Write a function double(n) that returns n multiplied by 2.',
        {
          language: 'js',
          starter: '// Define double below, then run the tests\n',
          tests: [
            {
              id: 'defined',
              label: 'double is a function',
              run: "typeof double === 'function'",
              hint: 'Declare it with function double(n) { … } — the declaration itself makes it callable.',
            },
            {
              id: 'two',
              label: 'double(2) returns 4',
              run: 'double(2) === 4',
              hint: 'Return n * 2 — not n + 2.',
            },
            {
              id: 'negative',
              label: 'double(-3) returns -6',
              run: 'double(-3) === -6',
              hint: 'Negative numbers must work too — multiplying handles the sign for you.',
            },
            {
              id: 'zero',
              label: 'double(0) returns 0',
              run: 'double(0) === 0',
              hint: 'Multiplication handles zero; a special case here is a smell.',
            },
          ],
        },
        'function double(n) {\n  return n * 2;\n}',
        'A function takes a parameter, returns a computed value, and works for every input — the single n * 2 expression covers all four tests.'
      ),
      MCQ(
        'Why is an object a good fit for Roman numerals?',
        'Each symbol maps directly to its value: { M: 1000, CM: 900, … }',
        [
          'Each symbol maps directly to its value: { M: 1000, CM: 900, … }',
          'Objects automatically sort keys from largest to smallest',
          'Objects can only hold numbers, nothing else',
          'Functions cannot read arrays, only objects',
        ],
        'Lookup tables are objects: symbol in, value out, no long if-chain.'
      ),
      MCQ(
        'MCMXCIV starts with MCM — what value is consumed first?',
        '1000 (M), leaving CMXCIV',
        ['1000 (M), leaving CMXCIV', '100 (C), leaving MMCIV', '900 (CM), leaving MMXCIV', '4 (IV), leaving MCMXC'],
        'Greedy conversion always eats the largest fitting symbol first.'
      ),
      BUILD(
        'Append a symbol to the result string',
        ['result', '+=', 'symbol;'],
        ['result', '+=', 'symbol;', '-=', '='],
        'result += symbol grows the answer one numeral at a time.'
      ),
    ],
  },

  'js-array-fp': {
    id: 'js-array-fp',
    title: 'Array methods and functional thinking',
    theory: [
      'Functional array methods replace manual loops: map transforms each item, filter keeps matches, reduce folds everything into one value. They never mutate the original array.',
      'A cash register folds the drawer into a total with reduce, then loops denominations from largest to smallest to build change.',
    ],
    questions: [
      MCQ(
        'What does [1, 2, 3].map(x => x * 2) return?',
        '[2, 4, 6]',
        ['[2, 4, 6]', '[1, 2, 3]', '12', '[true, true, true]'],
        'map builds a NEW array with the function applied to each item.'
      ),
      BUILD(
        'Keep only prices above 10 from the prices array',
        ['prices.filter(p', '=>', 'p', '>', '10)'],
        ['prices.filter(p', '=>', 'p', '>', 'map', '10)', 'for'],
        'filter keeps items where the test returns true.'
      ),
      MCQ(
        'What is reduce folding in a cash-drawer total?',
        'Combining every denomination amount into one sum',
        [
          'Combining every denomination amount into one sum',
          'Removing counterfeit bills from the drawer',
          'Sorting coins from smallest to largest',
          'Splitting the total across customers',
        ],
        'reduce((sum, bill) => sum + bill, 0) collapses the array to one number.'
      ),
      MCQ(
        'When must the register report INSUFFICIENT_FUNDS?',
        'When the drawer total is smaller than the change owed',
        [
          'When the drawer total is smaller than the change owed',
          'When the customer pays with exact change',
          'When the drawer holds only pennies',
          'When the price ends in .99',
        ],
        'Status logic compares two numbers: drawer sum versus change due.'
      ),
      BUILD(
        'Add each bill to the running total with reduce',
        ['drawer.reduce((sum,', 'bill)', '=>', 'sum', '+', 'bill,', '0)'],
        ['drawer.reduce((sum,', 'bill)', '=>', 'sum', '+', 'bill,', 'map', '0)'],
        'Accumulator plus current item, starting from 0.'
      ),
    ],
  },

  'js-regex-strings': {
    id: 'js-regex-strings',
    title: 'Regex and string surgery',
    theory: [
      'Regular expressions describe character patterns: /[A-Z]/ matches one capital letter, /[^a-z0-9]/gi matches anything that is NOT a letter or digit. test() returns true/false; replace() swaps matches out.',
      'ROT13 shifts each letter 13 places with charCodeAt/fromCharCode; phone validation is one careful regex plus a boolean verdict.',
    ],
    questions: [
      MCQ(
        'What does /[^a-z0-9]/gi match?',
        'Any character that is not a letter or digit',
        [
          'Any character that is not a letter or digit',
          'Only lowercase letters a through z',
          'Only the digits 0 through 9',
          'An empty string',
        ],
        '[^…] negates the set; i ignores case, g means replace them all.'
      ),
      BUILD(
        'Strip every non-alphanumeric character from s',
        ['s.replace(/[^a-z0-9]/gi,', "'')"],
        ['s.replace(/[^a-z0-9]/gi,', "'')", '.test', '\"\"', '/[a-z]/'],
        'replace with an empty string deletes the matches — the palindrome normalizer.'
      ),
      MCQ(
        'In ROT13, what happens to spaces and punctuation?',
        'They pass through unchanged — only A–Z shift',
        [
          'They pass through unchanged — only A–Z shift',
          'They are deleted from the message',
          'They shift by 13 places like letters',
          'They become the letter M',
        ],
        'Guard with /[A-Z]/ first: shift letters, copy everything else.'
      ),
      MCQ(
        'Which pair converts between a letter and its code?',
        'charCodeAt and fromCharCode',
        ['charCodeAt and fromCharCode', 'toString and valueOf', 'split and join', 'push and pop'],
        'charCodeAt reads the number; fromCharCode writes the shifted letter back.'
      ),
      BUILD(
        'Test whether text contains a capital letter',
        ['/[A-Z]/.test(text)'],
        ['/[A-Z]/.test(text)', '/[a-z]/', '.match', '(text)'],
        'Regex literal, dot test, input in parentheses — true or false out.'
      ),
    ],
  },

  'js-dom': {
    id: 'js-dom',
    title: 'Showing verdicts on the page',
    theory: [
      'Every JavaScript certification project ends the same way: write the verdict into the page. document.getElementById grabs an element; textContent sets its text.',
      'Grab once, compute, then assign textContent — the pattern behind every result display, countdown, and validation message.',
    ],
    questions: [
      MCQ(
        'What does document.getElementById("result") return?',
        'The element whose id is "result"',
        [
          'The element whose id is "result"',
          'The text inside that element',
          'A list of every paragraph',
          'A true/false verdict',
        ],
        'It returns the ELEMENT — you decide what to do with it next.'
      ),
      BUILD(
        'Write the word Valid into the result element',
        ['document.getElementById(\"result\").textContent', '=', '\"Valid\";'],
        ['document.getElementById(\"result\").textContent', '=', '\"Valid\";', 'innerHTML()', 'querySelectorAll'],
        'Grab the element, set its textContent, done.'
      ),
      MCQ(
        'textContent versus innerHTML — when is textContent safer?',
        'When showing user-typed text, so it cannot inject markup',
        [
          'When showing user-typed text, so it cannot inject markup',
          'When the text is longer than 100 characters',
          'When the page uses no CSS at all',
          'When the element is an image',
        ],
        'textContent treats input as plain text — no accidental tags or scripts.'
      ),
      MCQ(
        'A verdict element must start empty, then show the answer. Which HTML fits?',
        '<p id="result"></p>',
        ['<p id="result"></p>', '<p class="result">done</p>', '<div>result</div>', '<span>result = ?</span>'],
        'Empty with an id: JavaScript fills it after computing.'
      ),
      BUILD(
        'Read the user input from the box with id check',
        ['document.getElementById(\"check\").value'],
        ['document.getElementById(\"check\").value', '.text', 'getElementByClass', '(\"check\").text'],
        'Inputs expose .value; paragraphs and divs expose textContent.'
      ),
    ],
  },

  'js-variables-workshop': {
    id: 'js-variables-workshop',
    title: 'Build a counter step by step',
    theory: [
      'Workshop: assemble the counting loop exactly as instructed. Every token already appeared in the lesson.',
    ],
    questions: [
      BUILD(
        'Step 1 — declare a changeable total starting at 0',
        ['let', 'total', '=', '0;'],
        ['let', 'total', '=', '0;', 'const', '1;'],
        'let, name, assignment, starting value.'
      ),
      BUILD(
        'Step 2 — open a loop running 3 times',
        ['for', '(let', 'i', '=', '0;', 'i', '<', '3;', 'i++)', '{'],
        ['for', '(let', 'i', '=', '0;', 'i', '<', '3;', 'i++)', '{', 'while', '}'],
        'Initializer, condition, update, then the opening brace.'
      ),
      BUILD(
        'Step 3 — add 1 to the total each pass',
        ['total', '+=', '1;', '}'],
        ['total', '+=', '1;', '}', '=', 'total;'],
        'Grow the total, then close the loop body.'
      ),
      MCQ(
        'After the loop, total equals 3. Why not 4?',
        'i takes 0, 1, 2 — three passes, then the condition fails',
        [
          'i takes 0, 1, 2 — three passes, then the condition fails',
          'The last pass is skipped automatically',
          'total resets to zero after every loop',
          'for loops always run one fewer time than written',
        ],
        'Count the values of i: three values, three passes.'
      ),
      CODE(
        'Write a loop that pushes 0, 1, 2, 3, 4 into numbers.',
        {
          language: 'js',
          starter: 'const numbers = [];\n// Loop from 0 to 4 and push each value.\n',
          tests: [
            { id: 'array', label: 'numbers is an array', run: "Array.isArray(numbers)", hint: 'Do not replace numbers with a string.' },
            { id: 'length', label: 'numbers has five values', run: 'numbers.length === 5', hint: 'The loop should run five times, starting at 0.' },
            { id: 'order', label: 'values are 0 through 4 in order', run: "numbers.join(',') === '0,1,2,3,4'", hint: 'Push i inside the loop; do not hard-code the whole array.' },
          ],
        },
        'const numbers = [];\nfor (let i = 0; i < 5; i += 1) {\n  numbers.push(i);\n}',
        'A loop turns a repeated push into one rule: start at 0, stop below 5, step by one.'
      ),
    ],
  },

  'js-functions-workshop': {
    id: 'js-functions-workshop',
    title: 'Build a converter step by step',
    theory: [
      'Workshop: assemble the value-map converter exactly as instructed.',
    ],
    questions: [
      BUILD(
        'Step 1 — open a values object with M at 1000',
        ['const', 'values', '=', '{', 'M:', '1000', '};'],
        ['const', 'values', '=', '{', 'M:', '1000', '};', 'map', '[]'],
        'Lookup table first: symbol keys, numeric values.'
      ),
      BUILD(
        'Step 2 — declare the converter function',
        ['function', 'toRoman(num)', '{'],
        ['function', 'toRoman(num)', '{', '=>', 'function()', '}'],
        'Keyword, name with parameter, opening brace.'
      ),
      BUILD(
        'Step 3 — start with an empty answer string',
        ['let', 'result', '=', '"";'],
        ['let', 'result', '=', '"";', 'const', 'null;'],
        'Empty string, grown symbol by symbol.'
      ),
      MCQ(
        'With values { M: 1000, CM: 900 } and num 1900, what happens first?',
        'M fits, so append M and subtract 1000, leaving 900',
        [
          'M fits, so append M and subtract 1000, leaving 900',
          'CM fits immediately because letters come first',
          'Both symbols append at once for MCM',
          'The function returns empty since 1900 is not a key',
        ],
        'Greedy order eats the largest fitting value first.'
      ),
    ],
  },

  'js-array-workshop': {
    id: 'js-array-workshop',
    title: 'Fold a drawer step by step',
    theory: [
      'Workshop: assemble the functional pipeline exactly as instructed.',
    ],
    questions: [
      BUILD(
        'Step 1 — total the drawer with reduce',
        ['drawer.reduce((sum,', 'bill)', '=>', 'sum', '+', 'bill,', '0)'],
        ['drawer.reduce((sum,', 'bill)', '=>', 'sum', '+', 'bill,', '0)', 'map'],
        'Accumulator plus current bill, starting from zero.'
      ),
      BUILD(
        'Step 2 — double every price with map',
        ['prices.map(p', '=>', 'p', '*', '2)'],
        ['prices.map(p', '=>', 'p', '*', '2)', 'filter', 'for'],
        'map builds a new array; the original is untouched.'
      ),
      BUILD(
        'Step 3 — keep affordable items with filter',
        ['items.filter(item', '=>', 'item.price', '<', '10)'],
        ['items.filter(item', '=>', 'item.price', '<', '10)', 'map', 'reduce'],
        'Keep the matches, drop the rest — one predicate.'
      ),
      MCQ(
        'Drawer sums to 4.50 but change owed is 5.00. Status?',
        'INSUFFICIENT_FUNDS — the drawer cannot cover the change',
        [
          'INSUFFICIENT_FUNDS — the drawer cannot cover the change',
          'OPEN — partial change is fine',
          'CLOSED — the drawer is exactly right',
          'PENDING — wait for more customers',
        ],
        'Compare totals first; status follows the arithmetic.'
      ),
      CODE(
        'Write doubleAll(nums): return a new array with every number doubled.',
        {
          language: 'js',
          starter: 'function doubleAll(nums) {\n  // Return a new array; do not mutate nums.\n}\n',
          tests: [
            { id: 'double', label: 'doubleAll([1, 2, 3]) returns [2, 4, 6]', run: "JSON.stringify(doubleAll([1, 2, 3])) === '[2,4,6]'", hint: 'Map over nums and multiply each value by 2.' },
            { id: 'empty', label: 'doubleAll([]) returns an empty array', run: 'Array.isArray(doubleAll([])) && doubleAll([]).length === 0', hint: 'map handles an empty array without a special case.' },
            { id: 'immutable', label: 'the original array is unchanged', run: '(() => { const input = [1, 2]; doubleAll(input); return input.join(",") === "1,2"; })()', hint: 'map returns a new array; do not push into nums.' },
          ],
        },
        'function doubleAll(nums) {\n  return nums.map((n) => n * 2);\n}',
        'map expresses the transformation directly and returns a new array, so the caller’s data stays untouched.'
      ),
    ],
  },

  'js-regex-workshop': {
    id: 'js-regex-workshop',
    title: 'Clean and shift text step by step',
    theory: [
      'Workshop: assemble the normalizer and decoder exactly as instructed.',
    ],
    questions: [
      BUILD(
        'Step 1 — strip non-alphanumerics from s',
        ['s.replace(/[^a-z0-9]/gi,', '"\'")'],
        ['s.replace(/[^a-z0-9]/gi,', '"\'")', '.test', '/[a-z]/'],
        'Negated set, global, case-insensitive — replaced with nothing.'
      ),
      BUILD(
        'Step 2 — test for a capital letter before shifting',
        ['if', '(/[A-Z]/.test(ch))', '{'],
        ['if', '(/[A-Z]/.test(ch))', '{', 'while', '}'],
        'Guard letters; symbols skip the shift.'
      ),
      BUILD(
        'Step 3 — read the code of a letter',
        ['ch.charCodeAt(0)'],
        ['ch.charCodeAt(0)', '.length', 'fromCharCode', '(1)'],
        'charCodeAt turns the letter into a number you can add 13 to.'
      ),
      MCQ(
        'After shifting, how do numbers become letters again?',
        'String.fromCharCode converts the shifted code back to a letter',
        [
          'String.fromCharCode converts the shifted code back to a letter',
          'Numbers render as letters automatically',
          'toString(13) decodes ROT13 natively',
          'parseInt reverses the shift',
        ],
        'Codes in, letters out — the mirror of charCodeAt.'
      ),
      CODE(
        'Write maskEmail(email): keep the first local character, replace the rest with ***, and preserve the @domain. Return the input unchanged when it has no @.',
        {
          language: 'js',
          starter: 'function maskEmail(email) {\n  // Mask everything before @ except the first character\n}\n',
          tests: [
            { id: 'normal', label: 'amina@example.com becomes a***@example.com', run: "maskEmail('amina@example.com') === 'a***@example.com'", hint: 'Capture the first character and the @domain, then rebuild.' },
            { id: 'short', label: 'bo@x.io becomes b***@x.io', run: "maskEmail('bo@x.io') === 'b***@x.io'", hint: 'One visible character is enough; mask the remainder.' },
            { id: 'single', label: 'a@b.com becomes a***@b.com', run: "maskEmail('a@b.com') === 'a***@b.com'", hint: 'A one-character local part still gets the *** suffix.' },
            { id: 'invalid', label: 'A string without @ is returned unchanged', run: "maskEmail('no-at-sign') === 'no-at-sign'", hint: 'Return early when indexOf("@") is -1.' },
          ],
        },
        'function maskEmail(email) {\n  const at = email.indexOf("@");\n  if (at < 1) return email;\n  return email[0] + "***" + email.slice(at);\n}',
        'Privacy-preserving display is a string problem: find the boundary, keep the minimum identifying prefix, and preserve the domain so the person can still recognize the address.'
      ),
    ],
  },

  'js-dom-workshop': {
    id: 'js-dom-workshop',
    title: 'Wire a verdict display step by step',
    theory: [
      'Workshop: assemble the grab-compute-show pattern exactly as instructed.',
    ],
    questions: [
      BUILD(
        'Step 1 — grab the result element',
        ['const', 'el', '=', 'document.getElementById("result");'],
        ['const', 'el', '=', 'document.getElementById("result");', 'querySelectorAll'],
        'Grab once, reuse the reference — never query twice.'
      ),
      BUILD(
        'Step 2 — show the verdict text',
        ['el.textContent', '=', '"Valid";'],
        ['el.textContent', '=', '"Valid";', '.value', '.innerHTML ='],
        'textContent is the safe slot for computed verdicts.'
      ),
      BUILD(
        'Step 3 — read what the user typed',
        ['const', 'input', '=', 'document.getElementById("check").value;'],
        ['const', 'input', '=', 'document.getElementById("check").value;', '.text'],
        'Inputs expose .value; everything else uses textContent.'
      ),
      MCQ(
        'The verdict element must start empty. Why not pre-fill it?',
        'Stale text would show before any computation runs',
        [
          'Stale text would show before any computation runs',
          'Empty elements load measurably faster',
          'JavaScript cannot overwrite pre-filled text',
          'Graders reject any visible placeholder',
        ],
        'Empty with an id: JavaScript fills it after computing.'
      ),
      CODE(
        'Write renderVerdict(message): create one paragraph with id="verdict" if it is missing, set its textContent to message, and return the text. Calling it twice must update the same element, not add a second one.',
        {
          language: 'js',
          starter: 'function renderVerdict(message) {\n  // Create-or-update #verdict, then return its text\n}\n',
          tests: [
            { id: 'create', label: 'The first call creates #verdict', run: "renderVerdict('Valid') === 'Valid' && !!document.getElementById('verdict')", hint: 'Use document.getElementById first, then create and append a p when it is null.' },
            { id: 'text', label: 'The element carries the exact message', run: "renderVerdict('Valid') === 'Valid' && document.getElementById('verdict').textContent === 'Valid'", hint: 'Use textContent — never innerHTML for untrusted verdict text.' },
            { id: 'update', label: 'A second call updates instead of duplicating', run: "(function () { renderVerdict('Valid'); renderVerdict('Not valid'); return document.querySelectorAll('#verdict').length === 1 && document.getElementById('verdict').textContent === 'Not valid'; })()", hint: 'Reuse the element; do not append on every call.' },
            { id: 'return', label: 'The function returns the rendered text', run: "renderVerdict('Maybe') === 'Maybe'", hint: 'Return the same string you wrote into textContent.' },
          ],
        },
        'function renderVerdict(message) {\n  let el = document.getElementById("verdict");\n  if (!el) {\n    el = document.createElement("p");\n    el.id = "verdict";\n    document.body.appendChild(el);\n  }\n  el.textContent = message;\n  return el.textContent;\n}',
        'The grab-compute-show pattern needs one element with one identity. Creating it lazily and updating textContent keeps the DOM stable, avoids duplicate ids, and makes repeated renders idempotent.'
      ),
    ],
  },

  'js-checkpoint': {
    id: 'js-checkpoint',
    title: 'JavaScript checkpoint',
    theory: [
      'Final check across all five levels: loops, functions, array methods, regex, and DOM verdicts.',
    ],
    questions: [
      MCQ(
        'for (let i = 0; i < 3; i++) runs its body…',
        '3 times',
        ['3 times', '4 times', '2 times', 'Forever'],
        'i takes 0, 1, 2.'
      ),
      MCQ(
        'Why does a converter use an object like { M: 1000, CM: 900 }?',
        'Symbols map directly to values for greedy lookup',
        ['Symbols map directly to values for greedy lookup', 'Objects sort themselves automatically', 'Functions cannot read arrays', 'Numerals must be stored as strings'],
        'Lookup tables beat long if-chains.'
      ),
      BUILD(
        'Double every price functionally',
        ['prices.map(p', '=>', 'p', '*', '2)'],
        ['prices.map(p', '=>', 'p', '*', '2)', 'filter', 'for'],
        'map builds new; originals survive.'
      ),
      BUILD(
        'Strip non-alphanumerics before comparing',
        ['s.replace(/[^a-z0-9]/gi,', '"\'")'],
        ['s.replace(/[^a-z0-9]/gi,', '"\'")', '.test'],
        'Normalize first, compare second.'
      ),
      MCQ(
        'Where does a computed verdict go?',
        'Into textContent of the result element',
        ['Into textContent of the result element', 'Into the page title tag', 'Into a brand-new HTML file', 'Into the browser address bar'],
        'Grab by id, assign textContent.'
      ),
      MCQ(
        'Drawer totals 4.50, change owed is 5.00. Status?',
        'INSUFFICIENT_FUNDS',
        ['INSUFFICIENT_FUNDS', 'OPEN', 'CLOSED', 'PENDING'],
        'Drawer smaller than change: insufficient.'
      ),
      TEXT(
        'Type the expression that checks whether value is strictly equal to zero.',
        ['value === 0', 'value===0'],
        'Triple equals compares type and value, so "0" and 0 are different. Prefer strict equality in every condition.',
        { misconceptions: { 'value == 0': 'Double equals coerces types. Use === for a strict comparison.' } }
      ),
      CODE(
        'Write sumEven(nums): return the sum of all even numbers in the array.',
        {
          language: 'js',
          starter: 'function sumEven(nums) {\n  // Return the sum; an empty array sums to 0.\n}\n',
          tests: [
            { id: 'mixed', label: 'sumEven([1, 2, 3, 4]) returns 6', run: 'sumEven([1, 2, 3, 4]) === 6', hint: 'Filter for even values, then reduce to a sum.' },
            { id: 'empty', label: 'sumEven([]) returns 0', run: 'sumEven([]) === 0', hint: 'Give reduce a starting value of 0.' },
            { id: 'repeat', label: 'sumEven([2, 2]) returns 4', run: 'sumEven([2, 2]) === 4', hint: 'Every matching value must be added, not just the first.' },
            { id: 'negative', label: 'sumEven([-2, 3]) returns -2', run: 'sumEven([-2, 3]) === -2', hint: 'Negative even numbers count too: use n % 2 === 0.' },
          ],
        },
        'function sumEven(nums) {\n  return nums.filter((n) => n % 2 === 0).reduce((sum, n) => sum + n, 0);\n}',
        'The pipeline separates the two ideas: filter decides which values qualify, reduce combines them. The 0 starting value makes the empty case automatic.'
      ),
    ],
  },

  'js-palindrome': {
    id: 'js-palindrome',
    title: 'Palindrome Checker',
    theory: [
      'Capstone 1 of 5: read user text and announce whether it is a palindrome. Normalize first: lowercase everything and strip every character that is not a letter or digit.',
      'Compare the cleaned string against its reverse. An empty input after cleaning counts as no verdict — prompt for real text instead.',
      'The verdict renders on the page with the original input quoted, so the learner sees exactly what was judged.',
    ],
    questions: [
      MCQ(
        'Normalize "A man, a plan" for the check. First two moves?',
        'Lowercase, then strip non-alphanumerics',
        ['Lowercase, then strip non-alphanumerics', 'Uppercase, then add punctuation', 'Split into words, sort them', 'Reverse, then lowercase'],
        'Case-insensitive, punctuation-blind comparison.'
      ),
      MCQ(
        'Which pattern removes everything except letters and digits?',
        '/[^a-z0-9]/g',
        ['/[^a-z0-9]/g', '/[a-z0-9]/g', '/[^ ]/g', '/\\w+/'],
        'Negated class targets the junk; replace with empty string.'
      ),
      BUILD(
        'Reverse a cleaned string',
        ['[...s]', '.reverse()', '.join(\'\')'],
        ['[...s]', '.reverse()', '.join(\'\')', '.sort()', '.push()'],
        'Spread, reverse, rejoin — then compare.'
      ),
      MCQ(
        'User submits only spaces and punctuation. Correct response?',
        'Ask for real text — no verdict',
        ['Ask for real text — no verdict', 'Declare it a palindrome', 'Crash on empty string', 'Check the raw input uncleaned'],
        'Nothing alphanumeric means nothing to judge.'
      ),
    ],
  },

  'js-roman-numeral': {
    id: 'js-roman-numeral',
    title: 'Roman Numeral Converter',
    theory: [
      'Capstone 2 of 5: convert integers 1–3999 to Roman numerals. A lookup table pairs values with symbols: 1000→M, 900→CM, 500→D, 400→CD, 100→C, 90→XC, 50→L, 40→XL, 10→X, 9→IX, 5→V, 4→IV, 1→I.',
      'Greedy loop: while the number remains, take the largest table value that fits, append its symbol, subtract. Subtractive pairs (IV, IX, XL, XC, CD, CM) must sit in the table — never build them by logic.',
      'Guard the edges: reject numbers below 1, above 3999, and non-integers before converting.',
    ],
    questions: [
      MCQ(
        'Converting 94: after XC (90), what comes next?',
        'IV — 4 is the largest fit of the remainder',
        ['IV — 4 is the largest fit of the remainder', 'IIII', 'V', 'IX'],
        'Greedy: biggest fitting symbol, subtract, repeat.'
      ),
      MCQ(
        'Why must 900→CM live in the lookup table?',
        'Greedy subtraction only works if subtractive pairs are entries',
        ['Greedy subtraction only works if subtractive pairs are entries', 'To make the table longer', 'Roman law requires it', 'To slow the loop down'],
        'Without CM the loop would emit DCCCC.'
      ),
      BUILD(
        'Table entry every converter needs',
        ['[900,', '\'CM\'],'],
        ['[900,', '\'CM\'],', '[900,', '\'DCCCC\'],', '[999,'],
        'Value-symbol pair, subtractive included.'
      ),
      MCQ(
        'Input 0 or 4000 arrives. Correct response?',
        'Reject — range is 1 to 3999',
        ['Reject — range is 1 to 3999', 'Convert anyway with negatives', 'Return an empty string silently', 'Round to the nearest valid'],
        'Standard numerals cover 1–3999 only.'
      ),
    ],
  },

  'js-cash-register': {
    id: 'js-cash-register',
    title: 'Cash Register Game',
    theory: [
      'Capstone 3 of 5: from price and cash, compute change and report status. Change equals cash minus price; when cash falls short, alert the customer to bring more.',
      'Three statuses: INSUFFICIENT_FUNDS when the drawer cannot cover change, CLOSED when the drawer total exactly equals change (pay it all out), OPEN otherwise with per-denomination breakdown.',
      'Walk denominations high to low, spending each only up to what the drawer holds. Floating point is the trap — work in cents or round at every step.',
    ],
    questions: [
      MCQ(
        'Price 3.26, cash 100, drawer holds plenty. Status?',
        'OPEN with the per-denomination breakdown',
        ['OPEN with the per-denomination breakdown', 'CLOSED', 'INSUFFICIENT_FUNDS', 'PENDING'],
        'Covered with money left over: open and itemize.'
      ),
      MCQ(
        'Drawer total exactly equals the change owed. Status and payout?',
        'CLOSED — hand over the whole drawer',
        ['CLOSED — hand over the whole drawer', 'OPEN with coins only', 'INSUFFICIENT_FUNDS', 'OPEN with bills only'],
        'Exact match empties the drawer: closed.'
      ),
      BUILD(
        'Safest change arithmetic in JavaScript',
        ['Math.round(', 'change', '* 100)'],
        ['Math.round(', 'change', '* 100)', 'parseInt(', '/ 100)'],
        'Cents kill 0.1 + 0.2 drift.'
      ),
      MCQ(
        'Cash is less than price. First move?',
        'Alert: customer cash is short',
        ['Alert: customer cash is short', 'Open the drawer anyway', 'Report CLOSED', 'Dispense random coins'],
        'No change problem exists until payment covers price.'
      ),
    ],
  },

  'js-caesars-cipher': {
    id: 'js-caesars-cipher',
    title: 'Caesars Cipher',
    theory: [
      'Capstone 4 of 5: ROT13 — shift every letter 13 places, leave everything else untouched. A becomes N, N becomes A; digits, spaces, and punctuation pass through unchanged.',
      'Uppercase the input first so one alphabet range covers everything. For each character code: A–M shifts forward 13, N–Z shifts back 13, anything outside A–Z copies through.',
      'ROT13 is its own inverse: encoding twice returns the original. That symmetry is the self-test — run the output through again and expect the input.',
    ],
    questions: [
      MCQ(
        'Encoding "HELLO WORLD" — what happens to the space?',
        'Passes through unchanged',
        ['Passes through unchanged', 'Shifts to M', 'Is deleted', 'Becomes N'],
        'Only A–Z shifts; everything else copies.'
      ),
      MCQ(
        'Char code 78 (N) under ROT13 becomes…',
        '65 (A) — wrap back 13',
        ['65 (A) — wrap back 13', '91', '78 unchanged', '64'],
        'Second half wraps backward; first half shifts forward.'
      ),
      BUILD(
        'Guard: only shift A–Z codes',
        ['if', '(code >= 65', '&& code <= 90)'],
        ['if', '(code >= 65', '&& code <= 90)', '|| code < 65)', 'while'],
        'Range check before arithmetic.'
      ),
      MCQ(
        'Fastest self-test that the cipher is correct?',
        'Encode the output again — expect the input',
        ['Encode the output again — expect the input', 'Encode a third time', 'Compare lengths only', 'Check the first letter only'],
        'ROT13 is an involution: twice is identity.'
      ),
    ],
  },

  'js-telephone-validator': {
    id: 'js-telephone-validator',
    title: 'Telephone Validator',
    theory: [
      'Capstone 5 of 5: accept valid US numbers, reject the rest. Valid shapes: 5555555555, 555-555-5555, (555)555-5555, (555) 555-5555, 555 555 5555, 1 555 555 5555 and their mixes.',
      'Parentheses must pair around the area code — (555) passes, (555 or 555) fails. A leading 1 country code is optional but must stand alone, never glued to the area code.',
      'One regex with optional groups covers every shape; anything with letters, wrong digit counts, or unbalanced parens fails. Empty input gets a prompt, not a verdict.',
    ],
    questions: [
      MCQ(
        '"1 (555) 555-5555" — verdict?',
        'Valid — country code plus paired parens',
        ['Valid — country code plus paired parens', 'Invalid — spaces forbidden', 'Invalid — parens forbidden with 1', 'Invalid — dashes required'],
        'Optional 1, paired parens, ten digits: valid.'
      ),
      MCQ(
        '"(555-555-5555" — verdict?',
        'Invalid — unbalanced parenthesis',
        ['Invalid — unbalanced parenthesis', 'Valid — dash instead of close paren', 'Valid — open paren is enough', 'Invalid — too many digits'],
        'Parens pair or nothing.'
      ),
      BUILD(
        'Optional leading country code in the regex',
        ['^(1\\s?)?', '\\d'],
        ['^(1\\s?)?', '\\d', '(1\\s?)*', '$1'],
        'Optional group, then digits.'
      ),
      MCQ(
        '"555-abc-5555" — verdict?',
        'Invalid — letters are never allowed',
        ['Invalid — letters are never allowed', 'Valid — letters read as digits', 'Valid — dashes fix it', 'Invalid — too short'],
        'Digits, spaces, dashes, parens, one leading 1: nothing else.'
      ),
    ],
  },
};
