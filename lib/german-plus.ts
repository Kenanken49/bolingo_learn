/**
 * German expansion — Course 4 (comprehensive set).
 * Original lessons written for Bolingo; sequencing follows standard
 * beginner-German (A1) syllabi. Merged into LANGUAGE_COURSES in
 * lib/languages.ts — quiz, SRS, and guidebook work unchanged.
 */
import { MCQ, BUILD, TEXT, MATCH, LISTEN, SPEAK, type CourseLesson } from './quizBank';

export const GERMAN_PLUS: Record<string, CourseLesson> = {
  'german-greetings': {
    id: 'german-greetings',
    title: 'German Greetings & Politeness',
    theory: [
      'Hallo fits everywhere; Guten Morgen (morning), Guten Tag (day), Guten Abend (evening) ride the clock. Wie geht’s? asks a friend, Wie geht es Ihnen? respects an elder — du for friends, Sie for respect.',
      'Always land with bitte, danke, and Entschuldigung. Gern geschehen answers danke; Willkommen welcomes all.',
    ],
    questions: [
      MCQ(
        '“Guten Abend” is said…',
        'In the evening',
        ['In the evening', 'In the morning', 'At noon', 'Only at bedtime'],
        'Morgen → Tag → Abend: morning, day, evening.'
      ),
      BUILD(
        'Ask a friend “How is it going?”:',
        ['Wie', 'geht’s'],
        ['geht’s', 'Wie', 'geht', 'Ihnen'],
        'Wie geht’s? — du form, friends and family.'
      ),
      MCQ(
        '“Wie geht es Ihnen?” differs from “Wie geht’s?” in…',
        'Formality',
        ['Formality', 'Tense', 'Number', 'Speed'],
        'Sie (capital S) = respect. du = friends.'
      ),
      BUILD(
        'Answer “thanks” with “you are welcome”:',
        ['Gern', 'geschehen'],
        ['geschehen', 'Gern', 'Danke', 'Bitte'],
        'Danke → Gern geschehen. A tiny perfect pair.'
      ),
      MCQ(
        '“Willkommen!” means…',
        'Welcome!',
        ['Welcome!', 'Goodbye!', 'Good luck!', 'Congratulations!'],
        'Willkommen opens every home, shop, and classroom.'
      ),
      MATCH(
        'Pair each German phrase with the moment it fits.',
        [
          { left: 'Hallo', right: 'Any hour of the day' },
          { left: 'Guten Morgen', right: 'Before noon' },
          { left: 'Guten Tag', right: 'Daytime' },
          { left: 'Guten Abend', right: 'After the light fades' },
          { left: 'Entschuldigung', right: 'You bumped into someone' },
        ],
        'German greets by clock, not by mood. Entschuldigung is the apology; bitte is never the apology.'
      ),
      LISTEN(
        'Listen and type the formal question about how someone is.',
        'Wie geht es Ihnen',
        ['Wie geht es Ihnen'],
        'Ihnen is the formal you — the capital I is what marks respect; wie geht’s drops it all for friends.',
        { misconceptions: { 'Wie geht es dir': 'Dir is the friend form — the recording used the formal Ihnen.' } }
      ),
      SPEAK(
        'Thank someone warmly, out loud.',
        'Danke schön',
        'The ch in schön is the soft sh sound — DAHN-keh shurn — and stress sits on schön.'
      ),
    ],
  },

  'german-numbers-time': {
    id: 'german-numbers-time',
    title: 'German Numbers & Time',
    theory: [
      'Count: eins, zwei, drei, vier, fünf, sechs, sieben, acht, neun, zehn — then zwanzig, dreißig… hundert. Es ist drei Uhr = it is 3 o’clock; halb vier = half past THREE (halfway TO four!).',
      'Days run Montag to Sonntag; Monate Januar to Dezember. Heute = today, morgen = tomorrow, gestern = yesterday.',
    ],
    questions: [
      MCQ(
        '“Sieben” means…',
        'Seven',
        ['Seven', 'Six', 'Eight', 'Seventeen'],
        'Sechs 6, sieben 7, acht 8 — chant the run.'
      ),
      BUILD(
        'Say “It is 3 o’clock”:',
        ['Es', 'ist', 'drei', 'Uhr'],
        ['Uhr', 'Es', 'drei', 'ist', 'sind'],
        'Es ist + number + Uhr. Half past is halb + NEXT hour.'
      ),
      MCQ(
        '“Halb vier” means…',
        '3:30',
        ['3:30', '4:30', '4:00', '3:00'],
        'Halb vier = halfway to four = 3:30. Famous trap!'
      ),
      BUILD(
        'Say “tomorrow”:',
        ['Morgen'],
        ['Gestern', 'Morgen', 'Heute', 'Abend'],
        'Gestern → heute → morgen: yesterday, today, tomorrow.'
      ),
      MCQ(
        '“Viertel nach drei” means…',
        'Quarter past three',
        ['Quarter past three', 'Quarter to three', 'Half past three', 'Three quarters'],
        'Viertel nach = quarter past; vor = to.'
      ),
      MATCH(
        'Pair each German number with its value.',
        [
          { left: 'Sieben', right: '7' },
          { left: 'Acht', right: '8' },
          { left: 'Neun', right: '9' },
          { left: 'Zehn', right: '10' },
          { left: 'Zwanzig', right: '20' },
        ],
        'Sieben keeps its stress on the first syllable, and -zig becomes -ßig in writing: zwanzig, dreißig.'
      ),
      LISTEN(
        'Listen and type the time being announced.',
        'Es ist halb vier',
        ['Es ist halb vier'],
        'Halb vier is 3:30 — halfway toward four, not half past four.',
        { misconceptions: { 'Es ist vier Uhr': 'Halb vier names the hour you are approaching, so it is half past three.' } }
      ),
      SPEAK(
        'Say what time it is, out loud.',
        'Es ist halb acht',
        'Acht starts with a hard glottal stop — ah-kt — and halb keeps its a long: HALP aht.'
      ),
    ],
  },

  'german-food': {
    id: 'german-food',
    title: 'German Food & Drink',
    theory: [
      'Order like a Berliner: Ich möchte… (I would like…), Die Rechnung, bitte (the bill, please). Das Brot, der Käse, der Kaffee, die Milch, der Reis, das Hähnchen — hunger solved.',
      'Ich habe Hunger = I am hungry (I HAVE hunger), ich habe Durst = thirsty. Ich mag = I like; ich liebe = I love. Articles matter: der/die/das!',
    ],
    questions: [
      MCQ(
        '“Der Käse” means…',
        'The cheese',
        ['The cheese', 'The bread', 'The fish', 'The chicken'],
        'Käse = cheese, Brot = bread, Fisch = fish.'
      ),
      BUILD(
        'Say “I would like coffee” politely:',
        ['Ich', 'möchte', 'Kaffee'],
        ['Kaffee', 'Ich', 'möchte', 'will'],
        'Ich möchte = polished wanting. Ich will = blunt.'
      ),
      MCQ(
        '“Ich habe Hunger” literally means…',
        'I have hunger',
        ['I have hunger', 'I eat hunger', 'I am hunger', 'My hunger eats'],
        'German HAS hunger and thirst: Hunger, Durst.'
      ),
      BUILD(
        'Ask for the bill politely:',
        ['Die', 'Rechnung'],
        ['Rechnung', 'Die', 'Speisekarte', 'Das'],
        'Die Rechnung, bitte — the magic exit words.'
      ),
      MCQ(
        '“Das Hähnchen” means…',
        'The chicken',
        ['The chicken', 'The fish', 'The bread', 'The rice'],
        'Neuter das for Hähnchen; der for Käse. Learn noun + article!'
      ),
      MATCH(
        'Pair each grocery word with its article and meaning.',
        [
          { left: 'Das Brot', right: 'Bread' },
          { left: 'Der Käse', right: 'Cheese' },
          { left: 'Die Milch', right: 'Milk' },
          { left: 'Der Kaffee', right: 'Coffee' },
          { left: 'Das Hähnchen', right: 'Chicken' },
        ],
        'The article is part of the noun: der, die, das decide how every later sentence agrees. Learn Brot and Käse as whole chunks.'
      ),
      LISTEN(
        'Listen and type the polite order.',
        'Ich möchte einen Kaffee',
        ['Ich möchte einen Kaffee', 'Ich moechte einen Kaffee'],
        'Möchte is the polite want, and einen marks Kaffee as the masculine accusative object — what you want wears -en.',
        { misconceptions: { 'Ich möchte ein Kaffee': 'Kaffee is masculine, so the accusative is einen, not ein.' } }
      ),
      SPEAK(
        'Order coffee the polite way, out loud.',
        'Ich möchte einen Kaffee',
        'Möchte is two syllables with the soft ch: IRKH MEH-ktuh; adding bitte turns the order into a request.'
      ),
    ],
  },

  'german-travel': {
    id: 'german-travel',
    title: 'German Travel & Directions',
    theory: [
      'Move with precision: Wo ist…? (where is…?), links (left), rechts (right), geradeaus (straight). Der Bahnhof, der Flughafen, das Hotel, die Toilette — the big four.',
      'Ride anything: der Bus, der Zug, das Taxi. Wie viel kostet das? (how much?), Wann fährt er ab? (when does it leave?).',
    ],
    questions: [
      MCQ(
        '“Wo ist der Bahnhof?” asks for…',
        'The station’s location',
        ['The station’s location', 'The station’s price', 'Station time', 'A farm road'],
        'Wo = where. Wo ist…? unlocks every city.'
      ),
      BUILD(
        'Say “to the left”:',
        ['Nach', 'links'],
        ['links', 'Nach', 'rechts', 'geradeaus'],
        'Links = left, rechts = right, geradeaus = straight.'
      ),
      MCQ(
        '“Wie viel kostet das?” asks for…',
        'The price',
        ['The price', 'The time', 'The weight', 'The name'],
        'Wie viel = how much. Kostet = costs.'
      ),
      BUILD(
        'Ask where the hotel is:',
        ['Wo', 'ist', 'Hotel'],
        ['Hotel', 'Wo', 'das', 'ist'],
        'Wo ist…? + place. Das Hotel, der Bahnhof.'
      ),
      MCQ(
        '“Der Zug” means…',
        'The train',
        ['The train', 'The bus', 'The taxi', 'The plane'],
        'Zug = train, Bus = bus, Flugzeug = plane.'
      ),
      MATCH(
        'Pair each travel word with what it gives you.',
        [
          { left: 'Nach links', right: 'Turn left' },
          { left: 'Nach rechts', right: 'Turn right' },
          { left: 'Geradeaus', right: 'Keep going straight' },
          { left: 'Der Bahnhof', right: 'Catch a train here' },
          { left: 'Wie viel', right: 'Ask the price' },
        ],
        'Links and rechts are mirror words that must be instant; wie viel asks cost while wo asks place.'
      ),
      LISTEN(
        'Listen and type the question about the station.',
        'Wo ist der Bahnhof',
        ['Wo ist der Bahnhof'],
        'Wo ist + the noun with its article: der Bahnhof. Asking without the article still works, but the article is what you will be understood by.',
        { misconceptions: { 'Wo ist das Bahnhof': 'Bahnhof is masculine: der Bahnhof, never das.' } }
      ),
      SPEAK(
        'Give someone the route, out loud.',
        'Geradeaus und dann links',
        'Geradeaus is stress-last (guh-rah-DOWS), dann links is short and flat — direction-giving in German never decorates.'
      ),
    ],
  },

  'german-family': {
    id: 'german-family',
    title: 'German Family & Descriptions',
    theory: [
      'Meet die Familie: die Mutter, der Vater, der Bruder, die Schwester, der Sohn, die Tochter, der Freund. Mein/meine = my, dein/deine = your, sein/seine = his.',
      'Describe with sein + adjective, matching gender and case: groß, klein, glücklich. Ich bin groß = I am tall. Capitalize every noun — always!',
    ],
    questions: [
      MCQ(
        '“Die Schwester” means…',
        'The sister',
        ['The sister', 'The brother', 'The mother', 'The daughter'],
        'Schwester = sister, Bruder = brother. Die Familie grows.'
      ),
      BUILD(
        'Say “my brothers” (more than one):',
        ['Meine', 'Brüder'],
        ['Brüder', 'Mein', 'Meine', 'Dein'],
        'Mein → meine before plurals/feminine: meine Brüder.'
      ),
      MCQ(
        '“Ich bin groß” is said by…',
        'A tall person',
        ['A tall person', 'A big group', 'A tall building', 'Anyone large'],
        'Groß = tall/big, klein = small, glücklich = happy.'
      ),
      BUILD(
        'Say “your (friend’s) mother”:',
        ['Deine', 'Mutter'],
        ['Mutter', 'Seine', 'Deine', 'Meine'],
        'Deine = your (friend), seine = his. Mutter = mother.'
      ),
      MCQ(
        '“Der Sohn” means…',
        'The son',
        ['The son', 'The daughter', 'The father', 'The sun'],
        'Sohn = son, Tochter = daughter. (Die Sonne = the sun!)'
      ),
      MATCH(
        'Pair each family word with who it names.',
        [
          { left: 'Die Mutter', right: 'Mother' },
          { left: 'Der Vater', right: 'Father' },
          { left: 'Der Bruder', right: 'Brother' },
          { left: 'Die Schwester', right: 'Sister' },
          { left: 'Die Tochter', right: 'Daughter' },
        ],
        'Tochter is daughter and die Sonne is the sun — one letter apart, and the -er ending hides in every pair here.'
      ),
      LISTEN(
        'Listen and type who you are talking about.',
        'Das ist mein Bruder',
        ['Das ist mein Bruder'],
        'Mein agrees with a masculine noun; meine returns for die Schwester.',
        { misconceptions: { 'Das ist meine Bruder': 'Bruder is masculine, so the possessive is mein — meine belongs to die Schwester.' } }
      ),
      SPEAK(
        'Say you have a sister, out loud.',
        'Ich habe eine Schwester',
        'Habe stresses the long i: HA-buh; eine is AY-nuh, and Schwester is two crisp SHWES-ter.'
      ),
    ],
  },

  'german-verbs-present': {
    id: 'german-verbs-present',
    title: 'German Present Verbs',
    theory: [
      'Stems wear endings: sprechen (speak) → ich spreche, du sprichst, er spricht, wir sprechen, sie sprechen. Note the vowel shift e→i in du/er for strong verbs!',
      'Must-knows: ich bin (I am), ich habe (I have), ich möchte (I want), ich kann (I can). Sein describes identity; haben holds hunger, age, time.',
    ],
    questions: [
      BUILD(
        'Say “I speak German”:',
        ['Ich', 'spreche', 'Deutsch'],
        ['Deutsch', 'Ich', 'sprichst', 'spreche'],
        'Ich spreche, du sprichst, er spricht — feel the shift.'
      ),
      MCQ(
        '“Wir essen” means…',
        'We eat',
        ['We eat', 'You eat', 'They ate', 'He eats'],
        'Regular -en verbs: ich esse, wir essen, sie essen.'
      ),
      BUILD(
        'Say “I am happy” (sein):',
        ['Ich', 'bin', 'glücklich'],
        ['glücklich', 'Ich', 'bin', 'bist'],
        'Sein: ich bin, du bist, er ist. Ich bin glücklich!'
      ),
      MCQ(
        '“Ich kann” means…',
        'I can',
        ['I can', 'I want', 'I have', 'I go'],
        'Können → ich kann. Möchten → ich möchte.'
      ),
      BUILD(
        'Say “They sell bread” (verkaufen):',
        ['Sie', 'verkaufen', 'Brot'],
        ['Brot', 'Sie', 'verkaufen', 'verkauft', 'verkaufe'],
        'Regular verbs: wir/sie/Sie keep the -en: verkaufen.'
      ),
      MATCH(
        'Pair each verb form with the person it marks.',
        [
          { left: 'Ich spreche', right: 'I speak' },
          { left: 'Du sprichst', right: 'You speak, informally' },
          { left: 'Er spricht', right: 'He speaks' },
          { left: 'Wir sprechen', right: 'We speak' },
          { left: 'Ich bin', right: 'I am' },
        ],
        'Sprechen is a strong verb: du and er shift the vowel e→i and du adds an extra -s. Wir and sie stay on the infinitive.'
      ),
      LISTEN(
        'Listen and type what they claim to be good at.',
        'Ich kann gut kochen',
        ['Ich kann gut kochen'],
        'kann + infinitive: the modal takes second position and the real verb is thrown to the very end — kochen.'
      ),
      SPEAK(
        'Say you are happy, out loud.',
        'Ich bin glücklich',
        'Glücklich doubles the soft ch twice: GLIKH-likh; the ich ending is the same sound in every German word.'
      ),
    ],
  },

  'german-past': {
    id: 'german-past',
    title: 'German Past Stories',
    theory: [
      'Stories speak in Perfekt: ich habe gesprochen (I spoke), ich habe gegessen (I ate), ich bin gegangen (I went). Ge- + stem + -t/-en; movement verbs take sein.',
      'The rebels: ich hatte (I had), ich war (I was), ich habe gemacht (I did/made). Gestern = yesterday, letzte Woche = last week.',
    ],
    questions: [
      MCQ(
        '“Ich habe gesprochen” means…',
        'I spoke',
        ['I spoke', 'I speak', 'I will speak', 'Speak!'],
        'Haben + gesprochen = finished past. Ich spreche = now.'
      ),
      BUILD(
        'Say “I ate” (essen → gegessen):',
        ['Ich', 'habe', 'gegessen'],
        ['gegessen', 'Ich', 'habe', 'esse'],
        'Ge- + gess + -en: gegessen. Verb goes last!'
      ),
      MCQ(
        '“Ich bin gegangen” uses sein because…',
        'Gehen is movement',
        ['Gehen is movement', 'Gehen is long', 'Gegangen is formal', 'Haben is broken'],
        'Movement/change verbs take sein: gehen, kommen, fahren.'
      ),
      BUILD(
        'Say “last week”:',
        ['Letzte', 'Woche'],
        ['Woche', 'Letzte', 'Gestern', 'Morgen'],
        'Letzte Woche frames any finished story.'
      ),
      MCQ(
        '“Ich hatte” means…',
        'I had',
        ['I had', 'I have', 'I hate', 'I hated'],
        'Haben → hatte. Sein → war (ich war = I was).'
      ),
      MATCH(
        'Pair each past form with what it says.',
        [
          { left: 'Ich habe gesprochen', right: 'I spoke' },
          { left: 'Ich habe gegessen', right: 'I ate' },
          { left: 'Ich bin gegangen', right: 'I went' },
          { left: 'Ich war', right: 'I was' },
          { left: 'Letzte Woche', right: 'When it happened' },
        ],
        'Perfekt is haben or sein plus a ge-…-t/-en participle at the end. Only movement and change of state borrow sein.'
      ),
      LISTEN(
        'Listen and type what happened last night.',
        'Ich habe gestern gegessen',
        ['Ich habe gestern gegessen'],
        'The two verbs split the sentence: habe sits second, gegessen goes last — that frame is German past storytelling.'
      ),
      SPEAK(
        'Say you drove to Berlin, out loud.',
        'Ich bin nach Berlin gefahren',
        'The ge- prefix is a short, soft keh — kuh-FAH-ren — and bin pulls the participle to the very end of the clause.'
      ),
    ],
  },

  'german-final': {
    id: 'german-final',
    title: 'German Final Exam',
    theory: ['Final exam: greetings, numbers, food, travel, family, present verbs, and past stories — the whole comprehensive course.'],
    questions: [
      BUILD(
        'Ask a friend “How is it going?”:',
        ['Wie', 'geht’s'],
        ['geht’s', 'Wie', 'Ihnen', 'geht'],
        'Du form for friends: Wie geht’s?'
      ),
      MCQ(
        '“Halb vier” means…',
        '3:30',
        ['3:30', '4:30', '4:00', 'Half four (4:30)'],
        'Halfway TO four = 3:30. The classic trap — nailed!'
      ),
      BUILD(
        'Say “They sell bread”:',
        ['Sie', 'verkaufen', 'Brot'],
        ['Brot', 'Sie', 'verkaufen', 'verkauft', 'verkaufe'],
        'Sie + -en verb: sie verkaufen = they sell.'
      ),
      MCQ(
        '“Ich habe Hunger” means…',
        'I am hungry',
        ['I am hungry', 'I hate hunger', 'I eat bread', 'I am thirsty'],
        'Ich habe Hunger = I have hunger. Durst = thirst.'
      ),
      MCQ(
        '“Ich habe gesprochen” vs “ich spreche”: the difference is…',
        'Past vs present',
        ['Past vs present', 'Formal vs casual', 'Loud vs quiet', 'None'],
        'Perfekt marks the finished past: habe gesprochen = spoke.'
      ),
      BUILD(
        'Ask “Where is the station?”:',
        ['Wo', 'ist', 'Bahnhof'],
        ['Bahnhof', 'Wo', 'der', 'ist'],
        'Wo ist…? + place. Der Bahnhof = the station.'
      ),
      MCQ(
        'At a Berlin ticket machine, you need one ticket to the city centre. Which is most natural?',
        'Eine Fahrkarte ins Zentrum, bitte. Was kostet das?',
        [
          'Eine Fahrkarte ins Zentrum, bitte. Was kostet das?',
          'Ich Fahrkarte Zentrum.',
          'Fahrkarte bitte billig.',
          'Wo ist die Fahrkarte?',
        ],
        'Name the ticket, add bitte, then ask Was kostet das? — the everyday polite pattern.'
      ),
      TEXT(
        'Type the German for “I don’t understand.”',
        ['Ich verstehe nicht.'],
        'The verb goes second in a main clause: Ich verstehe nicht. Nicht follows the verb it negates.',
        { misconceptions: { 'Ich nicht verstehe': 'German keeps the verb in second position: Ich verstehe nicht.' } }
      ),
      MATCH(
        'Pair each word from the course with what it does for you.',
        [
          { left: 'Gern geschehen', right: 'Reply to thanks' },
          { left: 'Wie viel', right: 'Ask a price' },
          { left: 'Letzte Woche', right: 'Frame a finished story' },
          { left: 'Ich bin gegangen', right: 'Movement in the past' },
          { left: 'Die Apotheke', right: 'Where you buy medicine' },
        ],
        'The final mixes politeness, numbers, past tense and travel — five different jobs, one phrase each.'
      ),
      LISTEN(
        'Listen and type the order at the counter.',
        'Ich möchte einen Tee',
        ['Ich möchte einen Tee', 'Ich moechte einen Tee'],
        'Möchte softens the want and Tee is one long syllable; the drink needs no article because it is uncountable here.'
      ),
      SPEAK(
        'Admit you did not follow, out loud.',
        'Ich verstehe das nicht',
        'Verstehe stresses the last syllable — fer-STAY-eh — and nicht closes the clause like a door.'
      ),
    ],
  },

  'german-questions': {
    id: 'german-questions',
    title: 'German Questions & Negation',
    theory: [
      'W-questions put the question word first and the verb second: Wo wohnst du? (Where do you live?), Wann kommst du? (When are you coming?), Warum lernst du Deutsch? (Why are you learning German?).',
      'Yes/no questions start with the verb: Sprichst du Deutsch? (Do you speak German?), Hast du Zeit? (Do you have time?). The verb keeps its second position even when the subject follows it.',
      'Negation: nicht for verbs, adjectives and definite nouns (Das ist nicht mein Buch); kein/keine for indefinite nouns (Ich habe keine Zeit, Ich spreche kein Deutsch). Use du with friends and Sie in formal situations.',
    ],
    questions: [
      MCQ(
        'Which is the correct question for “Where do you live?”',
        'Wo wohnst du?',
        ['Wo wohnst du?', 'Wo du wohnst?', 'Wohnst wo du?', 'Du wohnst wo?'],
        'Question word first, verb second: Wo + wohnst + du.'
      ),
      BUILD(
        'Ask “Do you speak German?”',
        ['Sprichst', 'du', 'Deutsch'],
        ['Deutsch', 'Sprichst', 'du', 'sprechen'],
        'Yes/no question: verb first, then subject. Sprichst du Deutsch?'
      ),
      MCQ(
        '“Ich habe keine Zeit” means…',
        'I have no time',
        ['I have no time', 'I have lots of time', 'I am late', 'I don’t like time'],
        'Keine negates the indefinite noun Zeit: keine Zeit = no time.'
      ),
      BUILD(
        'Say “I don’t speak German”:',
        ['Ich', 'spreche', 'kein', 'Deutsch'],
        ['Deutsch', 'Ich', 'spreche', 'kein', 'keine'],
        'Kein precedes the neuter noun Deutsch: kein Deutsch. Keine is for feminine/plural nouns.'
      ),
      MCQ(
        '“Das ist nicht mein Buch” means…',
        'That is not my book',
        ['That is not my book', 'That is my book', 'That is no book', 'I don’t read that book'],
        'Nicht negates the definite phrase mein Buch; kein would negate an indefinite noun.'
      ),
      MATCH(
        'Pair each question word with the answer it demands.',
        [
          { left: 'Wo', right: 'A place' },
          { left: 'Wann', right: 'A time' },
          { left: 'Warum', right: 'A reason' },
          { left: 'Wie viel', right: 'An amount' },
          { left: 'Wer', right: 'A person' },
        ],
        'Every German W-word wants its own kind of answer, and the verb still comes second: Wo wohnst du?'
      ),
      LISTEN(
        'Listen and type the flat denial.',
        'Ich spreche kein Deutsch',
        ['Ich spreche kein Deutsch'],
        'Deutsch is an indefinite noun here, so kein negates it — nicht Deutsch would deny a specific German you both already named.',
        { misconceptions: { 'Ich spreche nicht Deutsch': 'Before an unnamed object German uses kein: ich spreche kein Deutsch.' } }
      ),
      SPEAK(
        'Ask a friend if they have time, out loud.',
        'Hast du Zeit',
        'A yes/no question just moves the verb to the front: Hast + du. The stress falls on Zeit — tseyt.'
      ),
    ],
  },

  'german-health': {
    id: 'german-health',
    title: 'German Health & Emergencies',
    theory: [
      'Say what hurts with haben + a compound noun: Ich habe Kopfschmerzen (headache), Ich habe Bauchschmerzen (stomach ache). Also Ich habe Fieber (fever) and Ich huste (I cough).',
      'Ask for help: Ich brauche einen Arzt (I need a doctor), Wo ist die Apotheke? (where is the pharmacy?), Rufen Sie einen Krankenwagen (call an ambulance — formal).',
      'Allergies: Ich bin allergisch gegen Erdnüsse. For polite help say Können Sie mir helfen?',
    ],
    questions: [
      MCQ(
        '“Ich habe Kopfschmerzen” means…',
        'I have a headache',
        ['I have a headache', 'I have a stomach ache', 'My feet hurt', 'I am dizzy'],
        'Kopf = head, Schmerzen = pain. Kopfschmerzen is the everyday headache.'
      ),
      BUILD(
        'Say “I need a doctor”:',
        ['Ich', 'brauche', 'einen', 'Arzt'],
        ['Arzt', 'Ich', 'brauche', 'einen', 'Ärztin'],
        'Brauchen takes einen Arzt (masculine accusative); Ärztin is the female doctor.'
      ),
      MCQ(
        '“Ich habe Fieber” means…',
        'I have a fever',
        ['I have a fever', 'I have a cough', 'I am cold', 'I have a headache'],
        'Fieber = fever. Ich huste = I cough.'
      ),
      BUILD(
        'Ask “Where is the pharmacy?”',
        ['Wo', 'ist', 'die', 'Apotheke'],
        ['Apotheke', 'Wo', 'ist', 'die', 'der'],
        'Wo ist die Apotheke? — Apotheke is feminine, so die Apotheke.'
      ),
      MCQ(
        '“Ich bin allergisch gegen Erdnüsse” means…',
        'Peanuts make me ill',
        ['Peanuts make me ill', 'I love peanuts', 'I am carrying peanuts', 'Peanuts are expensive'],
        'Allergisch gegen… names the trigger. Erdnüsse = peanuts.'
      ),
      MATCH(
        'Pair each symptom with what the pharmacist hears.',
        [
          { left: 'Ich habe Kopfschmerzen', right: 'My head hurts' },
          { left: 'Ich habe Bauchschmerzen', right: 'My stomach hurts' },
          { left: 'Ich habe Fieber', right: 'I have a fever' },
          { left: 'Ich huste', right: 'I cannot stop coughing' },
          { left: 'Ich brauche einen Arzt', right: 'I need a doctor' },
        ],
        'German bolts body parts onto Schmerzen: Kopf + Bauch. Fever and coughing get their own verbs.'
      ),
      LISTEN(
        'Listen and type the question they ask in the street.',
        'Wo ist die Apotheke',
        ['Wo ist die Apotheke'],
        'Apotheke is feminine, so die Apotheke — and the p is aspirated, the h is audible.',
        { misconceptions: { 'Wo ist der Apotheke': 'Apotheke takes die; der belongs to der Bahnhof and der Arzt.' } }
      ),
      SPEAK(
        'Ask someone politely for help, out loud.',
        'Können Sie mir helfen',
        'Capital Sie marks respect, and the infinitive helfen closes the clause — KUR-nen zee meer HEL-fen.'
      ),
    ],
  },

  'german-adjectives': {
    id: 'german-adjectives',
    title: 'German Adjectives & Comparison',
    theory: [
      'Predicative adjectives (after sein or werden) never take endings: Das Auto ist schnell, Die Autos sind schnell. Only attributive adjectives before a noun decline.',
      'Compare with -er + als: schneller als der Zug (faster than the train). For equality, use so... wie: Er ist so groß wie ich (He is as tall as me). Irregulars: gut -> besser -> am besten; viel -> mehr -> am meisten.',
    ],
    questions: [
      MCQ(
        'In “Das Haus ist schön”, why does “schön” have no ending?',
        'It sits after the verb sein (predicative)',
        [
          'It sits after the verb sein (predicative)',
          'Because Haus is neuter',
          'Because schön is irregular',
          'It is an error in German',
        ],
        'Predicative adjectives after sein/werden never take case endings in German.'
      ),
      BUILD(
        'Say “The car is fast”:',
        ['Das', 'Auto', 'ist', 'schnell'],
        ['schnell', 'Das', 'Auto', 'ist', 'schnelle'],
        'Predicative: ist schnell, without any suffix.'
      ),
      MCQ(
        '“Schneller als der Zug” means…',
        'Faster than the train',
        ['Faster than the train', 'Slower than the train', 'Next to the train', 'As fast as the train'],
        'Comparative suffix -er plus als means faster than.'
      ),
      BUILD(
        'Say “He is as tall as Lukas”:',
        ['Er', 'ist', 'so', 'groß', 'wie', 'Lukas'],
        ['wie', 'Er', 'ist', 'so', 'groß', 'Lukas', 'als'],
        'So... wie expresses equality: as tall as.'
      ),
      MCQ(
        'What is the comparative form of “gut” (good)?',
        'Besser',
        ['Besser', 'Guter', 'Mehr gut', 'Bestens'],
        'Gut is irregular: gut -> besser -> am besten.'
      ),
      MATCH(
        'Pair each German adjective with its opposite.',
        [
          { left: 'Groß', right: 'Klein' },
          { left: 'Schnell', right: 'Langsam' },
          { left: 'Gut', right: 'Schlecht' },
          { left: 'Heiß', right: 'Kalt' },
          { left: 'Einfach', right: 'Schwer' },
        ],
        'German adjective pairs: groß/klein, schnell/langsam, gut/schlecht.'
      ),
      LISTEN(
        'Listen and type the comparison.',
        'Schneller als der Zug',
        ['Schneller als der Zug'],
        'Schneller = faster; als = than (used with comparatives).'
      ),
      SPEAK(
        'Say “The car is fast” out loud in German.',
        'Das Auto ist schnell',
        'dahs OW-toh ist SHNELL: the sch- makes a crisp sh sound.'
      ),
    ],
  },

  'german-politeness': {
    id: 'german-politeness',
    title: 'German Politeness & Courtesy',
    theory: [
      'German manners use clear, direct courtesy words. Entschuldigung (excuse me) opens questions to strangers or apologizes for small mishaps; Verzeihung is a slightly more formal variant.',
      'Es tut mir leid expresses heartfelt sympathy or deep apology. Bitte means please and you are welcome; Danke schön (thank you very much) is answered warmly with Gern geschehen (gladly done) or Keine Ursache (no trouble).',
    ],
    questions: [
      MCQ(
        'You bump into someone at the train station. What do you say?',
        'Entschuldigung',
        ['Entschuldigung', 'Tschüss', 'Guten Appetit', 'Keine Ahnung'],
        'Entschuldigung is the natural, universal apology for bumping into someone.'
      ),
      BUILD(
        'Say “Excuse me, please”:',
        ['Entschuldigung', 'bitte'],
        ['bitte', 'Entschuldigung', 'Danke', 'Hallo'],
        'Entschuldigung, bitte softens your entrance before asking a question.'
      ),
      MCQ(
        '“Es tut mir leid” means…',
        'I am sorry',
        ['I am sorry', 'Thank you very much', 'You are welcome', 'Good evening'],
        'Es tut mir leid literally means “It does sorrow to me”.'
      ),
      BUILD(
        'Say “Thank you very much”:',
        ['Danke', 'schön'],
        ['schön', 'Danke', 'Sehr', 'Bitte'],
        'Danke schön or Vielen Dank is the warm, standard thank-you.'
      ),
      MCQ(
        'Someone says “Vielen Dank”. What is a friendly reply?',
        'Gern geschehen',
        ['Gern geschehen', 'Es tut mir leid', 'Entschuldigung', 'Auf Wiedersehen'],
        'Gern geschehen (gladly done) or Bitte schön replies to thanks.'
      ),
      MATCH(
        'Pair each German courtesy word with its meaning.',
        [
          { left: 'Entschuldigung', right: 'Excuse me' },
          { left: 'Es tut mir leid', right: 'I am sorry' },
          { left: 'Danke schön', right: 'Thank you very much' },
          { left: 'Gern geschehen', right: 'My pleasure / gladly done' },
          { left: 'Bitte schön', right: 'You are welcome' },
        ],
        'Entschuldigung gains attention, es tut mir leid apologizes, and gern geschehen answers thanks.'
      ),
      LISTEN(
        'Listen and type the sincere German apology.',
        'Es tut mir sehr leid',
        ['Es tut mir sehr leid'],
        'Sehr adds "very": Es tut mir sehr leid = I am very sorry.'
      ),
      SPEAK(
        'Say “Excuse me” out loud in German.',
        'Entschuldigung bitte',
        'ent-SHOOL-dee-goong BIT-teh: articulate the three clear syllables.'
      ),
    ],
  },

  'german-introductions': {
    id: 'german-introductions',
    title: 'German Introductions & Origins',
    theory: [
      'Introduce yourself with Ich heiße... (My name is...) or Mein Name ist... (My name is...). Ask someone with Wie heißen Sie? (formal) or Wie heißt du? (casual).',
      'Talk about origins with kommen aus: Woher kommen Sie? -> Ich komme aus Deutschland / Ich komme aus den USA. Residence uses wohnen in: Ich wohne in Berlin. Close an introduction politely with Freut mich (Pleased to meet you).',
    ],
    questions: [
      MCQ(
        '“Wie heißen Sie?” asks for…',
        'Your name (formal)',
        ['Your name (formal)', 'Your age', 'Where you live', 'Your country'],
        'Wie heißen Sie? is the polite formal way to ask a stranger their name.'
      ),
      BUILD(
        'Say “My name is Thomas”:',
        ['Ich', 'heiße', 'Thomas'],
        ['Thomas', 'Ich', 'heiße', 'Du', 'heißt'],
        'Ich heiße + name is the most common German introduction.'
      ),
      MCQ(
        '“Woher kommen Sie?” means…',
        'Where do you come from?',
        ['Where do you come from?', 'Where are you going?', 'Where do you work?', 'Where is the hotel?'],
        'Woher = from where; kommen = to come; Sie = formal you.'
      ),
      BUILD(
        'Say “I live in Berlin”:',
        ['Ich', 'wohne', 'in', 'Berlin'],
        ['Berlin', 'Ich', 'wohne', 'in', 'aus'],
        'Wohnen + in + city: Ich wohne in Berlin.'
      ),
      MCQ(
        'When introduced, someone says “Freut mich”. What does that mean?',
        'Pleased to meet you',
        ['Pleased to meet you', 'Goodbye', 'Good morning', 'Good night'],
        'Freut mich (short for Es freut mich) = It pleases me / Pleased to meet you.'
      ),
      MATCH(
        'Pair each introduction phrase with its role.',
        [
          { left: 'Ich heiße', right: 'Stating your name' },
          { left: 'Ich komme aus', right: 'Stating where you are from' },
          { left: 'Ich wohne in', right: 'Stating where you live' },
          { left: 'Freut mich', right: 'Pleased to meet you' },
          { left: 'Woher kommst du', right: 'Where are you from (casual)' },
        ],
        'Ich heiße gives your name, komme aus gives your homeland, and wohne in gives your town.'
      ),
      LISTEN(
        'Listen and type the polite introduction greeting.',
        'Sehr erfreut Sie kennenzulernen',
        ['Sehr erfreut Sie kennenzulernen'],
        'Sehr erfreut = very pleased; kennenzulernen = to get to know.'
      ),
      SPEAK(
        'Say where you come from, out loud in German.',
        'Ich komme aus Deutschland',
        'ikh KOH-meh ows DOYTCH-lahnt: aus takes dative and Deutschland is Germany.'
      ),
    ],
  },

  'german-language': {
    id: 'german-language',
    title: 'German Languages & Understanding',
    theory: [
      'Ask about languages with sprechen: Sprechen Sie Englisch? (Do you speak English?) or casual Sprichst du Deutsch?. Answer with Ich spreche ein bisschen Deutsch (I speak a little German).',
      'When overwhelmed by fast German, rescue yourself with: Ich verstehe nicht (I don’t understand), Können Sie das bitte wiederholen? (Can you please repeat that?), and Bitte sprechen Sie langsamer (Please speak slower).',
    ],
    questions: [
      MCQ(
        '“Ich verstehe nicht” means…',
        'I do not understand',
        ['I do not understand', 'I do not speak', 'I do not want', 'I do not hear'],
        'Verstehen = to understand. Ich verstehe nicht saves any awkward moment.'
      ),
      BUILD(
        'Ask “Do you speak English?” formally:',
        ['Sprechen', 'Sie', 'Englisch'],
        ['Englisch', 'Sprechen', 'Sie', 'Sprichst', 'du'],
        'Sprechen Sie Englisch? — verb first for yes/no question, capital Sie for respect.'
      ),
      MCQ(
        'You need someone to speak more slowly. What do you say?',
        'Bitte sprechen Sie langsamer.',
        ['Bitte sprechen Sie langsamer.', 'Bitte sprechen Sie schneller.', 'Ich verstehe alles.', 'Auf Wiedersehen.'],
        'Langsam = slow; langsamer = slower.'
      ),
      BUILD(
        'Say “I speak a little German”:',
        ['Ich', 'spreche', 'ein', 'bisschen', 'Deutsch'],
        ['Deutsch', 'Ich', 'spreche', 'ein', 'bisschen', 'viel'],
        'Ein bisschen = a little bit. Ich spreche ein bisschen Deutsch.'
      ),
      MCQ(
        '“Können Sie das bitte wiederholen?” asks…',
        'Can you please repeat that?',
        ['Can you please repeat that?', 'Can you please write that?', 'Can you speak louder?', 'Can you help me?'],
        'Wiederholen = to repeat; können = modal verb can.'
      ),
      MATCH(
        'Pair each language phrase with what it communicates.',
        [
          { left: 'Ich verstehe nicht', right: 'I do not understand' },
          { left: 'Bitte langsamer', right: 'Speak slower' },
          { left: 'Bitte wiederholen', right: 'Please repeat' },
          { left: 'Ein bisschen', right: 'A little bit' },
          { left: 'Sprechen Sie Englisch', right: 'Do you speak English' },
        ],
        'Ich verstehe nicht admits the gap; langsamer and wiederholen ask for adjustments.'
      ),
      LISTEN(
        'Listen and type the polite request for slower speech in German.',
        'Bitte sprechen Sie etwas langsamer',
        ['Bitte sprechen Sie etwas langsamer'],
        'Etwas = somewhat / a bit; langsamer = slower.'
      ),
      SPEAK(
        'Say you speak a little German, out loud.',
        'Ich spreche ein bisschen Deutsch',
        'ikh SHPREH-kheh ayn BIS-khen DOYTCH: crisp and clear.'
      ),
    ],
  },

  'german-money': {
    id: 'german-money',
    title: 'German Shopping & Money',
    theory: [
      'In stores and bakeries, ask the price with Wie viel kostet das? (How much does that cost?) or Was kostet das?.',
      'Assess prices with Das ist zu teuer (That is too expensive) or Das ist günstig (That is reasonably priced / good value). Payment: Kann ich mit Karte zahlen? (Can I pay with card?) or Bar zahlen (pay in cash). At a restaurant: Die Rechnung, bitte (The check, please).',
    ],
    questions: [
      MCQ(
        '“Wie viel kostet das?” asks…',
        'How much does that cost?',
        ['How much does that cost?', 'What is that called?', 'Where is that from?', 'Who made that?'],
        'Wie viel = how much; kosten = to cost.'
      ),
      BUILD(
        'Say “That is too expensive” in German:',
        ['Das', 'ist', 'zu', 'teuer'],
        ['teuer', 'Das', 'ist', 'zu', 'billig'],
        'Zu = too (excessive); teuer = expensive. Billig = cheap.'
      ),
      MCQ(
        'How do you ask “Can I pay by card?” in German?',
        'Kann ich mit Karte zahlen?',
        ['Kann ich mit Karte zahlen?', 'Haben Sie Kleingeld?', 'Wo ist der Geldautomat?', 'Kostet das extra?'],
        'Karte = card; zahlen = to pay.'
      ),
      BUILD(
        'Ask for the check at a German restaurant:',
        ['Die', 'Rechnung', 'bitte'],
        ['bitte', 'Die', 'Rechnung', 'Der', 'Kellner'],
        'Die Rechnung, bitte = The check/bill, please.'
      ),
      MCQ(
        '“Bar zahlen” means…',
        'To pay with cash',
        ['To pay with cash', 'To pay with card', 'To drink at the bar', 'To pay tomorrow'],
        'Bar = cash in German: Barzahlung or bar zahlen.'
      ),
      MATCH(
        'Pair each German shopping phrase with its meaning.',
        [
          { left: 'Wie viel kostet das', right: 'How much does that cost' },
          { left: 'Zu teuer', right: 'Too expensive' },
          { left: 'Mit Karte', right: 'With card' },
          { left: 'Bar zahlen', right: 'Pay cash' },
          { left: 'Die Rechnung bitte', right: 'The check please' },
        ],
        'Wie viel kostet asks the price, teuer assesses it, and die Rechnung asks to settle.'
      ),
      LISTEN(
        'Listen and type the price question.',
        'Was kostet das bitte',
        ['Was kostet das bitte'],
        'Was kostet das? is the everyday short form of Wie viel kostet das?.'
      ),
      SPEAK(
        'Ask for the restaurant check, out loud in German.',
        'Die Rechnung bitte',
        'dee REKH-noong BIT-teh: polite, standard, and used in every German café or gasthaus.'
      ),
    ],
  },
};
