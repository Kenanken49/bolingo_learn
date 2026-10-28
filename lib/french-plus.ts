/**
 * French expansion — Course 4 (comprehensive set).
 * Original lessons written for Bolingo; sequencing follows standard
 * beginner-French syllabi. Merged into LANGUAGE_COURSES in
 * lib/languages.ts — quiz, SRS, and guidebook work unchanged.
 */
import { MCQ, BUILD, type CourseLesson } from './quizBank';

export const FRENCH_PLUS: Record<string, CourseLesson> = {
  'french-greetings': {
    id: 'french-greetings',
    title: 'French Greetings & Politeness',
    theory: [
      'Bonjour opens every door before evening, when Bonsoir takes over. Salut greets friends; Coucou is pure affection. Comment ça va? asks a friend, Comment allez-vous? respects an elder — tu for friends, vous for respect.',
      'Land softly with s’il vous plaît, merci, pardon. De rien answers merci; Bienvenue welcomes all.',
    ],
    questions: [
      MCQ(
        '“Bonsoir” is said…',
        'In the evening',
        ['In the evening', 'In the morning', 'At noon', 'Only at bedtime'],
        'Bonjour → Bonsoir when the light fades.'
      ),
      BUILD(
        'Ask a friend “How is it going?”:',
        ['Comment', 'ça', 'va'],
        ['va', 'Comment', 'allez', 'ça'],
        'Comment ça va? — tu form, friends and family.'
      ),
      MCQ(
        '“Comment allez-vous?” differs from “Comment ça va?” in…',
        'Formality',
        ['Formality', 'Tense', 'Number', 'Speed'],
        'Vous = respect (elders, officials). Tu = friends.'
      ),
      BUILD(
        'Answer “thanks” with “you are welcome”:',
        ['De', 'rien'],
        ['rien', 'De', 'Merci', 'Plaît'],
        'Merci → De rien. A tiny perfect pair.'
      ),
      MCQ(
        '“Bienvenue!” means…',
        'Welcome!',
        ['Welcome!', 'Goodbye!', 'Good luck!', 'Congratulations!'],
        'Bienvenue opens every home, shop, and classroom.'
      ),
    ],
  },

  'french-numbers-time': {
    id: 'french-numbers-time',
    title: 'French Numbers & Time',
    theory: [
      'Count: un, deux, trois, quatre, cinq, six, sept, huit, neuf, dix — then the famous rebels: quatre-vingts (80, four-twenties!). Il est trois heures = it is 3 o’clock; et demie = half past, et quart = quarter past.',
      'Days run lundi to dimanche; mois janvier to décembre. Aujourd’hui = today, demain = tomorrow, hier = yesterday.',
    ],
    questions: [
      MCQ(
        '“Huit” means…',
        'Eight',
        ['Eight', 'Seven', 'Nine', 'Eighteen'],
        'Sept 7, huit 8, neuf 9 — chant the run.'
      ),
      BUILD(
        'Say “It is 3 o’clock”:',
        ['Il', 'est', 'trois', 'heures'],
        ['heures', 'Il', 'trois', 'est', 'sont'],
        'Il est + number + heures. Half past adds et demie.'
      ),
      MCQ(
        '“Quatre-vingts” literally means…',
        'Four-twenties (80)',
        ['Four-twenties (80)', 'Four winds', 'Four wines', 'Eighty wines'],
        'French counts by twenties: 80 = 4×20. Glorious chaos.'
      ),
      BUILD(
        'Say “tomorrow”:',
        ['Demain'],
        ['Hier', 'Demain', 'Aujourd’hui', 'Soir'],
        'Hier → aujourd’hui → demain: yesterday, today, tomorrow.'
      ),
      MCQ(
        '“Et quart” after an hour means…',
        'Quarter past',
        ['Quarter past', 'Quarter to', 'Half past', 'Sharp'],
        'Trois heures et quart = 3:15. Moins le quart = quarter to.'
      ),
    ],
  },

  'french-food': {
    id: 'french-food',
    title: 'French Food & Drink',
    theory: [
      'Order like a Parisian: Je voudrais… (I would like…), L’addition, s’il vous plaît (the bill, please). Le pain, le fromage, le café, le lait, le riz, le poulet, le poisson — hunger solved.',
      'J’ai faim = I am hungry (I HAVE hunger), j’ai soif = I am thirsty. J’aime = I like; j’adore = I love.',
    ],
    questions: [
      MCQ(
        '“Le fromage” means…',
        'The cheese',
        ['The cheese', 'The bread', 'The fish', 'The chicken'],
        'Fromage = cheese, pain = bread, poisson = fish.'
      ),
      BUILD(
        'Say “I would like coffee” politely:',
        ['Je', 'voudrais', 'café'],
        ['café', 'Je', 'voudrais', 'veux'],
        'Je voudrais = polished wanting. Je veux = blunt.'
      ),
      MCQ(
        '“J’ai faim” literally means…',
        'I have hunger',
        ['I have hunger', 'I eat hunger', 'I am hunger', 'My hunger eats'],
        'French HAS hunger and thirst: j’ai faim, j’ai soif.'
      ),
      BUILD(
        'Ask for the bill politely:',
        ['L’addition'],
        ['Le menu', 'L’addition', 'La carte', 'Le café'],
        'L’addition, s’il vous plaît — the magic exit words.'
      ),
      MCQ(
        '“J’adore” means…',
        'I love',
        ['I love', 'I hate', 'I want', 'I need'],
        'J’aime = I like, j’adore = I love. J’adore le café!'
      ),
    ],
  },

  'french-travel': {
    id: 'french-travel',
    title: 'French Travel & Directions',
    theory: [
      'Move with grace: Où est…? (where is…?), à gauche (left), à droite (right), tout droit (straight). La gare, l’aéroport, l’hôtel, les toilettes — the big four.',
      'Ride anything: le bus, le train, le taxi. C’est combien? (how much?), À quelle heure part-il? (what time does it leave?).',
    ],
    questions: [
      MCQ(
        '“Où est la gare?” asks for…',
        'The station’s location',
        ['The station’s location', 'The station’s price', 'Station time', 'A guarded room'],
        'Où = where. Où est…? unlocks every city.'
      ),
      BUILD(
        'Say “to the left”:',
        ['À', 'gauche'],
        ['gauche', 'À', 'droite', 'tout'],
        'Gauche = left, droite = right. Tout droit = straight on.'
      ),
      MCQ(
        '“C’est combien?” asks for…',
        'The price',
        ['The price', 'The time', 'The number', 'The name'],
        'Combien = how much. C’est combien? bargains anywhere.'
      ),
      BUILD(
        'Ask where the hotel is:',
        ['Où', 'est', 'l’hôtel'],
        ['l’hôtel', 'Où', 'est', 'combien'],
        'Où est…? + place. L’hôtel, la gare, l’aéroport.'
      ),
      MCQ(
        '“Le train” means…',
        'The train',
        ['The train', 'The bus', 'The taxi', 'The plane'],
        'Train = train, bus = bus, avion = plane.'
      ),
    ],
  },

  'french-family': {
    id: 'french-family',
    title: 'French Family & Descriptions',
    theory: [
      'Meet la famille: la mère, le père, le frère, la sœur, le fils, la fille, l’ami. Mon/ma/mes = my, ton/ta/tes = your, son/sa/ses = his/her.',
      'Describe with être + adjective, matching gender and number: grand/grande, petit/petite, heureux/heureuse. Je suis grand = I am tall.',
    ],
    questions: [
      MCQ(
        '“La sœur” means…',
        'The sister',
        ['The sister', 'The brother', 'The mother', 'The daughter'],
        'Sœur = sister, frère = brother. La famille grows.'
      ),
      BUILD(
        'Say “my brothers” (more than one):',
        ['Mes', 'frères'],
        ['frères', 'Mon', 'Mes', 'Ton'],
        'Mon → mes before plurals: mes frères, mes amis.'
      ),
      MCQ(
        '“Je suis grande” is said by…',
        'A tall woman/girl',
        ['A tall woman/girl', 'A tall man', 'Tall children', 'Anyone tall'],
        'Adjectives agree: grand/grande, petits/petites.'
      ),
      BUILD(
        'Say “your (friend’s) mother”:',
        ['Ta', 'mère'],
        ['mère', 'Sa', 'Ta', 'Ma'],
        'Ta = your (friend), sa = his/her. Mère = mother.'
      ),
      MCQ(
        '“Le fils” means…',
        'The son',
        ['The son', 'The daughter', 'The father', 'The thread'],
        'Fils = son, fille = daughter. Pronounced “feece”.'
      ),
    ],
  },

  'french-verbs-present': {
    id: 'french-verbs-present',
    title: 'French Present Verbs',
    theory: [
      'Three families rule the present: -er (parler), -ir (finir), -re (vendre). Je parle, tu parles, il parle, nous parlons, ils parlent — the endings sing the person.',
      'Must-knows: je suis (I am), j’ai (I have), je veux (I want), je peux (I can). Avoir describes age and hunger: j’ai dix ans, j’ai faim.',
    ],
    questions: [
      BUILD(
        'Say “I speak French”:',
        ['Je', 'parle', 'français'],
        ['français', 'Je', 'parles', 'parle'],
        '-er verbs: je parle (I), tu parles (you), il parle (he).'
      ),
      MCQ(
        '“Nous finissons” means…',
        'We finish',
        ['We finish', 'You finish', 'They finish', 'He finishes'],
        '-ir verbs: je finis, nous finissons, ils finissent.'
      ),
      BUILD(
        'Say “I am happy” (être):',
        ['Je', 'suis', 'heureux'],
        ['heureux', 'Je', 'suis', 'es'],
        'Être: je suis, tu es, il est. Je suis heureux!'
      ),
      MCQ(
        '“Je peux” means…',
        'I can',
        ['I can', 'I want', 'I have', 'I go'],
        'Pouvoir → je peux. Vouloir → je veux.'
      ),
      BUILD(
        'Say “They sell bread” (vendre):',
        ['Ils', 'vendent', 'pain'],
        ['pain', 'Ils', 'vendent', 'vends', 'vendons'],
        '-re verbs: je vends, ils vendent. Pain = bread.'
      ),
    ],
  },

  'french-past': {
    id: 'french-past',
    title: 'French Past Stories',
    theory: [
      'Yesterday speaks in passé composé: j’ai parlé (I spoke), j’ai fini (I finished), je suis allé (I went). Most verbs take avoir; movement verbs (aller, venir, arriver) take être.',
      'The rebels: j’ai eu (I had), j’ai fait (I did/made), j’ai dit (I said). Hier = yesterday, la semaine dernière = last week.',
    ],
    questions: [
      MCQ(
        '“J’ai parlé” means…',
        'I spoke',
        ['I spoke', 'I speak', 'I will speak', 'Speak!'],
        'Avoir + parlé = finished past. Je parle = now.'
      ),
      BUILD(
        'Say “I finished” (finir):',
        ['J’ai', 'fini'],
        ['fini', 'J’ai', 'Je', 'finis'],
        'J’ai fini: avoir + past participle (fini).'
      ),
      MCQ(
        '“Je suis allé” uses être because…',
        'Aller is a movement verb',
        ['Aller is a movement verb', 'Aller is long', 'Allé is formal', 'Avoir is broken'],
        'DR MRS VANDERTRAMP verbs take être: aller, venir, arriver…'
      ),
      BUILD(
        'Say “last week”:',
        ['La', 'semaine', 'dernière'],
        ['dernière', 'La', 'semaine', 'hier'],
        'La semaine dernière frames any finished story.'
      ),
      MCQ(
        '“J’ai fait” means…',
        'I did / I made',
        ['I did / I made', 'I do', 'I say', 'I have'],
        'Faire → fait. J’ai dit = I said, j’ai eu = I had.'
      ),
    ],
  },

  'french-final': {
    id: 'french-final',
    title: 'French Final Exam',
    theory: ['Final exam: greetings, numbers, food, travel, family, present verbs, and past stories — the whole comprehensive course.'],
    questions: [
      BUILD(
        'Ask a friend “How is it going?”:',
        ['Comment', 'ça', 'va'],
        ['va', 'Comment', 'allez', 'ça'],
        'Tu form for friends: Comment ça va?'
      ),
      MCQ(
        '“Quatre-vingts” means…',
        '80',
        ['80', '84', '20', '420'],
        'Four-twenties: 4 × 20 = 80. Only in French!'
      ),
      BUILD(
        'Say “They sell bread”:',
        ['Ils', 'vendent', 'pain'],
        ['pain', 'Ils', 'vendent', 'vends', 'vendre'],
        '-re present: ils vendent = they sell.'
      ),
      MCQ(
        '“J’ai faim” means…',
        'I am hungry',
        ['I am hungry', 'I have fame', 'I eat bread', 'I am thirsty'],
        'J’ai faim = I have hunger. J’ai soif = thirsty.'
      ),
      MCQ(
        '“J’ai parlé” vs “je parle”: the difference is…',
        'Past vs present',
        ['Past vs present', 'Formal vs casual', 'Loud vs quiet', 'None'],
        'Passé composé marks the finished past: j’ai parlé = I spoke.'
      ),
      BUILD(
        'Ask “Where is the station?”:',
        ['Où', 'est', 'la', 'gare'],
        ['gare', 'Où', 'est', 'la', 'combien'],
        'Où est…? + place. La gare = the station.'
      ),
    ],
  },
};
