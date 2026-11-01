/**
 * French expansion — Course 4 (comprehensive set).
 * Original lessons written for Bolingo; sequencing follows standard
 * beginner-French syllabi. Merged into LANGUAGE_COURSES in
 * lib/languages.ts — quiz, SRS, and guidebook work unchanged.
 */
import { MCQ, BUILD, TEXT, MATCH, LISTEN, SPEAK, type CourseLesson } from './quizBank';

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
      MATCH(
        'Pair each French phrase with the moment it fits.',
        [
          { left: 'Bonjour', right: 'Greeting someone before evening' },
          { left: 'Bonsoir', right: 'Greeting someone after dark' },
          { left: 'Salut', right: 'Greeting a friend' },
          { left: 'Merci', right: 'Someone handed you what you asked for' },
          { left: 'De rien', right: 'Someone just thanked you' },
        ],
        'Bonjour and bonsoir split the day, salut stays informal, and merci/de rien are a fixed pair — the reply to thanks is never oui.'
      ),
      LISTEN(
        'Listen and type the small-talk question a friend asks you.',
        'Comment ça va',
        ['Comment ça va', 'Comment sa va', 'Comment ca va'],
        'Ça va carries all the small talk — the ç makes an s sound, so typing sa or ca still counts here.'
      ),
      SPEAK(
        'Greet a friend and ask how they are, out loud.',
        'Salut comment ça va',
        'Salut lands fast and flat, then let the question rise at the end — French asks with pitch, not word order.'
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
      MATCH(
        'Pair each French number with its value.',
        [
          { left: 'Sept', right: '7' },
          { left: 'Huit', right: '8' },
          { left: 'Neuf', right: '9' },
          { left: 'Dix', right: '10' },
          { left: 'Quatre-vingts', right: '80' },
        ],
        'The run 7-8-9-10 rhymes, then French breaks the pattern: 80 is four twenties, not a word of its own.'
      ),
      LISTEN(
        'Listen and type the time being announced.',
        'Il est trois heures',
        ['Il est trois heures'],
        'Il est, never c’est, and heures keeps a silent s you still have to type.'
      ),
      SPEAK(
        'Tell someone the hour out loud.',
        'Il est dix heures',
        'The x in dix links into heures — say it dee-zez, and the final s stays silent.'
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
      MATCH(
        'Pair each word with what you are asking for at the table.',
        [
          { left: 'Le pain', right: 'Bread' },
          { left: 'Le fromage', right: 'Cheese' },
          { left: 'Le poisson', right: 'Fish' },
          { left: 'Le poulet', right: 'Chicken' },
          { left: 'L’addition', right: 'The bill' },
        ],
        'Pain, fromage, poisson, poulet all take le; addition starts with a vowel so it takes l’. It is also the word that ends the meal.'
      ),
      LISTEN(
        'Listen and type the polite order.',
        'Je voudrais un café',
        ['Je voudrais un café', 'Je voudrais un cafe'],
        'Je voudrais is the conditional — the soft way to want. Je veux would read as a demand.'
      ),
      SPEAK(
        'Order a coffee the polite way, out loud.',
        'Je voudrais un café',
        'Voudrais ends in a silent s: voo-dray. Add s’il vous plaît and the order becomes a request.'
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
      MATCH(
        'Pair each travel word with what it gives you.',
        [
          { left: 'À gauche', right: 'Turn left' },
          { left: 'À droite', right: 'Turn right' },
          { left: 'Tout droit', right: 'Keep going straight' },
          { left: 'La gare', right: 'Catch a train here' },
          { left: 'C’est combien', right: 'Ask the price' },
        ],
        'Gauche and droite are the two words that save you on any street; combien asks price, where asks place.'
      ),
      LISTEN(
        'Listen and type the question about the station.',
        'Où est la gare',
        ['Où est la gare', 'Ou est la gare'],
        'Où = where; the accent separates it from ou (or), but hearing it is the same sound.'
      ),
      SPEAK(
        'Tell a passer-by which way to go, out loud.',
        'Allez tout droit',
        'Allez is the vous imperative — ah-lay with the nasal -ez — and tout droit means straight ahead.'
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
      MATCH(
        'Pair each family word with who it names.',
        [
          { left: 'La mère', right: 'Mother' },
          { left: 'Le père', right: 'Father' },
          { left: 'Le frère', right: 'Brother' },
          { left: 'La sœur', right: 'Sister' },
          { left: 'La fille', right: 'Daughter' },
        ],
        'La/le carry the gender, and fils (son) and fille (daughter) differ only in that final e you do not pronounce.'
      ),
      LISTEN(
        'Listen and type who you are talking about.',
        'C’est ma mère',
        ['C’est ma mère', 'C est ma mere', 'C’est ma mere'],
        'Ma agrees with the feminine noun; mon would only return before a vowel word like mon amie.'
      ),
      SPEAK(
        'Say you have a big family, out loud.',
        'J’ai une grande famille',
        'Grande keeps its final -d before the vowel of famille — that linking sound is what makes French flow.'
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
      MATCH(
        'Pair each verb form with the person it marks.',
        [
          { left: 'Je parle', right: 'I speak' },
          { left: 'Tu parles', right: 'You speak, informally' },
          { left: 'Nous parlons', right: 'We speak' },
          { left: 'Ils parlent', right: 'They speak' },
          { left: 'Je finis', right: 'I finish' },
        ],
        'The ending names the person: -e, -es, -ons, -ent. Speak and finish use the same endings, different stems.'
      ),
      LISTEN(
        'Listen and type what they sell.',
        'Je peux vendre du pain',
        ['Je peux vendre du pain'],
        'Can + infinitive is the pattern: je peux vendre (I can sell), and pain is bread.',
        { misconceptions: { 'Je peut vendre du pain': 'Peut is the il form. The two sound identical, but only je takes peux.' } }
      ),
      SPEAK(
        'Say you speak a little French, out loud.',
        'Je parle un peu français',
        'Parle is one syllable (parl), peu is "puh", and français ends in the nasal an — zhuh parl uhn puh fran-SAY.'
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
      MATCH(
        'Pair each past form with what it says.',
        [
          { left: 'J’ai parlé', right: 'I spoke' },
          { left: 'J’ai fini', right: 'I finished' },
          { left: 'Je suis allé', right: 'I went' },
          { left: 'J’ai fait', right: 'I did something' },
          { left: 'La semaine dernière', right: 'When it happened' },
        ],
        'Passé composé is auxiliary + past participle. Only movement verbs like aller borrow être instead of avoir.'
      ),
      LISTEN(
        'Listen and type what they did yesterday.',
        'Hier j’ai mangé au restaurant',
        ['Hier j’ai mangé au restaurant', 'Hier j ai mange au restaurant'],
        'Hier sets the frame, j’ai mangé is the finished action, and au restaurant is à + le fused into one word.'
      ),
      SPEAK(
        'Say you spoke French yesterday, out loud.',
        'Hier j’ai parlé français',
        'Parlé drops the final e sound: par-LAY. The whole sentence is one breath group, stress on the last syllable.'
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
      MCQ(
        'You are at a boulangerie. You want two croissants and need to pay. Which is most natural?',
        'Deux croissants, s’il vous plaît. Je peux payer ?',
        [
          'Deux croissants, s’il vous plaît. Je peux payer ?',
          'Deux croissants je payer.',
          'Je veux deux croissants maintenant.',
          'Croissants deux, payer oui.',
        ],
        'S’il vous plaît makes the order polite; “Je peux payer ?” asks to pay without demanding.'
      ),
      TEXT(
        'Type the French for “I don’t understand.”',
        ['Je ne comprends pas.'],
        'Je ne comprends pas wraps the verb in ne … pas. In casual speech you may hear “Je comprends pas,” but the full form is the standard.',
        { misconceptions: { 'Je ne comprende pas': 'Comprendre is an -re verb: the first person is je comprends, not je comprende.' } }
      ),
      MATCH(
        'Pair each word from the course with what it does for you.',
        [
          { left: 'De rien', right: 'Reply to thanks' },
          { left: 'Combien', right: 'Ask a price' },
          { left: 'La semaine dernière', right: 'Frame a finished story' },
          { left: 'Je suis allé', right: 'Movement in the past' },
          { left: 'Une pharmacie', right: 'Where you buy medicine' },
        ],
        'The final mixes politeness, numbers, past tense and travel — five different jobs, one sentence each.'
      ),
      LISTEN(
        'Listen and type the order at the counter.',
        'Je voudrais un thé',
        ['Je voudrais un thé', 'Je voudrais un the'],
        'Voudrais is the polite want and un thé is one syllable — thé ends in an aspirated h, so no liaison after it.'
      ),
      SPEAK(
        'Admit you did not follow, out loud.',
        'Je ne comprends pas',
        'Say both halves: zhuh nuh kohm-PRAH pa. Dropping the ne is casual speech, not the standard form.'
      ),
    ],
  },

  'french-questions': {
    id: 'french-questions',
    title: 'French Questions & Negation',
    theory: [
      'French asks questions three ways: rising intonation (Tu parles français ?), est-ce que (Est-ce que tu parles français ?), or inversion (Parles-tu français ?). Inversion is the most formal; est-ce que is the safest everyday form.',
      'Question words: où (where), quand (when), pourquoi (why), comment (how), qui (who), combien (how much/many), and qu’est-ce que (what). The question word comes first: Où est la gare ?',
      'Negation wraps the verb in ne … pas: Je ne parle pas français. In speech the ne often disappears: Je parle pas français. Other pairs: ne … jamais (never), ne … rien (nothing). Use tu with friends and vous in formal situations.',
    ],
    questions: [
      MCQ(
        'Which is the formal way to ask “Do you speak French?”',
        'Parlez-vous français ?',
        ['Parlez-vous français ?', 'Tu parles français ?', 'Vous parlez français.', 'Parles-tu français ?'],
        'Inversion with vous is formal: Parlez-vous…? Tu parles…? is informal; the third option is a statement.'
      ),
      BUILD(
        'Ask “Where is the station?”',
        ['Où', 'est', 'la', 'gare'],
        ['gare', 'Où', 'est', 'la', 'combien'],
        'Où est…? + place. La gare = the station; combien asks how much.'
      ),
      MCQ(
        '“Je ne parle pas français” means…',
        'I don’t speak French',
        ['I don’t speak French', 'I speak French', 'I don’t study French', 'I want to learn French'],
        'Ne … pas surrounds the verb: ne parle pas = don’t speak.'
      ),
      BUILD(
        'Say “I don’t eat meat”:',
        ['Je', 'ne', 'mange', 'pas', 'de', 'viande'],
        ['viande', 'Je', 'ne', 'mange', 'pas', 'de', 'jamais'],
        'Je ne mange pas de viande. After a negation, de replaces the article: pas de viande.'
      ),
      MCQ(
        '“Je ne vois rien” means…',
        'I see nothing',
        ['I see nothing', 'I don’t see the water', 'I see everything', 'I don’t want to see'],
        'Ne … rien is the “nothing” pair. French keeps both halves around the verb.'
      ),
      MATCH(
        'Pair each question word with the answer it demands.',
        [
          { left: 'Où', right: 'A place' },
          { left: 'Quand', right: 'A time' },
          { left: 'Pourquoi', right: 'A reason' },
          { left: 'Combien', right: 'An amount' },
          { left: 'Qui', right: 'A person' },
        ],
        'Each word demands a different kind of answer: où wants a place, combien wants a number, pourquoi wants an excuse.'
      ),
      LISTEN(
        'Listen and type the refusal.',
        'Je ne mange pas de viande',
        ['Je ne mange pas de viande'],
        'Ne … pas closes around the verb, and after a negation de replaces the article: pas de viande, not pas la viande.',
        { misconceptions: { 'Je ne mange pas la viande': 'A negation turns the article into de: je ne mange pas de viande.' } }
      ),
      SPEAK(
        'Ask how much something costs, out loud.',
        'Combien ça coûte',
        'Combien is kohm-NYEN with the nasal, coûte is one syllable (koót) — the stress always falls on the last sound of the phrase.'
      ),
    ],
  },

  'french-health': {
    id: 'french-health',
    title: 'French Health & Emergencies',
    theory: [
      'Say where it hurts with avoir mal à: J’ai mal à la tête (headache), J’ai mal au ventre (stomach ache). The preposition contracts: à + le = au, à + les = aux.',
      'Symptoms: J’ai de la fièvre (I have a fever), je tousse (I cough). Ask for help with J’ai besoin d’un médecin (I need a doctor), Où est la pharmacie ?, or Appelez une ambulance (call an ambulance — formal).',
      'Allergies: Je suis allergique aux arachides. For polite help say Pouvez-vous m’aider ?',
    ],
    questions: [
      MCQ(
        '“J’ai mal à la tête” means…',
        'I have a headache',
        ['I have a headache', 'I have a stomach ache', 'My feet hurt', 'I am dizzy'],
        'Avoir mal à + body part: la tête = the head. Au ventre is the stomach.'
      ),
      BUILD(
        'Say “I need a doctor”:',
        ['J’ai', 'besoin', 'd’un', 'médecin'],
        ['médecin', 'J’ai', 'besoin', 'd’un', 'pharmacie'],
        'J’ai besoin de… = I need…; de + un contracts to d’un médecin.'
      ),
      MCQ(
        '“J’ai de la fièvre” means…',
        'I have a fever',
        ['I have a fever', 'I have a cough', 'I am cold', 'I have a headache'],
        'Avoir de la fièvre = to have a fever. Je tousse = I cough.'
      ),
      BUILD(
        'Ask “Where is the pharmacy?”',
        ['Où', 'est', 'la', 'pharmacie'],
        ['pharmacie', 'Où', 'est', 'la', 'le'],
        'Où est la pharmacie ? — pharmacie is feminine, so la pharmacie.'
      ),
      MCQ(
        '“Je suis allergique aux arachides” means…',
        'Peanuts make me ill',
        ['Peanuts make me ill', 'I love peanuts', 'I am carrying peanuts', 'Peanuts are expensive'],
        'Allergique à… names the trigger; à + les contracts to aux.'
      ),
      MATCH(
        'Pair each symptom with what the pharmacist hears.',
        [
          { left: 'J’ai mal à la tête', right: 'My head hurts' },
          { left: 'J’ai mal au ventre', right: 'My stomach hurts' },
          { left: 'J’ai de la fièvre', right: 'I have a fever' },
          { left: 'Je tousse', right: 'I cannot stop coughing' },
          { left: 'J’ai besoin d’un médecin', right: 'I need a doctor' },
        ],
        'Avoir mal à + body part for pain, avoir de la fièvre for fever, besoin de for need — three different frames, one visit.'
      ),
      LISTEN(
        'Listen and type the question they ask in the street.',
        'Où est la pharmacie',
        ['Où est la pharmacie', 'Ou est la pharmacie'],
        'Où est + place is the survival question; pharmacie is feminine, so la pharmacie.'
      ),
      SPEAK(
        'Tell someone to call an ambulance, out loud.',
        'Appelez une ambulance',
        'Appelez is the vous imperative — ah-play-lay — and the final z links into une: ah-play-LAY-zoon.'
      ),
    ],
  },
};
