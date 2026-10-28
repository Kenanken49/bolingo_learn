/**
 * Track PY · Scientific Computing & Data Analysis — leveled lesson banks.
 * Syllabus order: Python syntax first, then OOP, then the NumPy/Pandas data
 * stack, then dates and strings, and formatting/validation last. All original.
 */

import { MCQ, BUILD, type CourseLesson } from '../quizBank';

export const TRACK_PY: Record<string, CourseLesson> = {
  'py-basics': {
    id: 'py-basics',
    title: 'Python basics and ledgers',
    theory: [
      'Python reads like pseudocode: lists hold items, methods mutate or compute, and f-strings embed values. A Category ledger is a list of {"amount", "description"} dicts with deposit/withdraw methods.',
      'Withdraw returns False when funds run short — the method refuses instead of going negative.',
    ],
    questions: [
      MCQ(
        'What does ledger.append({"amount": 50}) do?',
        'Adds one deposit record to the end of the ledger list',
        [
          'Adds one deposit record to the end of the ledger list',
          'Replaces the entire ledger with 50',
          'Sorts the ledger from largest to smallest',
          'Sends 50 to another category',
        ],
        'append grows the list by exactly one item — the deposit paper trail.'
      ),
      BUILD(
        'Append a withdrawal record for amount spent',
        ['self.ledger.append({\"amount\":', '-amount,', '\"description\":', 'desc', '})'],
        ['self.ledger.append({\"amount\":', '-amount,', '\"description\":', 'desc', '})', 'add', '"amount": amount,'],
        'Withdrawals store negative amounts — the minus sign is the meaning.'
      ),
      MCQ(
        'The fund holds 30 and withdraw(50) is called. What should happen?',
        'Return False and change nothing — no overdraft',
        [
          'Return False and change nothing — no overdraft',
          'Return True and set the balance to -20',
          'Delete the ledger and start over',
          'Withdraw 30 and forget the remaining 20',
        ],
        'Guard first: check funds, then mutate. Refusals return False.'
      ),
      MCQ(
        'How does a method read the category\u2019s own ledger?',
        'Through self — self.ledger is that instance\u2019s list',
        [
          'Through self — self.ledger is that instance\u2019s list',
          'Through a global variable shared by all categories',
          'By re-reading the source file each time',
          'Methods cannot see instance data',
        ],
        'self is the instance: its ledger, its balance, its business.'
      ),
      BUILD(
        'Total the ledger amounts with a starting balance of zero',
        ['balance', '=', 'sum(item[\"amount\"]', 'for', 'item', 'in', 'self.ledger)'],
        ['balance', '=', 'sum(item[\"amount\"]', 'for', 'item', 'in', 'self.ledger)', 'total(', 'append'],
        'A generator sums every amount — deposits add, withdrawals subtract.'
      ),
    ],
  },

  'py-oop': {
    id: 'py-oop',
    title: 'Classes and inheritance',
    theory: [
      'Rectangle stores width/height and computes area, perimeter, diagonal, picture, and containment. Square extends Rectangle — same interface, one side repeated.',
      'Inheritance means Square IS-A Rectangle: it reuses every method and only changes construction.',
    ],
    questions: [
      MCQ(
        'Square(Rectangle) as a class declaration means what?',
        'Square inherits every method from Rectangle',
        [
          'Square inherits every method from Rectangle',
          'Square deletes Rectangle\u2019s methods',
          'Rectangle becomes a kind of Square',
          'The two classes cannot be used together',
        ],
        'Parentheses name the parent: Square gets area, perimeter, and all.'
      ),
      MCQ(
        'Why does get_picture refuse shapes wider than 50?',
        'Pictures are for humans — huge ones flood the screen',
        [
          'Pictures are for humans — huge ones flood the screen',
          'Python strings cannot exceed 50 characters',
          'Wide shapes have no area to draw',
          'The test suite times out after 50 asterisks',
        ],
        '"Too big for picture." is a kindness: cap display, keep math exact.'
      ),
      BUILD(
        'Compute the rectangle area from width and height',
        ['return', 'self.width', '*', 'self.height'],
        ['return', 'self.width', '*', 'self.height', '+', 'self.side'],
        'Area is width times height — attributes, not guesses.'
      ),
      MCQ(
        'get_amount_inside(shape) asks how many shapes fit. What must it ignore?',
        'Partial fits — only whole shapes count (integer division)',
        [
          'Partial fits — only whole shapes count (integer division)',
          'The color of each shape',
          'Shapes larger than the container count as one',
          'The shape\u2019s name and description',
        ],
        'Floor the division: 2.9 fitting shapes hold 2 shapes.'
      ),
      BUILD(
        'Give Square a single-side constructor calling the parent',
        ['super().__init__(side,', 'side)'],
        ['super().__init__(side,', 'side)', 'self(', 'Rectangle side'],
        'super() runs the parent constructor with width and height equal.'
      ),
    ],
  },

  'py-numpy-pandas': {
    id: 'py-numpy-pandas',
    title: 'Data frames with Pandas',
    theory: [
      'Pandas loads the census CSV with read_csv into a DataFrame — rows of people, columns of attributes. groupby splits rows, mean/value_counts summarize them.',
      'The analysis answers fixed questions: race counts, average age by sex, education income share, top occupations and countries.',
    ],
    questions: [
      MCQ(
        'What does pd.read_csv("adult.csv") return?',
        'A DataFrame: rows of people, columns of attributes',
        [
          'A DataFrame: rows of people, columns of attributes',
          'A single average age number',
          'A chart image saved to disk',
          'A list of column names only',
        ],
        'Everything downstream — filters, groups, means — starts from the frame.'
      ),
      BUILD(
        'Count people by race with value counts',
        ['df[\"race\"].value_counts()'],
        ['df[\"race\"].value_counts()', 'df.count', '.groupby(', '.mean()'],
        'Column, then count each distinct value — the demographic headcount.'
      ),
      MCQ(
        'How do you get average age of men versus women?',
        'Group by sex, then take the mean of age',
        [
          'Group by sex, then take the mean of age',
          'Sort by age and read the middle row',
          'Delete every row under 18 first',
          'Average the two oldest people of each sex',
        ],
        'groupby("sex")["age"].mean() — split, then summarize each split.'
      ),
      MCQ(
        'What does the "higher-education rich" percentage need?',
        'Two counts: advanced-degree earners over $50K divided by all advanced-degree holders',
        [
          'Two counts: advanced-degree earners over $50K divided by all advanced-degree holders',
          'The total number of rows in the file',
          'The richest single person\u2019s salary',
          'The average years of schooling worldwide',
        ],
        'Percentages are fractions: numerator filtered twice, denominator once.'
      ),
      BUILD(
        'Average hours worked per week by occupation',
        ['df.groupby(\"occupation\")[\"hours-per-week\"].mean()'],
        ['df.groupby(\"occupation\")[\"hours-per-week\"].mean()', '.sum()', '.max()', 'df.sort'],
        'Group rows by job, average the hours column within each group.'
      ),
    ],
  },

  'py-datetime-strings': {
    id: 'py-datetime-strings',
    title: 'Time math and weekdays',
    theory: [
      'add_time(start, duration, day=None) adds hours and minutes, flips AM/PM across 12-hour boundaries, rolls days over, and names the weekday when given.',
      'Track three things: the clock time, the AM/PM flag, and days-later — "(next day)" for one, "(N days later)" beyond.',
    ],
    questions: [
      MCQ(
        '11:59 PM plus 0:02 is 12:01 AM. What flipped?',
        'Both the hour cycle and the AM/PM flag, with a day rollover',
        [
          'Both the hour cycle and the AM/PM flag, with a day rollover',
          'Only the minutes — hours never change',
          'The weekday but not the date',
          'Nothing — 11:61 PM is a valid time',
        ],
        'Crossing 12 flips AM/PM; crossing midnight adds "(next day)".'
      ),
      BUILD(
        'Define add_time with an optional weekday defaulting to None',
        ['def', 'add_time(start,', 'duration,', 'day=None):'],
        ['def', 'add_time(start,', 'duration,', 'day=None):', 'function', 'day="":'],
        'def, name, required params, optional param with default, colon.'
      ),
      MCQ(
        'Start Monday, duration pushes 3 days forward. What weekday is reported?',
        'Thursday — Monday plus 3, wrapping past Sunday as needed',
        [
          'Thursday — Monday plus 3, wrapping past Sunday as needed',
          'Monday — weekdays never change',
          'Day 4 — weekdays are reported as numbers',
          'The weekday of the duration string',
        ],
        'Index the 7-day list and take modulo 7 after adding.'
      ),
      MCQ(
        'When is "(next day)" used instead of "(N days later)"?',
        'When exactly one day rolls over',
        [
          'When exactly one day rolls over',
          'When the weekday is unknown',
          'When the time stays AM',
          'When duration is under one hour',
        ],
        'One day gets the phrase; two or more get the count.'
      ),
      BUILD(
        'Format the final time with its period marker',
        ['f\"{hour}:{minutes:02d}', '{period}\"'],
        ['f\"{hour}:{minutes:02d}', '{period}\"', '"{hour}:{minutes} {period}"', 'str(hour)'],
        'Zero-padded minutes, then AM/PM — the exact display contract.'
      ),
    ],
  },

  'py-format-validation': {
    id: 'py-format-validation',
    title: 'Formatting and input validation',
    theory: [
      'arithmetic_arranger stacks problems vertically: operands right-aligned, dashes beneath, 4 spaces between problems, optional answer lines.',
      'Validation returns Error: strings — too many problems, bad operators, non-digits, or numbers over 4 digits. Format never runs on invalid input.',
    ],
    questions: [
      MCQ(
        'What must happen BEFORE any formatting when given 6 problems?',
        'Return "Error: Too many problems." with no arrangement',
        [
          'Return "Error: Too many problems." with no arrangement',
          'Arrange the first 5 and silently drop one',
          'Arrange all 6 with narrower spacing',
          'Ask the user to delete one problem',
        ],
        'Validate first, format second — errors short-circuit everything.'
      ),
      BUILD(
        'Right-align the first operand to the problem width',
        ['first.rjust(width)'],
        ['first.rjust(width)', '.ljust(', '.center(', 'first +'],
        'rjust pads on the left so units line up above the dashes.'
      ),
      MCQ(
        'Why must every number be 4 digits or fewer?',
        'The vertical layout contract assumes a bounded width',
        [
          'The vertical layout contract assumes a bounded width',
          'Python integers cannot exceed 9999',
          'Longer numbers are always wrong answers',
          'Dashes can only be drawn 6 wide',
        ],
        'Constraints keep columns aligned: "Error: Numbers cannot be more than four digits."'
      ),
      MCQ(
        'Where does the optional second argument show up?',
        'A fourth answer line appears only when show_answers is True',
        [
          'A fourth answer line appears only when show_answers is True',
          'It replaces the dashes with equals signs',
          'It sorts the problems hardest-first',
          'It emails the arranged problems to the learner',
        ],
        'Default off: two operands, dashes. Opt in: answers aligned beneath.'
      ),
      BUILD(
        'Join the four arranged lines with newline characters',
        ['\"\\n\".join([line1,', 'line2,', 'line3,', 'line4])'],
        ['\"\\n\".join([line1,', 'line2,', 'line3,', 'line4])', '" ".join', 'concat(', '+'],
        'Lines stack with newlines — one string, four rows.'
      ),
    ],
  },

  'py-basics-workshop': {
    id: 'py-basics-workshop',
    title: 'Grow a ledger step by step',
    theory: [
      'Workshop: deposit, refuse overdrafts, total the ledger.',
    ],
    questions: [
      BUILD(
        'Step 1 — record a 50 deposit',
        ['self.ledger.append({"amount":', '50,', '"description":', '"deposit"', '})'],
        ['self.ledger.append({"amount":', '50,', '"description":', '"deposit"', '})', 'add'],
        'append grows the list by one record.'
      ),
      BUILD(
        'Step 2 — total all amounts from zero',
        ['balance', '=', 'sum(item["amount"]', 'for', 'item', 'in', 'self.ledger)'],
        ['balance', '=', 'sum(item["amount"]', 'for', 'item', 'in', 'self.ledger)', 'total('],
        'Deposits add, withdrawals subtract.'
      ),
      MCQ(
        'Balance is 30, withdraw(50) is called. Result?',
        'False — no overdraft, ledger untouched',
        [
          'False — no overdraft, ledger untouched',
          'True with balance -20',
          'Ledger deleted',
          'Withdraw 30, forget the rest',
        ],
        'Guard first, then mutate.'
      ),
      MCQ(
        'Why does the method use self.ledger?',
        'self is the instance — its own list, its own balance',
        [
          'self is the instance — its own list, its own balance',
          'Globals are faster',
          'Methods cannot see instance data',
          'Files must be re-read each time',
        ],
        'self carries the instance state.'
      ),
    ],
  },

  'py-oop-workshop': {
    id: 'py-oop-workshop',
    title: 'Shape a square step by step',
    theory: [
      'Workshop: inherit everything, construct with one side.',
    ],
    questions: [
      BUILD(
        'Step 1 — compute the area',
        ['return', 'self.width', '*', 'self.height'],
        ['return', 'self.width', '*', 'self.height', '+'],
        'Width times height.'
      ),
      BUILD(
        'Step 2 — construct via the parent',
        ['super().__init__(side,', 'side)'],
        ['super().__init__(side,', 'side)', 'self('],
        'Square passes one side twice.'
      ),
      MCQ(
        'Square(Rectangle) means?',
        'Square inherits every Rectangle method',
        [
          'Square inherits every Rectangle method',
          'Square deletes them',
          'Rectangle becomes a Square',
          'They cannot mix',
        ],
        'IS-A: reuse everything.'
      ),
      MCQ(
        'Why refuse pictures wider than 50?',
        'Displays are for humans — cap them, keep math exact',
        [
          'Displays are for humans — cap them, keep math exact',
          'Strings cannot exceed 50 chars',
          'Wide shapes have no area',
          'Tests time out at 51',
        ],
        'Cap display, never the geometry.'
      ),
    ],
  },

  'py-pandas-workshop': {
    id: 'py-pandas-workshop',
    title: 'Summarize people step by step',
    theory: [
      'Workshop: load the frame, split rows, summarize.',
    ],
    questions: [
      BUILD(
        'Step 1 — count people by race',
        ['df["race"].value_counts()'],
        ['df["race"].value_counts()', 'df.count', '.mean()'],
        'Column, then count each value.'
      ),
      BUILD(
        'Step 2 — average hours by occupation',
        ['df.groupby("occupation")["hours-per-week"].mean()'],
        ['df.groupby("occupation")["hours-per-week"].mean()', '.sum()', '.max()'],
        'Split rows, summarize each split.'
      ),
      MCQ(
        'Average age of men vs women needs?',
        'Group by sex, mean the age',
        [
          'Group by sex, mean the age',
          'Sort and read the middle',
          'Delete under-18s first',
          'Average the two oldest',
        ],
        'groupby, then mean.'
      ),
      MCQ(
        'pd.read_csv returns what?',
        'A DataFrame: rows of people, columns of attributes',
        [
          'A DataFrame: rows of people, columns of attributes',
          'One average number',
          'A saved chart image',
          'Column names only',
        ],
        'Everything starts from the frame.'
      ),
    ],
  },

  'py-time-workshop': {
    id: 'py-time-workshop',
    title: 'Roll time forward step by step',
    theory: [
      'Workshop: declare, flip, roll over, name the day.',
    ],
    questions: [
      BUILD(
        'Step 1 — declare add_time with optional weekday',
        ['def', 'add_time(start,', 'duration,', 'day=None):'],
        ['def', 'add_time(start,', 'duration,', 'day=None):', 'function'],
        'def, params, optional default, colon.'
      ),
      BUILD(
        'Step 2 — format time with zero-padded minutes',
        ['f"{hour}:{minutes:02d}', '{period}"'],
        ['f"{hour}:{minutes:02d}', '{period}"', 'str(hour)'],
        'Pad minutes, then AM/PM.'
      ),
      MCQ(
        '11:59 PM + 0:02 gives?',
        '12:01 AM next day — flip flag, roll the date',
        [
          '12:01 AM next day — flip flag, roll the date',
          '11:61 PM',
          '12:01 PM same day',
          'An error — times cannot cross midnight',
        ],
        'Crossing 12 flips; crossing midnight adds a day.'
      ),
      MCQ(
        'Start Monday, +3 days lands on?',
        'Thursday, wrapping past Sunday with modulo 7',
        [
          'Thursday, wrapping past Sunday with modulo 7',
          'Monday — weekdays freeze',
          'Day 4 as a number',
          'The duration weekday',
        ],
        'Index the 7-day list, modulo 7.'
      ),
    ],
  },

  'py-format-workshop': {
    id: 'py-format-workshop',
    title: 'Stack problems step by step',
    theory: [
      'Workshop: validate first, right-align second, join last.',
    ],
    questions: [
      BUILD(
        'Step 1 — right-align the first operand',
        ['first.rjust(width)'],
        ['first.rjust(width)', '.ljust(', 'first +'],
        'Pad left so units line up.'
      ),
      BUILD(
        'Step 2 — stack the four lines',
        ['"\n".join([line1,', 'line2,', 'line3,', 'line4])'],
        ['"\n".join([line1,', 'line2,', 'line3,', 'line4])', '" ".join'],
        'Newlines between rows, one string out.'
      ),
      MCQ(
        'Six problems arrive. First move?',
        'Return "Error: Too many problems." with no arrangement',
        [
          'Return "Error: Too many problems." with no arrangement',
          'Arrange 5, drop one silently',
          'Squeeze all 6 narrower',
          'Ask the user to delete one',
        ],
        'Validate first, format never on bad input.'
      ),
      MCQ(
        'When does the fourth answer line appear?',
        'Only when show_answers is True',
        [
          'Only when show_answers is True',
          'Always, answers are mandatory',
          'Never — answers are forbidden',
          'When problems exceed 4 digits',
        ],
        'Opt-in answers, aligned beneath.'
      ),
    ],
  },

  'py-checkpoint': {
    id: 'py-checkpoint',
    title: 'Python checkpoint',
    theory: [
      'Final check across all five levels: ledgers, classes, frames, time, and formatting.',
    ],
    questions: [
      MCQ(
        'Balance 30, withdraw(50). Result?',
        'False — no overdraft',
        ['False — no overdraft', 'True, balance -20', 'Ledger deleted', 'Withdraw 30'],
        'Guard first.'
      ),
      MCQ(
        'Square(Rectangle) means?',
        'Inherits every method',
        ['Inherits every method', 'Deletes them', 'Reverses the relation', 'Isolation'],
        'IS-A reuse.'
      ),
      BUILD(
        'Count people by race',
        ['df["race"].value_counts()'],
        ['df["race"].value_counts()', 'df.count'],
        'Column, count values.'
      ),
      BUILD(
        'Right-align the operand',
        ['first.rjust(width)'],
        ['first.rjust(width)', '.ljust('],
        'Pad left, align units.'
      ),
      MCQ(
        '11:59 PM + 0:02 gives?',
        '12:01 AM next day',
        ['12:01 AM next day', '11:61 PM', '12:01 PM', 'An error'],
        'Flip and roll.'
      ),
      MCQ(
        'Six problems arrive. First move?',
        'Return the too-many error, arrange nothing',
        ['Return the too-many error, arrange nothing', 'Arrange 5 silently', 'Squeeze narrower', 'Ask the user'],
        'Validate first.'
      ),
    ],
  },

  'py-budget-app': {
    id: 'py-budget-app',
    title: 'Budget App',
    theory: [
      'Capstone 1 of 5: Category ledgers with deposit, withdraw, transfer, and a spend chart. The ledger lists every entry; the balance sums amounts — withdrawals store as negatives.',
      'Transfers move money between categories with paired entries ("Transfer to X" / "Transfer from Y"). Withdrawals beyond the balance fail with False and record nothing.',
      'The spend chart shows whole percentages per category as bars of o characters, floored to tens. Category names print vertically beneath the bars.',
    ],
    questions: [
      MCQ(
        'Food balance 500, withdraw 700. Result?',
        'False — nothing recorded',
        ['False — nothing recorded', 'True, balance goes negative', 'True, balance hits zero', 'Transfers instead'],
        'No overdrafts: fail clean.'
      ),
      MCQ(
        'Transfer 50 from Food to Clothing records…',
        'Withdraw entry in Food, deposit entry in Clothing',
        ['Withdraw entry in Food, deposit entry in Clothing', 'One entry in Food only', 'Ledger deletion', 'A new category'],
        'Paired entries keep both ledgers honest.'
      ),
      BUILD(
        'Balance of a ledger of amounts',
        ['sum(', 'entry[\'amount\']', 'for entry in self.ledger)'],
        ['sum(', 'entry[\'amount\']', 'len(', 'for entry in self.ledger)', 'for entry in ledger)'],
        'Sum every stored amount.'
      ),
      MCQ(
        'Spend share 34.9% renders in the chart as…',
        '30 — percentages floor to tens',
        ['30 — percentages floor to tens', '34', '35', '40'],
        'Floor, never round, to the ten.'
      ),
    ],
  },

  'py-polygon-calculator': {
    id: 'py-polygon-calculator',
    title: 'Polygon Area Calculator',
    theory: [
      'Capstone 2 of 5: Rectangle with Square as its subclass. get_area multiplies sides, get_perimeter doubles the sum, get_diagonal uses Pythagoras — all from stored width and height.',
      'get_picture draws the shape with * characters, capped: too big returns "Too big for picture." get_amount_inside counts how many of another shape tile inside without rotation.',
      'Square inherits everything and fixes the invariant: set_side, set_width, and set_height all keep width equal to height. Its repr names the class and side.',
    ],
    questions: [
      MCQ(
        'Rectangle 3×6 picture. Row content?',
        'Six stars per row, three rows',
        ['Six stars per row, three rows', 'Three stars per row, six rows', 'One 3×6 number', 'An empty string'],
        'Width stars, height rows.'
      ),
      MCQ(
        'Square side 4, set_width(9) called. New sides?',
        '9 × 9 — square keeps width equal height',
        ['9 × 9 — square keeps width equal height', '9 × 4', '4 × 9', 'Unchanged 4 × 4'],
        'Every setter preserves the invariant.'
      ),
      BUILD(
        'Diagonal of a width×height rectangle',
        ['(width ** 2', '+ height ** 2)', '** 0.5'],
        ['(width ** 2', '+ height ** 2)', '** 0.5', 'width * height', '** 2'],
        'Pythagoras, then square root.'
      ),
      MCQ(
        '50×50 shape picture requested. Result?',
        '"Too big for picture."',
        ['"Too big for picture."', '2500 stars', 'An empty page', 'A smaller scaled picture'],
        'Over the cap refuses politely.'
      ),
    ],
  },

  'py-demographic-analyzer': {
    id: 'py-demographic-analyzer',
    title: 'Demographic Data Analyzer',
    theory: [
      'Capstone 3 of 5: Pandas over census rows. Load the CSV into a DataFrame, then answer: race counts, average age of men, education vs salary rates, work hours, countries, occupations.',
      'Boolean masks filter rows; .mean() on a mask gives rates directly. Group by country or occupation, then compare high-earner shares to find the richest slice.',
      'Edge care: strip whitespace from string columns first, and guard divisions where a group could be empty.',
    ],
    questions: [
      MCQ(
        'Share of Bachelors holders earning >50K. Pandas idiom?',
        'Mean of the (bachelors AND rich) mask',
        ['Mean of the (bachelors AND rich) mask', 'Count of all rows', 'Max salary overall', 'Median age of everyone'],
        'Mask, combine, mean — rate in one line.'
      ),
      MCQ(
        'Country column reads " United-States" with a leading space. First move?',
        'Strip whitespace from string columns',
        ['Strip whitespace from string columns', 'Drop the column', 'Lowercase all numbers', 'Sort descending'],
        'Dirty strings split groups silently.'
      ),
      BUILD(
        'Richest occupation by high-earner rate',
        ['df[df[\'salary\']', '> 50K].groupby(\'occupation\')', '.size() / df.groupby(\'occupation\').size()', '.idxmax()'],
        ['df[df[\'salary\']', '> 50K].groupby(\'occupation\')', '.size() / df.groupby(\'occupation\').size()', '.idxmax()', '.mean()', '.sum()'],
        'Rate per group, then the top label.'
      ),
      MCQ(
        'No one works the minimum hours. Safest rate computation?',
        'Guard empty groups before dividing',
        ['Guard empty groups before dividing', 'Divide anyway', 'Return 100%', 'Drop all rows'],
        'Empty denominators need a guard.'
      ),
    ],
  },

  'py-time-calculator': {
    id: 'py-time-calculator',
    title: 'Time Calculator',
    theory: [
      'Capstone 4 of 5: add durations to 12-hour times. Parse the start, add hours and minutes, flip AM/PM every 12 hours, and count days passed.',
      'Optional weekday shifts forward by days-passed mod 7. Output names the new time, the weekday when given, and "(next day)" or "(n days later)" as needed.',
      'Minutes carry into hours; hours wrap at 12 with the AM/PM flip. Day counting starts only after a full 24 hours elapse.',
    ],
    questions: [
      MCQ(
        '"11:30 PM" + "2:45", no weekday. Result names…',
        '2:15 AM, next day',
        ['2:15 AM, next day', '1:15 AM, next day', '2:15 PM, same day', '13:75 AM'],
        'Carry minutes, flip past midnight, count the day.'
      ),
      MCQ(
        'Start Monday, 48 hours pass. Weekday output?',
        'Wednesday — 2 days forward',
        ['Wednesday — 2 days forward', 'Monday — weekdays never shift', 'Sunday', 'Friday'],
        'Shift by days mod 7 from the start day.'
      ),
      BUILD(
        'Minutes past the hour after adding',
        ['total_minutes', '% 60'],
        ['total_minutes', '% 60', '// 60', '+ 60'],
        'Modulo keeps the minute hand.'
      ),
      MCQ(
        'Same time next day (24h added, no weekday). Suffix?',
        '"(next day)"',
        ['"(next day)"', 'No suffix', '"(2 days later)"', '"(same day)"'],
        'Exactly one day earns the singular.'
      ),
    ],
  },

  'py-arithmetic-formatter': {
    id: 'py-arithmetic-formatter',
    title: 'Arithmetic Formatter',
    theory: [
      'Capstone 5 of 5: arrange addition/subtraction problems vertically, side by side, four spaces apart. Each problem stacks operands right-aligned under the operator with a dash rule.',
      'Validation order: too many problems first, then operator check, then digit check, then length check. First failure returns its error — nothing formats.',
      'Optional second argument shows the answers beneath the dashes, aligned to the same width. Operands cap at four digits.',
    ],
    questions: [
      MCQ(
        'Six problems arrive. Formatter returns…',
        'The too-many error, nothing arranged',
        ['The too-many error, nothing arranged', 'First five arranged', 'All six squeezed', 'An empty string'],
        'Count check runs before everything.'
      ),
      MCQ(
        '"32 * 8" arrives. Which error?',
        'Operator must be + or -',
        ['Operator must be + or -', 'Too many problems', 'Numbers must be digits', 'Numbers too long'],
        'Operator gate is second in order.'
      ),
      BUILD(
        'Dash rule width for operands of width w',
        ['\'-\'', '* (w + 2)'],
        ['\'-\'', '* (w + 2)', '* w', '+ 2'],
        'Operator plus space, then the digits.'
      ),
      MCQ(
        '"99999 + 1" arrives. Which error?',
        'Numbers cannot exceed four digits',
        ['Numbers cannot exceed four digits', 'Too many problems', 'Bad operator', 'Letters forbidden'],
        'Five digits trips the length gate.'
      ),
    ],
  },
};
