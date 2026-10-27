/**
 * Track SECML · Information Security & Machine Learning — leveled banks.
 * Syllabus order: secure headers first, then auth and password-gated
 * actions, full CRUD hardening, ML foundations with TensorFlow, and text
 * classification last. All original.
 */

import { MCQ, BUILD, type CourseLesson } from '../quizBank';

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
    ],
  },
};
