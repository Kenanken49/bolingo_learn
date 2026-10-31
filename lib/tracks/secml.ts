/**
 * Track SECML · Information Security & Machine Learning — leveled banks.
 * Syllabus order: secure headers first, then auth and password-gated
 * actions, full CRUD hardening, ML foundations with TensorFlow, and text
 * classification last. All original.
 */

import { MCQ, BUILD, CODE, TEXT, type CourseLesson } from '../quizBank';

export const TRACK_SECML: Record<string, CourseLesson> = {
  'sec-http-helmet': {
    id: 'sec-http-helmet',
    title: 'Headers and Helmet',
    theory: [
      'HTTP headers instruct browsers: Helmet sets secure defaults (contentSecurityPolicy, frameguard) so your stock-price API ships hardened. Likes are deduped per IP — one person, one vote.',
      'Two-stock queries report relative_likes (the difference), so comparisons stay fair even when both stocks are popular.',
    ],
    questions: [
      MCQ(
        'What does Helmet\u2019s frameguard protect against?',
        'Clickjacking — your pages cannot be invisibly framed by attackers',
        [
          'Clickjacking — your pages cannot be invisibly framed by attackers',
          'Slow database queries timing out',
          'Users liking the same stock twice',
          'Typos in API endpoint names',
        ],
        'Deny framing and the classic invisible-overlay theft dies with it.'
      ),
      BUILD(
        'Lock down Express responses with Helmet defaults',
        ['app.use(helmet());'],
        ['app.use(helmet());', 'helmet.use(', 'secure()', 'app.lock'],
        'One middleware call sets the whole secure-header baseline.'
      ),
      MCQ(
        'Why dedupe likes by IP instead of trusting the button?',
        'Buttons can be clicked forever — IPs approximate one person',
        [
          'Buttons can be clicked forever — IPs approximate one person',
          'IPs load pages faster than buttons do',
          'Buttons cannot reach the database directly',
          'IP addresses are secret and unguessable',
        ],
        'Count one like per IP: findOneAndUpdate or $addToSet enforces it.'
      ),
      MCQ(
        'Stock A has 5 likes, stock B has 3. What is the relative_likes view?',
        'A: +2 and B: -2 — the signed difference, not raw totals',
        [
          'A: +2 and B: -2 — the signed difference, not raw totals',
          'Both show 8 — likes are pooled together',
          'Both show 0 — differences cancel permanently',
          'A shows 5/5 and B shows 3/5 as fractions',
        ],
        'Relative means comparative: difference with a sign per side.'
      ),
      BUILD(
        'Fetch the price endpoint for a requested stock symbol',
        ['fetch(`/api/stock-prices?stock=${symbol}`)'],
        ['fetch(`/api/stock-prices?stock=${symbol}`)', 'GET /prices', 'axios.all', 'stock()'],
        'Symbol as a query param; price and like state come back together.'
      ),
    ],
  },

  'sec-auth-passwords': {
    id: 'sec-auth-passwords',
    title: 'Identity and password-gated actions',
    theory: [
      'The anonymous board is public to read but gated to change: reporting a thread flags it, deleting needs the delete_password set at creation. Ten threads return sorted by bumped_on.',
      'Passwords are checked, never displayed — wrong password means no delete, no hint about the right one.',
    ],
    questions: [
      MCQ(
        'Why require a password to delete but nothing to read?',
        'Reading is harmless; destruction must prove ownership',
        [
          'Reading is harmless; destruction must prove ownership',
          'Passwords slow down page loading nicely',
          'Anonymous boards cannot store passwords at all',
          'Reading requires a faster internet connection',
        ],
        'Capability matches consequence: view freely, destroy with proof.'
      ),
      BUILD(
        'Mark a thread reported without deleting it',
        ['findOneAndUpdate(id,', '{', 'reported:', 'true', '})'],
        ['findOneAndUpdate(id,', '{', 'reported:', 'true', '})', 'deleteOne', 'remove(', 'reported ='],
        'Report flips a flag; the documented text stays for moderators.'
      ),
      MCQ(
        'What does sorting the feed by bumped_on achieve?',
        'Freshly replied threads float to the top automatically',
        [
          'Freshly replied threads float to the top automatically',
          'Old threads are deleted one by one',
          'Threads sort alphabetically by author',
          'Reported threads always appear first',
        ],
        'Every reply bumps the timestamp; sorting rides it. Limit 10.'
      ),
      MCQ(
        'A delete arrives with the wrong password. What must the API do?',
        'Refuse, without revealing anything about the correct one',
        [
          'Refuse, without revealing anything about the correct one',
          'Delete anyway — the user tried their best',
          'Return the correct password as a hint',
          'Lock the entire board for one hour',
        ],
        'Incorrect password: "incorrect password", no delete, no leaks.'
      ),
      BUILD(
        'Remove a reply only when its password matches',
        ['if', '(password', '===', 'stored)', 'deleteOne();'],
        ['if', '(password', '===', 'stored)', 'deleteOne();', 'drop()', 'removeAll'],
        'Compare first, destroy second — never the reverse.'
      ),
    ],
  },

  'sec-crud-safety': {
    id: 'sec-crud-safety',
    title: 'Hardened CRUD and audit trails',
    theory: [
      'The issue tracker runs full CRUD on /api/issues/:project: GET filters by query params, POST creates with created_on, PUT refreshes updated_on, DELETE removes by id.',
      'Every write is validated and every read is filterable — the audit trail (who changed what, when) is what makes CRUD production-grade.',
    ],
    questions: [
      MCQ(
        'GET with ?open=true&assigned=ana returns what?',
        'Issues matching ALL supplied filters at once',
        [
          'Issues matching ALL supplied filters at once',
          'Issues matching ANY one filter is enough',
          'All issues — filters are suggestions only',
          'Only the filter names, not the issues',
        ],
        'Query filters combine with AND: each param narrows further.'
      ),
      BUILD(
        'Find issues by combining the project with query filters',
        ['Issue.find({', 'project,', '...req.query', '})'],
        ['Issue.find({', 'project,', '...req.query', '})', '.all()', 'findById', 'whereAny'],
        'Spread the query into the finder — every param becomes a condition.'
      ),
      MCQ(
        'Why do PUT and POST both validate required fields?',
        'Invalid writes corrupt every future read that trusts the shape',
        [
          'Invalid writes corrupt every future read that trusts the shape',
          'Validation makes responses arrive faster',
          'MongoDB rejects all strings without validation',
          'Required fields are encrypted automatically',
        ],
        'Missing title or text must fail loudly with "required field(s) missing".'
      ),
      MCQ(
        'A DELETE succeeds. What should the response confirm?',
        'A deleted confirmation plus the removed id',
        [
          'A deleted confirmation plus the removed id',
          'The full contents of every remaining issue',
          'A new issue created to replace it',
          'Nothing — successful deletes stay silent',
        ],
        '"successfully deleted" plus _id: the client can drop it from view.'
      ),
      BUILD(
        'Stamp every update with the current time',
        ['doc.updated_on', '=', 'new', 'Date();'],
        ['doc.updated_on', '=', 'new', 'Date();', 'created_on', 'now()', 'Date'],
        'PUT refreshes updated_on; created_on never moves.'
      ),
    ],
  },

  'sec-ml-basics': {
    id: 'sec-ml-basics',
    title: 'Learning from data with TensorFlow',
    theory: [
      'A regression model learns mapping features to a number: build Sequential with Dense layers, fit on training data, hold out validation data, and report MAE/MSE.',
      'Train/validation split is the honesty mechanism — error on unseen data is the only score that counts.',
    ],
    questions: [
      MCQ(
        'What does model.fit actually do?',
        'Adjusts weights over epochs to reduce training error',
        [
          'Adjusts weights over epochs to reduce training error',
          'Checks whether the model file fits on disk',
          'Resizes input images to fit the screen',
          'Deletes layers that perform poorly',
        ],
        'Fit = learn: gradients nudge weights, loss falls, repeat.'
      ),
      BUILD(
        'Stack a dense hidden layer of 64 units with relu',
        ['Dense(64,', 'activation=\"relu\")'],
        ['Dense(64,', 'activation=\"relu\")', 'Flatten(', 'Dropout', 'Sequential'],
        'Dense connects everything; relu bends the line into curves.'
      ),
      MCQ(
        'Why hold out validation data the model never trains on?',
        'To measure whether it learned patterns or memorized rows',
        [
          'To measure whether it learned patterns or memorized rows',
          'To make training finish faster',
          'To double the size of the training set',
          'Validation data trains a second, better model',
        ],
        'Low training error plus high validation error means memorization.'
      ),
      MCQ(
        'MAE of 2.1 on house prices means what?',
        'Predictions miss by $2,100 on average (in $1k units)',
        [
          'Predictions miss by $2,100 on average (in $1k units)',
          '2.1% of predictions are exactly right',
          'The model trained for 2.1 epochs',
          '21 houses were predicted perfectly',
        ],
        'Mean Absolute Error speaks in the target\u2019s own units — average miss distance.'
      ),
      BUILD(
        'Evaluate the trained model on held-out features and labels',
        ['model.evaluate(X_test,', 'y_test)'],
        ['model.evaluate(X_test,', 'y_test)', '.fit(', '.predict(', 'score_test'],
        'evaluate reports loss and metrics on data the model never saw.'
      ),
    ],
  },

  'sec-nlp-classification': {
    id: 'sec-nlp-classification',
    title: 'Text classification for spam',
    theory: [
      'Spam filtering is classification: tokenize messages (Tokenizer, pad_sequences), embed tokens as vectors, pool through a Dense sigmoid head, and read accuracy on held-out messages.',
      'Embeddings turn words into meaning-geometry — "free money" and "claim prize" cluster far from normal mail.',
    ],
    questions: [
      MCQ(
        'What does tokenization do to "WIN cash now!!!"?',
        'Splits it into integer ids per word, then pads to equal length',
        [
          'Splits it into integer ids per word, then pads to equal length',
          'Translates it into three languages',
          'Deletes it as obvious spam immediately',
          'Encrypts it for safe storage',
        ],
        'fit_on_texts builds the vocabulary; pad_sequences equalizes lengths.'
      ),
      BUILD(
        'Convert raw texts to equal-length integer sequences',
        ['pad_sequences(tokenizer.texts_to_sequences(texts))'],
        ['pad_sequences(tokenizer.texts_to_sequences(texts))', '.split(', 'one_hot(', 'encode_texts'],
        'Texts to id lists, then padded — the model\u2019s fixed-size input.'
      ),
      MCQ(
        'Why does the final Dense layer use sigmoid for spam?',
        'It squeezes output into a 0–1 spam probability',
        [
          'It squeezes output into a 0–1 spam probability',
          'It makes training exactly twice as fast',
          'It doubles the vocabulary size automatically',
          'It translates predictions into English sentences',
        ],
        'Sigmoid answers "how spammy": near 1 spam, near 0 ham.'
      ),
      MCQ(
        'Accuracy is 98% but every spam lands in the inbox. What happened?',
        'Class imbalance — accuracy on mostly-ham hides total spam failure',
        [
          'Class imbalance — accuracy on mostly-ham hides total spam failure',
          'The model trained for too few milliseconds',
          'Sigmoid outputs cannot represent spam at all',
          'Tokenizers delete all spam words by design',
        ],
        'Check the confusion matrix: accuracy lies when classes are lopsided.'
      ),
      BUILD(
        'Report the classifier score on unseen messages',
        ['model.evaluate(X_test,', 'y_test)[1]'],
        ['model.evaluate(X_test,', 'y_test)[1]', '.fit(', '[0]', '.accuracy()'],
        'evaluate returns [loss, accuracy] — index 1 is the headline score.'
      ),
    ],
  },

  'sec-helmet-workshop': {
    id: 'sec-helmet-workshop',
    title: 'Lock headers step by step',
    theory: [
      'Workshop: set secure defaults, count fair votes.',
    ],
    questions: [
      BUILD(
        'Step 1 — apply Helmet defaults',
        ['app.use(helmet());'],
        ['app.use(helmet());', 'helmet.use(', 'secure()'],
        'One call sets the whole baseline.'
      ),
      BUILD(
        'Step 2 — fetch a stock price by symbol',
        ['fetch(`/api/stock-prices?stock=${symbol}`)'],
        ['fetch(`/api/stock-prices?stock=${symbol}`)', 'GET /prices', 'stock()'],
        'Symbol as query param.'
      ),
      MCQ(
        'A has 5 likes, B has 3. Relative view?',
        'A: +2 and B: −2 — signed difference',
        [
          'A: +2 and B: −2 — signed difference',
          'Both show 8 pooled',
          'Both show 0',
          'Fractions 5/5 and 3/5',
        ],
        'Relative means comparative.'
      ),
      MCQ(
        'Why dedupe likes by IP?',
        'Buttons click forever — IPs approximate one person',
        [
          'Buttons click forever — IPs approximate one person',
          'IPs load faster',
          'Buttons lack database access',
          'IPs are unguessable secrets',
        ],
        'One like per IP.'
      ),
    ],
  },

  'sec-auth-workshop': {
    id: 'sec-auth-workshop',
    title: 'Gate changes step by step',
    theory: [
      'Workshop: flag reports, check passwords, float fresh threads.',
    ],
    questions: [
      BUILD(
        'Step 1 — flag a thread reported',
        ['findOneAndUpdate(id,', '{', 'reported:', 'true', '})'],
        ['findOneAndUpdate(id,', '{', 'reported:', 'true', '})', 'deleteOne'],
        'Flip the flag; keep the text for moderators.'
      ),
      BUILD(
        'Step 2 — delete only on password match',
        ['if', '(password', '===', 'stored)', 'deleteOne();'],
        ['if', '(password', '===', 'stored)', 'deleteOne();', 'drop()'],
        'Compare first, destroy second.'
      ),
      MCQ(
        'Wrong password on delete. Response?',
        'Refuse — reveal nothing about the right one',
        [
          'Refuse — reveal nothing about the right one',
          'Delete anyway for effort',
          'Return the correct password',
          'Lock the board an hour',
        ],
        'Incorrect password, no leaks.'
      ),
      MCQ(
        'Why sort the feed by bumped_on?',
        'Fresh replies float up automatically',
        [
          'Fresh replies float up automatically',
          'Old threads delete themselves',
          'Alphabetical by author',
          'Reports always pin first',
        ],
        'Replies bump; sorting rides it.'
      ),
      CODE(
        'Write isStrongPassword(password): at least 12 characters, with an uppercase letter, a lowercase letter, a digit and a symbol. Return a boolean.',
        {
          language: 'js',
          starter: 'function isStrongPassword(password) {\n  // Return true only when every rule passes\n}\n',
          tests: [
            { id: 'strong', label: 'A long mixed password passes', run: "isStrongPassword('LongEnough1!') === true", hint: 'Check every rule with a separate test and combine with &&.' },
            { id: 'short', label: 'Eleven characters fail', run: "isStrongPassword('Short1!abcd') === false", hint: 'The length check comes before the character checks.' },
            { id: 'upper', label: 'A missing uppercase letter fails', run: "isStrongPassword('longenough1!') === false", hint: 'Use /[A-Z]/ for the uppercase rule.' },
            { id: 'digit', label: 'A missing digit fails', run: "isStrongPassword('LongEnough!!') === false", hint: 'Use /[0-9]/ for digits.' },
            { id: 'symbol', label: 'A missing symbol fails', run: "isStrongPassword('LongEnough11') === false", hint: 'A symbol is anything outside letters and digits: /[^A-Za-z0-9]/.' },
            { id: 'boolean', label: 'The result is always a boolean', run: "typeof isStrongPassword('x') === 'boolean'", hint: 'Return the combined boolean, never the matched string.' },
          ],
        },
        'function isStrongPassword(password) {\n  if (typeof password !== "string" || password.length < 12) return false;\n  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);\n}',
        'Password strength is a policy, not a feeling. Each rule is independent and testable; the length floor makes brute force expensive, and character classes widen the search space. In production, also hash with a slow KDF such as bcrypt or Argon2 — never store the plaintext.'
      ),
    ],
  },

  'sec-crud-workshop': {
    id: 'sec-crud-workshop',
    title: 'Audit writes step by step',
    theory: [
      'Workshop: filter reads, validate writes, stamp time.',
    ],
    questions: [
      BUILD(
        'Step 1 — find by project plus query',
        ['Issue.find({', 'project,', '...req.query', '})'],
        ['Issue.find({', 'project,', '...req.query', '})', '.all()'],
        'Every param becomes a condition.'
      ),
      BUILD(
        'Step 2 — stamp the update',
        ['doc.updated_on', '=', 'new', 'Date();'],
        ['doc.updated_on', '=', 'new', 'Date();', 'created_on'],
        'PUT moves updated_on only.'
      ),
      MCQ(
        '?open=true&assigned=ana returns?',
        'Issues matching ALL filters',
        [
          'Issues matching ALL filters',
          'Issues matching ANY filter',
          'Everything unfiltered',
          'Only filter names',
        ],
        'Filters AND together.'
      ),
      MCQ(
        'A DELETE succeeds. Confirm with?',
        'A deleted message plus the removed id',
        [
          'A deleted message plus the removed id',
          'All remaining issues',
          'A replacement issue',
          'Silence',
        ],
        'Client drops it from view.'
      ),
    ],
  },

  'sec-ml-workshop': {
    id: 'sec-ml-workshop',
    title: 'Fit honestly step by step',
    theory: [
      'Workshop: stack layers, split data, trust only held-out error.',
    ],
    questions: [
      BUILD(
        'Step 1 — stack a 64-unit relu layer',
        ['Dense(64,', 'activation="relu")'],
        ['Dense(64,', 'activation="relu")', 'Flatten('],
        'Dense connects; relu bends.'
      ),
      BUILD(
        'Step 2 — score on unseen data',
        ['model.evaluate(X_test,', 'y_test)'],
        ['model.evaluate(X_test,', 'y_test)', '.fit('],
        'Unseen data is the only honest score.'
      ),
      MCQ(
        'model.fit does what?',
        'Nudges weights over epochs to cut training error',
        [
          'Nudges weights over epochs to cut training error',
          'Checks disk space',
          'Resizes images',
          'Deletes weak layers',
        ],
        'Fit equals learn.'
      ),
      MCQ(
        'MAE 2.1 on house prices ($1k units) means?',
        'Miss by $2,100 on average',
        [
          'Miss by $2,100 on average',
          '2.1% exactly right',
          '2.1 epochs trained',
          '21 houses perfect',
        ],
        'MAE speaks the target units.'
      ),
      CODE(
        'Write meanAbsoluteError(predicted, actual): return the average absolute difference, 0 for two empty arrays, and null for mismatched lengths.',
        {
          language: 'js',
          starter: 'function meanAbsoluteError(predicted, actual) {\n  // Validate lengths, then average the absolute errors\n}\n',
          tests: [
            { id: 'basic', label: '[1,2,3] vs [2,2,2] gives 2/3', run: "Math.abs(meanAbsoluteError([1,2,3],[2,2,2]) - 2/3) < 1e-9", hint: 'Sum |p - a| and divide by the number of examples.' },
            { id: 'units', label: '[10,20] vs [12,17] gives 2.5', run: "meanAbsoluteError([10,20],[12,17]) === 2.5", hint: 'Absolute value removes the sign before averaging.' },
            { id: 'empty', label: 'Two empty arrays return 0', run: "meanAbsoluteError([], []) === 0", hint: 'Guard the empty case before dividing.' },
            { id: 'mismatch', label: 'Mismatched lengths return null', run: "meanAbsoluteError([1,2],[1]) === null", hint: 'Silent truncation hides a data bug — reject mismatched lengths.' },
          ],
        },
        'function meanAbsoluteError(predicted, actual) {\n  if (predicted.length !== actual.length) return null;\n  if (predicted.length === 0) return 0;\n  let total = 0;\n  for (let i = 0; i < predicted.length; i++) total += Math.abs(predicted[i] - actual[i]);\n  return total / predicted.length;\n}',
        'MAE is the average size of the miss, in the target’s own units. Rejecting mismatched lengths prevents a silent data-alignment bug from producing a flattering score.'
      ),
    ],
  },

  'sec-nlp-workshop': {
    id: 'sec-nlp-workshop',
    title: 'Vectorize words step by step',
    theory: [
      'Workshop: tokenize, pad, squeeze to probability.',
    ],
    questions: [
      BUILD(
        'Step 1 — texts to equal-length sequences',
        ['pad_sequences(tokenizer.texts_to_sequences(texts))'],
        ['pad_sequences(tokenizer.texts_to_sequences(texts))', '.split('],
        'Ids first, padding second.'
      ),
      MCQ(
        'Final Dense uses sigmoid because?',
        'It squeezes output into a 0–1 spam probability',
        [
          'It squeezes output into a 0–1 spam probability',
          'It trains twice as fast',
          'It doubles vocabulary',
          'It writes English sentences',
        ],
        'Near 1 spam, near 0 ham.'
      ),
      MCQ(
        '98% accuracy but all spam lands in inboxes. Cause?',
        'Imbalance — accuracy on mostly-ham hides total spam failure',
        [
          'Imbalance — accuracy on mostly-ham hides total spam failure',
          'Too few milliseconds trained',
          'Sigmoid cannot output spam',
          'Tokenizers delete spam words',
        ],
        'Read the confusion matrix.'
      ),
      MCQ(
        'Where does the headline score come from?',
        'evaluate on held-out messages, index 1',
        [
          'evaluate on held-out messages, index 1',
          'Training loss, index 0',
          'The tokenizer vocabulary size',
          'The embedding dimension',
        ],
        '[loss, accuracy] — index 1.'
      ),
    ],
  },

  'secml-checkpoint': {
    id: 'secml-checkpoint',
    title: 'Security & ML checkpoint',
    theory: [
      'Final check across all five levels: headers, identity, CRUD, regression, and classification.',
    ],
    questions: [
      MCQ(
        'What does frameguard stop?',
        'Clickjacking via invisible framing',
        ['Clickjacking via invisible framing', 'Slow queries', 'Double likes', 'Typos'],
        'Deny framing.'
      ),
      MCQ(
        'Delete arrives with wrong password. Action?',
        'Refuse, reveal nothing',
        ['Refuse, reveal nothing', 'Delete anyway', 'Return the password', 'Lock the board'],
        'No leaks.'
      ),
      BUILD(
        'Find by project plus query',
        ['Issue.find({', 'project,', '...req.query', '})'],
        ['Issue.find({', 'project,', '...req.query', '})', '.all()'],
        'Params become conditions.'
      ),
      MCQ(
        'Why hold out validation data?',
        'To tell patterns apart from memorized rows',
        ['To tell patterns apart from memorized rows', 'To train faster', 'To double data', 'To train a second model'],
        'Unseen error is the score.'
      ),
      BUILD(
        'Texts to equal sequences',
        ['pad_sequences(tokenizer.texts_to_sequences(texts))'],
        ['pad_sequences(tokenizer.texts_to_sequences(texts))', '.split('],
        'Ids, then padding.'
      ),
      MCQ(
        'Sigmoid head outputs?',
        'A 0–1 spam probability',
        ['A 0–1 spam probability', 'Double speed', 'Double vocabulary', 'English sentences'],
        'Near 1 spam.'
      ),
      TEXT(
        'Type the scikit-learn helper that splits data into training and test sets.',
        ['train_test_split', 'train_test_split()'],
        'train_test_split shuffles and splits X and y while keeping their rows aligned. Always hold out data before judging a model.',
        { misconceptions: { split: 'The helper is train_test_split, and it keeps features and labels aligned.' } }
      ),
    ],
  },

  'sec-stock-checker': {
    id: 'sec-stock-checker',
    title: 'Stock Price Checker',
    theory: [
      'Capstone 1 of 5: fetch a stock quote and track likes. GET /api/stock-prices?stock=SYM returns price plus likes; two symbols return relative likes (each minus the other).',
      'Likes bind to IP: one like per address per stock, anonymous users counted once. Like state changes the count; re-liking from the same IP does nothing.',
      'Helmet hardens every response: no sniffing, no unwanted framing, HTTPS assumed. Price data comes from the quote service; likes live in the database keyed by stock plus IP hash.',
    ],
    questions: [
      MCQ(
        'Same IP likes SYM twice. Like count moves…',
        '+1 total — second like is a no-op',
        ['+1 total — second like is a no-op', '+2 total', 'Back to 0', 'To a random value'],
        'IP-keyed likes are idempotent.'
      ),
      MCQ(
        'Two stocks queried with like on. rel_likes for the first equals…',
        'Its likes minus the other likes',
        ['Its likes minus the other likes', 'Sum of both', 'Always zero', 'The price difference'],
        'Relative means the difference.'
      ),
      BUILD(
        'One like per IP per stock, enforced',
        ['findOne({ stock,', 'ipHash })', '?? create'],
        ['findOne({ stock,', 'ipHash })', '?? create', 'deleteMany(', 'updateAll('],
        'Lookup before counting.'
      ),
      MCQ(
        'Helmet on an API means…',
        'Secure headers on every response',
        ['Secure headers on every response', 'No responses at all', 'Passwords in headers', 'Likes disabled'],
        'Hardened headers, same JSON.'
      ),
    ],
  },

  'sec-anon-board': {
    id: 'sec-anon-board',
    title: 'Anonymous Message Board',
    theory: [
      'Capstone 2 of 5: threads and replies with delete passwords. POST creates, GET lists the 10 freshest threads with 3 newest replies each, PUT reports a reply, DELETE removes with its password.',
      'Passwords never store raw — hash before saving, compare hashes on delete. Wrong password fails the delete; the content stays.',
      'Board isolation: every query filters by board name. Reporting flips a flag instead of deleting; the 10/3 shape keeps responses small.',
    ],
    questions: [
      MCQ(
        'Delete arrives with the wrong password. Result?',
        'Refused — content stays',
        ['Refused — content stays', 'Deleted anyway', 'Board dropped', 'Password emailed out'],
        'Hash mismatch blocks the write.'
      ),
      MCQ(
        'GET a board returns how much?',
        '10 freshest threads, 3 newest replies each',
        ['10 freshest threads, 3 newest replies each', 'Everything ever posted', 'Only reply counts', 'One random thread'],
        'Bounded shape, freshest first.'
      ),
      BUILD(
        'Store a delete password safely',
        ['bcrypt.hash(', 'password,', 'rounds)'],
        ['bcrypt.hash(', 'password,', 'rounds)', 'md5(', 'btoa('],
        'Salted hash, never plaintext.'
      ),
      MCQ(
        'Reporting a reply does what?',
        'Flags it — visible until a delete removes it',
        ['Flags it — visible until a delete removes it', 'Deletes it instantly', 'Bans the board', 'Clears all passwords'],
        'Report marks; delete removes.'
      ),
    ],
  },

  'sec-issue-tracker': {
    id: 'sec-issue-tracker',
    title: 'Issue Tracker',
    theory: [
      'Capstone 3 of 5: full CRUD on project issues. POST requires title text; GET filters on any field via query params; PUT updates only supplied fields and stamps updated_on; DELETE needs the id.',
      'Missing id on update or delete earns a no-id error; unknown ids earn could-not-update/delete. Open/closed flips via a status field; closed_on stamps when an issue closes.',
      'Every response echoes the affected document so clients stay in sync. Filters combine — title plus open status narrows to matching open issues.',
    ],
    questions: [
      MCQ(
        'PUT arrives with no _id. Response?',
        'Missing-id error, nothing updated',
        ['Missing-id error, nothing updated', 'Update all issues', 'Create a new issue', 'Delete the project'],
        'No target, no write.'
      ),
      MCQ(
        'Issue closes. Which stamps move?',
        'status flips, closed_on set, updated_on refreshed',
        ['status flips, closed_on set, updated_on refreshed', 'created_on rewritten', 'Only the title changes', 'Nothing — closing is silent'],
        'Close is a triple write.'
      ),
      BUILD(
        'Filter issues by query params',
        ['find(', 'req.query', ')'],
        ['find(', 'req.query', 'findById(', ')', 'req.body'],
        'Query object is the filter.'
      ),
      MCQ(
        'PUT with a valid id but no fields. Response?',
        'No-update error — nothing to change',
        ['No-update error — nothing to change', 'Silent success', 'Delete the issue', 'Clear all fields'],
        'Empty updates fail loudly.'
      ),
    ],
  },

  'ml-linear-regression': {
    id: 'ml-linear-regression',
    title: 'Linear Regression Predictor',
    theory: [
      'Capstone 4 of 5: fit a line through training data with gradient descent or the normal equation. Features scale first — unscaled inputs stall learning.',
      'Cost is mean squared error; the learning rate steps weights downhill. Too large diverges, too small crawls — the checks expect convergence on a known dataset.',
      'Evaluate on held-out data: report error on unseen rows, never training rows. A bias term (intercept) lets the line miss the origin.',
    ],
    questions: [
      MCQ(
        'Features span 1–100000. First move before training?',
        'Scale features to a common range',
        ['Scale features to a common range', 'Delete small features', 'Raise the learning rate 100x', 'Skip the bias term'],
        'Scale first or descent stalls.'
      ),
      MCQ(
        'Loss explodes to NaN by iteration 10. Likely cause?',
        'Learning rate far too large',
        ['Learning rate far too large', 'Too much data', 'Bias term present', 'Features scaled'],
        'Overshooting steps diverge.'
      ),
      BUILD(
        'Mean squared error over predictions',
        ['((y_pred - y)', '** 2).mean()'],
        ['((y_pred - y)', '** 2).mean()', '.sum()', '.max()'],
        'Square residuals, average them.'
      ),
      MCQ(
        'Honest model score comes from…',
        'Held-out rows the model never trained on',
        ['Held-out rows the model never trained on', 'The training rows again', 'Random numbers', 'The largest weights'],
        'Test measures generalization.'
      ),
    ],
  },

  'ml-spam-classifier': {
    id: 'ml-spam-classifier',
    title: 'Spam Classifier',
    theory: [
      'Capstone 5 of 5: text to spam-or-ham with a neural net. Tokenize messages to id sequences, pad to equal length, embed, then pool to a fixed vector.',
      'A dense layer plus sigmoid head outputs the spam probability; 0.5 splits the verdict. Train on labeled texts, validate on unseen ones — accuracy on held-out messages is the grade.',
      'Overfitting watch: training accuracy far above validation means memorize, not learn — add dropout or more data. Class imbalance (mostly ham) needs weighting or the model predicts ham always.',
    ],
    questions: [
      MCQ(
        'Messages vary from 5 to 200 words. Batching needs…',
        'Padding to one length after tokenizing',
        ['Padding to one length after tokenizing', 'Deleting long messages', 'One sample per batch', 'Sorting by sender'],
        'Uniform shapes batch together.'
      ),
      MCQ(
        'Train 99%, validation 61%. Diagnosis?',
        'Overfitting — memorizing, add dropout or data',
        ['Overfitting — memorizing, add dropout or data', 'Underfitting — train longer only', 'Perfect generalization', 'Bad test labels always'],
        'The gap is the giveaway.'
      ),
      BUILD(
        'Probability head for binary spam',
        ['Dense(1,', 'activation=\'sigmoid\')'],
        ['Dense(1,', 'activation=\'sigmoid\')', 'activation=\'relu\')', 'Dense(100,'],
        'Single sigmoid unit: P(spam).'
      ),
      MCQ(
        '95% of training mail is ham. Naive model predicts…',
        'Ham always — 95% without learning',
        ['Ham always — 95% without learning', 'Spam always', 'Perfect labels', 'Random fairly'],
        'Imbalance rewards the lazy majority vote.'
      ),
    ],
  },
};
