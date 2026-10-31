/**
 * Track BE · Back End Development and APIs — leveled lesson banks.
 * Syllabus order: routes first, then validation and middleware, data models
 * with Mongoose, filtered reads and file handling, and headers/security
 * last. All original.
 */

import { MCQ, BUILD, CODE, TEXT, type CourseLesson } from '../quizBank';

export const TRACK_BE: Record<string, CourseLesson> = {
  'be-node-express': {
    id: 'be-node-express',
    title: 'Routes with Node and Express',
    theory: [
      'Express maps URLs to functions: app.get("/api/:date?", handler) answers date requests with { unix, utc }. The :date? parameter is optional — empty means "right now".',
      'Every handler ends in exactly one response: res.json(data) for success, res.json({ error: "Invalid Date" }) for garbage input.',
    ],
    questions: [
      MCQ(
        'What does the ? in "/api/:date?" mean?',
        'The date parameter is optional — the route matches with or without it',
        [
          'The date parameter is optional — the route matches with or without it',
          'The route only matches literal question marks',
          'The server will ask the user a question first',
          'The response is always uncertain',
        ],
        'Optional params let one route serve /api and /api/2015-12-25 alike.'
      ),
      BUILD(
        'Register a GET route for an optional date parameter',
        ['app.get(\"/api/:date?\",', 'handler);'],
        ['app.get(\"/api/:date?\",', 'handler);', 'post', 'app.listen'],
        'Method, path with the optional param, handler — the route contract.'
      ),
      MCQ(
        'A request arrives with no date at all. What should the API return?',
        'The current time as { unix, utc }',
        [
          'The current time as { unix, utc }',
          'An empty page with status 200',
          'The server\u2019s source code',
          'A random historical date',
        ],
        'Empty input means now: new Date() with no arguments.'
      ),
      MCQ(
        'Why respond { error: "Invalid Date" } instead of crashing?',
        'APIs must answer every input with predictable JSON',
        [
          'APIs must answer every input with predictable JSON',
          'Crashing deletes the database automatically',
          'Invalid dates are illegal in most countries',
          'Clients cannot handle HTTP error codes',
        ],
        'One response per request, always shaped the same way.'
      ),
      BUILD(
        'Send the result object back as JSON',
        ['res.json({', 'unix,', 'utc', '});'],
        ['res.json({', 'unix,', 'utc', '});', 'send', 'render'],
        'res.json serializes and ends the response in one call.'
      ),
    ],
  },

  'be-middleware-validation': {
    id: 'be-middleware-validation',
    title: 'Validation and middleware',
    theory: [
      'Never trust a submitted URL: validate it (parse it, or dns.lookup the host) before storing anything. Middleware like multer\u2019s single("upfile") handles multipart uploads before your handler runs.',
      'The shortener stores { original_url, short_url }; the file service answers { name, type, size }. Validation first, storage second, response last.',
    ],
    questions: [
      MCQ(
        'Why validate a posted URL before saving it?',
        'Junk in means broken redirects out — for every future visitor',
        [
          'Junk in means broken redirects out — for every future visitor',
          'Validation makes the database run faster',
          'Unvalidated URLs are automatically deleted hourly',
          'Browsers refuse to display validated links',
        ],
        'Stored garbage redirects forever. Check once at the door.'
      ),
      MCQ(
        'What does multer\u2019s single("upfile") do?',
        'Parses one uploaded file from the "upfile" field before the handler runs',
        [
          'Parses one uploaded file from the "upfile" field before the handler runs',
          'Compresses every file to a single byte',
          'Deletes all files except one survivor',
          'Emails the file to the site administrator',
        ],
        'Middleware prepares req.file; your handler just reads the metadata.'
      ),
      BUILD(
        'Redirect a short URL visitor to the stored original',
        ['res.redirect(original_url);'],
        ['res.redirect(original_url);', 'res.json', 'redirect_to', 'render'],
        'GET /api/shorturl/:id looks the id up, then redirects — never renders.'
      ),
      MCQ(
        'The file analyser must return name, type, and size. Where do they come from?',
        'The parsed upload: originalname, mimetype, and size',
        [
          'The parsed upload: originalname, mimetype, and size',
          'The HTML form\u2019s title tag',
          'The server\u2019s hostname and port',
          'The user\u2019s password hash',
        ],
        'Multer exposes all three on req.file — forward them as JSON.'
      ),
      BUILD(
        'Accept exactly one file from the upfile field',
        ['upload.single(\"upfile\")'],
        ['upload.single(\"upfile\")', 'upload.many', '.array(', 'singlefile'],
        'single() with the field name: one file, known field.'
      ),
    ],
  },

  'be-mongo-models': {
    id: 'be-mongo-models',
    title: 'Data models with MongoDB',
    theory: [
      'MongoDB stores documents; Mongoose gives them shape with schemas: a URL maps to { original_url, short_url }, an exercise log to { description, duration, date } tied to a user.',
      'Models are the vocabulary of the API: create on POST, find on GET. Every later filter assumes the model was designed right.',
    ],
    questions: [
      MCQ(
        'What does a Mongoose schema define?',
        'The shape and types of documents in a collection',
        [
          'The shape and types of documents in a collection',
          'The color scheme of the admin dashboard',
          'The order routes appear in the file',
          'The maximum number of visitors per day',
        ],
        'Schemas declare fields and types; models enforce them on every write.'
      ),
      BUILD(
        'Declare a string field for the original URL',
        ['original_url:', '{', 'type:', 'String,', 'required:', 'true', '}'],
        ['original_url:', '{', 'type:', 'String,', 'required:', 'true', '}', 'Number', 'false'],
        'Field, type wrapper, String type, required — the model\u2019s noun.'
      ),
      MCQ(
        'An exercise needs description, duration, AND date. What goes wrong if date is optional and missing?',
        'Logs lose their timeline — filtering by date range breaks',
        [
          'Logs lose their timeline — filtering by date range breaks',
          'The exercise burns zero calories',
          'MongoDB deletes the user automatically',
          'Durations convert from minutes to hours',
        ],
        'Default missing dates to the exercise day, or ranges (?from&to) go blind.'
      ),
      MCQ(
        'Why store short_url as a small integer instead of the full URL twice?',
        'Short ids keep redirect lookups tiny and URLs typable',
        [
          'Short ids keep redirect lookups tiny and URLs typable',
          'Integers are encrypted but strings are not',
          'MongoDB cannot store strings longer than ten characters',
          'Full URLs expire after 24 hours by law',
        ],
        'The id IS the short URL: /api/shorturl/1 stays short forever.'
      ),
      BUILD(
        'Save a new user document with the posted username',
        ['await', 'User.create({', 'username', '}));'],
        ['await', 'User.create({', 'username', '}));', 'find', 'saveAll'],
        'Create persists; await waits for the write to land.'
      ),
    ],
  },

  'be-crud-filters': {
    id: 'be-crud-filters',
    title: 'Filtered reads and full CRUD',
    theory: [
      'Exercise logs support ?from & ?to & ?limit: parse the query, filter the log array, slice to the limit. The issue tracker goes further — GET/POST/PUT/DELETE on /api/issues/:project with query filters and updated_on stamps.',
      'Reads filter, writes timestamp: created_on once, updated_on on every PUT. Filters never mutate — they return views.',
    ],
    questions: [
      MCQ(
        'GET /api/users/abc/log?from=2024-01-01&limit=2 means what?',
        'That user\u2019s log from January 1st, at most 2 entries',
        [
          'That user\u2019s log from January 1st, at most 2 entries',
          'Delete 2 entries starting January 1st',
          'Create a user named from with password to',
          'Return only the 2nd of January\u2019s entries',
        ],
        'Query params narrow the view: range plus cap, originals untouched.'
      ),
      BUILD(
        'Cap a log array to the requested limit',
        ['log.slice(0,', 'Number(limit));'],
        ['log.slice(0,', 'Number(limit));', 'splice', 'filter(', 'limit--'],
        'slice copies the first N — the stored log never shrinks.'
      ),
      MCQ(
        'A PUT arrives changing an issue\u2019s status. Which timestamp moves?',
        'updated_on — created_on is write-once history',
        [
          'updated_on — created_on is write-once history',
          'created_on — the issue is effectively reborn',
          'Both — they must always match each other',
          'Neither — timestamps are decorative',
        ],
        'PUT refreshes updated_on; created_on remembers birth forever.'
      ),
      MCQ(
        'GET /api/issues/apiproject?open=true should return what?',
        'Only that project\u2019s issues where open is true',
        [
          'Only that project\u2019s issues where open is true',
          'Every issue in every project, open or not',
          'Only the project\u2019s name and nothing else',
          'A form for filing new issues',
        ],
        'Each query param is a filter; combine them with AND logic.'
      ),
      BUILD(
        'Remove one issue document by its id',
        ['await', 'Issue.findByIdAndDelete(id);'],
        ['await', 'Issue.findByIdAndDelete(id);', 'removeAll', 'drop', 'DELETE'],
        'Find by key, delete exactly that document, await the result.'
      ),
    ],
  },

  'be-headers-security': {
    id: 'be-headers-security',
    title: 'Headers and API security',
    theory: [
      'GET /api/whoami answers { ipaddress, language, software } from the request itself: the IP, the accept-language header, and the user-agent string.',
      'Real APIs distrust everything: validate inputs, cap sizes, set security headers. whoami reads headers; hardened APIs also constrain them.',
    ],
    questions: [
      MCQ(
        'Where does the software field of whoami come from?',
        'The user-agent request header',
        [
          'The user-agent request header',
          'The server\u2019s package.json',
          'The database migration history',
          'The HTML title of the homepage',
        ],
        'Clients announce themselves with user-agent on every request.'
      ),
      BUILD(
        'Read the preferred language from request headers',
        ['req.headers[\"accept-language\"]'],
        ['req.headers[\"accept-language\"]', 'req.body', 'req.query', 'headers()'],
        'Headers live on req.headers under their lowercase names.'
      ),
      MCQ(
        'Two proxies sit before your app. Why can req.ip lie?',
        'Each proxy may append or forge forwarding headers',
        [
          'Each proxy may append or forge forwarding headers',
          'IP addresses expire after one request',
          'Express randomizes req.ip for privacy',
          'Proxies convert IPs to hostnames automatically',
        ],
        'Trust, but verify: configure trusted proxies or accept imprecision.'
      ),
      MCQ(
        'A client sends a 500MB "profile picture". What should the API do first?',
        'Reject it at the size limit before parsing or storing',
        [
          'Reject it at the size limit before parsing or storing',
          'Store it, then ask the client to compress it',
          'Split it across 500 one-megabyte database rows',
          'Render it on the homepage at full size',
        ],
        'Limits belong at the door: 413 before a single byte is trusted.'
      ),
      BUILD(
        'Return the whoami payload with all three fields',
        ['res.json({', 'ipaddress,', 'language,', 'software', '});'],
        ['res.json({', 'ipaddress,', 'language,', 'software', '});', 'req', 'headers'],
        'Three request facts, one JSON object — the whole microservice.'
      ),
    ],
  },

  'be-routes-workshop': {
    id: 'be-routes-workshop',
    title: 'Answer dates step by step',
    theory: [
      'Workshop: assemble the timestamp route exactly as instructed.',
    ],
    questions: [
      BUILD(
        'Step 1 — register the optional-date route',
        ['app.get("/api/:date?",', 'handler);'],
        ['app.get("/api/:date?",', 'handler);', 'post', 'listen'],
        'Method, optional param, handler.'
      ),
      BUILD(
        'Step 2 — send the result as JSON',
        ['res.json({', 'unix,', 'utc', '});'],
        ['res.json({', 'unix,', 'utc', '});', 'send'],
        'One response per request.'
      ),
      MCQ(
        'Empty input arrives. What is the correct answer?',
        'Now — new Date() with no arguments',
        [
          'Now — new Date() with no arguments',
          'An empty page',
          'The server source',
          'A random date',
        ],
        'No date means the current moment.'
      ),
      MCQ(
        'Garbage input arrives. What is the correct answer?',
        '{ error: "Invalid Date" } — predictable JSON, no crash',
        [
          '{ error: "Invalid Date" } — predictable JSON, no crash',
          'A stack trace in HTML',
          'Silence and a hanging request',
          'Deletion of the route',
        ],
        'Every input gets a shaped answer.'
      ),
      CODE(
        'Write parseTimestamp(input): return { unix, utc } for a valid date or millisecond string, and { error: "Invalid Date" } for junk. Empty input means now.',
        {
          language: 'js',
          starter: 'function parseTimestamp(input) {\n  // Return { unix, utc } or { error: "Invalid Date" }\n}\n',
          tests: [
            { id: 'iso', label: 'An ISO date returns the right unix value', run: "parseTimestamp('2015-12-25').unix === 1451001600000", hint: 'new Date(input).getTime() converts a parseable date to milliseconds.' },
            { id: 'utc', label: 'The UTC string is human-readable', run: "parseTimestamp('2015-12-25').utc === 'Fri, 25 Dec 2015 00:00:00 GMT'", hint: 'toUTCString() produces the standard HTTP-style date.' },
            { id: 'millis', label: 'A millisecond string is accepted', run: "parseTimestamp('1451001600000').unix === 1451001600000", hint: 'Number(input) is a valid Date constructor input when it is all digits.' },
            { id: 'invalid', label: 'Junk returns the documented error', run: "parseTimestamp('not-a-date').error === 'Invalid Date'", hint: 'Check Number.isNaN(date.getTime()) before building the response.' },
            { id: 'empty', label: 'Empty input means now, not an error', run: "typeof parseTimestamp('').unix === 'number' && typeof parseTimestamp('').utc === 'string'", hint: 'Default to new Date() when the parameter is absent or empty.' },
          ],
        },
        'function parseTimestamp(input) {\n  const raw = input == null || input === "" ? Date.now() : input;\n  const date = new Date(/^\\d+$/.test(String(raw)) ? Number(raw) : raw);\n  if (Number.isNaN(date.getTime())) return { error: "Invalid Date" };\n  return { unix: date.getTime(), utc: date.toUTCString() };\n}',
        'The route is a thin wrapper around one deterministic function. Parsing, millisecond handling and validation live here, so the HTTP layer only chooses a status code and sends the object.'
      ),
    ],
  },

  'be-validation-workshop': {
    id: 'be-validation-workshop',
    title: 'Guard inputs step by step',
    theory: [
      'Workshop: validate URLs, parse uploads, redirect cleanly.',
    ],
    questions: [
      BUILD(
        'Step 1 — accept one file from upfile',
        ['upload.single("upfile")'],
        ['upload.single("upfile")', 'upload.many', '.array('],
        'One file, known field.'
      ),
      BUILD(
        'Step 2 — redirect to the stored original',
        ['res.redirect(original_url);'],
        ['res.redirect(original_url);', 'res.json', 'render'],
        'Look up, then redirect — never render.'
      ),
      MCQ(
        'A posted URL fails parsing. Next step?',
        'Reject with an error — store nothing',
        [
          'Reject with an error — store nothing',
          'Store it and hope browsers cope',
          'Guess what the user meant and save that',
          'Redirect to the homepage silently',
        ],
        'Validate first, store second.'
      ),
      MCQ(
        'The file response needs name, type, size. Source?',
        'The parsed upload: originalname, mimetype, size',
        [
          'The parsed upload: originalname, mimetype, size',
          'The form title tag',
          'The server hostname',
          'The user password hash',
        ],
        'Multer exposes all three on req.file.'
      ),
    ],
  },

  'be-models-workshop': {
    id: 'be-models-workshop',
    title: 'Shape data step by step',
    theory: [
      'Workshop: declare schemas, then persist through models.',
    ],
    questions: [
      BUILD(
        'Step 1 — declare the original_url string field',
        ['original_url:', '{', 'type:', 'String,', 'required:', 'true', '}'],
        ['original_url:', '{', 'type:', 'String,', 'required:', 'true', '}', 'Number'],
        'Field, type wrapper, String, required.'
      ),
      BUILD(
        'Step 2 — persist the posted user',
        ['await', 'User.create({', 'username', '}));'],
        ['await', 'User.create({', 'username', '}));', 'find'],
        'Create persists; await lands the write.'
      ),
      MCQ(
        'Exercise date is missing. What breaks?',
        'Range filters go blind — default it to the exercise day',
        [
          'Range filters go blind — default it to the exercise day',
          'Calories stop counting',
          'MongoDB deletes the user',
          'Nothing — dates are decorative',
        ],
        'Timelines need every point dated.'
      ),
      MCQ(
        'Why short integer ids for short URLs?',
        'Tiny, typable, and cheap to look up',
        [
          'Tiny, typable, and cheap to look up',
          'Integers are encrypted',
          'Strings over ten chars are banned',
          'Full URLs expire hourly',
        ],
        'The id IS the short URL.'
      ),
    ],
  },

  'be-crud-workshop': {
    id: 'be-crud-workshop',
    title: 'Filter and stamp step by step',
    theory: [
      'Workshop: narrow reads with queries, audit writes with timestamps.',
    ],
    questions: [
      BUILD(
        'Step 1 — cap the log to the limit',
        ['log.slice(0,', 'Number(limit));'],
        ['log.slice(0,', 'Number(limit));', 'splice'],
        'slice copies the first N; the log never shrinks.'
      ),
      BUILD(
        'Step 2 — filter issues by the query',
        ['Issue.find({', 'project,', '...req.query', '})'],
        ['Issue.find({', 'project,', '...req.query', '})', '.all()'],
        'Spread the query into the finder.'
      ),
      BUILD(
        'Step 3 — stamp the update time',
        ['doc.updated_on', '=', 'new', 'Date();'],
        ['doc.updated_on', '=', 'new', 'Date();', 'created_on'],
        'PUT refreshes updated_on; created_on never moves.'
      ),
      MCQ(
        '?open=true&assigned=ana returns what?',
        'Issues matching ALL filters at once',
        [
          'Issues matching ALL filters at once',
          'Issues matching ANY filter',
          'Every issue unfiltered',
          'Only the filter names',
        ],
        'Filters combine with AND.'
      ),
    ],
  },

  'be-headers-workshop': {
    id: 'be-headers-workshop',
    title: 'Read requests step by step',
    theory: [
      'Workshop: extract the three whoami facts from headers.',
    ],
    questions: [
      BUILD(
        'Step 1 — read the language header',
        ['req.headers["accept-language"]'],
        ['req.headers["accept-language"]', 'req.body', 'req.query'],
        'Lowercase names on req.headers.'
      ),
      BUILD(
        'Step 2 — answer with all three fields',
        ['res.json({', 'ipaddress,', 'language,', 'software', '});'],
        ['res.json({', 'ipaddress,', 'language,', 'software', '});', 'req'],
        'Three facts, one object.'
      ),
      MCQ(
        'Why can req.ip lie behind proxies?',
        'Proxies may append or forge forwarding headers',
        [
          'Proxies may append or forge forwarding headers',
          'IPs expire per request',
          'Express randomizes req.ip',
          'Proxies convert IPs to hostnames',
        ],
        'Trust, but verify.'
      ),
      MCQ(
        'A 500MB "profile picture" arrives. First move?',
        'Reject at the size limit before parsing',
        [
          'Reject at the size limit before parsing',
          'Store it, then compress',
          'Split across 500 rows',
          'Render it full-size',
        ],
        'Limits belong at the door.'
      ),
    ],
  },

  'be-checkpoint': {
    id: 'be-checkpoint',
    title: 'Back End checkpoint',
    theory: [
      'Final check across all five levels: routes, validation, models, filters, and headers.',
    ],
    questions: [
      MCQ(
        'What does the ? in "/api/:date?" mean?',
        'Optional — matches with or without the date',
        ['Optional — matches with or without the date', 'Literal question mark', 'Uncertain response', 'A quiz for the user'],
        'One route serves both shapes.'
      ),
      MCQ(
        'Posted URL fails parsing. Action?',
        'Reject — store nothing',
        ['Reject — store nothing', 'Store and hope', 'Guess and save', 'Redirect silently'],
        'Validate first.'
      ),
      BUILD(
        'Persist the posted user',
        ['await', 'User.create({', 'username', '}));'],
        ['await', 'User.create({', 'username', '}));', 'find'],
        'Create and await.'
      ),
      MCQ(
        '?from=2024-01-01&limit=2 means?',
        'That log from January 1st, at most 2 entries',
        ['That log from January 1st, at most 2 entries', 'Delete 2 entries', 'Create user "from"', 'Only the 2nd of January'],
        'Range plus cap.'
      ),
      BUILD(
        'Read the language header',
        ['req.headers["accept-language"]'],
        ['req.headers["accept-language"]', 'req.body'],
        'Lowercase on req.headers.'
      ),
      MCQ(
        'PUT arrives changing status. Which timestamp moves?',
        'updated_on — created_on is write-once',
        ['updated_on — created_on is write-once', 'created_on', 'Both always', 'Neither'],
        'Refresh updated, keep birth.'
      ),
      TEXT(
        'Type the HTTP status code that means a resource was created.',
        ['201', '201 Created'],
        '201 Created is the success code for a POST that actually creates a resource; 200 is generic success.',
        { misconceptions: { '200': '200 means OK, not created. Use 201 when a new resource exists.' } }
      ),
    ],
  },

  'be-timestamp': {
    id: 'be-timestamp',
    title: 'Timestamp Microservice',
    theory: [
      'Capstone 1 of 5: an endpoint that answers every date question. GET /api/:date? returns unix milliseconds and a UTC string; empty date means right now.',
      'Parsing accepts ISO strings and bare millisecond numbers. Anything unparseable gets { error: "Invalid Date" } — the checks probe this path deliberately.',
      'Express serves it: one route, one handler, JSON out. new Date(input) does the heavy lifting; isNaN on getTime detects failure.',
    ],
    questions: [
      MCQ(
        'GET /api/1451001600000 must return…',
        'unix 1451001600000 plus its UTC string',
        ['unix 1451001600000 plus its UTC string', 'Only the UTC string', 'Only the unix number', '{ error: "Invalid Date" }'],
        'Both fields, every success.'
      ),
      MCQ(
        'GET /api/not-a-date must return…',
        '{ error: "Invalid Date" }',
        ['{ error: "Invalid Date" }', 'unix 0', 'The current time', 'A 500 crash'],
        'Invalid in, error object out.'
      ),
      BUILD(
        'Detect an unparseable date',
        ['isNaN(', 'd.getTime()', ')'],
        ['isNaN(', 'd.getTime()', 'd.getTime(', ')', 'isFinite('],
        'NaN time means invalid date.'
      ),
      MCQ(
        'GET /api with no date returns…',
        'The current time in both fields',
        ['The current time in both fields', 'An error', 'unix 0', 'Empty object'],
        'Missing date defaults to now.'
      ),
    ],
  },

  'be-file-metadata': {
    id: 'be-file-metadata',
    title: 'File Metadata Microservice',
    theory: [
      'Capstone 2 of 5: accept an upload and report its name, type, and size. A multipart form posts the file; upload middleware parks it in memory or temp storage.',
      'The handler reads originalname, mimetype, and size off the parsed file object and returns all three as JSON. No file attached means a clean client error, not a crash.',
      'Limits matter: cap file size in middleware so one upload cannot exhaust the server. The form field name must match what the middleware expects.',
    ],
    questions: [
      MCQ(
        'Handler needs the uploaded filename. Which property?',
        'req.file.originalname',
        ['req.file.originalname', 'req.body.filename', 'req.query.name', 'req.headers.name'],
        'Middleware attaches the parsed file to req.file.'
      ),
      MCQ(
        'Form posts with no file attached. Correct response?',
        'A 400 asking for a file — no crash',
        ['A 400 asking for a file — no crash', 'Report size 0 as success', 'Hang until timeout', 'Return another user file'],
        'Missing file is a client error, handled.'
      ),
      BUILD(
        'JSON metadata every upload returns',
        ['{ name,', 'type,', 'size }'],
        ['{ name,', 'type,', 'size }', '{ path,', 'hash }'],
        'Name, type, size — the metadata triple.'
      ),
      MCQ(
        'One giant upload must not kill the server. Where is the cap?',
        'File-size limit in the upload middleware',
        ['File-size limit in the upload middleware', 'In the JSON response', 'In the HTML form title', 'Nowhere — disk is infinite'],
        'Reject oversized files before buffering them.'
      ),
    ],
  },

  'be-url-shortener': {
    id: 'be-url-shortener',
    title: 'URL Shortener Microservice',
    theory: [
      'Capstone 3 of 5: POST a URL, get back a short id; GET /api/shorturl/:id redirects to the original. Mongo stores the pair; the id is the lookup key.',
      'Validation first: only http/https URLs get stored — DNS lookup confirms the host resolves. Anything else earns an invalid-URL error, never a row.',
      'Redirects use 302 to the stored original. Unknown ids get a no-such-URL error instead of a blind redirect.',
    ],
    questions: [
      MCQ(
        'POST ftp://files/x arrives. Correct response?',
        'Invalid URL — only http/https stored',
        ['Invalid URL — only http/https stored', 'Shorten it anyway', 'Redirect to ftp', 'Store and crash later'],
        'Scheme allowlist guards the store.'
      ),
      MCQ(
        'GET /api/shorturl/7 for a known id must…',
        '302 redirect to the stored original',
        ['302 redirect to the stored original', 'Return the id as JSON', 'Delete the row', 'Render the homepage'],
        'Lookup, then redirect.'
      ),
      BUILD(
        'Confirm a host resolves before storing',
        ['dns.lookup(', 'hostname,', 'cb)'],
        ['dns.lookup(', 'hostname,', 'cb)', 'dns.resolve(', 'url)'],
        'DNS proves the host exists.'
      ),
      MCQ(
        'Unknown short id arrives. Correct response?',
        'No-such-URL error, no redirect',
        ['No-such-URL error, no redirect', 'Redirect to homepage', 'Redirect to a random URL', 'Create the row on the fly'],
        'Miss means error, never a guess.'
      ),
    ],
  },

  'be-exercise-tracker': {
    id: 'be-exercise-tracker',
    title: 'Exercise Tracker',
    theory: [
      'Capstone 4 of 5: users with exercise logs. POST /api/users creates a user; POST /api/users/:id/exercises appends description, duration, and an optional date defaulting to today.',
      'The log endpoint returns the user plus their exercises, filtered by from/to dates and capped by limit. Dates store as Date objects; responses format them as readable strings.',
      'Missing users and bad ids get errors, never phantom rows. Duration must be a number — validate before saving.',
    ],
    questions: [
      MCQ(
        'Exercise posts with no date. Stored date?',
        'Today — default fills it',
        ['Today — default fills it', 'Unix epoch', 'Null forever', 'Rejected as invalid'],
        'Optional date defaults to now.'
      ),
      MCQ(
        'Log request carries ?from=2024-01-01&limit=2. Handler must…',
        'Filter by date, then cap at 2 entries',
        ['Filter by date, then cap at 2 entries', 'Ignore both params', 'Return all entries twice', 'Delete older entries'],
        'Query params shape the log.'
      ),
      BUILD(
        'Append an exercise to a user log',
        ['user.log.push({', 'description,', 'duration,', 'date })'],
        ['user.log.push({', 'description,', 'duration,', 'date })', 'user.log = [', 'date }]'],
        'Push the entry object onto the log.'
      ),
      MCQ(
        'Duration arrives as "thirty". Correct handling?',
        'Reject — duration must be numeric',
        ['Reject — duration must be numeric', 'Store the string', 'Default to 0 silently', 'Crash the process'],
        'Validate numbers before saving.'
      ),
    ],
  },

  'be-header-parser': {
    id: 'be-header-parser',
    title: 'Request Header Parser',
    theory: [
      'Capstone 5 of 5: GET /api/whoami reports the caller. The handler reads IP, preferred language, and software from the request and returns all three as JSON.',
      'Sources: IP from the connection (respecting proxies), language from accept-language, software from user-agent. Header names arrive lowercased on req.headers.',
      'No input, no database — pure request inspection. The checks call from different clients and expect their own details echoed back.',
    ],
    questions: [
      MCQ(
        'Preferred language lives in which header?',
        'accept-language',
        ['accept-language', 'content-type', 'authorization', 'host'],
        'The client preference header.'
      ),
      MCQ(
        'Client software (OS, browser) lives in…',
        'user-agent',
        ['user-agent', 'user-name', 'x-powered-by', 'cookie'],
        'User-agent describes the caller.'
      ),
      BUILD(
        'Read a header inside Express',
        ['req.headers[', '"accept-language"', ']'],
        ['req.headers[', '"accept-language"', '"Accept-Language"', ']', 'req.body['],
        'Lowercased keys on req.headers.'
      ),
      MCQ(
        'Behind a proxy, the true client IP needs…',
        'Trust-proxy plus x-forwarded-for awareness',
        ['Trust-proxy plus x-forwarded-for awareness', 'Reading req.body.ip', 'Guessing from user-agent', 'Ignoring it — IPs do not matter'],
        'Proxies hide the socket address.'
      ),
    ],
  },
};
