/**
 * German expansion — Course 4 (comprehensive set).
 * Original lessons written for Bolingo; sequencing follows standard
 * beginner-German (A1) syllabi. Merged into LANGUAGE_COURSES in
 * lib/languages.ts — quiz, SRS, and guidebook work unchanged.
 */
import { MCQ, BUILD, type CourseLesson } from './quizBank';

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
    ],
  },
};
