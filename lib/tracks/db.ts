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
};
