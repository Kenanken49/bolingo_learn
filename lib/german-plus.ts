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
};
