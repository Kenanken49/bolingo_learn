/**
 * Track JS · JavaScript Algorithms & Data Structures — leveled lesson banks.
 * Syllabus order mirrors the real-world path: variables and loops before
 * functions and objects, array methods before regex, DOM last (every
 * certification project renders its verdict on the page). All original.
 */

import { MCQ, BUILD, type CourseLesson } from '../quizBank';

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
      BUILD(
        'Start a function named toRoman that takes num',
        ['function', 'toRoman(num)', '{'],
        ['function', 'toRoman(num)', '=>', '{', '}'],
        'function keyword, name with its parameter, then the opening brace.'
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
};
