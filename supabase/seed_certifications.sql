-- Bolingo Learn: Core Curriculum seed — 7 certification tracks × 5 projects.
-- GENERATED FILE — do not hand-edit. Regenerate with:
--   node scripts/gen-cert-seed.cjs
-- Source of truth: lib/certifications.ts (the app runs off it offline).
-- Safe to re-run: DDL uses IF NOT EXISTS, tracks/projects upsert by id.
-- Apply with: supabase db query --linked --file supabase/seed_certifications.sql

create table if not exists public.certification_tracks (
  id text primary key,
  name text not null,
  icon text not null default '',
  blurb text not null default '',
  skills jsonb not null default '[]'::jsonb
);

create table if not exists public.certification_projects (
  id text primary key,
  track_id text not null references public.certification_tracks (id) on delete cascade,
  position integer not null default 0,
  title text not null,
  skills jsonb not null default '[]'::jsonb,
  brief jsonb not null default '[]'::jsonb,
  starter_code text not null default '',
  stories jsonb not null default '[]'::jsonb,
  xp integer not null default 50
);

alter table public.certification_tracks enable row level security;
alter table public.certification_projects enable row level security;

drop policy if exists "Anyone can read tracks" on public.certification_tracks;
create policy "Anyone can read tracks"
  on public.certification_tracks for select using (true);

drop policy if exists "Anyone can read cert projects" on public.certification_projects;
create policy "Anyone can read cert projects"
  on public.certification_projects for select using (true);

-- RLS policies alone are not enough: the API roles need table grants.
grant select on public.certification_tracks, public.certification_projects to anon, authenticated;

-- Tracks ----------------------------------------------------------------
insert into public.certification_tracks (id, name, icon, blurb, skills) values
  ('rwd', 'Responsive Web Design', '📄', 'The starting line — semantic HTML and modern CSS.',
   '["HTML5","CSS3","Flexbox","CSS Grid","Media Queries","Accessibility"]'),
  ('js', 'JavaScript Algorithms & Data Structures', '🟨', 'Think in code — pure JavaScript problem solving.',
   '["Variables","Loops","OOP","Functional Programming","RegEx","DOM Manipulation"]'),
  ('fed', 'Front End Development Libraries', '⚛️', 'Component thinking — React, state, and styling systems.',
   '["React","Redux","Sass","Bootstrap","jQuery"]'),
  ('db', 'Relational Databases', '🗄️', 'Think in tables — Bash, Postgres, and safe SQL.',
   '["Bash","Linux Command Line","PostgreSQL","Git","SQL Injection defense"]'),
  ('be', 'Back End Development and APIs', '🔌', 'Serve the world — Node, Express, Mongo.',
   '["Node.js","Express","MongoDB","Mongoose","npm"]'),
  ('py', 'Scientific Computing & Data Analysis', '🐍', 'Think in data — Python, NumPy, Pandas.',
   '["Python","NumPy","Pandas","Matplotlib","Seaborn"]'),
  ('secml', 'Information Security & Machine Learning', '🛡️', 'Harden and predict — Helmet, TensorFlow, neural nets.',
   '["HelmetJS","TCP","Penetration Testing","TensorFlow","Neural Networks"]')
on conflict (id) do update set
  name = excluded.name, icon = excluded.icon, blurb = excluded.blurb, skills = excluded.skills;

-- Projects (stories mirror lib/certifications.ts patterns) ----------------
insert into public.certification_projects (id, track_id, position, title, skills, brief, starter_code, stories, xp) values
  ('rwd-cat-photo', 'rwd', 1, 'Cat Photo App', '["HTML5","Accessibility"]',
   '["Build the classic first page: a cat photo app with headings, paragraphs, links, and images.","Pass all automated tests, then submit. Project 1 of 5 for the Responsive Web Design certification."]',
   '<h1>CatPhotoApp</h1>
<p>Everyone loves cute cats online.</p>
',
   '[{"label":"A single <h1> names the app","pattern":"<h1>[^<]*cat[^<]*</h1>","hint":"Add one <h1>CatPhotoApp</h1>."},{"label":"A link to cat photos","pattern":"<a[^>]*href[^>]*>.*?</a>","hint":"Add <a href=\"https://catphotos\">See cats</a>."},{"label":"An image with alt text","pattern":"<img[^>]*alt\\s*=\\s*\"[^\"]+\"[^>]*>","hint":"Add <img src=\"cat.jpg\" alt=\"A cute cat\">."}]',
   50),
  ('rwd-survey-form', 'rwd', 2, 'Survey Form', '["HTML5","CSS3","Accessibility"]',
   '["Build a survey form with labels, inputs, and a submit button — every control reachable by keyboard.","Pass all automated tests, then submit. Project 2 of 5 for the Responsive Web Design certification."]',
   '<h1>Survey</h1>
<p>Tell us about yourself.</p>
',
   '[{"label":"A form element wraps the controls","pattern":"<form[^>]*>[\\s\\S]*</form>","hint":"Wrap everything in <form>…</form>."},{"label":"Labeled text input","pattern":"<label[^>]*>[\\s\\S]*<input[^>]*>","hint":"Add <label>Name <input type=\"text\"></label>."},{"label":"A submit button","pattern":"<(button[^>]*type\\s*=\\s*\"submit\"|input[^>]*type\\s*=\\s*\"submit\")[^>]*>","hint":"Add <button type=\"submit\">Submit</button>."},{"label":"CSS centers the heading","pattern":"h1\\s*\\{[^}]*text-align\\s*:\\s*center","hint":"Add a style block: h1 { text-align: center; }."}]',
   50),
  ('rwd-tech-doc', 'rwd', 3, 'Technical Documentation Page', '["HTML5","CSS3","Media Queries"]',
   '["Build a docs page: fixed nav with anchor links plus one section per topic.","Pass all automated tests, then submit. Project 3 of 5 for the Responsive Web Design certification."]',
   '<h1>Docs</h1>
<p>How the thing works.</p>
',
   '[{"label":"A nav with anchor links","pattern":"<nav[^>]*>[\\s\\S]*<a[^>]*href\\s*=\\s*\"#[^\"]+\"[^>]*>[\\s\\S]*</nav>","hint":"Add <nav><a href=\"#intro\">Intro</a></nav>."},{"label":"At least two content sections","pattern":"<section[\\s\\S]*<section","hint":"Add two <section> blocks with headings."},{"label":"A responsive media query","pattern":"@media[^{]*\\{","hint":"Add @media (max-width: 600px) { … }."}]',
   50),
  ('rwd-portfolio', 'rwd', 4, 'Personal Portfolio', '["HTML5","CSS3","Flexbox","CSS Grid"]',
   '["Build your portfolio: hero heading, project grid, and a contact link.","Pass all automated tests, then submit. Project 4 of 5 for the Responsive Web Design certification."]',
   '<h1>My Portfolio</h1>
<p>Projects I built.</p>
',
   '[{"label":"A projects section with links","pattern":"<section[^>]*>[\\s\\S]*<a[^>]*href[^>]*>[\\s\\S]*</section>","hint":"Add <section><a href=\"#p1\">Project 1</a></section>."},{"label":"Flexbox or grid layout","pattern":"display\\s*:\\s*(flex|grid)","hint":"Style the grid: .grid { display: grid; }."},{"label":"A contact link","pattern":"<a[^>]*href\\s*=\\s*\"(mailto:|#contact)[^\"]*\"[^>]*>","hint":"Add <a href=\"mailto:me@mail.com\">Contact</a>."}]',
   50),
  ('rwd-product-landing', 'rwd', 5, 'Product Landing Page', '["HTML5","CSS3","Flexbox","Media Queries"]',
   '["Build a product landing page: headline, feature list, signup form, and responsive layout.","Pass all automated tests, then submit. Project 5 of 5 — finish this to earn the certification."]',
   '<h1>Our Product</h1>
<p>It solves everything.</p>
',
   '[{"label":"A headline naming the product","pattern":"<h1>[^<]+</h1>","hint":"Add one <h1>Product Name</h1>."},{"label":"A feature list","pattern":"<(ul|ol)>[\\s\\S]*<li>[^<]+</li>[\\s\\S]*</(ul|ol)>","hint":"Add <ul><li>Fast</li></ul>."},{"label":"An email signup form","pattern":"<form[^>]*>[\\s\\S]*<input[^>]*type\\s*=\\s*\"email\"[^>]*>[\\s\\S]*</form>","hint":"Add a form with <input type=\"email\">."},{"label":"Responsive + flexible layout","pattern":"@media[^{]*\\{|display\\s*:\\s*(flex|grid)","hint":"Add flex/grid plus one @media query."}]',
   50),
  ('js-palindrome', 'js', 1, 'Palindrome Checker', '["Variables","Loops","RegEx"]',
   '["Write a palindrome checker: strip non-alphanumerics, reverse, compare. Logic lives in the JS tab.","Pass all automated tests, then submit. Project 1 of 5 for the JavaScript certification."]',
   '<h1>Palindrome Checker</h1>
<p>Type a word to test.</p>
',
   '[{"label":"A result element for output","pattern":"<(p|div)[^>]*id\\s*=\\s*\"result\"[^>]*>","hint":"Add <p id=\"result\"></p> for the verdict."},{"label":"Normalization with regex","pattern":"/[^/]+/[a-z]*\\.?(replace|test|match)","hint":"Use .replace(/[^a-z0-9]/gi, \"\") to clean input."},{"label":"A reversal or loop comparison","pattern":"(split\\s*\\(\\s*\"\"\\s*\\)\\.reverse|for\\s*\\(|while\\s*\\()","hint":"Reverse with split(\"\").reverse() or compare in a loop."}]',
   50),
  ('js-roman-numeral', 'js', 2, 'Roman Numeral Converter', '["Variables","Loops","Functional Programming"]',
   '["Write a converter: given 1–3999, emit the Roman numeral using a value map.","Pass all automated tests, then submit. Project 2 of 5 for the JavaScript certification."]',
   '<h1>Roman Numerals</h1>
<p>Enter a number.</p>
',
   '[{"label":"A numeral value map","pattern":"(1000|\\bM\\b[\\s\\S]*\\bCM\\b|[\\{\\[][^\\]]*1000)","hint":"Define a map/table including 1000→M, 900→CM, 500→D, 100→C, 90→XC, 50→L, 40→XL, 10→X, 9→IX, 5→V, 4→IV, 1→I."},{"label":"A conversion loop","pattern":"(for\\s*\\(|while\\s*\\(|\\.map\\s*\\(|\\.reduce\\s*\\()","hint":"Loop over the map subtracting values."},{"label":"Output wired to the page","pattern":"(getElementById|querySelector|textContent|innerText)","hint":"Write the result with textContent or getElementById."}]',
   50),
  ('js-cash-register', 'js', 3, 'Cash Register Game', '["OOP","Functional Programming","DOM Manipulation"]',
   '["Build a cash register: given price, cash, and drawer, return change and status (OPEN/CLOSED/INSUFFICIENT_FUNDS).","Pass all automated tests, then submit. Project 3 of 5 for the JavaScript certification."]',
   '<h1>Cash Register</h1>
<p>Enter payment details.</p>
',
   '[{"label":"Drawer state as data","pattern":"(cid|drawer)\\s*(=|:\\s*\\[)","hint":"Model the drawer: const cid = [[\"PENNY\", 1.01], …]."},{"label":"Status logic for all three cases","pattern":"(INSUFFICIENT_FUNDS[\\s\\S]*CLOSED[\\s\\S]*OPEN|OPEN[\\s\\S]*CLOSED[\\s\\S]*INSUFFICIENT_FUNDS)","hint":"Handle OPEN, CLOSED, and INSUFFICIENT_FUNDS statuses."},{"label":"Change rendered to the DOM","pattern":"(getElementById|querySelector|textContent|innerHTML)","hint":"Render the change breakdown on the page."}]',
   50),
  ('js-caesars-cipher', 'js', 4, 'Caesars Cipher', '["Loops","RegEx","Functional Programming"]',
   '["Write a ROT13 decoder: shift every letter 13 places, leaving symbols untouched.","Pass all automated tests, then submit. Project 4 of 5 for the JavaScript certification."]',
   '<h1>ROT13 Decoder</h1>
<p>Paste a secret message.</p>
',
   '[{"label":"Character-code shifting","pattern":"(charCodeAt|fromCharCode)","hint":"Shift letters with charCodeAt / fromCharCode."},{"label":"Regex guards letters only","pattern":"/\\[A-Z","hint":"Test /[A-Z]/ before shifting so symbols survive."},{"label":"A decode function","pattern":"function\\s+\\w*(rot|decod|cipher|shift)\\w*|const\\s+\\w*(rot|decod|cipher)\\w*\\s*=","hint":"Define a rot13/decode function."}]',
   50),
  ('js-telephone-validator', 'js', 5, 'Telephone Validator', '["RegEx","DOM Manipulation"]',
   '["Write a US phone validator accepting the standard formats and rejecting the rest.","Pass all automated tests, then submit. Project 5 of 5 — finish this to earn the certification."]',
   '<h1>Phone Validator</h1>
<p>Enter a US number.</p>
',
   '[{"label":"A validation regex","pattern":"/[^/]*\\\\d[^/]*/","hint":"Write a regex matching US formats like 555-555-5555 and (555) 555-5555."},{"label":"Boolean verdict logic","pattern":"(test\\s*\\(|\\.match\\s*\\(|true[\\s\\S]*false|false[\\s\\S]*true)","hint":"Return true/false via .test() or .match()."},{"label":"Verdict shown on the page","pattern":"(getElementById|querySelector|textContent|innerText)","hint":"Show valid/invalid with textContent."}]',
   50),
  ('fed-quote-machine', 'fed', 1, 'Random Quote Machine', '["React","Bootstrap","jQuery"]',
   '["Build a quote machine: new-quote button, author display, tweet link. React via CDN or vanilla with component structure.","Pass all automated tests, then submit. Project 1 of 5 for the Front End Libraries certification."]',
   '<h1>Quotes</h1>
<p>Wisdom on demand.</p>
',
   '[{"label":"A quote display element","pattern":"id\\s*=\\s*\"text\"","hint":"Add id=\"text\" to the quote element."},{"label":"An author element","pattern":"id\\s*=\\s*\"author\"","hint":"Add id=\"author\" for the author."},{"label":"A new-quote control","pattern":"id\\s*=\\s*\"new-quote\"","hint":"Add id=\"new-quote\" to the button."},{"label":"A tweet link","pattern":"id\\s*=\\s*\"tweet-quote\"","hint":"Add id=\"tweet-quote\" linking to the tweet intent."}]',
   60),
  ('fed-markdown-previewer', 'fed', 2, 'Markdown Previewer', '["React","Redux","Sass"]',
   '["Build a live Markdown previewer: editor textarea renders formatted output instantly.","Pass all automated tests, then submit. Project 2 of 5 for the Front End Libraries certification."]',
   '<h1>Markdown</h1>
<p>Write on the left, read on the right.</p>
',
   '[{"label":"An editor textarea","pattern":"id\\s*=\\s*\"editor\"","hint":"Add <textarea id=\"editor\">."},{"label":"A preview pane","pattern":"id\\s*=\\s*\"preview\"","hint":"Add <div id=\"preview\">."},{"label":"Live rendering wired up","pattern":"(oninput|onchange|addEventListener|useState|marked|DOMPurify)","hint":"Re-render preview on input (marked/DOMPurify or own parser)."}]',
   60),
  ('fed-drum-machine', 'fed', 3, 'Drum Machine', '["React","Redux","Bootstrap"]',
   '["Build a drum machine: 9 pads (QWE/ASD/ZXC), keyboard triggers, display names the hit.","Pass all automated tests, then submit. Project 3 of 5 for the Front End Libraries certification."]',
   '<h1>Drums</h1>
<p>Hit the pads.</p>
',
   '[{"label":"A drum-machine container","pattern":"id\\s*=\\s*\"drum-machine\"","hint":"Add id=\"drum-machine\" wrapper."},{"label":"A display element","pattern":"id\\s*=\\s*\"display\"","hint":"Add id=\"display\" showing the last hit."},{"label":"Nine pads with clips","pattern":"class\\s*=\\s*\"[^\"]*drum-pad[^\"]*\"","hint":"Add 9 .drum-pad elements each wrapping an <audio>."},{"label":"Keyboard triggering","pattern":"(keydown|keyCode|key\\s*===|onKey)","hint":"Play the clip on keydown for Q/W/E/A/S/D/Z/X/C."}]',
   60),
  ('fed-calculator', 'fed', 4, 'JavaScript Calculator', '["React","Redux","Sass"]',
   '["Build a calculator: digit/operator buttons, chained operations, clear, decimal handling.","Pass all automated tests, then submit. Project 4 of 5 for the Front End Libraries certification."]',
   '<h1>Calculator</h1>
<p>Do the math.</p>
',
   '[{"label":"A display element","pattern":"id\\s*=\\s*\"display\"","hint":"Add id=\"display\" defaulting to 0."},{"label":"Digit + operator buttons","pattern":"id\\s*=\\s*\"(zero|one|add|subtract|multiply|divide|equals|clear)\"","hint":"Add buttons with fCC ids (zero…nine, add, subtract, multiply, divide, equals, clear, decimal)."},{"label":"Expression evaluation","pattern":"(eval\\s*\\(|Function\\s*\\(|parseFloat|Number\\s*\\()","hint":"Evaluate the expression chain on equals."}]',
   60),
  ('fed-pomodoro-clock', 'fed', 5, '25 + 5 Clock', '["React","Redux","jQuery"]',
   '["Build a Pomodoro clock: adjustable session/break lengths, countdown, session↔break switching, beep at zero.","Pass all automated tests, then submit. Project 5 of 5 — finish this to earn the certification."]',
   '<h1>Focus Clock</h1>
<p>Work in sprints.</p>
',
   '[{"label":"Break and session controls","pattern":"id\\s*=\\s*\"break-(increment|decrement)\"[\\s\\S]*id\\s*=\\s*\"session-(increment|decrement)\"","hint":"Add break/session length controls with those ids."},{"label":"A time-left display","pattern":"id\\s*=\\s*\"time-left\"","hint":"Add id=\"time-left\" in mm:ss."},{"label":"Start/stop + reset","pattern":"id\\s*=\\s*\"start_stop\"[\\s\\S]*id\\s*=\\s*\"reset\"","hint":"Add start_stop and reset controls."},{"label":"A beep at zero","pattern":"id\\s*=\\s*\"beep\"|<audio","hint":"Add <audio id=\"beep\"> played at 00:00."}]',
   60),
  ('db-celestial-bodies', 'db', 1, 'Celestial Body Database', '["Bash","PostgreSQL","Git"]',
   '["Design a universe database in PostgreSQL: galaxy → star → planet → moon with proper keys.","Script it in the editor (SQL in a comment block is fine). Project 1 of 5 for the Relational Databases certification."]',
   '<h1>Celestial Bodies</h1>
<!-- Write your schema here:
CREATE TABLE galaxy(...);
-->
',
   '[{"label":"CREATE TABLE statements","pattern":"CREATE\\s+TABLE","hint":"Write CREATE TABLE for galaxy, star, planet, moon."},{"label":"Primary keys declared","pattern":"PRIMARY\\s+KEY","hint":"Give every table a PRIMARY KEY."},{"label":"Foreign keys link the bodies","pattern":"REFERENCES","hint":"Link star→galaxy, planet→star, moon→planet with REFERENCES."}]',
   60),
  ('db-mario-database', 'db', 2, 'Mario Database', '["Bash","PostgreSQL","SQL"]',
   '["Query the Mario database: joins across characters, actions, and sounds to answer questions.","Script your queries in the editor. Project 2 of 5 for the Relational Databases certification."]',
   '<h1>Mario DB</h1>
<!-- SELECT * FROM characters; -->
',
   '[{"label":"SELECT queries present","pattern":"SELECT[\\s\\S]+FROM","hint":"Write SELECT … FROM queries."},{"label":"A JOIN across tables","pattern":"JOIN","hint":"Join characters to actions or sounds with JOIN … ON."},{"label":"Filtered + ordered results","pattern":"(WHERE[\\s\\S]*ORDER\\s+BY|ORDER\\s+BY[\\s\\S]*WHERE)","hint":"Filter with WHERE and sort with ORDER BY."}]',
   60),
  ('db-bike-shop', 'db', 3, 'Bike Rental Shop', '["Bash","PostgreSQL","Git","SQL"]',
   '["Script the bike shop: interactive Bash + SQL for renting, returning, and availability.","Script it in the editor. Project 3 of 5 for the Relational Databases certification."]',
   '<h1>Bike Shop</h1>
<!-- #!/bin/bash
PSQL="psql ..."; -->
',
   '[{"label":"A psql query wrapper","pattern":"(PSQL|psql)","hint":"Define PSQL=\"psql -X --username=… --dbname=bikes … -t --no-align -c\"."},{"label":"Rental UPDATE logic","pattern":"UPDATE[\\s\\S]+SET","hint":"UPDATE rentals/bikes when a bike goes out."},{"label":"Availability SELECT","pattern":"SELECT[\\s\\S]+WHERE[\\s\\S]+available","hint":"SELECT available bikes with WHERE available = TRUE."}]',
   60),
  ('db-salon-scheduler', 'db', 4, 'Salon Appointment Scheduler', '["Bash","PostgreSQL","SQL Injection defense"]',
   '["Script the salon scheduler: list services, book appointments, confirm by phone — injection-safe.","Script it in the editor. Project 4 of 5 for the Relational Databases certification."]',
   '<h1>Salon Scheduler</h1>
<!-- services table + booking flow -->
',
   '[{"label":"Services listed from the DB","pattern":"SELECT[\\s\\S]+FROM\\s+services","hint":"SELECT services to display the menu."},{"label":"Appointment INSERT","pattern":"INSERT\\s+INTO\\s+appointments","hint":"INSERT INTO appointments on booking."},{"label":"Phone lookup for customers","pattern":"SELECT[\\s\\S]+FROM\\s+customers[\\s\\S]+phone","hint":"Look up the customer by phone before inserting."}]',
   60),
  ('db-number-guessing', 'db', 5, 'Number Guessing Game', '["Bash","Linux CLI","PostgreSQL"]',
   '["Script the guessing game: random number, hint loop (higher/lower), persist best score per user.","Script it in the editor. Project 5 of 5 — finish this to earn the certification."]',
   '<h1>Guessing Game</h1>
<!-- SECRET=$(( RANDOM % 1000 + 1 )) -->
',
   '[{"label":"Random secret generation","pattern":"(RANDOM|\\$RANDOM)","hint":"Generate SECRET with $RANDOM."},{"label":"Higher/lower hint loop","pattern":"(higher|lower)[\\s\\S]*(while|until|if)|((while|until)[\\s\\S]*(higher|lower))","hint":"Loop with higher/lower hints until guessed."},{"label":"Score persisted to Postgres","pattern":"(INSERT\\s+INTO|UPDATE)[\\s\\S]*(users|games)","hint":"INSERT/UPDATE the user score in Postgres."}]',
   60),
  ('be-timestamp', 'be', 1, 'Timestamp Microservice', '["Node.js","Express","npm"]',
   '["Build a timestamp API: GET /api/:date? returns { unix, utc } for ISO dates, millis, or empty (now).","Code it in the editor (JS tab). Project 1 of 5 for the Back End certification."]',
   '<h1>Timestamp API</h1>
<!-- app.get("/api/:date?", ...) -->
',
   '[{"label":"Express date route","pattern":"(app\\.get|router\\.get)[\\s\\S]*:?date","hint":"Add app.get(\"/api/:date?\", …)."},{"label":"Unix + UTC response","pattern":"(unix[\\s\\S]*utc|utc[\\s\\S]*unix)","hint":"Respond with { unix, utc }."},{"label":"Invalid-date handling","pattern":"(Invalid\\s+Date[\\s\\S]*error|error[\\s\\S]*Invalid\\s+Date)","hint":"Return { error: \"Invalid Date\" } for bad input."}]',
   60),
  ('be-url-shortener', 'be', 2, 'URL Shortener Microservice', '["Node.js","Express","MongoDB","Mongoose"]',
   '["Build a URL shortener: POST a URL, get an id back; GET /api/shorturl/:id redirects.","Code it in the editor. Project 2 of 5 for the Back End certification."]',
   '<h1>URL Shortener</h1>
<!-- mongoose model { original_url, short_url } -->
',
   '[{"label":"URL validation","pattern":"(dns\\.lookup|isURL|valid-url|http)","hint":"Validate the posted URL (dns.lookup or URL parse)."},{"label":"Short URL stored + returned","pattern":"(short_url|shorturl)[\\s\\S]*(save|create|insert)","hint":"Persist { original_url, short_url } with Mongoose."},{"label":"Redirect endpoint","pattern":"(res\\.redirect|302|301)","hint":"GET /api/shorturl/:id must res.redirect() to the original."}]',
   60),
  ('be-exercise-tracker', 'be', 3, 'Exercise Tracker', '["Node.js","Express","MongoDB","Mongoose"]',
   '["Build an exercise tracker: users, dated exercises, filtered logs (?from&to&limit).","Code it in the editor. Project 3 of 5 for the Back End certification."]',
   '<h1>Exercise Tracker</h1>
<!-- User + Exercise models -->
',
   '[{"label":"User creation endpoint","pattern":"(/api/users|User\\.create|new\\s+User)","hint":"POST /api/users creates a user."},{"label":"Exercise logging with date","pattern":"(/api/users/:.*\\/exercises|description[\\s\\S]*duration[\\s\\S]*date)","hint":"POST exercises with description, duration, date."},{"label":"Filtered log query","pattern":"(from|to|limit)[\\s\\S]*(find|filter|slice)","hint":"GET logs supports ?from & ?to & ?limit."}]',
   60),
  ('be-file-metadata', 'be', 4, 'File Metadata Microservice', '["Node.js","Express","npm"]',
   '["Build a file analyser: upload a file, get back { name, type, size }.","Code it in the editor. Project 4 of 5 for the Back End certification."]',
   '<h1>File Metadata</h1>
<!-- multer single("upfile") -->
',
   '[{"label":"Multipart upload middleware","pattern":"(multer|formidable|busboy|\\.single\\s*\\()","hint":"Handle uploads with multer single(\"upfile\")."},{"label":"File analysis endpoint","pattern":"(/api/fileanalyse|fileanalyse)","hint":"POST /api/fileanalyse processes the file."},{"label":"Name/type/size response","pattern":"(originalname|mimetype|size)[\\s\\S]*(originalname|mimetype|size)[\\s\\S]*(originalname|mimetype|size)","hint":"Respond with name, type, and size."}]',
   60),
  ('be-header-parser', 'be', 5, 'Request Header Parser', '["Node.js","Express"]',
   '["Build a whoami API: GET /api/whoami returns { ipaddress, language, software }.","Code it in the editor. Project 5 of 5 — finish this to earn the certification."]',
   '<h1>Whoami API</h1>
<!-- req.ip, req.headers ... -->
',
   '[{"label":"Whoami route","pattern":"(/api/whoami|whoami)","hint":"Add GET /api/whoami."},{"label":"IP + language extracted","pattern":"(ip[\\s\\S]*language|language[\\s\\S]*ip)","hint":"Read IP and accept-language from the request."},{"label":"Software (user-agent) extracted","pattern":"(user-agent|userAgent|getHeader\\s*\\(\\s*[\"\\x27]user)","hint":"Read the user-agent software string."}]',
   60),
  ('py-budget-app', 'py', 1, 'Budget App', '["Python","OOP"]',
   '["Write a Category ledger class: deposit, withdraw, transfer, plus a spend-chart function.","Code it in the editor. Project 1 of 5 for the Data Analysis certification."]',
   '<h1>Budget App</h1>
<!-- class Category: ... -->
',
   '[{"label":"A Category class with ledger","pattern":"class\\s+Category[\\s\\S]*ledger","hint":"Define class Category with a ledger list."},{"label":"Deposit/withdraw methods","pattern":"(def\\s+deposit[\\s\\S]*def\\s+withdraw|def\\s+withdraw[\\s\\S]*def\\s+deposit)","hint":"Implement deposit() and withdraw() (withdraw returns False when overdrawn)."},{"label":"A spend chart function","pattern":"def\\s+create_spend_chart","hint":"Implement create_spend_chart(categories) with o-bars by percent."}]',
   60),
  ('py-polygon-calculator', 'py', 2, 'Polygon Area Calculator', '["Python","OOP"]',
   '["Write Rectangle/Square classes: area, perimeter, diagonal, picture, amount-inside.","Code it in the editor. Project 2 of 5 for the Data Analysis certification."]',
   '<h1>Shapes</h1>
<!-- class Rectangle ... class Square(Rectangle) -->
',
   '[{"label":"Rectangle + Square classes","pattern":"(class\\s+Rectangle[\\s\\S]*class\\s+Square|class\\s+Square[\\s\\S]*class\\s+Rectangle)","hint":"Define Rectangle and Square (Square extends Rectangle)."},{"label":"Area/perimeter/diagonal","pattern":"(def\\s+get_area[\\s\\S]*def\\s+get_perimeter|def\\s+get_diagonal)","hint":"Implement get_area, get_perimeter, get_diagonal."},{"label":"Picture + containment","pattern":"(def\\s+get_picture[\\s\\S]*def\\s+get_amount_inside|def\\s+get_amount_inside[\\s\\S]*def\\s+get_picture)","hint":"Implement get_picture() and get_amount_inside()."}]',
   60),
  ('py-demographic-analyzer', 'py', 3, 'Demographic Data Analyzer', '["Python","Pandas","NumPy"]',
   '["Analyze the census CSV with Pandas: race counts, average age by sex/education, top occupations and countries.","Code it in the editor. Project 3 of 5 for the Data Analysis certification."]',
   '<h1>Demographics</h1>
<!-- import pandas as pd -->
',
   '[{"label":"Pandas loaded the dataset","pattern":"(import\\s+pandas|read_csv)","hint":"Load the CSV with pandas read_csv."},{"label":"Grouped aggregations","pattern":"(groupby|mean\\s*\\(|value_counts)","hint":"Aggregate with groupby/mean/value_counts."},{"label":"Key questions answered","pattern":"(race[\\s\\S]*(count|represent)|bachelor|higher-educ|rich|occupation|country)","hint":"Answer race counts, education income %, top occupations/countries."}]',
   60),
  ('py-time-calculator', 'py', 4, 'Time Calculator', '["Python"]',
   '["Write add_time(): given start, duration, and optional weekday, return the new time with day rollover.","Code it in the editor. Project 4 of 5 for the Data Analysis certification."]',
   '<h1>Time Calculator</h1>
<!-- def add_time(start, duration, day=None): -->
',
   '[{"label":"An add_time function","pattern":"def\\s+add_time","hint":"Define def add_time(start, duration, day=None)."},{"label":"AM/PM flipping handled","pattern":"(AM|PM)[\\s\\S]*(AM|PM)","hint":"Flip AM/PM correctly across 12-hour boundaries."},{"label":"Day rollover reported","pattern":"(next\\s+day|\\d+\\s+days?\\s+later|weekday|day\\s+of\\s+week)","hint":"Report (next day) / (N days later) and the weekday."}]',
   60),
  ('py-arithmetic-formatter', 'py', 5, 'Arithmetic Formatter', '["Python"]',
   '["Write arithmetic_arranger(): vertically format addition/subtraction problems, optionally with answers.","Code it in the editor. Project 5 of 5 — finish this to earn the certification."]',
   '<h1>Formatter</h1>
<!-- def arithmetic_arranger(problems, show_answers=False): -->
',
   '[{"label":"An arranger function","pattern":"def\\s+arithmetic_arranger","hint":"Define def arithmetic_arranger(problems, show_answers=False)."},{"label":"Validation with error strings","pattern":"(Error[\\s\\S]*Too\\s+many|Too\\s+many[\\s\\S]*Error|must\\s+not|can\\s+only)","hint":"Return Error: strings for bad input (too many, bad operator, non-digits, >4 digits)."},{"label":"Vertical alignment logic","pattern":"(rjust|ljust|center|\\.format|f[\"\\x27])","hint":"Right-align operands above dashes with 4-space gaps."}]',
   60),
  ('sec-stock-checker', 'secml', 1, 'Stock Price Checker', '["HelmetJS","Node.js","Express"]',
   '["Build a stock checker with like-voting: Helmet-secured, deduped likes per IP, relative likes for pairs.","Code it in the editor. Project 1 of 5 for the Security & ML certification."]',
   '<h1>Stock Checker</h1>
<!-- helmet + /api/stock-prices -->
',
   '[{"label":"Helmet security headers","pattern":"(helmet|contentSecurityPolicy|frameguard)","hint":"Lock down headers with Helmet."},{"label":"Stock price endpoint with likes","pattern":"(/api/stock-prices|stock[\\s\\S]*like)","hint":"GET prices with like support."},{"label":"IP-deduped likes","pattern":"(ip[\\s\\S]*like|like[\\s\\S]*ip|findOneAndUpdate|\\$addToSet)","hint":"Count one like per IP (relative_likes for two-stock queries)."}]',
   70),
  ('sec-anon-board', 'secml', 2, 'Anonymous Message Board', '["HelmetJS","MongoDB","Node.js"]',
   '["Build an anonymous board: threads + replies with report/delete (password-gated), 10-thread bump-sorted feed.","Code it in the editor. Project 2 of 5 for the Security & ML certification."]',
   '<h1>Anon Board</h1>
<!-- /api/threads/:board /api/replies/:board -->
',
   '[{"label":"Thread + reply routes","pattern":"(/api/threads[\\s\\S]*/api/replies|/api/replies[\\s\\S]*/api/threads)","hint":"Implement thread and reply endpoints."},{"label":"Report + password delete","pattern":"(reported[\\s\\S]*delete_password|delete_password[\\s\\S]*reported|findOneAnd(Update|Delete))","hint":"Support reporting and password-checked deletes."},{"label":"Bump-sorted thread feed","pattern":"(bumped_on|sort[\\s\\S]*-?bumped|limit\\s*\\(\\s*10)","hint":"Return 10 threads sorted by bumped_on."}]',
   70),
  ('sec-issue-tracker', 'secml', 3, 'Issue Tracker', '["Node.js","Express","MongoDB"]',
   '["Build an issue tracker: full CRUD per project with filters, PUT auto-updates updated_on.","Code it in the editor. Project 3 of 5 for the Security & ML certification."]',
   '<h1>Issue Tracker</h1>
<!-- /api/issues/:project CRUD -->
',
   '[{"label":"Full CRUD routes","pattern":"(\\.get[\\s\\S]*\\.post[\\s\\S]*\\.put[\\s\\S]*\\.delete|route[\\s\\S]*get[\\s\\S]*post)","hint":"Implement GET/POST/PUT/DELETE on /api/issues/:project."},{"label":"Filterable GET","pattern":"(req\\.query|find\\s*\\([^)]*req)","hint":"Filter GET by query params."},{"label":"Timestamps maintained","pattern":"(created_on|updated_on)","hint":"Track created_on and updated_on per issue."}]',
   70),
  ('ml-linear-regression', 'secml', 4, 'Linear Regression Model', '["TensorFlow","Neural Networks"]',
   '["Train a regression model (TensorFlow): predict the target from features, report MAE under the bar.","Script it in the editor (Python/TF or JS equivalent). Project 4 of 5 for the Security & ML certification."]',
   '<h1>Regression</h1>
<!-- import tensorflow as tf -->
',
   '[{"label":"A sequential/dense model","pattern":"(Sequential|Dense|LinearRegression|fit\\s*\\()","hint":"Build and fit a regression model."},{"label":"Train/validation split","pattern":"(train_test_split|validation_split|train[\\s\\S]*test)","hint":"Split data into train and validation sets."},{"label":"Error metric reported","pattern":"(mae|mse|mean_squared_error|mean_absolute_error|score)","hint":"Report MAE/MSE on held-out data."}]',
   70),
  ('ml-spam-classifier', 'secml', 5, 'Spam Text Classifier', '["TensorFlow","Neural Networks"]',
   '["Train a text classifier: tokenize messages, embed, classify ham vs spam with held-out accuracy.","Script it in the editor. Project 5 of 5 — finish this to earn the certification."]',
   '<h1>Spam Classifier</h1>
<!-- Tokenizer + embedding model -->
',
   '[{"label":"Text tokenization","pattern":"(Tokenizer|CountVectorizer|Tfidf|pad_sequences|fit_on_texts)","hint":"Tokenize and pad the message corpus."},{"label":"Embedding + dense head","pattern":"(Embedding[\\s\\S]*Dense|Dense[\\s\\S]*sigmoid|softmax)","hint":"Build an embedding + Dense(sigmoid) classifier."},{"label":"Accuracy evaluated","pattern":"(accuracy|evaluate|classification_report)","hint":"Evaluate accuracy on held-out messages."}]',
   70)
on conflict (id) do update set
  track_id = excluded.track_id, position = excluded.position, title = excluded.title,
  skills = excluded.skills, brief = excluded.brief, starter_code = excluded.starter_code,
  stories = excluded.stories, xp = excluded.xp;
