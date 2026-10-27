/**
 * Track BE · Back End Development and APIs — leveled lesson banks.
 * Syllabus order: routes first, then validation and middleware, data models
 * with Mongoose, filtered reads and file handling, and headers/security
 * last. All original.
 */

import { MCQ, BUILD, type CourseLesson } from '../quizBank';

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
    ],
  },
};
