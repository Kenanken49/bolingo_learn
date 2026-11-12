/**
 * AI & ML Academy · Tier 1 “Gamified Explorer” — modules 1–5.
 * Ages 10–18. Every note is a blueprint submodule in syllabus order; projects
 * are the blueprint's own labs, kept as the module's runnable exercise.
 */

import type { AiModule } from './build';

export const EXPLORER_A: AiModule[] = [
  {
    id: 'aiml1-m01',
    title: 'M1 · The Matrix Awakening',
    goal: 'Tell a rule apart from a model, and trace one prediction from input to output.',
    notes: [
      'Digital world logic — a computer follows exact instructions, so the same input always produces the same output. That predictability is what makes a program testable.',
      'Tracking patterns — a pattern is a repeatable relationship between inputs and outputs. Spotting one is the first step from hand-written rules toward learning.',
      'Input vs output — inputs are what the system receives; outputs are what it returns. Naming both before you code removes most beginner confusion.',
      'What is a machine brain? — a model is a function with adjustable numbers called parameters that maps inputs to outputs.',
      'Data as food for code — models learn from examples. No examples, no learning; bad examples, bad behaviour.',
      'Teaching a computer to see — an image is a grid of pixel numbers, so “seeing” is arithmetic on those numbers.',
      'Guessing games with math — a prediction is a guess plus a score of how wrong it was, and that score drives the next guess.',
      'Rules vs learning — hand-written rules are precise but brittle; learning generalises from examples but can be confidently wrong on new cases.',
      'The AI timeline adventure — rules in the 1950s, statistical learning in the 1990s, deep learning in the 2010s, foundation models in the 2020s.',
      'Safe boundaries for AI — every system needs limits: which data it may see, what it may decide, and who checks it.',
    ],
    terms: [
      ['Input', 'What the system receives'],
      ['Model', 'Function mapping inputs to outputs'],
      ['Parameter', 'A number training is allowed to change'],
      ['Prediction', 'The output for one input'],
      ['Label', 'The correct answer used to score a prediction'],
    ],
    quiz: [
      {
        q: 'What separates a hand-written rule from a learned model?',
        a: 'A person writes the rule; the model adjusts its parameters from examples',
        options: [
          'A person writes the rule; the model adjusts its parameters from examples',
          'Rules always run slower than models',
          'Models never make mistakes',
          'A rule needs data and a model does not',
        ],
        why: 'Both are functions. The difference is who sets the numbers: an author or a training loop.',
      },
      {
        q: 'An image reaches a vision model. What does the model actually receive?',
        a: 'A grid of pixel numbers',
        options: ['A grid of pixel numbers', 'A sentence describing the picture', 'A compressed video stream', 'A list of object names'],
        why: 'Pixels are numbers. Every vision model starts by doing arithmetic on that grid.',
      },
      {
        q: 'Why does training need many examples rather than one?',
        a: 'Parameters are tuned by comparing many predictions with their labels',
        options: [
          'Parameters are tuned by comparing many predictions with their labels',
          'One example cannot be stored in memory',
          'Models must see every possible input',
          'Examples make the program run faster',
        ],
        why: 'One example can always be memorised; many examples force the model to generalise.',
      },
      {
        q: 'A prediction is wrong. What does the training loop do next?',
        a: 'Adjusts the parameters to reduce the error',
        options: [
          'Adjusts the parameters to reduce the error',
          'Deletes the example',
          'Rewrites the label to match the prediction',
          'Restarts the whole dataset from zero',
        ],
        why: 'Error is the signal. Parameters move in the direction that lowers it — that is learning.',
      },
    ],
    workshop: {
      title: 'Trace one prediction',
      steps: [
        {
          prompt: 'Put the learning loop in order: collect examples, fit parameters, evaluate.',
          chain: ['collect examples', 'fit parameters', 'evaluate'],
          bank: ['collect examples', 'fit parameters', 'evaluate', 'delete the labels'],
          why: 'Data first, fitting second, honest scoring last — swap the order and the score means nothing.',
        },
        {
          prompt: 'Order what happens inside one prediction: receive input, compute output, compare with label.',
          chain: ['receive input', 'compute output', 'compare with label'],
          bank: ['receive input', 'compute output', 'compare with label', 'publish the model'],
          why: 'The comparison produces the error that training consumes.',
        },
        {
          prompt: 'Order the safe-release check: define the data, set the boundary, assign the reviewer.',
          chain: ['define the data', 'set the boundary', 'assign the reviewer'],
          bank: ['define the data', 'set the boundary', 'assign the reviewer', 'skip the audit'],
          why: 'A model without a stated data boundary and a named reviewer is a liability, not a product.',
        },
      ],
    },
    lab: {
      intro: 'Data arrives in three shapes: numbers, text and everything else. A model must classify its input before it can use it, so start exactly there.',
      prompt: 'Write describeValue(value) returning "numeric data" for numbers, "text data" for strings, and "unknown" for anything else.',
      starter: 'function describeValue(value) {\n  // Return "numeric data", "text data" or "unknown".\n  return null;\n}\n',
      solution:
        'function describeValue(value) {\n  if (typeof value === "number") return "numeric data";\n  if (typeof value === "string") return "text data";\n  return "unknown";\n}\n',
      tests: [
        { id: 'number', label: 'describeValue(42) reports numeric data', run: 'describeValue(42) === "numeric data"', hint: 'typeof 42 is "number".' },
        { id: 'text', label: 'describeValue("hello") reports text data', run: 'describeValue("hello") === "text data"', hint: 'typeof "hello" is "string".' },
        { id: 'other', label: 'describeValue(null) reports unknown', run: 'describeValue(null) === "unknown"', hint: 'Everything that is neither number nor string falls through.' },
      ],
    },
    text: {
      prompt: 'Name the property that lets a learned model handle inputs it has never seen (one word).',
      answers: ['generalisation', 'generalization'],
      why: 'Generalisation is the whole point: memorised answers fail, generalised patterns survive new inputs.',
      hint: 'Starts with “gener…”',
    },
    project: 'Build and train your first 3D companion pet that recognises your hand gestures — the classifier you write here is the same shape, just with pixels instead of numbers.',
  },

  {
    id: 'aiml1-m02',
    title: 'M2 · Data Treasure Hunting',
    goal: 'Turn messy raw rows into a clean, labelled dataset you can trust.',
    notes: [
      'Finding data clues — raw data hides its meaning in names and formats; read ten rows before writing one line of code.',
      'Cleaning dirty text — trim spaces, unify case, strip stray punctuation. Every rule you skip becomes a duplicate later.',
      'Sorting visual items — grouping by a visible property (colour, shape, size) is clustering done by hand.',
      'Labelling maps — a label turns an observation into a training example; unlabelled rows are only useful for clustering.',
      'Secret features in data — a feature is a measurable column. “Age” is a feature; “customer id” is a name, not a signal.',
      'Storage chests (Databases) — tables store rows of the same shape; a database keeps many tables consistent and queryable.',
      'Row and column mysteries — rows are examples, columns are features. Mixing them up is the most common beginner bug.',
      'Good data vs bad data — good data is complete, consistent and measured the same way every time; bad data is everything else.',
      'Privacy forcefields — collect only what you need and remove identifiers before training; you cannot un-leak a dataset.',
      'The bias monster — if your examples over-represent one group, the model learns that group as “normal” and everyone else as noise.',
    ],
    terms: [
      ['Row', 'One example in a table'],
      ['Column', 'One feature measured for every example'],
      ['Label', 'The target value you want to predict'],
      ['Outlier', 'A value far from the rest of its column'],
      ['Identifier', 'A unique name that carries no predictive signal'],
    ],
    quiz: [
      {
        q: 'In a table of customers, what is one row?',
        a: 'One customer with every measured feature',
        options: ['One customer with every measured feature', 'One feature across all customers', 'The table header', 'A single label'],
        why: 'Rows are examples; columns are features. Keep that straight and every later step makes sense.',
      },
      {
        q: 'Which column should usually be dropped before training?',
        a: 'A unique customer id',
        options: ['A unique customer id', 'Account balance', 'Age in years', 'Number of purchases'],
        why: 'Ids are unique per row, so they cannot generalise — the model memorises instead of learning.',
      },
      {
        q: 'What makes a dataset “bad” rather than just small?',
        a: 'Inconsistent measurement and missing labels',
        options: ['Inconsistent measurement and missing labels', 'It has fewer than one million rows', 'It contains numbers', 'It was collected in one country'],
        why: 'Consistency and complete labels matter more than raw size; a million unreliable rows teach unreliable rules.',
      },
      {
        q: 'A dataset of hiring decisions contains 90% one group. What is the risk?',
        a: 'The model learns that group as the norm and penalises everyone else',
        options: [
          'The model learns that group as the norm and penalises everyone else',
          'Nothing — more data is always better',
          'The model trains faster',
          'The labels become unnecessary',
        ],
        why: 'Bias is inherited from the examples. Balanced, representative data is a design requirement.',
      },
    ],
    workshop: {
      title: 'Clean a table',
      steps: [
        {
          prompt: 'Put the cleaning pipeline in order: inspect, trim, deduplicate.',
          chain: ['inspect', 'trim', 'deduplicate'],
          bank: ['inspect', 'trim', 'deduplicate', 'train the model'],
          why: 'Look before you cut; deduplicate only after the text is normalised, or duplicates survive in disguise.',
        },
        {
          prompt: 'Order the privacy pass: drop identifiers, drop unused columns, store the remainder.',
          chain: ['drop identifiers', 'drop unused columns', 'store the remainder'],
          bank: ['drop identifiers', 'drop unused columns', 'store the remainder', 'publish the raw file'],
          why: 'Removal must happen before storage — a copy you kept is still a leak waiting to happen.',
        },
        {
          prompt: 'Order the label check: confirm the target column, confirm its values, count the classes.',
          chain: ['confirm the target column', 'confirm its values', 'count the classes'],
          bank: ['confirm the target column', 'confirm its values', 'count the classes', 'delete half the rows'],
          why: 'Class counts reveal imbalance early, while it is still cheap to fix.',
        },
      ],
    },
    lab: {
      intro: 'Cleaning is mostly three operations: trim, drop, relabel. Build them in one pass so the output is predictable.',
      prompt: 'Write cleanNames(list): trim every name, drop empty strings, and capitalise the first letter of the rest.',
      starter: 'function cleanNames(list) {\n  // Trim, drop blanks, capitalise the first letter.\n  return list;\n}\n',
      solution:
        'function cleanNames(list) {\n  return list\n    .map((name) => String(name).trim())\n    .filter((name) => name.length > 0)\n    .map((name) => name[0].toUpperCase() + name.slice(1).toLowerCase());\n}\n',
      tests: [
        {
          id: 'shape',
          label: 'Whitespace is trimmed and blanks are dropped',
          run: 'JSON.stringify(cleanNames(["  ada ", "", "grace "])) === JSON.stringify(["Ada", "Grace"])',
          hint: 'Map with trim first, then filter out empty strings.',
        },
        {
          id: 'case',
          label: 'The first letter is capitalised and the rest lowercased',
          run: 'JSON.stringify(cleanNames(["ADA"])) === JSON.stringify(["Ada"])',
          hint: 'name[0].toUpperCase() + name.slice(1).toLowerCase().',
        },
        {
          id: 'empty',
          label: 'An all-blank input returns an empty array',
          run: 'Array.isArray(cleanNames(["   ", ""])) && cleanNames(["   ", ""]).length === 0',
          hint: 'After trimming, blank names must be filtered out.',
        },
      ],
    },
    text: {
      prompt: 'What do we call a measurable column a model can learn from? (one word)',
      answers: ['feature'],
      why: 'Features are the inputs; the label is the answer. A column that cannot generalise is not a feature.',
      hint: 'Starts with “feat…”.',
    },
    project: '“Data Cleanse Dungeon” — a co-op speedrun that filters corrupted datasets. The cleaning pass you just wrote is the first room.',
  },

  {
    id: 'aiml1-m03',
    title: 'M3 · Wizardry of Regressions',
    goal: 'Fit a straight line to data and explain what its slope and error mean.',
    notes: [
      'Connecting dots on charts — regression draws the line that sits closest to every point at once.',
      'Trendlines as paths — the line is a path through the data; its slope is the direction the target moves as the input grows.',
      'Predictive guessing — a fitted line predicts a number for new inputs, which is why regression is a regression, not a classifier.',
      'Target variables — the target (y) is what you predict; the input (x) is what you are allowed to know at prediction time.',
      'Continuous streams — regression outputs any number on a scale, so a tiny error is normal and a large one is a signal.',
      'Error distance math — the error is the vertical gap between a point and the line; squared, it stops positive and negative errors cancelling.',
      'Shifting the line — training moves the slope and intercept until the total squared error stops falling.',
      'Overfitting illusions — a wiggly line can pass through every training point and still fail on the next one.',
      'Underfitting traps — a straight line through a curve misses both ends; the model is too simple for the pattern.',
      'Live charting games — plot predictions against reality; if the residuals show a curve, your model is missing a feature.',
    ],
    terms: [
      ['Slope', 'How much the prediction changes per unit of input'],
      ['Intercept', 'The prediction when the input is zero'],
      ['Residual', 'The gap between a real value and its prediction'],
      ['Overfitting', 'Fitting noise instead of the pattern'],
      ['Underfitting', 'A model too simple to capture the pattern'],
    ],
    quiz: [
      {
        q: 'A line predicts house price from size. What is the target?',
        a: 'The price',
        options: ['The price', 'The size', 'The slope', 'The intercept'],
        why: 'The target is what you predict; the input is what you observe first.',
      },
      {
        q: 'Why square the residuals instead of summing them directly?',
        a: 'So positive and negative errors do not cancel, and big misses cost more',
        options: [
          'So positive and negative errors do not cancel, and big misses cost more',
          'Because squares are easier to compute',
          'Because residuals are always negative',
          'To make the line longer',
        ],
        why: 'Squaring removes the sign and punishes outliers — that is the least-squares objective.',
      },
      {
        q: 'Training error is near zero but new data is predicted badly. What happened?',
        a: 'The model overfitted the training examples',
        options: ['The model overfitted the training examples', 'The model underfitted', 'The labels were perfect', 'The slope was zero'],
        why: 'Perfect training scores plus poor new-data scores is the classic overfitting signature.',
      },
      {
        q: 'What does a slope of 0 mean for a regression line?',
        a: 'The prediction does not change with the input',
        options: ['The prediction does not change with the input', 'The model is broken', 'The intercept is also 0', 'Every residual is 1'],
        why: 'Slope 0 means the input carries no linear signal for that target.',
      },
    ],
    workshop: {
      title: 'Fit a line by hand',
      steps: [
        {
          prompt: 'Order the fitting loop: compute predictions, compute residuals, update slope.',
          chain: ['compute predictions', 'compute residuals', 'update slope'],
          bank: ['compute predictions', 'compute residuals', 'update slope', 'delete the outliers'],
          why: 'You cannot measure error before predicting, and you cannot update without error.',
        },
        {
          prompt: 'Diagnose overfitting: compare training error, compare validation error, simplify.',
          chain: ['compare training error', 'compare validation error', 'simplify'],
          bank: ['compare training error', 'compare validation error', 'simplify', 'add more parameters'],
          why: 'A large gap between the two errors means the model memorised; simplify before adding capacity.',
        },
        {
          prompt: 'Order a clean experiment: split the data, fit on train, score on test.',
          chain: ['split the data', 'fit on train', 'score on test'],
          bank: ['split the data', 'fit on train', 'score on test', 'score on train twice'],
          why: 'Scoring only on training data rewards memorisation and hides failure.',
        },
      ],
    },
    lab: {
      intro: 'Least squares has a closed form: slope = covariance(x, y) / variance(x). Implement it once and you understand every regression library.',
      prompt: 'Write slope(xs, ys) returning the least-squares slope of y against x. A flat relationship must return 0.',
      starter: 'function slope(xs, ys) {\n  // slope = sum((x - meanX) * (y - meanY)) / sum((x - meanX) ** 2)\n  return 0;\n}\n',
      solution:
        'function slope(xs, ys) {\n  const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;\n  const mx = mean(xs);\n  const my = mean(ys);\n  let num = 0;\n  let den = 0;\n  for (let i = 0; i < xs.length; i += 1) {\n    num += (xs[i] - mx) * (ys[i] - my);\n    den += (xs[i] - mx) ** 2;\n  }\n  return den === 0 ? 0 : num / den;\n}\n',
      tests: [
        { id: 'rising', label: 'A perfect rising line gives slope 2', run: 'Math.abs(slope([1, 2, 3], [2, 4, 6]) - 2) < 1e-9', hint: 'Divide the summed products by the summed squared deviations.' },
        { id: 'flat', label: 'A flat target gives slope 0', run: 'Math.abs(slope([0, 1, 2], [5, 5, 5])) < 1e-9', hint: 'No change in y means the numerator is zero.' },
        { id: 'falling', label: 'A falling line gives a negative slope', run: 'slope([0, 1, 2], [4, 2, 0]) < 0', hint: 'The sign comes from the covariance, so do not take an absolute value.' },
      ],
    },
    text: {
      prompt: 'What is the gap between a real value and its prediction called? (one word)',
      answers: ['residual', 'error'],
      why: 'Residual is the precise term; error is the looser everyday word for the same gap.',
      hint: 'Starts with “res…”.',
    },
    project: 'Graphing simulator: predict a spaceship’s landing trajectory from its weight, then watch the residuals tell you where the physics is missing.',
  },

  {
    id: 'aiml1-m04',
    title: 'M4 · The Sorting Sorting Hat',
    goal: 'Classify with yes/no splits and read a confusion matrix honestly.',
    notes: [
      'Sorting into buckets — classification predicts a category, not a number; the buckets must be defined before training starts.',
      'Yes/No binary choices — a binary classifier answers one question at a time, which is why “spam or not” beats “which of nine labels”.',
      'Grouping multi-classes — several classes can be handled with one model or one-versus-rest, but each class needs enough examples.',
      'Decision tree paths — a tree asks a sequence of yes/no questions; each answer moves you down one branch.',
      'Splitting options — a good split makes the children purer than the parent; that is what the tree is choosing at every node.',
      'Leaf nodes and roots — the root is the first question, leaves are the final answers, and depth is how many questions a decision may cost.',
      'True vs false positives — a false positive claims the thing is present when it is not; a false negative misses it.',
      'Confusion matrix puzzles — the 2×2 table of predictions versus reality is the only honest summary of a classifier.',
      'Boundary lines — a classifier draws a border in feature space; every error is a point on the wrong side of it.',
      'Probability meters — a classifier can output confidence, and a confident wrong answer is worse than an unsure one.',
    ],
    terms: [
      ['True positive', 'Predicted yes, and it was yes'],
      ['False positive', 'Predicted yes, but it was no'],
      ['False negative', 'Predicted no, but it was yes'],
      ['Precision', 'Of the predicted yeses, how many were right'],
      ['Recall', 'Of the real yeses, how many were found'],
    ],
    quiz: [
      {
        q: 'A spam filter marks a real work email as spam. Which error is that?',
        a: 'A false positive',
        options: ['A false positive', 'A true positive', 'A false negative', 'A true negative'],
        why: 'The model claimed “spam” (positive) and was wrong — false positive.',
      },
      {
        q: 'A medical test misses a sick patient. Which error is that?',
        a: 'A false negative',
        options: ['A false negative', 'A false positive', 'A true negative', 'A true positive'],
        why: 'It claimed “healthy” when the truth was positive — the dangerous miss.',
      },
      {
        q: 'What makes a decision-tree split good?',
        a: 'It makes the child groups purer than the parent',
        options: ['It makes the child groups purer than the parent', 'It uses every feature at once', 'It creates the deepest tree possible', 'It keeps the classes mixed'],
        why: 'Purity gain is the objective; depth is a cost you pay for it.',
      },
      {
        q: 'A classifier is 99% accurate on data with 1% positives. What should you check?',
        a: 'Recall and precision — always predicting “no” also scores 99%',
        options: ['Recall and precision — always predicting “no” also scores 99%', 'Nothing, 99% is excellent', 'The colour of the chart', 'Whether the model is deep enough'],
        why: 'Accuracy hides imbalance. The majority-class baseline is the number to beat.',
      },
    ],
    workshop: {
      title: 'Grow a decision tree',
      steps: [
        {
          prompt: 'Order one tree node: choose the feature, choose the threshold, split the rows.',
          chain: ['choose the feature', 'choose the threshold', 'split the rows'],
          bank: ['choose the feature', 'choose the threshold', 'split the rows', 'label every row positive'],
          why: 'A split is a feature plus a threshold; without both you have not decided anything.',
        },
        {
          prompt: 'Order the evaluation: build the confusion matrix, compute precision and recall, choose the threshold.',
          chain: ['build the confusion matrix', 'compute precision and recall', 'choose the threshold'],
          bank: ['build the confusion matrix', 'compute precision and recall', 'choose the threshold', 'delete the negatives'],
          why: 'Precision and recall trade off, so the threshold is a business decision made after measuring both.',
        },
        {
          prompt: 'Order the pruning pass: grow fully, measure validation error, cut branches that do not help.',
          chain: ['grow fully', 'measure validation error', 'cut branches that do not help'],
          bank: ['grow fully', 'measure validation error', 'cut branches that do not help', 'add branches randomly'],
          why: 'Pruning is evidence-driven: a branch stays only if it improves held-out performance.',
        },
      ],
    },
    lab: {
      intro: 'The simplest classifier is a vote. Before trees existed, people counted labels — and that is still the baseline every model must beat.',
      prompt: 'Write majority(labels): return the most frequent label. On a tie, return the label that appeared first.',
      starter: 'function majority(labels) {\n  // Count each label, then return the most frequent one.\n  return null;\n}\n',
      solution:
        'function majority(labels) {\n  const counts = new Map();\n  let best = null;\n  let bestCount = 0;\n  for (const label of labels) {\n    const next = (counts.get(label) || 0) + 1;\n    counts.set(label, next);\n    if (next > bestCount) {\n      best = label;\n      bestCount = next;\n    }\n  }\n  return best;\n}\n',
      tests: [
        { id: 'clear', label: 'The most frequent label wins', run: 'majority(["cat", "dog", "cat"]) === "cat"', hint: 'Track counts in a Map and keep the leader.' },
        { id: 'tie', label: 'A tie returns the first label seen', run: 'majority(["b", "a"]) === "b"', hint: 'Only replace the leader on a strict improvement.' },
        { id: 'single', label: 'A single label returns itself', run: 'majority(["only"]) === "only"', hint: 'The loop must handle one item.' },
      ],
    },
    text: {
      prompt: 'Which metric answers “of the real positives, how many did we find”? (one word)',
      answers: ['recall', 'sensitivity'],
      why: 'Recall is the share of real positives recovered; precision is the share of claimed positives that were right.',
      hint: 'Also called sensitivity.',
    },
    project: 'Design an interactive sorting hat that reads character stats and groups them into houses — then plot the points it gets wrong.',
  },

  {
    id: 'aiml1-m05',
    title: 'M5 · Nearest Neighbour Forests',
    goal: 'Predict from proximity, then combine many weak trees into a stronger vote.',
    notes: [
      'Birds of a feather (k-NN) — the nearest-neighbour rule predicts that a new point resembles the points closest to it.',
      'Measuring distance maps — every distance needs a definition; Euclidean distance is the straight line in feature space.',
      'Voting blocks — k-NN with k neighbours takes a vote, and the value of k decides how smooth the boundary is.',
      'Growing random forests — a forest trains many trees on random subsets, so their mistakes do not line up.',
      'Ensemble party mechanics — averaging many weak models beats trusting one strong-looking model, because errors cancel.',
      'Feature importance rankings — a forest can report which columns its splits used most, which is a first explanation.',
      'Voting weights — not every tree deserves an equal vote; confidence or accuracy can weight the tally.',
      'Speed vs accuracy tradeoffs — more neighbours and more trees cost time; k=1 is fast and jumpy.',
      'Tree depth limits — capping depth stops a tree memorising single examples and keeps inference cheap.',
      'The forest maze — with hundreds of trees you gain accuracy and lose the ability to explain a single decision.',
    ],
    terms: [
      ['Nearest neighbour', 'The closest stored example to a new input'],
      ['k', 'How many neighbours vote'],
      ['Ensemble', 'Many models combined into one prediction'],
      ['Bagging', 'Training each model on a random sample of rows'],
      ['Feature importance', 'How much a column contributed to the splits'],
    ],
    quiz: [
      {
        q: 'In k-NN, what does a larger k do to the decision boundary?',
        a: 'Makes it smoother and less sensitive to single points',
        options: ['Makes it smoother and less sensitive to single points', 'Makes it sharper and more local', 'Removes the need for distance', 'Guarantees perfect accuracy'],
        why: 'More voters means more smoothing; k=1 follows every noisy point.',
      },
      {
        q: 'Why does a random forest sample rows for each tree?',
        a: 'So the trees make different mistakes and their vote cancels noise',
        options: ['So the trees make different mistakes and their vote cancels noise', 'To make training slower on purpose', 'Because trees cannot share data', 'To remove the need for labels'],
        why: 'Diversity is the ensemble’s engine; identical trees add nothing.',
      },
      {
        q: 'What does a k-NN model store during training?',
        a: 'The training examples themselves',
        options: ['The training examples themselves', 'A fixed set of weights', 'A decision tree', 'Only the labels'],
        why: 'k-NN is lazy: “training” is storing, and all the work happens at prediction time.',
      },
      {
        q: 'A forest is 3% more accurate but ten times slower. What is the honest conclusion?',
        a: 'It is a tradeoff — pick based on the latency budget, not accuracy alone',
        options: ['It is a tradeoff — pick based on the latency budget, not accuracy alone', 'The accurate model always wins', 'The fast model is always wrong', 'Accuracy and latency are unrelated'],
        why: 'Serving cost is part of the product; a model too slow to answer is not deployed.',
      },
    ],
    workshop: {
      title: 'Run a neighbour vote',
      steps: [
        {
          prompt: 'Order one k-NN prediction: compute distances, take the k closest, vote.',
          chain: ['compute distances', 'take the k closest', 'vote'],
          bank: ['compute distances', 'take the k closest', 'vote', 'retrain the forest'],
          why: 'Distance, selection, vote — the whole algorithm in three beats.',
        },
        {
          prompt: 'Order forest training: sample rows, grow a tree, repeat and average.',
          chain: ['sample rows', 'grow a tree', 'average the trees'],
          bank: ['sample rows', 'grow a tree', 'average the trees', 'use one tree only'],
          why: 'Bagging plus averaging is the forest; one tree is just a tree.',
        },
        {
          prompt: 'Order a fairness check on the model: slice the data, score each slice, compare.',
          chain: ['slice the data', 'score each slice', 'compare'],
          bank: ['slice the data', 'score each slice', 'compare', 'report the average only'],
          why: 'A single average hides a group that the model fails; slices expose it.',
        },
      ],
    },
    lab: {
      intro: 'Proximity is arithmetic: for each stored point, measure the straight-line distance and keep the smallest.',
      prompt: 'Write nearestIndex(points, target) returning the index of the point closest to target, where each point is { x, y }.',
      starter: 'function nearestIndex(points, target) {\n  // Compare squared distances; return the index of the smallest.\n  return -1;\n}\n',
      solution:
        'function nearestIndex(points, target) {\n  let best = -1;\n  let bestDistance = Infinity;\n  points.forEach((point, index) => {\n    const dx = point.x - target.x;\n    const dy = point.y - target.y;\n    const distance = dx * dx + dy * dy;\n    if (distance < bestDistance) {\n      bestDistance = distance;\n      best = index;\n    }\n  });\n  return best;\n}\n',
      tests: [
        {
          id: 'closest',
          label: 'The closest of three points is chosen',
          run: 'nearestIndex([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }], { x: 6, y: 6 }) === 1',
          hint: 'Squared distance is dx*dx + dy*dy.',
        },
        {
          id: 'first',
          label: 'The first point is chosen when it is closest',
          run: 'nearestIndex([{ x: 1, y: 1 }, { x: 9, y: 9 }], { x: 0, y: 0 }) === 0',
          hint: 'Initialise the best distance to Infinity.',
        },
        {
          id: 'exact',
          label: 'An exact match wins',
          run: 'nearestIndex([{ x: 2, y: 4 }, { x: 7, y: 1 }], { x: 7, y: 1 }) === 1',
          hint: 'A zero distance must replace any earlier best.',
        },
      ],
    },
    text: {
      prompt: 'What is the name for combining many models into one prediction? (one word)',
      answers: ['ensemble'],
      why: 'An ensemble trades a little explainability for a lot of stability.',
      hint: 'Starts with “ens…”',
    },
    project: '“Monster Forest Matcher” — use proximity to identify friendly versus hostile creatures, then compare k=1 against k=5.',
  },
];
