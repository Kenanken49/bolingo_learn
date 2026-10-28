/**
 * Track DB · Relational Databases — leveled lesson banks.
 * Syllabus order: tables and keys before queries, simple SELECTs before
 * JOINs, interactive querying before Bash scripting, and injection-safe
 * habits throughout. All original.
 */

import { MCQ, BUILD, type CourseLesson } from '../quizBank';

export const TRACK_DB: Record<string, CourseLesson> = {
  'db-tables-keys': {
    id: 'db-tables-keys',
    title: 'Tables and keys',
    theory: [
      'A relational database is tables of rows. Each table gets a PRIMARY KEY (one unique id per row); relationships are FOREIGN KEYs with REFERENCES pointing at another table\u2019s key.',
      'Design the universe top-down: galaxy → star → planet → moon. Every child row names its parent, so no moon ever floats without a planet.',
    ],
    questions: [
      MCQ(
        'What does a PRIMARY KEY guarantee?',
        'Every row has a unique, non-empty identifier',
        [
          'Every row has a unique, non-empty identifier',
          'The table can never be deleted',
          'Rows are stored alphabetically',
          'Only one user may read the table',
        ],
        'Uniqueness plus presence: the row\u2019s permanent address.'
      ),
      BUILD(
        'Declare an integer id column as the primary key',
        ['id', 'INTEGER', 'PRIMARY', 'KEY,'],
        ['id', 'INTEGER', 'PRIMARY', 'KEY,', 'REFERENCES', 'TEXT'],
        'Type first, then the constraint — the identity of every row.'
      ),
      MCQ(
        'A moon row must belong to a planet. Which clause enforces that?',
        'REFERENCES planet(planet_id)',
        [
          'REFERENCES planet(planet_id)',
          'ORDER BY planet_id',
          'LIMIT 1',
          'SELECT * FROM planet',
        ],
        'Foreign keys point at real parents; orphans are rejected.'
      ),
      MCQ(
        'Why design galaxy → star → planet → moon in that order?',
        'Parents must exist before children can reference them',
        [
          'Parents must exist before children can reference them',
          'Alphabetical order runs fastest',
          'Moons are larger than galaxies',
          'Postgres requires four tables minimum',
        ],
        'Create parents first, then children with REFERENCES to them.'
      ),
      BUILD(
        'Create the galaxy table with a serial primary key',
        ['CREATE', 'TABLE', 'galaxy(id', 'SERIAL', 'PRIMARY', 'KEY);'],
        ['CREATE', 'TABLE', 'galaxy(id', 'SERIAL', 'PRIMARY', 'KEY);', 'DATABASE', 'INDEX'],
        'CREATE TABLE names the table; columns follow in parentheses.'
      ),
    ],
  },

  'db-select-filter': {
    id: 'db-select-filter',
    title: 'Reading data with SELECT',
    theory: [
      'SELECT columns FROM table filters columns; WHERE filters rows; ORDER BY sorts them. Read the Mario database this way: pick characters, keep the loud ones, sort by name.',
      'Clauses have one legal order: SELECT … FROM … WHERE … ORDER BY …. Postgres rejects any other sequence.',
    ],
    questions: [
      MCQ(
        'What does SELECT name FROM characters do?',
        'Returns only the name column of every character row',
        [
          'Returns only the name column of every character row',
          'Deletes every column except name',
          'Renames the table to name',
          'Counts how many names exist',
        ],
        'SELECT chooses columns; * would return all of them.'
      ),
      BUILD(
        'Select all columns from the characters table',
        ['SELECT', '*', 'FROM', 'characters;'],
        ['SELECT', '*', 'FROM', 'characters;', 'TABLE', 'WHERE'],
        'Star means every column — the starting point of exploration.'
      ),
      MCQ(
        'Where does the WHERE clause sit?',
        'Between FROM and ORDER BY',
        [
          'Between FROM and ORDER BY',
          'Before SELECT',
          'After the semicolon',
          'Inside the table name',
        ],
        'SELECT … FROM … WHERE … ORDER BY … — one order, always.'
      ),
      MCQ(
        'How do you sort loudest-first by the volume column?',
        'ORDER BY volume DESC',
        ['ORDER BY volume DESC', 'SORT volume FIRST', 'WHERE volume = DESC', 'GROUP volume LOUD'],
        'ORDER BY sorts; DESC flips loudest to the top.'
      ),
      BUILD(
        'Keep only rows louder than 5, sorted by name',
        ['WHERE', 'volume', '>', '5', 'ORDER', 'BY', 'name;'],
        ['WHERE', 'volume', '>', '5', 'ORDER', 'BY', 'name;', 'HAVING', 'LIMIT'],
        'Filter rows with WHERE, then sort survivors with ORDER BY.'
      ),
    ],
  },

  'db-joins': {
    id: 'db-joins',
    title: 'Combining tables with JOIN',
    theory: [
      'Real answers span tables: characters JOIN actions ON character_id, sounds JOIN characters the same way. The ON clause states exactly how rows match.',
      'Inner joins keep only matched pairs — a character with no recorded action simply does not appear. That strictness is the point.',
    ],
    questions: [
      MCQ(
        'What does JOIN … ON declare?',
        'How rows from two tables pair up',
        [
          'How rows from two tables pair up',
          'Which table gets deleted first',
          'The password for both tables',
          'The order rows were inserted',
        ],
        'ON matches keys: character_id here equals character_id there.'
      ),
      BUILD(
        'Join actions onto their characters by id',
        ['JOIN', 'actions', 'ON', 'characters.id', '=', 'actions.character_id;'],
        ['JOIN', 'actions', 'ON', 'characters.id', '=', 'actions.character_id;', 'WHERE', 'MERGE'],
        'Name the second table, then the key equality that pairs rows.'
      ),
      MCQ(
        'A character performed no actions. With an inner join, where is it?',
        'Absent from the result — no match, no row',
        [
          'Absent from the result — no match, no row',
          'Shown with blank action columns',
          'Moved to the top of the result',
          'Duplicatedonce per action type',
        ],
        'Inner means matched pairs only. Unmatched rows vanish silently.'
      ),
      MCQ(
        'The bike shop needs available bikes with their sizes. Which tables meet?',
        'Bikes joined to sizes on the size id',
        [
          'Bikes joined to sizes on the size id',
          'Rentals joined to themselves',
          'Customers joined to the shop address',
          'All tables unioned without ON',
        ],
        'Follow the keys: each bike row points at its size row.'
      ),
      BUILD(
        'List bike names with availability from the bikes table',
        ['SELECT', 'name,', 'available', 'FROM', 'bikes', 'WHERE', 'available', '=', 'TRUE;'],
        ['SELECT', 'name,', 'available', 'FROM', 'bikes', 'WHERE', 'available', '=', 'TRUE;', 'JOIN', 'FALSE;'],
        'Columns, table, row filter — the rental-availability query.'
      ),
    ],
  },

  'db-bash-psql': {
    id: 'db-bash-psql',
    title: 'Scripting with Bash and psql',
    theory: [
      'Interactive work becomes scripts: a Bash variable holds the psql connection (PSQL="psql -X --username=… --dbname=bikes -t --no-align -c"), then every query runs through $PSQL "SQL…".',
      'Flags matter: -t strips headers, --no-align gives plain output your script can parse. Rentals UPDATE on checkout and flip back on return.',
    ],
    questions: [
      MCQ(
        'What does the PSQL variable hold?',
        'The full psql connection command for reuse',
        [
          'The full psql connection command for reuse',
          'The shop\u2019s total revenue',
          'A backup of every table',
          'The postgres superuser password in plain text',
        ],
        'Define once, call everywhere: $PSQL "SELECT …" runs one query.'
      ),
      BUILD(
        'Run a query through the PSQL helper variable',
        ['$PSQL', '\"SELECT', '1;\"'],
        ['$PSQL', '\"SELECT', '1;\"', 'psql', 'ECHO'],
        'Variable first, quoted SQL second — the scripting heartbeat.'
      ),
      MCQ(
        'Why pass -t --no-align to psql in scripts?',
        'So output is plain values without headers or padding',
        [
          'So output is plain values without headers or padding',
          'So queries run ten times faster',
          'So only admins may connect',
          'So results are encrypted on disk',
        ],
        'Scripts parse values; headers and aligned columns would corrupt that.'
      ),
      MCQ(
        'A bike goes out. Which statement records the rental?',
        'UPDATE rentals SET … plus marking the bike unavailable',
        [
          'UPDATE rentals SET … plus marking the bike unavailable',
          'DROP TABLE bikes and recreate it',
          'SELECT the bike and hope nobody else takes it',
          'GRANT the customer ownership of the table',
        ],
        'Renting is a state change: UPDATE both the rental and the bike rows.'
      ),
      BUILD(
        'Mark bike 3 as rented in the bikes table',
        ['UPDATE', 'bikes', 'SET', 'available', '=', 'FALSE', 'WHERE', 'bike_id', '=', '3;'],
        ['UPDATE', 'bikes', 'SET', 'available', '=', 'FALSE', 'WHERE', 'bike_id', '=', '3;', 'SELECT'],
        'UPDATE table SET column WHERE row — precision via the key.'
      ),
    ],
  },

  'db-inserts-safety': {
    id: 'db-inserts-safety',
    title: 'Booking flow and injection safety',
    theory: [
      'The salon flow: list services (SELECT from services), look the customer up by phone, then INSERT INTO appointments. Every step checks the step before.',
      'Never paste user input into SQL. Parameterize or validate first — "defense" is the skill because one careless concatenation leaks the whole database.',
    ],
    questions: [
      MCQ(
        'What is the first step of a safe booking?',
        'Look up the customer by phone before inserting anything',
        [
          'Look up the customer by phone before inserting anything',
          'Insert the appointment, then ask who it is for',
          'Delete all appointments and start fresh',
          'Email every customer the full schedule',
        ],
        'Identify first: existing customer gets reused, new ones get created.'
      ),
      BUILD(
        'Record an appointment for customer 7 at 10am',
        ['INSERT', 'INTO', 'appointments(customer_id,', 'time)', 'VALUES(7,', '\"10:00\");'],
        ['INSERT', 'INTO', 'appointments(customer_id,', 'time)', 'VALUES(7,', '\"10:00\");', 'SELECT', 'UPDATE'],
        'INSERT INTO table(columns) VALUES(values) — the booking write.'
      ),
      MCQ(
        'Why is " OR "1"="1 a dangerous input in a phone field?',
        'It can turn the lookup WHERE into always-true and expose every row',
        [
          'It can turn the lookup WHERE into always-true and expose every row',
          'It crashes the keyboard on mobile devices',
          'It makes the phone number too long to store',
          'It automatically books every service at once',
        ],
        'Classic injection: concatenated input rewrites the query\u2019s logic.'
      ),
      MCQ(
        'How does the guessing game persist a best score?',
        'INSERT the result or UPDATE the player\u2019s row in Postgres',
        [
          'INSERT the result or UPDATE the player\u2019s row in Postgres',
          'Print the score and trust the terminal scrollback',
          'Email the score to the database administrator',
          'Store it in the filename of the script',
        ],
        'Scores survive in tables: one row per player, updated on improvement.'
      ),
      BUILD(
        'Count how many appointments exist in total',
        ['SELECT', 'COUNT(*)', 'FROM', 'appointments;'],
        ['SELECT', 'COUNT(*)', 'FROM', 'appointments;', 'SUM', 'TABLE'],
        'COUNT(*) answers "how many rows" — the scheduler\u2019s pulse check.'
      ),
    ],
  },

  'db-tables-workshop': {
    id: 'db-tables-workshop',
    title: 'Declare keys step by step',
    theory: [
      'Workshop: write the identity and relationship clauses exactly as instructed.',
    ],
    questions: [
      BUILD(
        'Step 1 — an integer id as primary key',
        ['id', 'INTEGER', 'PRIMARY', 'KEY,'],
        ['id', 'INTEGER', 'PRIMARY', 'KEY,', 'TEXT'],
        'Type first, then the constraint.'
      ),
      BUILD(
        'Step 2 — create a table for stars',
        ['CREATE', 'TABLE', 'star(id', 'SERIAL', 'PRIMARY', 'KEY);'],
        ['CREATE', 'TABLE', 'star(id', 'SERIAL', 'PRIMARY', 'KEY);', 'DATABASE'],
        'CREATE TABLE names it; columns follow.'
      ),
      BUILD(
        'Step 3 — point each star at its galaxy',
        ['galaxy_id', 'INTEGER', 'REFERENCES', 'galaxy(id),'],
        ['galaxy_id', 'INTEGER', 'REFERENCES', 'galaxy(id),', 'ORDER', 'BY'],
        'Foreign key: type plus the parent it names.'
      ),
      MCQ(
        'Why create galaxy before star?',
        'Children cannot reference parents that do not exist yet',
        [
          'Children cannot reference parents that do not exist yet',
          'Alphabetical order is mandatory',
          'Galaxies are larger than stars',
          'Postgres allows only one table per day',
        ],
        'Parents first, then referencing children.'
      ),
    ],
  },

  'db-select-workshop': {
    id: 'db-select-workshop',
    title: 'Filter and sort step by step',
    theory: [
      'Workshop: assemble the read query clause by clause.',
    ],
    questions: [
      BUILD(
        'Step 1 — read every column from characters',
        ['SELECT', '*', 'FROM', 'characters;'],
        ['SELECT', '*', 'FROM', 'characters;', 'TABLE'],
        'Star means all columns.'
      ),
      BUILD(
        'Step 2 — keep only loud rows, newest sort coming',
        ['WHERE', 'volume', '>', '5'],
        ['WHERE', 'volume', '>', '5', 'HAVING', 'IF'],
        'WHERE filters rows before any sorting.'
      ),
      BUILD(
        'Step 3 — sort the survivors by name',
        ['ORDER', 'BY', 'name;'],
        ['ORDER', 'BY', 'name;', 'SORT', 'GROUP'],
        'ORDER BY is always last.'
      ),
      MCQ(
        'SELECT name FROM characters WHERE volume > 5 ORDER BY name — what returns?',
        'Names of loud characters, A to Z',
        [
          'Names of loud characters, A to Z',
          'All columns of quiet characters',
          'One random loud character',
          'The number 5',
        ],
        'Columns, filter, sort — read it in clause order.'
      ),
    ],
  },

  'db-joins-workshop': {
    id: 'db-joins-workshop',
    title: 'Pair tables step by step',
    theory: [
      'Workshop: assemble the join, then predict who survives it.',
    ],
    questions: [
      BUILD(
        'Step 1 — join actions onto characters',
        ['JOIN', 'actions', 'ON', 'characters.id', '=', 'actions.character_id;'],
        ['JOIN', 'actions', 'ON', 'characters.id', '=', 'actions.character_id;', 'WHERE'],
        'Second table, then the key equality.'
      ),
      MCQ(
        'A character with no actions meets this inner join. Result?',
        'No row — unmatched rows vanish from inner joins',
        [
          'No row — unmatched rows vanish from inner joins',
          'A row with blank action columns',
          'Two rows, to be safe',
          'An error message',
        ],
        'Inner means matched pairs only.'
      ),
      BUILD(
        'Step 2 — list available bikes with their names',
        ['SELECT', 'name', 'FROM', 'bikes', 'WHERE', 'available', '=', 'TRUE;'],
        ['SELECT', 'name', 'FROM', 'bikes', 'WHERE', 'available', '=', 'TRUE;', 'JOIN'],
        'The rental-availability read.'
      ),
      MCQ(
        'Why join sizes instead of storing the size text on every bike?',
        'One size row updates everywhere; copies drift apart',
        [
          'One size row updates everywhere; copies drift apart',
          'Text columns are forbidden in Postgres',
          'Joins make queries shorter to type',
          'Bikes have no sizes',
        ],
        'Normalize: store once, reference by key.'
      ),
    ],
  },

  'db-bash-workshop': {
    id: 'db-bash-workshop',
    title: 'Script a rental step by step',
    theory: [
      'Workshop: build the helper variable, then the state-changing query.',
    ],
    questions: [
      BUILD(
        'Step 1 — run one query through the helper',
        ['$PSQL', '"SELECT', '1;"'],
        ['$PSQL', '"SELECT', '1;"', 'ECHO'],
        'Variable first, quoted SQL second.'
      ),
      BUILD(
        'Step 2 — mark bike 3 rented',
        ['UPDATE', 'bikes', 'SET', 'available', '=', 'FALSE', 'WHERE', 'bike_id', '=', '3;'],
        ['UPDATE', 'bikes', 'SET', 'available', '=', 'FALSE', 'WHERE', 'bike_id', '=', '3;', 'SELECT'],
        'UPDATE table SET column WHERE row.'
      ),
      MCQ(
        'Why does the script use -t --no-align flags?',
        'So output is bare values scripts can parse',
        [
          'So output is bare values scripts can parse',
          'So queries run ten times faster',
          'So only admins may connect',
          'So results encrypt themselves',
        ],
        'Humans like tables; scripts like values.'
      ),
      MCQ(
        'Checkout must UPDATE two things. Which two?',
        'The rental row and the bike availability flag',
        [
          'The rental row and the bike availability flag',
          'The customer name and the shop address',
          'The psql version and the Bash history',
          'Nothing — SELECT is enough',
        ],
        'Renting is state change on both sides.'
      ),
    ],
  },

  'db-inserts-workshop': {
    id: 'db-inserts-workshop',
    title: 'Book safely step by step',
    theory: [
      'Workshop: identify first, insert second, never concatenate.',
    ],
    questions: [
      BUILD(
        'Step 1 — record the appointment',
        ['INSERT', 'INTO', 'appointments(customer_id,', 'time)', 'VALUES(7,', '"10:00");'],
        ['INSERT', 'INTO', 'appointments(customer_id,', 'time)', 'VALUES(7,', '"10:00");', 'SELECT'],
        'Table, columns, values — the booking write.'
      ),
      MCQ(
        'What must happen before that INSERT runs?',
        'Look the customer up by phone — reuse or create them',
        [
          'Look the customer up by phone — reuse or create them',
          'Delete all other appointments',
          'Email the customer a survey',
          'Restart the database',
        ],
        'Identify first, book second.'
      ),
      BUILD(
        'Step 2 — check how busy the shop is',
        ['SELECT', 'COUNT(*)', 'FROM', 'appointments;'],
        ['SELECT', 'COUNT(*)', 'FROM', 'appointments;', 'SUM'],
        'COUNT(*) is the scheduler pulse check.'
      ),
      MCQ(
        'A phone field receives: " OR "1"="1. What is it?',
        'An injection attempt — validate, never concatenate',
        [
          'An injection attempt — validate, never concatenate',
          'A valid international number',
          'A typo the database will forgive',
          'A request for extra services',
        ],
        'Quoted input that rewrites logic is hostile by definition.'
      ),
    ],
  },

  'db-checkpoint': {
    id: 'db-checkpoint',
    title: 'Relational Databases checkpoint',
    theory: [
      'Final check across all five levels: keys, reads, joins, scripts, and safety.',
    ],
    questions: [
      MCQ(
        'What does PRIMARY KEY guarantee?',
        'Unique, non-empty identity per row',
        ['Unique, non-empty identity per row', 'Alphabetical storage', 'Single-user access', 'Automatic backups'],
        'The row address.'
      ),
      BUILD(
        'Read all columns from characters',
        ['SELECT', '*', 'FROM', 'characters;'],
        ['SELECT', '*', 'FROM', 'characters;', 'TABLE'],
        'Star means everything.'
      ),
      MCQ(
        'What does JOIN … ON declare?',
        'How rows from two tables pair up',
        ['How rows from two tables pair up', 'Which table deletes first', 'The table password', 'Insert order'],
        'Match keys, pair rows.'
      ),
      MCQ(
        'Why -t --no-align in scripts?',
        'Bare values that scripts can parse',
        ['Bare values that scripts can parse', 'Faster queries', 'Admin-only mode', 'Encryption'],
        'Values, not tables.'
      ),
      BUILD(
        'Mark bike 3 rented',
        ['UPDATE', 'bikes', 'SET', 'available', '=', 'FALSE', 'WHERE', 'bike_id', '=', '3;'],
        ['UPDATE', 'bikes', 'SET', 'available', '=', 'FALSE', 'WHERE', 'bike_id', '=', '3;', 'SELECT'],
        'Precision via the key.'
      ),
      MCQ(
        'Phone input reads: " OR "1"="1. Response?',
        'Reject — never concatenate input into SQL',
        ['Reject — never concatenate input into SQL', 'Accept as international', 'Trim and store it', 'Book every service'],
        'Hostile input, safe refusal.'
      ),
    ],
  },

  'db-celestial-bodies': {
    id: 'db-celestial-bodies',
    title: 'Celestial Bodies Database',
    theory: [
      'Capstone 1 of 5: model a universe in PostgreSQL. Tables for galaxy, star, planet, and moon — each row points at its parent, so moons join through planets to stars to galaxies.',
      'Keys carry the design: SERIAL primary keys on every table, UNIQUE names where duplicates make no sense, NOT NULL on every foreign key so no orphan rows exist.',
      'Columns fit the domain: BOOLEAN for has_life, INT for counts and periods, DECIMAL or FLOAT for distances, TEXT or VARCHAR for names and descriptions.',
    ],
    questions: [
      MCQ(
        'Every moon must belong to a planet. Which constraint?',
        'NOT NULL foreign key to planet',
        ['NOT NULL foreign key to planet', 'Nullable text column', 'UNIQUE moon name only', 'No constraint needed'],
        'Required reference, no orphans.'
      ),
      MCQ(
        'Two galaxies named Andromeda must be impossible. Which constraint?',
        'UNIQUE on galaxy name',
        ['UNIQUE on galaxy name', 'PRIMARY KEY on name', 'FOREIGN KEY on name', 'CHECK on name length'],
        'Uniqueness without making it the key.'
      ),
      BUILD(
        'Moons of planet 4, with the planet name',
        ['SELECT moon.name', 'FROM moon', 'JOIN planet', 'ON moon.planet_id = planet.planet_id', 'WHERE planet.planet_id = 4;'],
        ['SELECT moon.name', 'FROM moon', 'FROM planet', 'JOIN planet', 'ON moon.planet_id = planet.planet_id', 'WHERE planet.planet_id = 4;', 'GROUP BY'],
        'Join on the key, filter on the parent.'
      ),
      MCQ(
        'Orbital distance like 1.42 billion km fits best in…',
        'DECIMAL / FLOAT numeric column',
        ['DECIMAL / FLOAT numeric column', 'BOOLEAN column', 'SERIAL column', 'A separate table per digit'],
        'Continuous measures need numeric types.'
      ),
    ],
  },

  'db-mario-database': {
    id: 'db-mario-database',
    title: 'Mario Database',
    theory: [
      'Capstone 2 of 5: query a game-character database with SELECT, WHERE, ORDER BY, and aggregates. Read the schema first — column names decide every query.',
      'Filters combine with AND/OR/NOT; pattern matching uses LIKE with % wildcards. Aggregate questions need COUNT, SUM, AVG, MIN, MAX with GROUP BY splitting rows into buckets.',
      'Order and limit shape output: ORDER BY … DESC with LIMIT n answers every "top n" question. Aliases with AS keep result columns readable.',
    ],
    questions: [
      MCQ(
        'Names starting with M. Which WHERE clause?',
        'WHERE name LIKE \'M%\'',
        ['WHERE name LIKE \'M%\'', 'WHERE name = \'M\'', 'WHERE name LIKE \'%M\'', 'WHERE name IN (\'M\')'],
        'Trailing wildcard: starts-with.'
      ),
      MCQ(
        'Count characters per game. Which clause splits the buckets?',
        'GROUP BY game',
        ['GROUP BY game', 'ORDER BY game', 'LIMIT game', 'JOIN game'],
        'Group first, then COUNT each bucket.'
      ),
      BUILD(
        'Top 3 tallest characters, tallest first',
        ['SELECT name', 'ORDER BY height DESC', 'LIMIT 3;'],
        ['SELECT name', 'ORDER BY height DESC', 'ORDER BY height ASC', 'LIMIT 3;', 'LIMIT 1;'],
        'Sort descending, cut at three.'
      ),
      MCQ(
        'Average coins per level, one row. Which select?',
        'SELECT AVG(coins)',
        ['SELECT AVG(coins)', 'SELECT coins', 'SELECT SUM(coins) per row', 'SELECT coins GROUPED'],
        'Bare aggregate collapses to a single row.'
      ),
    ],
  },

  'db-bike-shop': {
    id: 'db-bike-shop',
    title: 'Bike Rental Shop',
    theory: [
      'Capstone 3 of 5: a Bash-driven rental script over Postgres. The script greets, lists bikes from the database, reads the customer choice, and records rentals.',
      'Bash reads input, psql runs queries, and command substitution captures results into variables. Menus loop until the choice validates against real bike ids.',
      'Rentals insert a row linking customer to bike with the current date; returning flips availability back. Every query result the script branches on must be trimmed of psql headers.',
    ],
    questions: [
      MCQ(
        'Script needs the bike list inside a variable. Which mechanism?',
        'Command substitution: BIKES=$(psql …)',
        ['Command substitution: BIKES=$(psql …)', 'An HTML table', 'A screenshot of the terminal', 'A second database'],
        'Capture query output into the script.'
      ),
      MCQ(
        'Customer picks bike 99, which does not exist. Script must…',
        'Re-show the menu until the id validates',
        ['Re-show the menu until the id validates', 'Insert rental for bike 99', 'Delete all bikes', 'Exit and drop the database'],
        'Validate choice against real ids, loop on miss.'
      ),
      BUILD(
        'Record rental of bike 2 by customer 7 today',
        ['INSERT INTO rentals(customer_id, bike_id, date)', 'VALUES(7, 2, CURRENT_DATE);'],
        ['INSERT INTO rentals(customer_id, bike_id, date)', 'INSERT INTO bikes', 'VALUES(7, 2, CURRENT_DATE);', 'VALUES(2, 7);'],
        'Link both ids with today.'
      ),
      MCQ(
        'psql output piped into script logic needs which flags?',
        'Tuples-only, unaligned output',
        ['Tuples-only, unaligned output', 'Full ASCII art tables', 'HTML output mode', 'Pager forced on'],
        'Clean values branch cleanly.'
      ),
    ],
  },

  'db-salon-scheduler': {
    id: 'db-salon-scheduler',
    title: 'Salon Appointment Scheduler',
    theory: [
      'Capstone 4 of 5: book salon appointments from Bash. Customers identify by phone — known numbers greet by name, new numbers trigger registration before booking.',
      'Services list from the database; the chosen service id must validate like the bike ids did. The appointment row links customer, service, and time.',
      'Confirmation echoes the full booking back: service name, time, and customer name. No booking without a registered customer row.',
    ],
    questions: [
      MCQ(
        'Phone matches no customer. Correct flow?',
        'Register the name first, then book',
        ['Register the name first, then book', 'Book under a blank name', 'Refuse service', 'Reuse another customer row'],
        'Customer row must exist before the booking references it.'
      ),
      MCQ(
        'Service id must be real. Validation mirrors…',
        'The bike-id menu loop: query, check, re-ask',
        ['The bike-id menu loop: query, check, re-ask', 'Trusting the input blindly', 'Booking two services at once', 'Skipping the services table'],
        'Same validate-then-act loop, new table.'
      ),
      BUILD(
        'Find the customer behind a phone number',
        ['SELECT name', 'FROM customers', 'WHERE phone = \'555-0134\';'],
        ['SELECT name', 'SELECT phone', 'FROM customers', 'FROM services', 'WHERE phone = \'555-0134\';'],
        'Phone is the lookup key.'
      ),
      MCQ(
        'After inserting the appointment the script must…',
        'Echo service, time, and name back as confirmation',
        ['Echo service, time, and name back as confirmation', 'Stay silent', 'List every customer', 'Drop the services table'],
        'Confirmation proves the write landed.'
      ),
    ],
  },

  'db-number-guessing': {
    id: 'db-number-guessing',
    title: 'Number Guessing Game',
    theory: [
      'Capstone 5 of 5: a Bash guessing game with Postgres memory. Random secret between 1 and 1000; the script counts guesses and stores each player best score.',
      'Players identify by username — first-timers get a welcome and a row; returners hear their games-played and best score. Usernames repeat safely: one row per name.',
      'Hints steer play: higher or lower after every miss. Integers only — non-numeric guesses get rejected without counting.',
    ],
    questions: [
      MCQ(
        'Username "ada" returns. Script greets with…',
        'Games played and best score from her row',
        ['Games played and best score from her row', 'A brand-new welcome', 'A second row for ada', 'The secret number'],
        'Memory is the feature: read before play.'
      ),
      MCQ(
        'Guess "twelve" arrives. Correct handling?',
        'Reject without counting the guess',
        ['Reject without counting the guess', 'Count it as 12', 'Crash the script', 'Treat it as correct'],
        'Validate numeric before comparing.'
      ),
      BUILD(
        'Secret number, 1 to 1000',
        ['SECRET=$(( RANDOM', '% 1000 + 1 ))'],
        ['SECRET=$(( RANDOM', 'SECRET=1000', '% 1000 + 1 ))', '% 999 ))'],
        'Modulo bounds the range, plus one floors it at 1.'
      ),
      MCQ(
        'New best score lands. Which write?',
        'UPDATE players SET best = n WHERE name matches',
        ['UPDATE players SET best = n WHERE name matches', 'INSERT a duplicate player row', 'DELETE the player', 'UPDATE every row'],
        'Targeted update on the known row.'
      ),
    ],
  },
};
