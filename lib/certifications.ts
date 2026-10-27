/**
 * Core Curriculum — interactive freeCodeCamp-style certifications.
 *
 * 7 certification tracks. Each track lists the core technologies covered and
 * exactly 5 mandatory certification projects. Passing all 5 (automated
 * pattern tests in the project runner) earns the certification — tracked via
 * the existing lesson_completions rows, so progress syncs across devices.
 *
 * Projects reuse the CourseProject shape so the existing project screen,
 * XP awards, streaks, and results flow work unchanged.
 */

export interface CertStory {
  label: string;
  /** Tested against the raw code with new RegExp(pattern, 'i'). */
  pattern: string;
  hint: string;
}

export interface CertProject {
  id: string;
  title: string;
  skills: string[];
  brief: string[];
  starterCode: string;
  stories: CertStory[];
  xp: number;
}

export interface CertTrack {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  skills: string[];
  projects: CertProject[];
}

const P = (label: string, pattern: string, hint: string): CertStory => ({ label, pattern, hint });

/* ------------------------------------------------------------------ */
/* 1 · Responsive Web Design                                           */
/* ------------------------------------------------------------------ */
const rwdCatPhoto: CertProject = {
  id: 'rwd-cat-photo',
  title: 'Cat Photo App',
  skills: ['HTML5', 'Accessibility'],
  brief: [
    'Build the classic first page: a cat photo app with headings, paragraphs, links, and images.',
    'Pass all automated tests, then submit. Project 1 of 5 for the Responsive Web Design certification.',
  ],
  starterCode: '<h1>CatPhotoApp</h1>\n<p>Everyone loves cute cats online.</p>\n',
  stories: [
    P('A single <h1> names the app', '<h1>[^<]*cat[^<]*</h1>', 'Add one <h1>CatPhotoApp</h1>.'),
    P('A link to cat photos', '<a[^>]*href[^>]*>.*?</a>', 'Add <a href="https://catphotos">See cats</a>.'),
    P('An image with alt text', '<img[^>]*alt\\s*=\\s*"[^"]+"[^>]*>', 'Add <img src="cat.jpg" alt="A cute cat">.'),
  ],
  xp: 50,
};

const rwdSurvey: CertProject = {
  id: 'rwd-survey-form',
  title: 'Survey Form',
  skills: ['HTML5', 'CSS3', 'Accessibility'],
  brief: [
    'Build a survey form with labels, inputs, and a submit button — every control reachable by keyboard.',
    'Pass all automated tests, then submit. Project 2 of 5 for the Responsive Web Design certification.',
  ],
  starterCode: '<h1>Survey</h1>\n<p>Tell us about yourself.</p>\n',
  stories: [
    P('A form element wraps the controls', '<form[^>]*>[\\s\\S]*</form>', 'Wrap everything in <form>…</form>.'),
    P('Labeled text input', '<label[^>]*>[\\s\\S]*<input[^>]*>', 'Add <label>Name <input type="text"></label>.'),
    P('A submit button', '<(button[^>]*type\\s*=\\s*"submit"|input[^>]*type\\s*=\\s*"submit")[^>]*>', 'Add <button type="submit">Submit</button>.'),
    P('CSS centers the heading', 'h1\\s*\\{[^}]*text-align\\s*:\\s*center', 'Add a style block: h1 { text-align: center; }.'),
  ],
  xp: 50,
};

const rwdTechDoc: CertProject = {
  id: 'rwd-tech-doc',
  title: 'Technical Documentation Page',
  skills: ['HTML5', 'CSS3', 'Media Queries'],
  brief: [
    'Build a docs page: fixed nav with anchor links plus one section per topic.',
    'Pass all automated tests, then submit. Project 3 of 5 for the Responsive Web Design certification.',
  ],
  starterCode: '<h1>Docs</h1>\n<p>How the thing works.</p>\n',
  stories: [
    P('A nav with anchor links', '<nav[^>]*>[\\s\\S]*<a[^>]*href\\s*=\\s*"#[^"]+"[^>]*>[\\s\\S]*</nav>', 'Add <nav><a href="#intro">Intro</a></nav>.'),
    P('At least two content sections', '<section[\\s\\S]*<section', 'Add two <section> blocks with headings.'),
    P('A responsive media query', '@media[^{]*\\{', 'Add @media (max-width: 600px) { … }.'),
  ],
  xp: 50,
};

const rwdPortfolio: CertProject = {
  id: 'rwd-portfolio',
  title: 'Personal Portfolio',
  skills: ['HTML5', 'CSS3', 'Flexbox', 'CSS Grid'],
  brief: [
    'Build your portfolio: hero heading, project grid, and a contact link.',
    'Pass all automated tests, then submit. Project 4 of 5 for the Responsive Web Design certification.',
  ],
  starterCode: '<h1>My Portfolio</h1>\n<p>Projects I built.</p>\n',
  stories: [
    P('A projects section with links', '<section[^>]*>[\\s\\S]*<a[^>]*href[^>]*>[\\s\\S]*</section>', 'Add <section><a href="#p1">Project 1</a></section>.'),
    P('Flexbox or grid layout', 'display\\s*:\\s*(flex|grid)', 'Style the grid: .grid { display: grid; }.'),
    P('A contact link', '<a[^>]*href\\s*=\\s*"(mailto:|#contact)[^"]*"[^>]*>', 'Add <a href="mailto:me@mail.com">Contact</a>.'),
  ],
  xp: 50,
};

const rwdLanding: CertProject = {
  id: 'rwd-product-landing',
  title: 'Product Landing Page',
  skills: ['HTML5', 'CSS3', 'Flexbox', 'Media Queries'],
  brief: [
    'Build a product landing page: headline, feature list, signup form, and responsive layout.',
    'Pass all automated tests, then submit. Project 5 of 5 — finish this to earn the certification.',
  ],
  starterCode: '<h1>Our Product</h1>\n<p>It solves everything.</p>\n',
  stories: [
    P('A headline naming the product', '<h1>[^<]+</h1>', 'Add one <h1>Product Name</h1>.'),
    P('A feature list', '<(ul|ol)>[\\s\\S]*<li>[^<]+</li>[\\s\\S]*</(ul|ol)>', 'Add <ul><li>Fast</li></ul>.'),
    P('An email signup form', '<form[^>]*>[\\s\\S]*<input[^>]*type\\s*=\\s*"email"[^>]*>[\\s\\S]*</form>', 'Add a form with <input type="email">.'),
    P('Responsive + flexible layout', '@media[^{]*\\{|display\\s*:\\s*(flex|grid)', 'Add flex/grid plus one @media query.'),
  ],
  xp: 50,
};

/* ------------------------------------------------------------------ */
/* 2 · JavaScript Algorithms & Data Structures                         */
/* ------------------------------------------------------------------ */
const jsPalindrome: CertProject = {
  id: 'js-palindrome',
  title: 'Palindrome Checker',
  skills: ['Variables', 'Loops', 'RegEx'],
  brief: [
    'Write a palindrome checker: strip non-alphanumerics, reverse, compare. Logic lives in the JS tab.',
    'Pass all automated tests, then submit. Project 1 of 5 for the JavaScript certification.',
  ],
  starterCode: '<h1>Palindrome Checker</h1>\n<p>Type a word to test.</p>\n',
  stories: [
    P('A result element for output', '<(p|div)[^>]*id\\s*=\\s*"result"[^>]*>', 'Add <p id="result"></p> for the verdict.'),
    P('Normalization with regex', '/[^/]+/[a-z]*\\.?(replace|test|match)', 'Use .replace(/[^a-z0-9]/gi, "") to clean input.'),
    P('A reversal or loop comparison', '(split\\s*\\(\\s*""\\s*\\)\\.reverse|for\\s*\\(|while\\s*\\()', 'Reverse with split("").reverse() or compare in a loop.'),
  ],
  xp: 50,
};

const jsRoman: CertProject = {
  id: 'js-roman-numeral',
  title: 'Roman Numeral Converter',
  skills: ['Variables', 'Loops', 'Functional Programming'],
  brief: [
    'Write a converter: given 1–3999, emit the Roman numeral using a value map.',
    'Pass all automated tests, then submit. Project 2 of 5 for the JavaScript certification.',
  ],
  starterCode: '<h1>Roman Numerals</h1>\n<p>Enter a number.</p>\n',
  stories: [
    P('A numeral value map', '(1000|\\bM\\b[\\s\\S]*\\bCM\\b|[\\{\\[][^\\]]*1000)', 'Define a map/table including 1000→M, 900→CM, 500→D, 100→C, 90→XC, 50→L, 40→XL, 10→X, 9→IX, 5→V, 4→IV, 1→I.'),
    P('A conversion loop', '(for\\s*\\(|while\\s*\\(|\\.map\\s*\\(|\\.reduce\\s*\\()', 'Loop over the map subtracting values.'),
    P('Output wired to the page', '(getElementById|querySelector|textContent|innerText)', 'Write the result with textContent or getElementById.'),
  ],
  xp: 50,
};

const jsCash: CertProject = {
  id: 'js-cash-register',
  title: 'Cash Register Game',
  skills: ['OOP', 'Functional Programming', 'DOM Manipulation'],
  brief: [
    'Build a cash register: given price, cash, and drawer, return change and status (OPEN/CLOSED/INSUFFICIENT_FUNDS).',
    'Pass all automated tests, then submit. Project 3 of 5 for the JavaScript certification.',
  ],
  starterCode: '<h1>Cash Register</h1>\n<p>Enter payment details.</p>\n',
  stories: [
    P('Drawer state as data', '(cid|drawer)\\s*(=|:\\s*\\[)', 'Model the drawer: const cid = [["PENNY", 1.01], …].'),
    P('Status logic for all three cases', '(INSUFFICIENT_FUNDS[\\s\\S]*CLOSED[\\s\\S]*OPEN|OPEN[\\s\\S]*CLOSED[\\s\\S]*INSUFFICIENT_FUNDS)', 'Handle OPEN, CLOSED, and INSUFFICIENT_FUNDS statuses.'),
    P('Change rendered to the DOM', '(getElementById|querySelector|textContent|innerHTML)', 'Render the change breakdown on the page.'),
  ],
  xp: 50,
};

const jsCipher: CertProject = {
  id: 'js-caesars-cipher',
  title: "Caesars Cipher",
  skills: ['Loops', 'RegEx', 'Functional Programming'],
  brief: [
    'Write a ROT13 decoder: shift every letter 13 places, leaving symbols untouched.',
    'Pass all automated tests, then submit. Project 4 of 5 for the JavaScript certification.',
  ],
  starterCode: '<h1>ROT13 Decoder</h1>\n<p>Paste a secret message.</p>\n',
  stories: [
    P('Character-code shifting', '(charCodeAt|fromCharCode)', 'Shift letters with charCodeAt / fromCharCode.'),
    P('Regex guards letters only', '/\\[A-Z', 'Test /[A-Z]/ before shifting so symbols survive.'),
    P('A decode function', 'function\\s+\\w*(rot|decod|cipher|shift)\\w*|const\\s+\\w*(rot|decod|cipher)\\w*\\s*=', 'Define a rot13/decode function.'),
  ],
  xp: 50,
};

const jsPhone: CertProject = {
  id: 'js-telephone-validator',
  title: 'Telephone Validator',
  skills: ['RegEx', 'DOM Manipulation'],
  brief: [
    'Write a US phone validator accepting the standard formats and rejecting the rest.',
    'Pass all automated tests, then submit. Project 5 of 5 — finish this to earn the certification.',
  ],
  starterCode: '<h1>Phone Validator</h1>\n<p>Enter a US number.</p>\n',
  stories: [
    P('A validation regex', '/[^/]*\\\\d[^/]*/', 'Write a regex matching US formats like 555-555-5555 and (555) 555-5555.'),
    P('Boolean verdict logic', '(test\\s*\\(|\\.match\\s*\\(|true[\\s\\S]*false|false[\\s\\S]*true)', 'Return true/false via .test() or .match().'),
    P('Verdict shown on the page', '(getElementById|querySelector|textContent|innerText)', 'Show valid/invalid with textContent.'),
  ],
  xp: 50,
};

/* ------------------------------------------------------------------ */
/* 3 · Front End Development Libraries                                 */
/* ------------------------------------------------------------------ */
const fedQuote: CertProject = {
  id: 'fed-quote-machine',
  title: 'Random Quote Machine',
  skills: ['React', 'Bootstrap', 'jQuery'],
  brief: [
    'Build a quote machine: new-quote button, author display, tweet link. React via CDN or vanilla with component structure.',
    'Pass all automated tests, then submit. Project 1 of 5 for the Front End Libraries certification.',
  ],
  starterCode: '<h1>Quotes</h1>\n<p>Wisdom on demand.</p>\n',
  stories: [
    P('A quote display element', 'id\\s*=\\s*"text"', 'Add id="text" to the quote element.'),
    P('An author element', 'id\\s*=\\s*"author"', 'Add id="author" for the author.'),
    P('A new-quote control', 'id\\s*=\\s*"new-quote"', 'Add id="new-quote" to the button.'),
    P('A tweet link', 'id\\s*=\\s*"tweet-quote"', 'Add id="tweet-quote" linking to the tweet intent.'),
  ],
  xp: 60,
};

const fedMarkdown: CertProject = {
  id: 'fed-markdown-previewer',
  title: 'Markdown Previewer',
  skills: ['React', 'Redux', 'Sass'],
  brief: [
    'Build a live Markdown previewer: editor textarea renders formatted output instantly.',
    'Pass all automated tests, then submit. Project 2 of 5 for the Front End Libraries certification.',
  ],
  starterCode: '<h1>Markdown</h1>\n<p>Write on the left, read on the right.</p>\n',
  stories: [
    P('An editor textarea', 'id\\s*=\\s*"editor"', 'Add <textarea id="editor">.'),
    P('A preview pane', 'id\\s*=\\s*"preview"', 'Add <div id="preview">.'),
    P('Live rendering wired up', '(oninput|onchange|addEventListener|useState|marked|DOMPurify)', 'Re-render preview on input (marked/DOMPurify or own parser).'),
  ],
  xp: 60,
};

const fedDrum: CertProject = {
  id: 'fed-drum-machine',
  title: 'Drum Machine',
  skills: ['React', 'Redux', 'Bootstrap'],
  brief: [
    'Build a drum machine: 9 pads (QWE/ASD/ZXC), keyboard triggers, display names the hit.',
    'Pass all automated tests, then submit. Project 3 of 5 for the Front End Libraries certification.',
  ],
  starterCode: '<h1>Drums</h1>\n<p>Hit the pads.</p>\n',
  stories: [
    P('A drum-machine container', 'id\\s*=\\s*"drum-machine"', 'Add id="drum-machine" wrapper.'),
    P('A display element', 'id\\s*=\\s*"display"', 'Add id="display" showing the last hit.'),
    P('Nine pads with clips', 'class\\s*=\\s*"[^"]*drum-pad[^"]*"', 'Add 9 .drum-pad elements each wrapping an <audio>.'),
    P('Keyboard triggering', '(keydown|keyCode|key\\s*===|onKey)', 'Play the clip on keydown for Q/W/E/A/S/D/Z/X/C.'),
  ],
  xp: 60,
};

const fedCalc: CertProject = {
  id: 'fed-calculator',
  title: 'JavaScript Calculator',
  skills: ['React', 'Redux', 'Sass'],
  brief: [
    'Build a calculator: digit/operator buttons, chained operations, clear, decimal handling.',
    'Pass all automated tests, then submit. Project 4 of 5 for the Front End Libraries certification.',
  ],
  starterCode: '<h1>Calculator</h1>\n<p>Do the math.</p>\n',
  stories: [
    P('A display element', 'id\\s*=\\s*"display"', 'Add id="display" defaulting to 0.'),
    P('Digit + operator buttons', 'id\\s*=\\s*"(zero|one|add|subtract|multiply|divide|equals|clear)"', 'Add buttons with fCC ids (zero…nine, add, subtract, multiply, divide, equals, clear, decimal).'),
    P('Expression evaluation', '(eval\\s*\\(|Function\\s*\\(|parseFloat|Number\\s*\\()', 'Evaluate the expression chain on equals.'),
  ],
  xp: 60,
};

const fedPomodoro: CertProject = {
  id: 'fed-pomodoro-clock',
  title: '25 + 5 Clock',
  skills: ['React', 'Redux', 'jQuery'],
  brief: [
    'Build a Pomodoro clock: adjustable session/break lengths, countdown, session↔break switching, beep at zero.',
    'Pass all automated tests, then submit. Project 5 of 5 — finish this to earn the certification.',
  ],
  starterCode: '<h1>Focus Clock</h1>\n<p>Work in sprints.</p>\n',
  stories: [
    P('Break and session controls', 'id\\s*=\\s*"break-(increment|decrement)"[\\s\\S]*id\\s*=\\s*"session-(increment|decrement)"', 'Add break/session length controls with those ids.'),
    P('A time-left display', 'id\\s*=\\s*"time-left"', 'Add id="time-left" in mm:ss.'),
    P('Start/stop + reset', 'id\\s*=\\s*"start_stop"[\\s\\S]*id\\s*=\\s*"reset"', 'Add start_stop and reset controls.'),
    P('A beep at zero', 'id\\s*=\\s*"beep"|<audio', 'Add <audio id="beep"> played at 00:00.'),
  ],
  xp: 60,
};

/* ------------------------------------------------------------------ */
/* 4 · Relational Databases                                            */
/* ------------------------------------------------------------------ */
const dbCelestial: CertProject = {
  id: 'db-celestial-bodies',
  title: 'Celestial Body Database',
  skills: ['Bash', 'PostgreSQL', 'Git'],
  brief: [
    'Design a universe database in PostgreSQL: galaxy → star → planet → moon with proper keys.',
    'Script it in the editor (SQL in a comment block is fine). Project 1 of 5 for the Relational Databases certification.',
  ],
  starterCode: '<h1>Celestial Bodies</h1>\n<!-- Write your schema here:\nCREATE TABLE galaxy(...);\n-->\n',
  stories: [
    P('CREATE TABLE statements', 'CREATE\\s+TABLE', 'Write CREATE TABLE for galaxy, star, planet, moon.'),
    P('Primary keys declared', 'PRIMARY\\s+KEY', 'Give every table a PRIMARY KEY.'),
    P('Foreign keys link the bodies', 'REFERENCES', 'Link star→galaxy, planet→star, moon→planet with REFERENCES.'),
  ],
  xp: 60,
};

const dbMario: CertProject = {
  id: 'db-mario-database',
  title: 'Mario Database',
  skills: ['Bash', 'PostgreSQL', 'SQL'],
  brief: [
    'Query the Mario database: joins across characters, actions, and sounds to answer questions.',
    'Script your queries in the editor. Project 2 of 5 for the Relational Databases certification.',
  ],
  starterCode: '<h1>Mario DB</h1>\n<!-- SELECT * FROM characters; -->\n',
  stories: [
    P('SELECT queries present', 'SELECT[\\s\\S]+FROM', 'Write SELECT … FROM queries.'),
    P('A JOIN across tables', 'JOIN', 'Join characters to actions or sounds with JOIN … ON.'),
    P('Filtered + ordered results', '(WHERE[\\s\\S]*ORDER\\s+BY|ORDER\\s+BY[\\s\\S]*WHERE)', 'Filter with WHERE and sort with ORDER BY.'),
  ],
  xp: 60,
};

const dbBike: CertProject = {
  id: 'db-bike-shop',
  title: 'Bike Rental Shop',
  skills: ['Bash', 'PostgreSQL', 'Git', 'SQL'],
  brief: [
    'Script the bike shop: interactive Bash + SQL for renting, returning, and availability.',
    'Script it in the editor. Project 3 of 5 for the Relational Databases certification.',
  ],
  starterCode: '<h1>Bike Shop</h1>\n<!-- #!/bin/bash\nPSQL="psql ..."; -->\n',
  stories: [
    P('A psql query wrapper', '(PSQL|psql)', 'Define PSQL="psql -X --username=… --dbname=bikes … -t --no-align -c".'),
    P('Rental UPDATE logic', 'UPDATE[\\s\\S]+SET', 'UPDATE rentals/bikes when a bike goes out.'),
    P('Availability SELECT', 'SELECT[\\s\\S]+WHERE[\\s\\S]+available', 'SELECT available bikes with WHERE available = TRUE.'),
  ],
  xp: 60,
};

const dbSalon: CertProject = {
  id: 'db-salon-scheduler',
  title: 'Salon Appointment Scheduler',
  skills: ['Bash', 'PostgreSQL', 'SQL Injection defense'],
  brief: [
    'Script the salon scheduler: list services, book appointments, confirm by phone — injection-safe.',
    'Script it in the editor. Project 4 of 5 for the Relational Databases certification.',
  ],
  starterCode: '<h1>Salon Scheduler</h1>\n<!-- services table + booking flow -->\n',
  stories: [
    P('Services listed from the DB', 'SELECT[\\s\\S]+FROM\\s+services', 'SELECT services to display the menu.'),
    P('Appointment INSERT', 'INSERT\\s+INTO\\s+appointments', 'INSERT INTO appointments on booking.'),
    P('Phone lookup for customers', 'SELECT[\\s\\S]+FROM\\s+customers[\\s\\S]+phone', 'Look up the customer by phone before inserting.'),
  ],
  xp: 60,
};

const dbGuess: CertProject = {
  id: 'db-number-guessing',
  title: 'Number Guessing Game',
  skills: ['Bash', 'Linux CLI', 'PostgreSQL'],
  brief: [
    'Script the guessing game: random number, hint loop (higher/lower), persist best score per user.',
    'Script it in the editor. Project 5 of 5 — finish this to earn the certification.',
  ],
  starterCode: '<h1>Guessing Game</h1>\n<!-- SECRET=$(( RANDOM % 1000 + 1 )) -->\n',
  stories: [
    P('Random secret generation', '(RANDOM|\\$RANDOM)', 'Generate SECRET with $RANDOM.'),
    P('Higher/lower hint loop', '(higher|lower)[\\s\\S]*(while|until|if)|((while|until)[\\s\\S]*(higher|lower))', 'Loop with higher/lower hints until guessed.'),
    P('Score persisted to Postgres', '(INSERT\\s+INTO|UPDATE)[\\s\\S]*(users|games)', 'INSERT/UPDATE the user score in Postgres.'),
  ],
  xp: 60,
};

/* ------------------------------------------------------------------ */
/* 5 · Back End Development and APIs                                   */
/* ------------------------------------------------------------------ */
const beTimestamp: CertProject = {
  id: 'be-timestamp',
  title: 'Timestamp Microservice',
  skills: ['Node.js', 'Express', 'npm'],
  brief: [
    'Build a timestamp API: GET /api/:date? returns { unix, utc } for ISO dates, millis, or empty (now).',
    'Code it in the editor (JS tab). Project 1 of 5 for the Back End certification.',
  ],
  starterCode: '<h1>Timestamp API</h1>\n<!-- app.get("/api/:date?", ...) -->\n',
  stories: [
    P('Express date route', '(app\\.get|router\\.get)[\\s\\S]*:?date', 'Add app.get("/api/:date?", …).'),
    P('Unix + UTC response', '(unix[\\s\\S]*utc|utc[\\s\\S]*unix)', 'Respond with { unix, utc }.'),
    P('Invalid-date handling', '(Invalid\\s+Date[\\s\\S]*error|error[\\s\\S]*Invalid\\s+Date)', 'Return { error: "Invalid Date" } for bad input.'),
  ],
  xp: 60,
};

const beShortener: CertProject = {
  id: 'be-url-shortener',
  title: 'URL Shortener Microservice',
  skills: ['Node.js', 'Express', 'MongoDB', 'Mongoose'],
  brief: [
    'Build a URL shortener: POST a URL, get an id back; GET /api/shorturl/:id redirects.',
    'Code it in the editor. Project 2 of 5 for the Back End certification.',
  ],
  starterCode: '<h1>URL Shortener</h1>\n<!-- mongoose model { original_url, short_url } -->\n',
  stories: [
    P('URL validation', '(dns\\.lookup|isURL|valid-url|http)', 'Validate the posted URL (dns.lookup or URL parse).'),
    P('Short URL stored + returned', '(short_url|shorturl)[\\s\\S]*(save|create|insert)', 'Persist { original_url, short_url } with Mongoose.'),
    P('Redirect endpoint', '(res\\.redirect|302|301)', 'GET /api/shorturl/:id must res.redirect() to the original.'),
  ],
  xp: 60,
};

const beExercise: CertProject = {
  id: 'be-exercise-tracker',
  title: 'Exercise Tracker',
  skills: ['Node.js', 'Express', 'MongoDB', 'Mongoose'],
  brief: [
    'Build an exercise tracker: users, dated exercises, filtered logs (?from&to&limit).',
    'Code it in the editor. Project 3 of 5 for the Back End certification.',
  ],
  starterCode: '<h1>Exercise Tracker</h1>\n<!-- User + Exercise models -->\n',
  stories: [
    P('User creation endpoint', '(/api/users|User\\.create|new\\s+User)', 'POST /api/users creates a user.'),
    P('Exercise logging with date', '(/api/users/:.*\\/exercises|description[\\s\\S]*duration[\\s\\S]*date)', 'POST exercises with description, duration, date.'),
    P('Filtered log query', '(from|to|limit)[\\s\\S]*(find|filter|slice)', 'GET logs supports ?from & ?to & ?limit.'),
  ],
  xp: 60,
};

const beFilemeta: CertProject = {
  id: 'be-file-metadata',
  title: 'File Metadata Microservice',
  skills: ['Node.js', 'Express', 'npm'],
  brief: [
    'Build a file analyser: upload a file, get back { name, type, size }.',
    'Code it in the editor. Project 4 of 5 for the Back End certification.',
  ],
  starterCode: '<h1>File Metadata</h1>\n<!-- multer single("upfile") -->\n',
  stories: [
    P('Multipart upload middleware', '(multer|formidable|busboy|\\.single\\s*\\()', 'Handle uploads with multer single("upfile").'),
    P('File analysis endpoint', '(/api/fileanalyse|fileanalyse)', 'POST /api/fileanalyse processes the file.'),
    P('Name/type/size response', '(originalname|mimetype|size)[\\s\\S]*(originalname|mimetype|size)[\\s\\S]*(originalname|mimetype|size)', 'Respond with name, type, and size.'),
  ],
  xp: 60,
};

const beHeader: CertProject = {
  id: 'be-header-parser',
  title: 'Request Header Parser',
  skills: ['Node.js', 'Express'],
  brief: [
    'Build a whoami API: GET /api/whoami returns { ipaddress, language, software }.',
    'Code it in the editor. Project 5 of 5 — finish this to earn the certification.',
  ],
  starterCode: '<h1>Whoami API</h1>\n<!-- req.ip, req.headers ... -->\n',
  stories: [
    P('Whoami route', '(/api/whoami|whoami)', 'Add GET /api/whoami.'),
    P('IP + language extracted', '(ip[\\s\\S]*language|language[\\s\\S]*ip)', 'Read IP and accept-language from the request.'),
    P('Software (user-agent) extracted', '(user-agent|userAgent|getHeader\\s*\\(\\s*["\\x27]user)', 'Read the user-agent software string.'),
  ],
  xp: 60,
};

/* ------------------------------------------------------------------ */
/* 6 · Scientific Computing & Data Analysis (Python)                   */
/* ------------------------------------------------------------------ */
const pyBudget: CertProject = {
  id: 'py-budget-app',
  title: 'Budget App',
  skills: ['Python', 'OOP'],
  brief: [
    'Write a Category ledger class: deposit, withdraw, transfer, plus a spend-chart function.',
    'Code it in the editor. Project 1 of 5 for the Data Analysis certification.',
  ],
  starterCode: '<h1>Budget App</h1>\n<!-- class Category: ... -->\n',
  stories: [
    P('A Category class with ledger', 'class\\s+Category[\\s\\S]*ledger', 'Define class Category with a ledger list.'),
    P('Deposit/withdraw methods', '(def\\s+deposit[\\s\\S]*def\\s+withdraw|def\\s+withdraw[\\s\\S]*def\\s+deposit)', 'Implement deposit() and withdraw() (withdraw returns False when overdrawn).'),
    P('A spend chart function', 'def\\s+create_spend_chart', 'Implement create_spend_chart(categories) with o-bars by percent.'),
  ],
  xp: 60,
};

const pyPolygon: CertProject = {
  id: 'py-polygon-calculator',
  title: 'Polygon Area Calculator',
  skills: ['Python', 'OOP'],
  brief: [
    'Write Rectangle/Square classes: area, perimeter, diagonal, picture, amount-inside.',
    'Code it in the editor. Project 2 of 5 for the Data Analysis certification.',
  ],
  starterCode: '<h1>Shapes</h1>\n<!-- class Rectangle ... class Square(Rectangle) -->\n',
  stories: [
    P('Rectangle + Square classes', '(class\\s+Rectangle[\\s\\S]*class\\s+Square|class\\s+Square[\\s\\S]*class\\s+Rectangle)', 'Define Rectangle and Square (Square extends Rectangle).'),
    P('Area/perimeter/diagonal', '(def\\s+get_area[\\s\\S]*def\\s+get_perimeter|def\\s+get_diagonal)', 'Implement get_area, get_perimeter, get_diagonal.'),
    P('Picture + containment', '(def\\s+get_picture[\\s\\S]*def\\s+get_amount_inside|def\\s+get_amount_inside[\\s\\S]*def\\s+get_picture)', 'Implement get_picture() and get_amount_inside().'),
  ],
  xp: 60,
};

const pyDemographic: CertProject = {
  id: 'py-demographic-analyzer',
  title: 'Demographic Data Analyzer',
  skills: ['Python', 'Pandas', 'NumPy'],
  brief: [
    'Analyze the census CSV with Pandas: race counts, average age by sex/education, top occupations and countries.',
    'Code it in the editor. Project 3 of 5 for the Data Analysis certification.',
  ],
  starterCode: '<h1>Demographics</h1>\n<!-- import pandas as pd -->\n',
  stories: [
    P('Pandas loaded the dataset', '(import\\s+pandas|read_csv)', 'Load the CSV with pandas read_csv.'),
    P('Grouped aggregations', '(groupby|mean\\s*\\(|value_counts)', 'Aggregate with groupby/mean/value_counts.'),
    P('Key questions answered', '(race[\\s\\S]*(count|represent)|bachelor|higher-educ|rich|occupation|country)', 'Answer race counts, education income %, top occupations/countries.'),
  ],
  xp: 60,
};

const pyTime: CertProject = {
  id: 'py-time-calculator',
  title: 'Time Calculator',
  skills: ['Python'],
  brief: [
    'Write add_time(): given start, duration, and optional weekday, return the new time with day rollover.',
    'Code it in the editor. Project 4 of 5 for the Data Analysis certification.',
  ],
  starterCode: '<h1>Time Calculator</h1>\n<!-- def add_time(start, duration, day=None): -->\n',
  stories: [
    P('An add_time function', 'def\\s+add_time', 'Define def add_time(start, duration, day=None).'),
    P('AM/PM flipping handled', '(AM|PM)[\\s\\S]*(AM|PM)', 'Flip AM/PM correctly across 12-hour boundaries.'),
    P('Day rollover reported', '(next\\s+day|\\d+\\s+days?\\s+later|weekday|day\\s+of\\s+week)', 'Report (next day) / (N days later) and the weekday.'),
  ],
  xp: 60,
};

const pyArithmetic: CertProject = {
  id: 'py-arithmetic-formatter',
  title: 'Arithmetic Formatter',
  skills: ['Python'],
  brief: [
    'Write arithmetic_arranger(): vertically format addition/subtraction problems, optionally with answers.',
    'Code it in the editor. Project 5 of 5 — finish this to earn the certification.',
  ],
  starterCode: '<h1>Formatter</h1>\n<!-- def arithmetic_arranger(problems, show_answers=False): -->\n',
  stories: [
    P('An arranger function', 'def\\s+arithmetic_arranger', 'Define def arithmetic_arranger(problems, show_answers=False).'),
    P('Validation with error strings', '(Error[\\s\\S]*Too\\s+many|Too\\s+many[\\s\\S]*Error|must\\s+not|can\\s+only)', 'Return Error: strings for bad input (too many, bad operator, non-digits, >4 digits).'),
    P('Vertical alignment logic', '(rjust|ljust|center|\\.format|f["\\x27])', 'Right-align operands above dashes with 4-space gaps.'),
  ],
  xp: 60,
};

/* ------------------------------------------------------------------ */
/* 7 · Information Security & Machine Learning                         */
/* ------------------------------------------------------------------ */
const secStock: CertProject = {
  id: 'sec-stock-checker',
  title: 'Stock Price Checker',
  skills: ['HelmetJS', 'Node.js', 'Express'],
  brief: [
    'Build a stock checker with like-voting: Helmet-secured, deduped likes per IP, relative likes for pairs.',
    'Code it in the editor. Project 1 of 5 for the Security & ML certification.',
  ],
  starterCode: '<h1>Stock Checker</h1>\n<!-- helmet + /api/stock-prices -->\n',
  stories: [
    P('Helmet security headers', '(helmet|contentSecurityPolicy|frameguard)', 'Lock down headers with Helmet.'),
    P('Stock price endpoint with likes', '(/api/stock-prices|stock[\\s\\S]*like)', 'GET prices with like support.'),
    P('IP-deduped likes', '(ip[\\s\\S]*like|like[\\s\\S]*ip|findOneAndUpdate|\\$addToSet)', 'Count one like per IP (relative_likes for two-stock queries).'),
  ],
  xp: 70,
};

const secBoard: CertProject = {
  id: 'sec-anon-board',
  title: 'Anonymous Message Board',
  skills: ['HelmetJS', 'MongoDB', 'Node.js'],
  brief: [
    'Build an anonymous board: threads + replies with report/delete (password-gated), 10-thread bump-sorted feed.',
    'Code it in the editor. Project 2 of 5 for the Security & ML certification.',
  ],
  starterCode: '<h1>Anon Board</h1>\n<!-- /api/threads/:board /api/replies/:board -->\n',
  stories: [
    P('Thread + reply routes', '(/api/threads[\\s\\S]*/api/replies|/api/replies[\\s\\S]*/api/threads)', 'Implement thread and reply endpoints.'),
    P('Report + password delete', '(reported[\\s\\S]*delete_password|delete_password[\\s\\S]*reported|findOneAnd(Update|Delete))', 'Support reporting and password-checked deletes.'),
    P('Bump-sorted thread feed', '(bumped_on|sort[\\s\\S]*-?bumped|limit\\s*\\(\\s*10)', 'Return 10 threads sorted by bumped_on.'),
  ],
  xp: 70,
};

const secTracker: CertProject = {
  id: 'sec-issue-tracker',
  title: 'Issue Tracker',
  skills: ['Node.js', 'Express', 'MongoDB'],
  brief: [
    'Build an issue tracker: full CRUD per project with filters, PUT auto-updates updated_on.',
    'Code it in the editor. Project 3 of 5 for the Security & ML certification.',
  ],
  starterCode: '<h1>Issue Tracker</h1>\n<!-- /api/issues/:project CRUD -->\n',
  stories: [
    P('Full CRUD routes', '(\\.get[\\s\\S]*\\.post[\\s\\S]*\\.put[\\s\\S]*\\.delete|route[\\s\\S]*get[\\s\\S]*post)', 'Implement GET/POST/PUT/DELETE on /api/issues/:project.'),
    P('Filterable GET', '(req\\.query|find\\s*\\([^)]*req)', 'Filter GET by query params.'),
    P('Timestamps maintained', '(created_on|updated_on)', 'Track created_on and updated_on per issue.'),
  ],
  xp: 70,
};

const mlRegression: CertProject = {
  id: 'ml-linear-regression',
  title: 'Linear Regression Model',
  skills: ['TensorFlow', 'Neural Networks'],
  brief: [
    'Train a regression model (TensorFlow): predict the target from features, report MAE under the bar.',
    'Script it in the editor (Python/TF or JS equivalent). Project 4 of 5 for the Security & ML certification.',
  ],
  starterCode: '<h1>Regression</h1>\n<!-- import tensorflow as tf -->\n',
  stories: [
    P('A sequential/dense model', '(Sequential|Dense|LinearRegression|fit\\s*\\()', 'Build and fit a regression model.'),
    P('Train/validation split', '(train_test_split|validation_split|train[\\s\\S]*test)', 'Split data into train and validation sets.'),
    P('Error metric reported', '(mae|mse|mean_squared_error|mean_absolute_error|score)', 'Report MAE/MSE on held-out data.'),
  ],
  xp: 70,
};

const mlSpam: CertProject = {
  id: 'ml-spam-classifier',
  title: 'Spam Text Classifier',
  skills: ['TensorFlow', 'Neural Networks'],
  brief: [
    'Train a text classifier: tokenize messages, embed, classify ham vs spam with held-out accuracy.',
    'Script it in the editor. Project 5 of 5 — finish this to earn the certification.',
  ],
  starterCode: '<h1>Spam Classifier</h1>\n<!-- Tokenizer + embedding model -->\n',
  stories: [
    P('Text tokenization', '(Tokenizer|CountVectorizer|Tfidf|pad_sequences|fit_on_texts)', 'Tokenize and pad the message corpus.'),
    P('Embedding + dense head', '(Embedding[\\s\\S]*Dense|Dense[\\s\\S]*sigmoid|softmax)', 'Build an embedding + Dense(sigmoid) classifier.'),
    P('Accuracy evaluated', '(accuracy|evaluate|classification_report)', 'Evaluate accuracy on held-out messages.'),
  ],
  xp: 70,
};

/* ------------------------------------------------------------------ */

export const CERTIFICATIONS: CertTrack[] = [
  {
    id: 'rwd',
    name: 'Responsive Web Design',
    icon: '📄',
    blurb: 'The starting line — semantic HTML and modern CSS.',
    skills: ['HTML5', 'CSS3', 'Flexbox', 'CSS Grid', 'Media Queries', 'Accessibility'],
    projects: [rwdCatPhoto, rwdSurvey, rwdTechDoc, rwdPortfolio, rwdLanding],
  },
  {
    id: 'js',
    name: 'JavaScript Algorithms & Data Structures',
    icon: '🟨',
    blurb: 'Think in code — pure JavaScript problem solving.',
    skills: ['Variables', 'Loops', 'OOP', 'Functional Programming', 'RegEx', 'DOM Manipulation'],
    projects: [jsPalindrome, jsRoman, jsCash, jsCipher, jsPhone],
  },
  {
    id: 'fed',
    name: 'Front End Development Libraries',
    icon: '⚛️',
    blurb: 'Component thinking — React, state, and styling systems.',
    skills: ['React', 'Redux', 'Sass', 'Bootstrap', 'jQuery'],
    projects: [fedQuote, fedMarkdown, fedDrum, fedCalc, fedPomodoro],
  },
  {
    id: 'db',
    name: 'Relational Databases',
    icon: '🗄️',
    blurb: 'Think in tables — Bash, Postgres, and safe SQL.',
    skills: ['Bash', 'Linux Command Line', 'PostgreSQL', 'Git', 'SQL Injection defense'],
    projects: [dbCelestial, dbMario, dbBike, dbSalon, dbGuess],
  },
  {
    id: 'be',
    name: 'Back End Development and APIs',
    icon: '🔌',
    blurb: 'Serve the world — Node, Express, Mongo.',
    skills: ['Node.js', 'Express', 'MongoDB', 'Mongoose', 'npm'],
    projects: [beTimestamp, beShortener, beExercise, beFilemeta, beHeader],
  },
  {
    id: 'py',
    name: 'Scientific Computing & Data Analysis',
    icon: '🐍',
    blurb: 'Think in data — Python, NumPy, Pandas.',
    skills: ['Python', 'NumPy', 'Pandas', 'Matplotlib', 'Seaborn'],
    projects: [pyBudget, pyPolygon, pyDemographic, pyTime, pyArithmetic],
  },
  {
    id: 'secml',
    name: 'Information Security & Machine Learning',
    icon: '🛡️',
    blurb: 'Harden and predict — Helmet, TensorFlow, neural nets.',
    skills: ['HelmetJS', 'TCP', 'Penetration Testing', 'TensorFlow', 'Neural Networks'],
    projects: [secStock, secBoard, secTracker, mlRegression, mlSpam],
  },
];

/** Flat lookup of every certification project by id (for the project runner). */
export const CERT_PROJECTS: Record<string, CertProject> = Object.fromEntries(
  CERTIFICATIONS.flatMap((t) => t.projects.map((p) => [p.id, p]))
);

export function getCertProject(id: string): CertProject | undefined {
  return CERT_PROJECTS[id];
}

export function getCertTrack(id: string): CertTrack | undefined {
  return CERTIFICATIONS.find((t) => t.id === id);
}

/* ------------------------------------------------------------------ */
/* Remote catalog (Supabase) — new tracks ship without an app update.  */
/* ------------------------------------------------------------------ */
// The app runs off the bundled CERTIFICATIONS above when offline or when
// the database is unreachable/invalid. When the remote catalog validates
// cleanly it takes over, so a new track inserted into Supabase appears in
// the app with zero client changes. Any validation failure fails CLOSED
// back to the bundle — a malformed row can never blank the screen.
import { supabase } from './supabase';

function validStory(s: unknown): s is CertStory {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  if (typeof o.label !== 'string' || !o.label) return false;
  if (typeof o.pattern !== 'string' || !o.pattern) return false;
  if (typeof o.hint !== 'string' || !o.hint) return false;
  try {
    new RegExp(o.pattern, 'i');
    return true;
  } catch {
    return false;
  }
}

export function validCertProject(p: unknown): p is CertProject {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === 'string' && !!o.id &&
    typeof o.title === 'string' &&
    Array.isArray(o.skills) &&
    Array.isArray(o.brief) && o.brief.length > 0 &&
    typeof o.starterCode === 'string' &&
    Array.isArray(o.stories) && o.stories.length > 0 &&
    (o.stories as unknown[]).every(validStory) &&
    typeof o.xp === 'number'
  );
}

/** Map one DB row (snake_case) to a CertProject, or null if invalid. */
function toProject(row: Record<string, unknown>): CertProject | null {
  const p: CertProject = {
    id: row.id as string,
    title: (row.title as string) ?? '',
    skills: (row.skills as string[]) ?? [],
    brief: (row.brief as string[]) ?? [],
    starterCode: (row.starter_code as string) ?? '',
    stories: (row.stories as CertStory[]) ?? [],
    xp: typeof row.xp === 'number' ? row.xp : 50,
  };
  return validCertProject(p) ? p : null;
}

/** Full remote catalog, or null when anything is missing/invalid. */
export async function fetchRemoteCatalog(): Promise<CertTrack[] | null> {
  try {
    const { data: tracks, error } = await supabase
      .from('certification_tracks')
      .select('*')
      .order('id');
    if (error || !tracks?.length) return null;
    const { data: projs, error: e2 } = await supabase
      .from('certification_projects')
      .select('*')
      .order('position');
    if (e2 || !projs?.length) return null;
    const byTrack = new Map<string, CertProject[]>();
    for (const row of projs as Record<string, unknown>[]) {
      const p = toProject(row);
      if (!p || typeof row.track_id !== 'string') return null;
      if (!byTrack.has(row.track_id)) byTrack.set(row.track_id, []);
      byTrack.get(row.track_id)!.push(p);
    }
    const out: CertTrack[] = [];
    for (const t of tracks as Record<string, unknown>[]) {
      const ps = typeof t.id === 'string' ? byTrack.get(t.id) ?? [] : [];
      if (typeof t.id !== 'string' || typeof t.name !== 'string' || !Array.isArray(t.skills) || !ps.length)
        return null;
      out.push({
        id: t.id,
        name: t.name,
        icon: typeof t.icon === 'string' ? t.icon : '',
        blurb: typeof t.blurb === 'string' ? t.blurb : '',
        skills: t.skills as string[],
        projects: ps,
      });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

/** One remote project by id (covers tracks shipped after this build). */
export async function fetchRemoteProject(id: string): Promise<CertProject | null> {
  try {
    const { data, error } = await supabase
      .from('certification_projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return toProject(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Grade learner code against a project's stories (shared by client + tests). */
export function gradeProject(
  project: { stories: Array<{ label: string; pattern: string; hint: string }> },
  code: string,
) {
  return project.stories.map((s) => {
    let pass = false;
    try {
      pass = new RegExp(s.pattern, 'i').test(code);
    } catch {
      pass = false;
    }
    return { ...s, pass };
  });
}

/** Certification is earned when all 5 project ids are in the completed set. */
export function isTrackCertified(track: CertTrack, completed: Set<string>): boolean {
  return track.projects.every((p) => completed.has(p.id));
}

export function trackProgress(track: CertTrack, completed: Set<string>): number {
  return track.projects.filter((p) => completed.has(p.id)).length;
}
