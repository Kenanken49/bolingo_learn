/**
 * English expansion — Course 4 (comprehensive ESL set).
 * Original lessons written for Bolingo; sequencing follows standard
 * beginner-ESL syllabi (greetings → numbers/time → determiners → daily
 * life → travel → work → past narration → final exam). Definitions for
 * lesson words are covered by the bundled offline dictionary
 * (assets/dict/en.json, English WordNet 2024 glosses).
 */
import { MCQ, BUILD, TEXT, MATCH, LISTEN, SPEAK, type CourseLesson } from './quizBank';

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
      MATCH(
        'Pair each phrase with the moment it belongs to.',
        [
          { left: 'How is it going', right: 'A casual hello that wants no report' },
          { left: 'Nice to meet you', right: 'Meeting someone for the first time' },
          { left: 'Good to see you', right: 'Greeting someone you already know' },
          { left: 'Any plans', right: 'Friendly small talk about the weekend' },
          { left: 'Good talking to you', right: 'Ending the conversation' },
        ],
        'English small talk is a sequence: open, ask lightly, then close. Nice to meet you only fits the very first link.'
      ),
      LISTEN(
        'Listen and type the casual greeting.',
        'How is it going',
        ['How is it going'],
        'In fast speech this collapses toward howzitgoing — the sounds blur but the words never change.',
        { misconceptions: { 'How it is going': 'The question keeps the verb before the subject: how IS IT going.' } }
      ),
      SPEAK(
        'Greet someone you have just been introduced to, out loud.',
        'Nice to meet you',
        'Link meet straight into you — meech-oo — and let the t of to disappear; no English speaker says each word separately here.'
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
      MATCH(
        'Pair each number word with its value.',
        [
          { left: 'Thirteen', right: '13' },
          { left: 'Twenty', right: '20' },
          { left: 'Thirty', right: '30' },
          { left: 'Hundred', right: '100' },
          { left: 'Thousand', right: '1000' },
        ],
        'Thirteen and thirty are the famous ear-trap: the stress sits on THIR-teen versus THREE-ty, and that is the only difference.'
      ),
      LISTEN(
        'Listen and type the time being said.',
        'It is half past three',
        ['It is half past three'],
        'Half past three is 3:30 — thirty minutes after the hour named last.',
        { misconceptions: { 'It is three thirty': 'That is the same minute spoken the other way; the recording used half past three.' } }
      ),
      SPEAK(
        'Say the time just before five, out loud.',
        'It is quarter to five',
        'Quarter takes a flap in American speech — KWER-er — and to reduces to a schwa: tuh five.'
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
      MATCH(
        'Pair each pointing word with the job it does.',
        [
          { left: 'A', right: 'Something new, before a consonant sound' },
          { left: 'An', right: 'Something new, before a vowel sound' },
          { left: 'The', right: 'Both speakers already know which one' },
          { left: 'This', right: 'One thing, near me' },
          { left: 'Those', right: 'Many things, far away' },
        ],
        'A and an answer sound, not spelling: a university, an hour. The answers shared knowledge.'
      ),
      LISTEN(
        'Listen and type what was seen at the zoo.',
        'I saw an elephant',
        ['I saw an elephant'],
        'An glues onto the vowel of elephant — one running sound, anelephant — which is why learners often miss where the article ends.'
      ),
      SPEAK(
        'Describe a trustworthy person, out loud.',
        'He is an honest man',
        'The h in honest is silent: AN-ONN-est. If you breathe the h, the article has to be a, and that is what gives the accent away.'
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
      MATCH(
        'Pair each shopping phrase with what it does.',
        [
          { left: 'How much is this', right: 'Ask the price' },
          { left: 'Could I have a coffee', right: 'Order without demanding' },
          { left: 'Many apples', right: 'Countables take many' },
          { left: 'Much rice', right: 'Uncountables take much' },
          { left: 'I will take it', right: 'Close the deal' },
        ],
        'Could I have…? is the sentence that makes any shop staff smile; Give me… is the sentence that makes them wary.'
      ),
      LISTEN(
        'Listen and type the polite order.',
        'Could I have a coffee please',
        ['Could I have a coffee please'],
        'Could reduces to cud and I have runs as eye-uv — the politeness is in the words, not in the emphasis.'
      ),
      SPEAK(
        'Ask the price of something in your hand, out loud.',
        'How much is this',
        'Much ends on the ch sound — muuch — and this keeps its final s voiceless; do not let it drift into "thiz".'
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
      MATCH(
        'Pair each direction phrase with what it tells you.',
        [
          { left: 'Go straight on', right: 'Keep walking forward' },
          { left: 'Turn left at the corner', right: 'Change direction at a landmark' },
          { left: 'It is on your right', right: 'Pin the place to your own body' },
          { left: 'How far is it', right: 'Ask about distance' },
          { left: 'What time does it leave', right: 'Ask about departure' },
        ],
        'Directions use landmark grammar: turn + direction + at + place. Ask twice — distance and time are different questions.'
      ),
      LISTEN(
        'Listen and type the question a traveller asks first.',
        'Excuse me where is the station',
        ['Excuse me where is the station'],
        'Excuse me opens the conversation; the station is the shared the because both speakers know which one is meant.'
      ),
      SPEAK(
        'Give someone the turn, out loud.',
        'Turn left at the corner',
        'Turn starts with the r-colored vowel — TURN, tongue curled, no t-u split — and at the reduces to uh-theh.'
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
      MATCH(
        'Pair each work phrase with what it names.',
        [
          { left: 'I work as a nurse', right: 'The role' },
          { left: 'I work for City Hospital', right: 'The employer' },
          { left: 'I am responsible for reports', right: 'The duty' },
          { left: 'I can code', right: 'An ability you have now' },
          { left: 'Could you help me', right: 'A request, softened' },
        ],
        'As names the job, for names the company. Can states ability; could is either past ability or politeness.'
      ),
      LISTEN(
        'Listen and type where she works.',
        'She works for City Hospital',
        ['She works for City Hospital'],
        'The -s on works is audible and obligatory: she WORKS. Dropping it is the single most common workplace-English slip.'
      ),
      SPEAK(
        'Name your duty at work, out loud.',
        'I am responsible for reports',
        'Re-SPON-si-bl puts the weight on the second syllable, and responsible for runs together as one breath.'
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
      MATCH(
        'Pair each irregular verb with its past form.',
        [
          { left: 'Go', right: 'Went' },
          { left: 'Eat', right: 'Ate' },
          { left: 'See', right: 'Saw' },
          { left: 'Buy', right: 'Bought' },
          { left: 'It was raining', right: 'The background scene' },
        ],
        'The rebels share one rule: no -ed, ever. Bought is spelled with a silent -ght, which is why it looks longer than it sounds.'
      ),
      LISTEN(
        'Listen and type the story about the safari.',
        'We saw a lion two days ago',
        ['We saw a lion two days ago'],
        'Saw is the past of see, and ago always counts backwards from today — two days ago, not two days from now.'
      ),
      SPEAK(
        'Say what someone bought yesterday, out loud.',
        'She bought a new phone',
        'Bought is one syllable — bawt — with no g sound and no ht sound. Pronouncing the letters you see is the giveaway of a reader, not a speaker.'
      ),
    ],
  },

  'english-final': {
    id: 'english-final',
    title: 'English Final Exam',
    theory: [
      'Final exam: greetings, numbers, articles, shopping, travel, work, questions, describing and comparing, health, and past stories — the whole comprehensive course.',
    ],
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
      BUILD(
        'Ask about the past: “Where did he go?”',
        ['Where', 'did', 'he', 'go'],
        ['go', 'Where', 'did', 'he', 'went'],
        'After did the verb stays in the base form: did he go, never did he went.'
      ),
      MCQ(
        'Which sentence is correct?',
        'This room is more comfortable than mine.',
        [
          'This room is more comfortable than mine.',
          'This room is comfortabler than mine.',
          'This room is most comfortable than mine.',
          'This room is more comfortable that mine.',
        ],
        'Long adjectives take more … than; -er belongs to short ones like cheaper.'
      ),
      BUILD(
        'Say “I am allergic to peanuts”:',
        ['I', 'am', 'allergic', 'to', 'peanuts'],
        ['peanuts', 'I', 'am', 'allergic', 'to', 'allergy'],
        'I am allergic to + the food. Allergy is the noun; allergic is the adjective.'
      ),
      MCQ(
        'You arrive at a hotel with a reservation. Which check-in line is most professional?',
        'Hi, I have a reservation under Chen.',
        [
          'Hi, I have a reservation under Chen.',
          'Give me my room, Chen.',
          'I am Chen and I want a room now.',
          'Reservation? Chen. Room.',
        ],
        'Name, reservation, and the name it is under — complete, calm, and easy for the desk to check.'
      ),
      TEXT(
        'Type the past tense of the verb “buy”.',
        ['bought'],
        'Buy is irregular: buy → bought. “Buyed” is never correct, even though it sounds plausible.',
        { misconceptions: { buyed: 'Buy is irregular: the past tense is bought, not buyed.' } }
      ),
      MATCH(
        'Pair each course item with the rule it proves.',
        [
          { left: 'Bought', right: 'Irregular past, no -ed' },
          { left: 'Doesn’t work', right: 'After the auxiliary the verb stays bare' },
          { left: 'More comfortable', right: 'Long adjectives take more' },
          { left: 'An hour', right: 'An before a vowel sound, silent h counts' },
          { left: 'Allergic to peanuts', right: 'The preposition allergic demands' },
        ],
        'The final is five rules from five units — each one a mistake that non-native speakers still make after ten years.'
      ),
      LISTEN(
        'Listen and type the question about his home.',
        'Where does he live',
        ['Where does he live'],
        'Does carries the tense, so live stays bare: where DOES he LIVE. Two -s endings would be double-marking.'
      ),
      SPEAK(
        'Talk about yesterday, out loud.',
        'I didn’t go to work',
        'Didn’t ends on a t and flows straight into go; after didn’t the verb is bare, so the past lives only in the auxiliary.'
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
      MATCH(
        'Pair each auxiliary with the sentence it belongs to.',
        [
          { left: 'Do', right: 'Present question with you, we or they' },
          { left: 'Does', right: 'Present question with he, she or it' },
          { left: 'Did', right: 'Any past question' },
          { left: 'Don’t', right: 'Negative for I, you, we or they' },
          { left: 'Doesn’t', right: 'Negative for he, she or it' },
        ],
        'One tense marker per clause: does already carries the third person, so the main verb never adds an -s on top.'
      ),
      LISTEN(
        'Listen and type the question about her.',
        'Does she live in Mombasa',
        ['Does she live in Mombasa'],
        'Does + she + live: the -es ending on does is the only place the third person appears.'
      ),
      SPEAK(
        'Ask why someone rang, out loud.',
        'Why did you call',
        'Did you links as did-ya, and call keeps its pure final l — the past is already inside did, so no -ed anywhere.'
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
      MATCH(
        'Pair each comparative pattern with what it compares.',
        [
          { left: 'Cheaper than', right: 'A short adjective taking -er' },
          { left: 'More expensive than', right: 'A long adjective taking more' },
          { left: 'As tall as', right: 'Equality — no difference at all' },
          { left: 'The best', right: 'The superlative of good' },
          { left: 'Worse than', right: 'The comparative of bad' },
        ],
        'One or two syllables take -er; three take more. Good and bad refuse both patterns entirely.'
      ),
      LISTEN(
        'Listen and type the comparison between the rooms.',
        'This room is bigger than mine',
        ['This room is bigger than mine'],
        'Big doubles the g before -er: bigger. The written -er is pronounced as a soft r, never a hard err.'
      ),
      SPEAK(
        'Say the two of you are equal height, out loud.',
        'She is as tall as her brother',
        'The two as sounds reduce to uhz — uz-TALL-uhz — which is why the sentence sounds shorter than it looks.'
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
      MATCH(
        'Pair each health phrase with what the clinician hears.',
        [
          { left: 'I have a headache', right: 'A symptom you carry' },
          { left: 'My back hurts', right: 'Pain named by body part' },
          { left: 'You should rest', right: 'Advice' },
          { left: 'I am allergic to peanuts', right: 'A warning before any food' },
          { left: 'Could you call an ambulance', right: 'A request that stays polite under pressure' },
        ],
        'Have carries symptoms, hurt is the verb the body part owns, and should never takes -s or -ed.'
      ),
      LISTEN(
        'Listen and type the question about medicine.',
        'Where is the nearest pharmacy',
        ['Where is the nearest pharmacy'],
        'Nearest is near plus the superlative -est, and pharmacy stresses the first syllable: FARM-uh-see.'
      ),
      SPEAK(
        'Give someone firm advice, out loud.',
        'You shouldn’t drive',
        'Shouldn’t loses the l-d sound entirely — SHUDDNT — and drive stays bare because should never takes a past form.'
      ),
    ],
  },
};
