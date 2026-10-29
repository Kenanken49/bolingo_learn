/**
 * English expansion — Course 4 (comprehensive ESL set).
 * Original lessons written for Bolingo; sequencing follows standard
 * beginner-ESL syllabi (greetings → numbers/time → determiners → daily
 * life → travel → work → past narration → final exam). Definitions for
 * lesson words are covered by the bundled offline dictionary
 * (assets/dict/en.json, English WordNet 2024 glosses).
 */
import { MCQ, BUILD, type CourseLesson } from './quizBank';

export const ENGLISH_PLUS: Record<string, CourseLesson> = {
  'english-greetings': {
    id: 'english-greetings',
    title: 'Greetings & Small Talk',
    theory: [
      'Sound natural from hello: “Hi, how is it going?” beats a flat “How are you?” — answer “Pretty good, you?” and the conversation flows. “Nice to meet you” is for first meetings; “Good to see you” is for friends you already know.',
      'Small talk runs on three topics: weather (“Lovely day, is it not?”), weekend (“Any plans?”), and the classic closer “Well, good talking to you!”',
    ],
    questions: [
      MCQ(
        '“How is it going?” is…',
        'A casual hello',
        ['A casual hello', 'A goodbye', 'A complaint', 'A question about travel'],
        'Answer it like “Pretty good!” — nobody wants a medical report.'
      ),
      BUILD(
        'Greet someone for the first time:',
        ['Nice', 'to', 'meet', 'you'],
        ['you', 'Nice', 'meet', 'to', 'see'],
        'First meeting = Nice to meet you. Later = Good to SEE you.'
      ),
      MCQ(
        '“Any plans for the weekend?” is…',
        'Friendly small talk',
        ['Friendly small talk', 'A job interview', 'A complaint', 'A farewell'],
        'Weekend plans: the universal friendly filler.'
      ),
      BUILD(
        'Close a chat warmly:',
        ['Good', 'talking', 'to', 'you'],
        ['you', 'Good', 'to', 'talking', 'bye'],
        '“Good talking to you!” ends any chat on a smile.'
      ),
      MCQ(
        'A friend you know says hello. You reply…',
        'Good to see you!',
        ['Good to see you!', 'Nice to meet you!', 'Who are you?', 'See you never!'],
        'Nice to MEET you is first-time only — then it is Good to SEE you.'
      ),
    ],
  },

  'english-numbers-time': {
    id: 'english-numbers-time',
    title: 'Numbers, Time & Dates',
    theory: [
      'Count with confidence: eleven to twenty are rebels (eleven, twelve, thirteen…), then the pattern locks: twenty-one, thirty-two. Hundreds and thousands stack: two hundred and five, three thousand.',
      'Tell time two ways: “half past three” or “three thirty”; “quarter to five” or “four forty-five”. Dates flip the order: Monday the 3rd of June. At, on, in: at 5pm, on Monday, in June.',
    ],
    questions: [
      MCQ(
        '“Twelve” is the number…',
        '12',
        ['12', '20', '2', '11'],
        'Eleven 11, twelve 12 — then thirteen adds the -teen.'
      ),
      BUILD(
        'Say “twenty-one”:',
        ['twenty-one'],
        ['twenty-one', 'twelve', 'twenty-two', 'thirty-one'],
        'Tens + units with a hyphen: twenty-one, forty-five.'
      ),
      MCQ(
        '“Half past three” means…',
        '3:30',
        ['3:30', '2:30', '3:15', '4:30'],
        'Half past = 30 minutes after the hour.'
      ),
      BUILD(
        'Say the date “Monday the 3rd of June”:',
        ['Monday', 'the', '3rd'],
        ['3rd', 'Monday', 'June', 'the'],
        'Day first, then the + ordinal: Monday the 3rd.'
      ),
      MCQ(
        '“___ Monday” — pick the right preposition.',
        'on',
        ['on', 'at', 'in', 'by'],
        'On + days, at + clock times, in + months and years.'
      ),
    ],
  },

  'english-articles': {
    id: 'english-articles',
    title: 'Articles & Pointing Words',
    theory: [
      'A/an introduces something new (“I saw a dog”), the points at something known (“The dog was big”). This/these stay close, that/those stand far: this book here, that shop over there.',
      'An before vowel SOUNDS (an hour, an honest man), a elsewhere. These/those are simply the plurals of this/that.',
    ],
    questions: [
      MCQ(
        '“I saw ___ elephant.” Fill the gap.',
        'an',
        ['an', 'a', 'the', 'no word needed'],
        'Elephant starts with a vowel sound → an elephant.'
      ),
      BUILD(
        'Point at a near book (one):',
        ['this', 'book'],
        ['book', 'that', 'this', 'those'],
        'This = near + singular. That = far + singular.'
      ),
      MCQ(
        '“Close the door” uses “the” because…',
        'Both speakers know which door',
        ['Both speakers know which door', 'Doors are always “the”', 'It is the first mention', 'A and an are plural'],
        'The = shared knowledge. First mention takes a/an.'
      ),
      BUILD(
        'Point at far shoes (many):',
        ['those', 'shoes'],
        ['shoes', 'these', 'those', 'that'],
        'Those = far + plural. These = near + plural.'
      ),
      MCQ(
        '“___ honest man” — a or an?',
        'an',
        ['an', 'a', 'the', 'none'],
        'Honest starts with a vowel SOUND (silent h) → an honest man.'
      ),
    ],
  },

  'english-food-shopping': {
    id: 'english-food-shopping',
    title: 'Food & Shopping',
    theory: [
      'Shop in English: “How much is this?” opens, “Too expensive — any discount?” bargains, “I will take it” closes. Countables take many/few (many apples), uncountables take much/little (much rice).',
      'Soften everything with please, excuse me, and sorry. “Could I have…?” beats “Give me…” in every country on Earth.',
    ],
    questions: [
      MCQ(
        '“How much is this?” asks for…',
        'The price',
        ['The price', 'The weight', 'The time', 'The name'],
        'How much = price. How many = quantity.'
      ),
      BUILD(
        'Order politely: “a coffee, please”:',
        ['Could', 'I', 'have'],
        ['have', 'Could', 'Give', 'I'],
        '“Could I have…?” — polite in every shop on Earth.'
      ),
      MCQ(
        '“Many apples” but “much rice” because…',
        'Apples are countable, rice is not',
        ['Apples are countable, rice is not', 'Rice is plural', 'Apples are cheap', 'Much is formal'],
        'Many/few + countables; much/little + uncountables.'
      ),
      BUILD(
        'Say you will buy it:',
        ['I', 'will', 'take', 'it'],
        ['it', 'I', 'take', 'will'],
        '“I will take it” — the deal is done. Smile included.'
      ),
      MCQ(
        'The price shocks you. Say…',
        'That is too expensive!',
        ['That is too expensive!', 'Give it free!', 'Too cheap!', 'No money!'],
        'Too + adjective states the problem; then bargain.'
      ),
    ],
  },

  'english-travel': {
    id: 'english-travel',
    title: 'Travel & Directions',
    theory: [
      'Never get lost: “Excuse me, where is…?” opens every direction. Go straight on, turn left/right, it is on your left — then “How far is it?” and “Thank you very much!”',
      'Book transport with “A ticket to…, please” and confirm “What time does it leave?” Single or return? Platform or gate? Ask twice, travel once.',
    ],
    questions: [
      MCQ(
        '“Turn left at the corner” means…',
        'Go left when you reach the corner',
        ['Go left when you reach the corner', 'Stop at the corner', 'Turn around now', 'Cross the road'],
        'Turn + direction + landmark: turn right at the bank.'
      ),
      BUILD(
        'Ask where the station is:',
        ['Where', 'is', 'the', 'station'],
        ['station', 'Where', 'the', 'is', 'what'],
        'Where is the…? — the traveller’s master key.'
      ),
      MCQ(
        '“It is on your right” means the place is…',
        'To your right-hand side',
        ['To your right-hand side', 'Behind you', 'Far away', 'Closed'],
        'On your left/right pins it to your own body.'
      ),
      BUILD(
        'Buy a ticket politely:',
        ['A', 'ticket', 'to', 'Lagos'],
        ['Lagos', 'A', 'to', 'ticket', 'please'],
        'A ticket to + place + please. Add “return” for round trip.'
      ),
      MCQ(
        '“What time does it leave?” asks for…',
        'The departure time',
        ['The departure time', 'The price', 'The platform', 'The arrival city'],
        'Leave = depart, arrive = get there. Mind both.'
      ),
    ],
  },

  'english-work': {
    id: 'english-work',
    title: 'Work & Jobs',
    theory: [
      'Talk shop: “I work as a…” names the role, “I work for…” names the company, “I am responsible for…” names the duty. Can = ability (“I can code”), could = past ability or polite request (“Could you help?”).',
      'Meetings run on three verbs: suggest (I suggest we…), agree (I agree because…), decide (We decided to…). Opinions welcome, evidence required.',
    ],
    questions: [
      MCQ(
        '“I work ___ a nurse.” Fill the gap.',
        'as',
        ['as', 'for', 'to', 'like'],
        'As + role, for + company: I work as a nurse for City Hospital.'
      ),
      BUILD(
        'State an ability:',
        ['I', 'can', 'type'],
        ['type', 'I', 'could', 'can'],
        'Can + base verb: I can drive, she can cook.'
      ),
      MCQ(
        '“Could you help me?” is…',
        'A polite request',
        ['A polite request', 'Past ability', 'A complaint', 'An order'],
        'Could softens requests; can states raw ability.'
      ),
      BUILD(
        'Name a duty: “reports every Friday”:',
        ['responsible', 'for', 'reports'],
        ['reports', 'responsible', 'of', 'for'],
        'Responsible for + -ing/duty: responsible for reports.'
      ),
      MCQ(
        '“We decided to launch” means the team…',
        'Made a decision',
        ['Made a decision', 'Had an idea', 'Disagreed', 'Delayed'],
        'Decide + to + verb: decided to launch, agreed to wait.'
      ),
    ],
  },

  'english-past-stories': {
    id: 'english-past-stories',
    title: 'Past Stories',
    theory: [
      'Tell what happened: past simple for finished events (I went, she bought), past continuous for the background scene (It was raining). Ago counts backwards: two days ago, a week ago.',
      'Irregulars steal the show: go → went, eat → ate, see → saw, buy → bought. No -ed, no mercy — memorise the rebels.',
    ],
    questions: [
      MCQ(
        '“She ___ a new phone yesterday.”',
        'bought',
        ['bought', 'buy', 'buys', 'buyed'],
        'Buy → bought. Yesterday demands the true past form.'
      ),
      BUILD(
        'Set the background scene:',
        ['It', 'was', 'raining'],
        ['raining', 'It', 'is', 'was'],
        'Was/were + -ing paints the background; simple past fires events.'
      ),
      MCQ(
        '“Three days ago” means…',
        'Three days before now',
        ['Three days before now', 'In three days', 'For three days', 'Every three days'],
        'Ago always looks backwards from today.'
      ),
      BUILD(
        'Say “We saw a lion”:',
        ['We', 'saw', 'a', 'lion'],
        ['lion', 'We', 'seed', 'saw', 'a'],
        'See → saw. Never “seed” — the rebels refuse -ed.'
      ),
      MCQ(
        '“I was cooking when he arrived” — the cooking was…',
        'Already in progress',
        ['Already in progress', 'Finished first', 'Cancelled', 'Planned later'],
        'Past continuous = in progress; past simple = the interruption.'
      ),
    ],
  },

  'english-final': {
    id: 'english-final',
    title: 'English Final Exam',
    theory: ['Final exam: greetings, numbers, articles, shopping, travel, work, and past stories — the whole comprehensive course.'],
    questions: [
      MCQ(
        'A stranger greets you with “How is it going?” You answer…',
        'Pretty good, you?',
        ['Pretty good, you?', 'I am going home.', 'It goes well.', 'What going?'],
        'Casual hello → casual bounce-back. Keep it light.'
      ),
      BUILD(
        'Point at near shoes (many):',
        ['these', 'shoes'],
        ['shoes', 'those', 'these', 'that'],
        'These = near + plural. Those wave from far away.'
      ),
      MCQ(
        '“She ___ TV every evening.”',
        'watches',
        ['watches', 'watch', 'watching', 'watched'],
        'She + habit → -es after -ch: she watches.'
      ),
      BUILD(
        'Ask the price politely:',
        ['How', 'much', 'is', 'this'],
        ['this', 'How', 'is', 'much'],
        'How much is this? — then “Could I have…?” to close.'
      ),
      MCQ(
        '“We ___ a lion on safari.” (past)',
        'saw',
        ['saw', 'see', 'seed', 'seen'],
        'See → saw. The rebels never take -ed.'
      ),
      BUILD(
        'State your job: “a driver for City Cabs”:',
        ['work', 'as', 'a', 'driver'],
        ['driver', 'work', 'for', 'as', 'a'],
        'Work AS a role, FOR a company. Both halves win.'
      ),
    ],
  },

  'english-questions': {
    id: 'english-questions',
    title: 'English Questions & Negatives',
    theory: [
      'Present simple questions use do or does + base verb: Do you work here? Does she live in Nairobi? Past questions use did + base verb: Did they arrive?',
      'Negatives use don’t, doesn’t or didn’t + base verb: I don’t drive. She doesn’t work here. They didn’t call. Never add -s or -ed after the auxiliary.',
      'Question-word order is question word + auxiliary + subject + verb: Where does he live? Why did you call? Short answers repeat the auxiliary: Yes, I do. / No, she doesn’t.',
    ],
    questions: [
      MCQ(
        '“___ she live in Mombasa?”',
        'Does',
        ['Does', 'Do', 'Is', 'Did'],
        'She is third-person singular, so present simple takes does + live.'
      ),
      BUILD(
        'Make it negative: “He works on Sundays.”',
        ['He', "doesn't", 'work', 'on', 'Sundays'],
        ['He', "doesn't", 'work', 'works', 'on', 'Sundays'],
        'The auxiliary carries the tense; work stays in the base form — doesn’t work.'
      ),
      MCQ(
        'Choose the correct question.',
        'Where does he live?',
        ['Where does he live?', 'Where he does live?', 'Where does he lives?', 'Where do he live?'],
        'Question word + auxiliary + subject + base verb: where + does + he + live.'
      ),
      BUILD(
        'Ask about the past: “Did you eat?”',
        ['Did', 'you', 'eat'],
        ['eat', 'Did', 'you', 'ate'],
        'After did, use the base verb: Did you eat? Never Did you ate?'
      ),
      MCQ(
        '“No, she doesn’t.” answers…',
        'Does she…?',
        ['Does she…?', 'Do she…?', 'Is she…?', 'Did she…?'],
        'Short answers echo the auxiliary and tense of the question — does in, doesn’t out.'
      ),
    ],
  },

  'english-comparing': {
    id: 'english-comparing',
    title: 'English Describing & Comparing',
    theory: [
      'Adjectives go before the noun and do not take a plural -s: two big dogs, a quiet room.',
      'Short adjectives compare with -er + than (cheaper than, taller than); longer ones use more (more expensive than). Irregulars: good → better → best, bad → worse → worst.',
      'as … as shows equality: She is as tall as her brother. Too means more than you want; enough means sufficient: too hot, warm enough.',
    ],
    questions: [
      MCQ(
        'Which phrase is correct?',
        'two big dogs',
        ['two big dogs', 'two bigs dogs', 'two dogs big', 'two big dog'],
        'The adjective stays singular and sits before the noun: two big dogs.'
      ),
      BUILD(
        'Compare: “This bag is cheaper than that one.”',
        ['This', 'bag', 'is', 'cheaper', 'than', 'that', 'one'],
        ['cheaper', 'This', 'bag', 'is', 'than', 'that', 'one', 'cheapest'],
        'One-syllable adjective + -er + than: cheaper than. Cheapest is the superlative.'
      ),
      MCQ(
        '“More expensive” is the comparative of…',
        'expensive',
        ['expensive', 'expensiver', 'most expensive', 'expense'],
        'Long adjectives take more, not -er: more expensive than.'
      ),
      BUILD(
        'Say “She is as tall as her brother.”',
        ['She', 'is', 'as', 'tall', 'as', 'her', 'brother'],
        ['tall', 'She', 'is', 'as', 'taller', 'as', 'her', 'brother'],
        'as + adjective + as shows equality; taller belongs to a than comparison.'
      ),
      MCQ(
        '“The soup is too hot” means…',
        'It is hotter than I want',
        ['It is hotter than I want', 'It is exactly right', 'It is not hot', 'It is the hottest soup'],
        'Too = more than is wanted. Enough would mean it is acceptable.'
      ),
    ],
  },

  'english-health': {
    id: 'english-health',
    title: 'English Health & Emergencies',
    theory: [
      'Say where it hurts with have or hurt: I have a headache. My back hurts. It hurts here. I feel dizzy.',
      'Ask for help: I need a doctor. Could you call an ambulance? Where is the nearest pharmacy? I’m allergic to peanuts.',
      'Give advice with should + base verb: You should rest. You shouldn’t drive. Should never takes -s or -ed.',
    ],
    questions: [
      MCQ(
        'You have a bad headache. You say…',
        'I have a headache.',
        ['I have a headache.', 'I am a headache.', 'My headache has me.', 'I do a headache.'],
        'Use have for symptoms: I have a headache / a fever / a cough.'
      ),
      BUILD(
        'Ask for a doctor: “I need a doctor.”',
        ['I', 'need', 'a', 'doctor'],
        ['doctor', 'I', 'need', 'a', 'medicine'],
        'I need a doctor — clear, direct, and understood everywhere.'
      ),
      MCQ(
        '“I’m allergic to peanuts” means…',
        'Peanuts make me ill',
        ['Peanuts make me ill', 'I love peanuts', 'I am carrying peanuts', 'Peanuts are expensive'],
        'Allergic means the body reacts badly — avoid the food and tell the staff.'
      ),
      BUILD(
        'Give advice: “You should rest.”',
        ['You', 'should', 'rest'],
        ['rest', 'You', 'should', 'rested'],
        'Should + base verb: should rest. Never should rested or should rests.'
      ),
      MCQ(
        'Choose the polite emergency request.',
        'Could you call an ambulance?',
        ['Could you call an ambulance?', 'Call ambulance now!', 'You call ambulance.', 'Ambulance calling?'],
        'Could you…? is the polite request; the emergency itself stays urgent and clear.'
      ),
    ],
  },
};
