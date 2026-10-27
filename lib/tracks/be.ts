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
};
