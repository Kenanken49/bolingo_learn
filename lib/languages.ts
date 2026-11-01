/**
 * World Languages & Chess — Course 4 banks (Duolingo style).
 * Owns the ES/FR/DE/SW + chess lesson data and its accessor; courses.ts
 * merges LANGUAGE_COURSES so getCourseLesson() behavior is identical and
 * the quiz engine, SRS, and guidebook need no changes.
 */
import { MCQ, BUILD, TEXT, MATCH, LISTEN, SPEAK, validateBank, type CourseLesson } from './quizBank';
import { SWAHILI_PLUS } from './swahili-plus';
import { ENGLISH_PLUS } from './english-plus';
import { SPANISH_PLUS } from './spanish-plus';
import { FRENCH_PLUS } from './french-plus';
import { GERMAN_PLUS } from './german-plus';
import { CHESS_PLUS } from './chess-plus';

export const LANGUAGE_COURSES: Record<string, CourseLesson> = {
  /* ---------------- Course 4 · World Languages (Duolingo style) ---------------- */

  'spanish-basics': {
    id: 'spanish-basics',
    title: 'Spanish Basics',
    theory: [
      'Spanish is spoken by 500M+ people. Start the Duolingo way: greetings first — Hola (hello), Adiós (goodbye), Gracias (thank you), Por favor (please).',
      'Every Spanish noun has gender: el for masculine, la for feminine. Niña (girl) is feminine → la niña.',
    ],
    questions: [
      MCQ(
        'How do you say "Hello" in Spanish?',
        'Hola',
        ['Hola', 'Adiós', 'Gracias', 'Por favor'],
        'Hola opens every conversation — nail it first.'
      ),
      MCQ(
        '"Gracias" means…',
        'Thank you',
        ['Thank you', 'Please', 'Goodbye', 'Welcome'],
        'Gratitude unlocks kindness in every language.'
      ),
      BUILD(
        'Say "I eat apples":',
        ['Yo', 'como', 'manzanas'],
        ['manzanas', 'Yo', 'el', 'como'],
        'Yo = I, como = (I) eat from comer, manzanas = apples.'
      ),
      MCQ(
        'Which article goes with "niña" (girl)?',
        'la',
        ['la', 'el', 'los', 'un'],
        'Feminine nouns take la; masculine nouns take el.'
      ),
      BUILD(
        'Say goodbye to a friend:',
        ['Adiós', 'amigo'],
        ['amigo', 'Hola', 'Adiós', 'gracias'],
        'Adiós = goodbye, amigo = friend.'
      ),
      MATCH(
        'Pair each Spanish word with its meaning.',
        [
          { left: 'Hola', right: 'Hello' },
          { left: 'Adiós', right: 'Goodbye' },
          { left: 'Gracias', right: 'Thank you' },
          { left: 'Por favor', right: 'Please' },
          { left: 'Niña', right: 'Girl' },
        ],
        'Four politeness words plus the gender cue: la niña is feminine, so el article never fits.'
      ),
      LISTEN(
        'Listen and type the sentence about apples.',
        'Yo como manzanas',
        ['Yo como manzanas'],
        'Yo = I, como = (I) eat, manzanas = apples — the -o ending is what marks the speaker as "I".'
      ),
      SPEAK(
        'Say goodbye to a friend, out loud.',
        'Adiós amigo',
        'The stress sits on the middle syllable — ad-YOS ah-MEE-go — and the accent on adiós lengthens that o.'
      ),
    ],
  },

  'french-basics': {
    id: 'french-basics',
    title: 'French Basics',
    theory: [
      'French starts with music: Bonjour (hello), Merci (thank you), Au revoir (goodbye). Pronounce every syllable softly — the r rolls at the back.',
      'Like Spanish, French nouns have gender: le for masculine, la for feminine. Fille (girl) is feminine → la fille.',
    ],
    questions: [
      MCQ(
        '"Bonjour" means…',
        'Hello',
        ['Hello', 'Goodbye', 'Thank you', 'Please'],
        'Bonjour = good day — the all-purpose French hello.'
      ),
      MCQ(
        '"Merci" means…',
        'Thank you',
        ['Thank you', 'Sorry', 'Welcome', 'Good night'],
        'Merci carries you through every café in Paris.'
      ),
      BUILD(
        'Say "I eat apples":',
        ['Je', 'mange', 'des', 'pommes'],
        ['pommes', 'Je', 'le', 'mange', 'des'],
        'Je = I, mange = (I) eat, des pommes = (some) apples.'
      ),
      MCQ(
        'Which article goes with "fille" (girl)?',
        'la',
        ['la', 'le', 'les', 'un'],
        'Feminine nouns take la; masculine nouns take le.'
      ),
      BUILD(
        'Say goodbye, friend:',
        ['Au', 'revoir', 'mon', 'ami'],
        ['ami', 'Bonjour', 'Au', 'revoir', 'mon'],
        'Au revoir = until we meet again; mon ami = my friend.'
      ),
      MATCH(
        'Pair each French word with its meaning.',
        [
          { left: 'Bonjour', right: 'Hello' },
          { left: 'Merci', right: 'Thank you' },
          { left: 'Au revoir', right: 'Goodbye' },
          { left: 'Fille', right: 'Girl' },
          { left: 'Pommes', right: 'Apples' },
        ],
        'Bonjour opens, au revoir closes, and gender decides the article: la fille, des pommes.'
      ),
      LISTEN(
        'Listen and type the sentence about apples.',
        'Je mange des pommes',
        ['Je mange des pommes'],
        'Je = I, mange = (I) eat, des pommes = (some) apples. The -s on pommes is silent; the nasal in "pommes" is not.'
      ),
      SPEAK(
        'Say goodbye to a friend, out loud.',
        'Au revoir mon ami',
        'Link the words the way French does — oh-rev-WAR mohn-ah-MEE — and let the r rasp at the back of the throat.'
      ),
    ],
  },

  'german-basics': {
    id: 'german-basics',
    title: 'German Basics',
    theory: [
      'German starts crisp: Hallo (hello), Danke (thank you), Bitte (please/you are welcome). Every noun is capitalised — Morgen, Apfel, Frau.',
      'German has three genders: der (masculine), die (feminine), das (neuter). Frau (woman) is feminine → die Frau.',
    ],
    questions: [
      MCQ(
        '"Hallo" means…',
        'Hello',
        ['Hello', 'Goodbye', 'Thank you', 'Please'],
        'Hallo works everywhere — shops, streets, friends.'
      ),
      MCQ(
        '"Danke" means…',
        'Thank you',
        ['Thank you', 'Please', 'Sorry', 'Welcome'],
        'Danke schön = thank you very much.'
      ),
      BUILD(
        'Say "I eat apples":',
        ['Ich', 'esse', 'Äpfel'],
        ['Äpfel', 'Ich', 'der', 'esse'],
        'Ich = I, esse = (I) eat, Äpfel = apples. Note the capital Ä!'
      ),
      MCQ(
        'Which article goes with "Frau" (woman)?',
        'die',
        ['die', 'der', 'das', 'den'],
        'Frau is feminine → die. Der Mann, das Kind.'
      ),
      BUILD(
        'Say "Good morning":',
        ['Guten', 'Morgen'],
        ['Morgen', 'Hallo', 'Guten', 'Abend'],
        'Guten Morgen — capital M, always.'
      ),
      MATCH(
        'Pair each German word with its meaning.',
        [
          { left: 'Hallo', right: 'Hello' },
          { left: 'Danke', right: 'Thank you' },
          { left: 'Frau', right: 'Woman' },
          { left: 'Äpfel', right: 'Apples' },
          { left: 'Morgen', right: 'Morning' },
        ],
        'Every German noun is capitalised — Morgen and Äpfel wear their capitals even mid-sentence.'
      ),
      LISTEN(
        'Listen and type the sentence about apples.',
        'Ich esse Äpfel',
        ['Ich esse Äpfel'],
        'Ich = I, esse = (I) eat, Äpfel = apples. The umlaut Ä is a different vowel, not a decorated A.'
      ),
      SPEAK(
        'Greet someone before noon, out loud.',
        'Guten Morgen',
        'Guten takes the "goo-ten" glide and Morgen stresses first: GOO-ten MOR-gen.'
      ),
    ],
  },

  'swahili-basics': {
    id: 'swahili-basics',
    title: 'Swahili Basics',
    theory: [
      'Kiswahili is spoken by 200M+ people across East Africa. Greetings carry respect: Habari (hello/how are you), Asante (thank you), Karibu (welcome), Tafadhali (please).',
      'Swahili verbs build like blocks: Ni-na-kula = I-am-eating. One word can be a whole sentence!',
    ],
    questions: [
      MCQ(
        '"Habari" means…',
        'Hello / How are you',
        ['Hello / How are you', 'Thank you', 'Goodbye', 'Welcome'],
        'Habari = news — you ask for their news to say hello.'
      ),
      MCQ(
        '"Asante" means…',
        'Thank you',
        ['Thank you', 'Please', 'Sorry', 'Welcome'],
        'Asante sana = thank you very much.'
      ),
      BUILD(
        'Say "I am eating mangoes":',
        ['Ninakula', 'maembe'],
        ['maembe', 'Habari', 'Ninakula', 'asante'],
        'Ni-na-kula = I-am-eating; maembe = mangoes.'
      ),
      MCQ(
        '"Karibu" means…',
        'Welcome',
        ['Welcome', 'Goodbye', 'Hurry', 'Sorry'],
        'Karibu welcomes every guest — hospitality in one word.'
      ),
      BUILD(
        'Ask "How are you?":',
        ['Habari', 'yako'],
        ['yako', 'Asante', 'Habari', 'karibu'],
        'Habari yako? = your news? — the everyday greeting.'
      ),
      MATCH(
        'Pair each Swahili word with its meaning.',
        [
          { left: 'Habari', right: 'Hello / How are you' },
          { left: 'Asante', right: 'Thank you' },
          { left: 'Karibu', right: 'Welcome' },
          { left: 'Tafadhali', right: 'Please' },
          { left: 'Maembe', right: 'Mangoes' },
        ],
        'Habari literally asks after someone’s news; the other four are the politeness set.'
      ),
      LISTEN(
        'Listen and type the sentence about mangoes.',
        'Ninakula maembe',
        ['Ninakula maembe'],
        'Ni-na-kula is one block: I + present -na- + eat. Maembe = mangoes.'
      ),
      SPEAK(
        'Ask a friend how they are, out loud.',
        'Habari yako',
        'Every syllable gets its vowel: hah-BAR-ee YAH-koh, with the h breathed out.'
      ),
    ],
  },

  /* ---------------- Course 4 · Chess Basics (Duolingo Chess style) ---------------- */

  'chess-basics': {
    id: 'chess-basics',
    title: 'Chess Basics',
    theory: [
      'Chess is played on an 8×8 board with 16 pieces each. Every piece moves differently — knights jump in an L, bishops glide diagonally, rooks run straight, the queen does both.',
      'The goal is checkmate: attack the enemy king so it cannot escape. Moves are written in notation — Nf3 means knight to f3, O-O means kingside castle.',
    ],
    questions: [
      MCQ(
        'How does a knight move?',
        'In an L-shape: two squares one way, one sideways',
        ['In an L-shape: two squares one way, one sideways', 'Diagonally any distance', 'Straight any distance', 'One square in any direction'],
        'Knights jump over pieces — the trickiest mover on the board.'
      ),
      MCQ(
        'Which piece moves diagonally any number of squares?',
        'Bishop',
        ['Bishop', 'Rook', 'Knight', 'Pawn'],
        'Bishop = diagonals; rook = straights; queen = both.'
      ),
      BUILD(
        'Knight on g1 jumps to f3. Write the move:',
        ['N', 'f3'],
        ['N', 'f3', 'g1', 'B'],
        'N = knight (K is the king). Then the destination square: f3.'
      ),
      MCQ(
        'What does O-O mean in notation?',
        'Kingside castle',
        ['Kingside castle', 'Checkmate', 'Draw offer', 'Pawn promotion'],
        'O-O castles kingside; O-O-O castles queenside.'
      ),
      MCQ(
        'Checkmate means…',
        'The king is attacked and cannot escape — game over',
        ['The king is attacked and cannot escape — game over', 'The king is attacked but can move', 'Both sides agree a draw', 'A pawn reaches the far rank'],
        'Check = attacked. Checkmate = no escape. Stalemate = draw.'
      ),
      MCQ(
        'White pawn on e2 pushes two squares. Write it:',
        'e4',
        ['e4', 'e3', 'Nf3', 'e5'],
        'Pawns move straight; from rank 2 they may jump two squares.'
      ),
      MATCH(
        'Pair each piece or symbol with what it does.',
        [
          { left: 'Knight', right: 'Jumps in an L-shape' },
          { left: 'Bishop', right: 'Glides along diagonals' },
          { left: 'Rook', right: 'Runs along straight lines' },
          { left: 'O-O', right: 'Kingside castle' },
          { left: 'O-O-O', right: 'Queenside castle' },
        ],
        'Bishops never change colour, rooks never turn, and the two castles differ by how many O’s you write.'
      ),
    ],
  },

  /* ---------------- Full courses: phrases + checkpoints ---------------- */

  'spanish-phrases': {
    id: 'spanish-phrases',
    title: 'Spanish Phrases',
    theory: [
      'Move past single words: ask how people are (¿Cómo estás?), introduce yourself (Me llamo…), and soften every request with Por favor.',
      'Gratitude scales up: Gracias → Muchas gracias (thank you very much). Goodbyes scale too: Adiós → Hasta luego (see you later).',
    ],
    questions: [
      MCQ(
        '"¿Cómo estás?" means…',
        'How are you?',
        ['How are you?', 'What is your name?', 'Where are you from?', 'How old are you?'],
        'The go-to greeting right after Hola.'
      ),
      BUILD(
        'Say "My name is Ana":',
        ['Me', 'llamo', 'Ana'],
        ['Ana', 'Yo', 'Me', 'llamo'],
        'Me llamo = I call myself — the Spanish introduction.'
      ),
      MCQ(
        '"Por favor" means…',
        'Please',
        ['Please', 'Thank you', 'Sorry', 'Welcome'],
        'Por favor softens every request.'
      ),
      BUILD(
        'Say "Thank you very much":',
        ['Muchas', 'gracias'],
        ['gracias', 'Hola', 'Muchas', 'por'],
        'Muchas = many; gracias = thanks. Stack them for emphasis.'
      ),
      MCQ(
        '"Hasta luego" means…',
        'See you later',
        ['See you later', 'Good night', 'Good luck', 'Welcome back'],
        'Hasta = until; luego = later. Warmer than Adiós.'
      ),
      MATCH(
        'Pair each phrase with what it does in a conversation.',
        [
          { left: '¿Cómo estás?', right: 'Ask a friend how they are' },
          { left: 'Me llamo', right: 'Introduce yourself' },
          { left: 'Por favor', right: 'Soften a request' },
          { left: 'Muchas gracias', right: 'Thank someone warmly' },
          { left: 'Hasta luego', right: 'Leave for now' },
        ],
        'Each one is a move in a conversation, not just a translation — greet, name, ask, thank, part.'
      ),
      LISTEN(
        'Listen and type how someone says their name.',
        'Me llamo Ana',
        ['Me llamo Ana'],
        'Me llamo = I call myself. No verb changes, no accent — the stress sits on the final a of Ana.'
      ),
      SPEAK(
        'Thank someone generously, out loud.',
        'Muchas gracias',
        'Both words stress the second-to-last syllable: MUCH-ahs GRASH-yahs (Latin America) or GRAH-see-ahs (Spain).'
      ),
    ],
  },

  'spanish-tenses': {
    id: 'spanish-tenses',
    title: 'Spanish Tenses Lab',
    theory: [
      'Present tense runs on endings: -o = I (hablo), -as = you (hablas), -a = he/she (habla), -amos = we (hablamos), -an = they (hablan).',
      'Ser vs estar: ser for identity, events and time (la fiesta es hoy); estar for location and mood (estoy cansado).',
    ],
    questions: [
      MCQ(
        '"___ hablo español." (I speak Spanish.)',
        'Yo',
        ['Yo', 'Tú', 'Él', 'Ellos'],
        'The verb ends in -o → the speaker is “I”: Yo hablo.'
      ),
      BUILD(
        'Say "We speak English":',
        ['Nosotros', 'hablamos', 'inglés'],
        ['inglés', 'Nosotros', 'hablamos', 'hablas'],
        '-amos = we: hablamos. Spanish often drops the pronoun!'
      ),
      MCQ(
        '"La fiesta ___ hoy." (The party is today.)',
        'es',
        ['es', 'está', 'son', 'están'],
        'Ser for events and time: la fiesta es hoy.'
      ),
      BUILD(
        'Ask "Where is the bathroom?":',
        ['Dónde', 'está', 'el', 'baño'],
        ['baño', 'Dónde', 'el', 'está', 'es'],
        'Location of things uses estar: ¿dónde está…?'
      ),
      MCQ(
        '"Ellos ___ tacos." (They eat tacos.)',
        'comen',
        ['como', 'comes', 'come', 'comen'],
        '-er verbs: ellos take -en → comen.'
      ),
      MATCH(
        'Pair each subject with its present-tense ending.',
        [
          { left: 'Yo', right: '-o' },
          { left: 'Tú', right: '-as' },
          { left: 'Él o Ella', right: '-a' },
          { left: 'Nosotros', right: '-amos' },
          { left: 'Ellos', right: '-an' },
        ],
        'One ending tells you who is speaking — that is why Spanish drops the pronoun so often.'
      ),
      LISTEN(
        'Listen and type the sentence about languages.',
        'Nosotros hablamos inglés',
        ['Nosotros hablamos inglés'],
        '-amos marks the we-form, and inglés keeps its accent on the final syllable.'
      ),
      SPEAK(
        'Ask where the bathroom is, out loud.',
        'Dónde está el baño',
        'Two accents, two stresses: DON-deh, es-TAH — and the ñ cuts the nose, not the n.'
      ),
    ],
  },

  'spanish-quiz': {
    id: 'spanish-quiz',
    title: 'Spanish Checkpoint',
    theory: ['Checkpoint: greetings, phrases, gender, and tenses from the full Spanish course.'],
    questions: [
      MCQ(
        'How do you say "Hello" in Spanish?',
        'Hola',
        ['Hola', 'Adiós', 'Gracias', 'Por favor'],
        'Hola opens every conversation.'
      ),
      BUILD(
        'Say "I eat apples":',
        ['Yo', 'como', 'manzanas'],
        ['manzanas', 'Yo', 'el', 'como'],
        'Yo = I, como = (I) eat, manzanas = apples.'
      ),
      MCQ(
        'Which article goes with "libro" (book)?',
        'el',
        ['el', 'la', 'los', 'las'],
        'Libro is masculine → el. La niña, el libro.'
      ),
      BUILD(
        'Say "My name is Ana":',
        ['Me', 'llamo', 'Ana'],
        ['Ana', 'Me', 'llamo', 'Tú'],
        'Me llamo Ana — introduce yourself anywhere.'
      ),
      MCQ(
        '"¿Cómo estás?" means…',
        'How are you?',
        ['How are you?', 'What is your name?', 'Where are you?', 'How old are you?'],
        'Ask it after Hola to start a real conversation.'
      ),
      MCQ(
        '"Ellos ___ tacos." (They eat tacos.)',
        'comen',
        ['como', 'comes', 'come', 'comen'],
        'Tenses check: ellos take -en → comen.'
      ),
      TEXT(
        'You are at a café in Madrid. Type the Spanish for “A coffee, please. The bill, please.”',
        ['Un café, por favor. La cuenta, por favor.', 'Un café por favor, la cuenta por favor.'],
        'Por favor softens both requests, and la cuenta is the bill. In Spain you can also say “Cobrar, por favor” when you are ready to pay.',
        { misconceptions: { 'Un café. La cuenta.': 'Both requests need por favor to sound polite in a café.' } }
      ),
      MATCH(
        'Pair each subject with the verb form that agrees with it.',
        [
          { left: 'Yo', right: 'hablo' },
          { left: 'Tú', right: 'hablas' },
          { left: 'Nosotros', right: 'hablamos' },
          { left: 'Ellos', right: 'comen' },
        ],
        'Three -o/-as/-amos forms from hablar, plus one -er verb: ellos comen, never comemos.'
      ),
      LISTEN(
        'Listen and type the question a stranger asks you.',
        'Dónde está el baño',
        ['Dónde está el baño', 'Donde esta el bano'],
        'Location uses estar, and the accent on dónde is what makes it a question rather than a statement.'
      ),
      SPEAK(
        'Order a coffee politely, out loud.',
        'Un café por favor',
        'Rise slightly on favor to signal a request; the é in café is a full vowel, not a stray mark.'
      ),
    ],
  },

  'french-phrases': {
    id: 'french-phrases',
    title: 'French Phrases',
    theory: [
      'Level up: ask how people are (Comment ça va?), introduce yourself (Je m’appelle…), and request politely (S’il vous plaît).',
      'Merci scales to Merci beaucoup; Au revoir softens to À bientôt (see you soon).',
    ],
    questions: [
      MCQ(
        '"Comment ça va?" means…',
        'How are you?',
        ['How are you?', 'What is your name?', 'Where is the station?', 'What time is it?'],
        'The classic after Bonjour.'
      ),
      BUILD(
        'Say "My name is Marie":',
        ['Je', "m'appelle", 'Marie'],
        ['Marie', 'Tu', 'Je', "m'appelle"],
        "Je m'appelle = I call myself — the French introduction."
      ),
      MCQ(
        '"S\'il vous plaît" means…',
        'Please',
        ['Please', 'Thank you', 'Sorry', 'Welcome'],
        'The politeness key to every French request.'
      ),
      BUILD(
        'Say "Thank you very much":',
        ['Merci', 'beaucoup'],
        ['beaucoup', 'Merci', 'bon', 'très'],
        'Merci beaucoup — beaucoup = a lot.'
      ),
      MCQ(
        '"À bientôt" means…',
        'See you soon',
        ['See you soon', 'Good night', 'Good luck', 'Welcome back'],
        'À = until; bientôt = soon.'
      ),
      MATCH(
        'Pair each phrase with what it does in a conversation.',
        [
          { left: 'Comment ça va?', right: 'Ask how someone is' },
          { left: "Je m'appelle", right: 'Introduce yourself' },
          { left: "S'il vous plaît", right: 'Soften a request' },
          { left: 'Merci beaucoup', right: 'Thank someone warmly' },
          { left: 'À bientôt', right: 'Leave for now' },
        ],
        'The same five moves as Spanish, in French clothes: greet, name, ask, thank, part.'
      ),
      LISTEN(
        'Listen and type how someone says their name.',
        "Je m'appelle Marie",
        ["Je m'appelle Marie"],
        'The elision m’appelle swallows the vowel of je — one smooth jump, not two words.'
      ),
      SPEAK(
        'Thank someone generously, out loud.',
        'Merci beaucoup',
        'mer-SEE boh-KOO — the l is silent and the final p never appears.'
      ),
    ],
  },

  'french-tenses': {
    id: 'french-tenses',
    title: 'French Tenses Lab',
    theory: [
      'Present tense runs on endings: -e = I/he (parle), -es = you (parles), -ons = we (parlons), -ez = you all (parlez), -ent = they (parlent, silent -nt!).',
      'Être is the king verb — memorise it whole: je suis, tu es, il est, nous sommes, vous êtes, ils sont.',
    ],
    questions: [
      MCQ(
        '"___ parle français." (I speak French.)',
        'Je',
        ['Je', 'Tu', 'Il', 'Nous'],
        '-e ending with no -s → Je parle.'
      ),
      BUILD(
        'Say "We love bread":',
        ['Nous', 'aimons', 'le', 'pain'],
        ['pain', 'Nous', 'le', 'aimons', 'aimez'],
        '-ons = we: nous aimons.'
      ),
      MCQ(
        '"Tu ___ à Paris." (You live in Paris.)',
        'habites',
        ['habite', 'habites', 'habitent', 'habiter'],
        'Tu verbs take -s: tu habites.'
      ),
      BUILD(
        'Say "She is tired":',
        ['Elle', 'est', 'fatiguée'],
        ['fatiguée', 'Elle', 'est', 'sont'],
        'Elle est — she is. Est also pairs with il and on.'
      ),
      MCQ(
        '"Ils ___ contents." (They are happy.)',
        'sont',
        ['est', 'sommes', 'sont', 'êtes'],
        'Ils + être → sont.'
      ),
      MATCH(
        'Pair each subject with its form of être (to be).',
        [
          { left: 'Je', right: 'suis' },
          { left: 'Tu', right: 'es' },
          { left: 'Il ou Elle', right: 'est' },
          { left: 'Nous', right: 'sommes' },
          { left: 'Vous', right: 'êtes' },
        ],
        'Être is irregular from the ground up — memorise it whole, because every level of French builds on it.'
      ),
      LISTEN(
        'Listen and type the sentence about bread.',
        'Nous aimons le pain',
        ['Nous aimons le pain'],
        '-ons is the we-ending, and the n in pain is nasal — the air comes through the nose.'
      ),
      SPEAK(
        'Say that she is tired, out loud.',
        'Elle est fatiguée',
        'Elle est runs together as one breath — el-AY — and fatiguée ends on the last e, not a silent one.'
      ),
    ],
  },

  'french-quiz': {
    id: 'french-quiz',
    title: 'French Checkpoint',
    theory: ['Checkpoint: greetings, phrases, gender, and tenses from the full French course.'],
    questions: [
      MCQ(
        '"Bonjour" means…',
        'Hello',
        ['Hello', 'Goodbye', 'Thank you', 'Please'],
        'Bonjour = good day — the all-purpose hello.'
      ),
      BUILD(
        'Say "I eat apples":',
        ['Je', 'mange', 'des', 'pommes'],
        ['pommes', 'Je', 'le', 'mange', 'des'],
        'Je = I, mange = (I) eat, des pommes = (some) apples.'
      ),
      MCQ(
        'Which article goes with "livre" (book)?',
        'le',
        ['le', 'la', 'les', 'des'],
        'Livre is masculine → le. La fille, le livre.'
      ),
      BUILD(
        'Say "My name is Marie":',
        ['Je', "m'appelle", 'Marie'],
        ['Marie', "m'appelle", 'Je', 'Tu'],
        "Je m'appelle Marie — introduce yourself anywhere."
      ),
      MCQ(
        '"Merci" means…',
        'Thank you',
        ['Thank you', 'Sorry', 'Welcome', 'Good night'],
        'Merci carries you through every café in Paris.'
      ),
      MCQ(
        '"Ils ___ contents." (They are happy.)',
        'sont',
        ['est', 'sommes', 'sont', 'êtes'],
        'Tenses check: ils + être → sont.'
      ),
      TEXT(
        'You walk into a restaurant in Lyon. Type the French for “A table for two, please.”',
        ['Une table pour deux, s’il vous plaît.', 'Une table pour deux s’il vous plaît.'],
        'Une table = a table, pour deux = for two, s’il vous plaît = please. The whole phrase is the polite request; dropping the final phrase makes it sound like a command.',
        { misconceptions: { 'Une table deux': 'Name the party size with pour: une table pour deux.' } }
      ),
      MATCH(
        'Pair each article with the noun shape it needs.',
        [
          { left: 'le', right: 'masculine singular' },
          { left: 'la', right: 'feminine singular' },
          { left: 'les', right: 'any plural' },
          { left: 'un', right: 'one masculine thing' },
        ],
        'Gender is a property of the noun, not the object: livre is masculine, fille is feminine, and les makes either plural.'
      ),
      LISTEN(
        'Listen and type the sentence about apples.',
        'Je mange des pommes',
        ['Je mange des pommes'],
        'des pommes is "some apples" — the partitive article you need whenever you eat or buy something.'
      ),
      SPEAK(
        'Ask a waiter for the table you already booked, out loud.',
        'Une table pour deux',
        'Link the words: oon-table-poor-DUH — French hates a gap between them.'
      ),
    ],
  },

  'german-phrases': {
    id: 'german-phrases',
    title: 'German Phrases',
    theory: [
      'Go beyond words: ask how people are (Wie geht’s?), introduce yourself (Ich heiße…), and excuse yourself (Entschuldigung).',
      'Danke grows to Vielen Dank; goodbyes split into formal Auf Wiedersehen and casual Tschüss.',
    ],
    questions: [
      MCQ(
        '"Wie geht\'s?" means…',
        'How are you?',
        ['How are you?', 'What is your name?', 'Where are you from?', 'What is that?'],
        'Short for Wie geht es dir — the casual check-in.'
      ),
      BUILD(
        'Say "My name is Anna":',
        ['Ich', 'heiße', 'Anna'],
        ['Anna', 'Du', 'Ich', 'heiße'],
        'Ich heiße = I am called — the German introduction.'
      ),
      MCQ(
        '"Entschuldigung" means…',
        'Excuse me / Sorry',
        ['Excuse me / Sorry', 'Thank you', 'Please', 'Welcome'],
        'Use it to pass by, apologise, or get attention.'
      ),
      BUILD(
        'Say "Thank you very much":',
        ['Vielen', 'Dank'],
        ['Dank', 'Danke', 'Vielen', 'Bitte'],
        'Vielen Dank — never Danke viel!'
      ),
      MCQ(
        '"Tschüss" means…',
        'Bye (informal)',
        ['Bye (informal)', 'Good night', 'Good luck', 'Welcome back'],
        'Tschüss for friends; Auf Wiedersehen for formal farewells.'
      ),
      MATCH(
        'Pair each phrase with what it does in a conversation.',
        [
          { left: "Wie geht's?", right: 'Ask how someone is' },
          { left: 'Ich heiße', right: 'Introduce yourself' },
          { left: 'Entschuldigung', right: 'Apologise or get past' },
          { left: 'Vielen Dank', right: 'Thank someone warmly' },
          { left: 'Tschüss', right: 'Say bye to a friend' },
        ],
        'Entschuldigung covers both sorry and excuse me — the register comes from your tone, not the word.'
      ),
      LISTEN(
        'Listen and type how someone says their name.',
        'Ich heiße Anna',
        ['Ich heiße Anna', 'Ich heisse Anna'],
        'The ß (Eszett) is a sharp s — heisse and heiße are the same word spelled two ways.'
      ),
      SPEAK(
        'Thank someone generously, out loud.',
        'Vielen Dank',
        'VEE-len DANK — stress the first syllable of each word and keep the vowel short and clean.'
      ),
    ],
  },

  'german-tenses': {
    id: 'german-tenses',
    title: 'German Tenses Lab',
    theory: [
      'Present tense: ich takes -e (spreche), du takes -st (sprichst), er takes -t (spricht); wir/sie take the bare infinitive (lernen).',
      'Questions flip the verb first: Bist du müde? Haben memorises as: ich habe, du hast, er hat.',
    ],
    questions: [
      MCQ(
        '"___ spreche Deutsch." (I speak German.)',
        'Ich',
        ['Ich', 'Du', 'Er', 'Wir'],
        '-e ending → ich: ich spreche.'
      ),
      BUILD(
        'Say "We are learning German":',
        ['Wir', 'lernen', 'Deutsch'],
        ['Deutsch', 'Wir', 'lernen', 'lernt'],
        'Wir + bare verb: wir lernen. No ending added!'
      ),
      MCQ(
        '"Er ___ ein Auto." (He has a car.)',
        'hat',
        ['habe', 'hast', 'hat', 'haben'],
        'Haben: ich habe, du hast, er/sie/es hat.'
      ),
      BUILD(
        'Ask "Are you tired?":',
        ['Bist', 'du', 'müde'],
        ['müde', 'du', 'Bist', 'Bin'],
        'Bist du = are you (informal). Verb first in questions!'
      ),
      MCQ(
        '"Sie (they) ___ müde." (They are tired.)',
        'sind',
        ['bin', 'bist', 'ist', 'sind'],
        'Sein: ich bin, du bist, er ist, wir/sie sind.'
      ),
      MATCH(
        'Pair each subject with its haben (to have) ending.',
        [
          { left: 'ich', right: 'habe' },
          { left: 'du', right: 'hast' },
          { left: 'er sie es', right: 'hat' },
          { left: 'wir', right: 'haben' },
        ],
        'du adds -st and er drops it entirely — and the plural just reuses the infinitive.'
      ),
      LISTEN(
        'Listen and type the sentence about learning German.',
        'Wir lernen Deutsch',
        ['Wir lernen Deutsch'],
        'Wir takes the bare infinitive: no ending at all. Deutsch wears its capital D because nouns are capitalised.'
      ),
      SPEAK(
        'Ask a friend whether they are tired, out loud.',
        'Bist du müde',
        'Verb first turns it into a question — no word order change needed, just the ü: BYST doo MUE-deh.'
      ),
    ],
  },

  'german-quiz': {
    id: 'german-quiz',
    title: 'German Checkpoint',
    theory: ['Checkpoint: greetings, phrases, gender, and tenses from the full German course.'],
    questions: [
      MCQ(
        '"Hallo" means…',
        'Hello',
        ['Hello', 'Goodbye', 'Thank you', 'Please'],
        'Hallo works everywhere.'
      ),
      BUILD(
        'Say "I eat apples":',
        ['Ich', 'esse', 'Äpfel'],
        ['Äpfel', 'Ich', 'der', 'esse'],
        'Ich = I, esse = (I) eat, Äpfel = apples. Capital Ä!'
      ),
      MCQ(
        'Which article goes with "Mann" (man)?',
        'der',
        ['der', 'die', 'das', 'den'],
        'Mann is masculine → der. Die Frau, das Kind.'
      ),
      BUILD(
        'Say "My name is Anna":',
        ['Ich', 'heiße', 'Anna'],
        ['Anna', 'heiße', 'Ich', 'Du'],
        'Ich heiße Anna — introduce yourself anywhere.'
      ),
      MCQ(
        '"Danke" means…',
        'Thank you',
        ['Thank you', 'Please', 'Sorry', 'Welcome'],
        'Danke schön = thank you very much.'
      ),
      MCQ(
        '"Sie (they) ___ müde." (They are tired.)',
        'sind',
        ['bin', 'bist', 'ist', 'sind'],
        'Tenses check: wir/sie + sein → sind.'
      ),
      TEXT(
        'Ask a stranger in Berlin, politely, where the station is. Type the German question.',
        ['Wo ist der Bahnhof, bitte?', 'Entschuldigung, wo ist der Bahnhof?', 'Wo ist der Bahnhof?'],
        'Wo = where, ist = is, der Bahnhof = the station. Add bitte or Entschuldigung to soften a direct question to a stranger.',
        { misconceptions: { 'Wo der Bahnhof ist?': 'German questions put the verb second: wo ist der Bahnhof?' } }
      ),
      MATCH(
        'Pair each subject with its form of sein (to be).',
        [
          { left: 'ich', right: 'bin' },
          { left: 'du', right: 'bist' },
          { left: 'er', right: 'ist' },
          { left: 'wir', right: 'sind' },
        ],
        'Sein is the most irregular verb in German — and the one you cannot speak without.'
      ),
      LISTEN(
        'Listen and type the question a stranger would ask you.',
        'Wo ist der Bahnhof',
        ['Wo ist der Bahnhof'],
        'Verb sits in second position even in a question: wo (1) ist (2) der Bahnhof (3).'
      ),
      SPEAK(
        'Take your leave of someone formally, out loud.',
        'Auf Wiedersehen',
        'owf VEE-der-zay-en — literally "to the seeing again", so keep the two words welded together.'
      ),
    ],
  },

  'swahili-phrases': {
    id: 'swahili-phrases',
    title: 'Swahili Phrases',
    theory: [
      'Speak in sentences: introduce yourself (Jina langu ni…), greet the morning (Habari za asubuhi?), and mind your manners (Tafadhali, Asante sana).',
      'Pole expresses sympathy (sorry about that); polepole means slowly — the most useful word pair in Swahili.',
    ],
    questions: [
      BUILD(
        'Say "My name is Amina":',
        ['Jina', 'langu', 'ni', 'Amina'],
        ['Amina', 'Jina', 'langu', 'ni', 'Wewe'],
        'Jina langu ni = my name is — word by word.'
      ),
      MCQ(
        '"Habari za asubuhi?" means…',
        'Good morning?',
        ['Good morning?', 'Good night?', 'How are you?', 'Where are you?'],
        'Asubuhi = morning. Jioni = evening.'
      ),
      BUILD(
        'Say "Thank you very much":',
        ['Asante', 'sana'],
        ['sana', 'Asante', 'ndiyo', 'pole'],
        'Sana = very. Asante sana goes a long way.'
      ),
      MCQ(
        '"Pole" means…',
        'Sorry',
        ['Sorry', 'Please', 'Welcome', 'Hurry'],
        'Pole = sorry (sympathy). Polepole = slowly!'
      ),
      MCQ(
        '"Tafadhali" means…',
        'Please',
        ['Please', 'Thank you', 'Sorry', 'Welcome'],
        'Tafadhali softens every request.'
      ),
      MATCH(
        'Pair each phrase with what it does in a conversation.',
        [
          { left: 'Jina langu ni', right: 'Introduce yourself' },
          { left: 'Habari za asubuhi', right: 'Greet in the morning' },
          { left: 'Asante sana', right: 'Thank someone warmly' },
          { left: 'Pole', right: 'Show sympathy' },
          { left: 'Tafadhali', right: 'Soften a request' },
        ],
        'Pole is sympathy ("sorry that happened"), not an admission of blame — that is samahani.'
      ),
      LISTEN(
        'Listen and type how someone says their name.',
        'Jina langu ni Amina',
        ['Jina langu ni Amina'],
        'Word for word: name my is Amina. No verb to conjugate — Swahili keeps introductions cheap.'
      ),
      SPEAK(
        'Thank someone warmly, out loud.',
        'Asante sana',
        'ah-SAHN-teh SAH-nah — every syllable is pronounced, and sana doubles the gratitude.'
      ),
    ],
  },

  'swahili-tenses': {
    id: 'swahili-tenses',
    title: 'Swahili Tenses Lab',
    theory: [
      'Swahili verbs wear their tense in the middle: ni-na-soma (I am reading), ni-li-soma (I read), ni-ta-soma (I will read). -na- now, -li- past, -ta- future.',
      'The subject prefix opens every verb: ni- (I), u- (you), a- (he/she), tu- (we), wa- (they).',
    ],
    questions: [
      MCQ(
        'Pick the present tense: “I am reading”.',
        'Ninasoma',
        ['Ninasoma', 'Nilisoma', 'Nitasoma', 'Soma'],
        'ni-na-soma: I + present -na- + read.'
      ),
      BUILD(
        'Say "They read books every day":',
        ['Wanasoma', 'vitabu', 'kila', 'siku'],
        ['siku', 'Wanasoma', 'kila', 'vitabu', 'jioni'],
        'wa-na-soma: they + present -na- + read. Kila siku = every day.'
      ),
      MCQ(
        '“Alipika” means he cooked — the past marker is…',
        '-li-',
        ['-na-', '-li-', '-ta-', '-me-'],
        '-li- = past: a-li-pika. -na- is present, -ta- is future.'
      ),
      BUILD(
        'Say "I will come tomorrow":',
        ['Nitakuja', 'kesho'],
        ['kesho', 'Nitakuja', 'Ninakuja', 'Nilikuja'],
        'ni-ta-kuja: I + future -ta- + come. Kesho = tomorrow.'
      ),
      MCQ(
        '“Tutakula” breaks down to…',
        'We will eat',
        ['We will eat', 'We are eating', 'We ate', 'Let us eat'],
        'tu-ta-kula: we + future -ta- + eat.'
      ),
      MATCH(
        'Pair each subject prefix with the person it means.',
        [
          { left: 'ni-', right: 'I' },
          { left: 'u-', right: 'you' },
          { left: 'a-', right: 'he or she' },
          { left: 'tu-', right: 'we' },
          { left: 'wa-', right: 'they' },
        ],
        'The prefix opens the verb, then the tense infix, then the root — one word, whole sentence.'
      ),
      LISTEN(
        'Listen and type the sentence about reading.',
        'Wanasoma vitabu kila siku',
        ['Wanasoma vitabu kila siku'],
        'wa-na-soma = they-are-reading; kila siku = every day, the habit cue that makes the present fit.'
      ),
      SPEAK(
        'Say that you will come tomorrow, out loud.',
        'Nitakuja kesho',
        'ni-ta-kuja is three morphemes welded into one word — nee-tah-KOO-jah, then KEH-shoh.'
      ),
    ],
  },

  'swahili-quiz': {
    id: 'swahili-quiz',
    title: 'Swahili Checkpoint',
    theory: ['Checkpoint: greetings, questions and negation, adjective agreement, health, verbs, and tenses from the full Swahili course.'],
    questions: [
      MCQ(
        '"Habari" means…',
        'Hello / How are you',
        ['Hello / How are you', 'Thank you', 'Goodbye', 'Welcome'],
        'Habari = news — ask for their news to say hello.'
      ),
      BUILD(
        'Say "I am eating mangoes":',
        ['Ninakula', 'maembe'],
        ['maembe', 'Habari', 'Ninakula', 'asante'],
        'Ni-na-kula = I-am-eating; maembe = mangoes.'
      ),
      MCQ(
        '"Karibu" means…',
        'Welcome',
        ['Welcome', 'Goodbye', 'Hurry', 'Sorry'],
        'Karibu welcomes every guest.'
      ),
      BUILD(
        'Say "My name is Amina":',
        ['Jina', 'langu', 'ni', 'Amina'],
        ['Amina', 'ni', 'Jina', 'langu'],
        'Jina langu ni Amina — introduce yourself anywhere.'
      ),
      MCQ(
        '"Asante" means…',
        'Thank you',
        ['Thank you', 'Please', 'Sorry', 'Welcome'],
        'Asante sana = thank you very much.'
      ),
      MCQ(
        '"Tutakula" breaks down to…',
        'We will eat',
        ['We will eat', 'We are eating', 'We ate', 'Let us eat'],
        'Tenses check: tu-ta-kula = we + future -ta- + eat.'
      ),
      MCQ(
        '“Anafanya kazi” (he works) becomes which negative?',
        'Hafanyi kazi',
        ['Hafanyi kazi', 'Hafanya kazi', 'Anafanya kazi', 'Hakufanya kazi'],
        'Present negative: ha- replaces a-, -na- drops, and the final -a becomes -i — hafanyi kazi.'
      ),
      BUILD(
        'Say “good children”:',
        ['Watoto', 'wazuri'],
        ['wazuri', 'Watoto', 'mzuri', 'wadogo'],
        'Watoto is class 2 plural, so the adjective takes wa-: watoto wazuri. Mzuri is the singular.'
      ),
      BUILD(
        'Tell the doctor “My head hurts”:',
        ['Naumwa', 'na', 'kichwa'],
        ['kichwa', 'Naumwa', 'na', 'tumbo'],
        'Naumwa = it hurts me; na kichwa names the place. Naumwa na tumbo is the stomach.'
      ),
      TEXT(
        'You are in a market in Nairobi and want the price of a shirt. Type the polite Swahili question.',
        ['Bei ya shati ni ngapi?', 'Shati hili ni bei gani?', 'Bei gani ya shati?'],
        'Bei = price, ya = of, shati = shirt, ni ngapi = is how much. Bei gani? is the shorter alternative; either works in the market.',
        { misconceptions: { 'Bei ya shati?': 'A price label is not a question. Add ni ngapi? to ask how much.' } }
      ),
      MATCH(
        'Pair each Swahili word or phrase with its meaning.',
        [
          { left: 'Watoto', right: 'Children' },
          { left: 'Watoto wazuri', right: 'Good children' },
          { left: 'Naumwa na kichwa', right: 'My head hurts' },
          { left: 'Naumwa na tumbo', right: 'My stomach hurts' },
        ],
        'Watoto is a plural class, so the adjective must borrow its wa- prefix: wazuri, not mzuri.'
      ),
      LISTEN(
        'Listen and type the market question.',
        'Bei ya shati ni ngapi',
        ['Bei ya shati ni ngapi'],
        'Bei = price, ya shati = of the shirt, ni ngapi = is how much — the question marker comes last.'
      ),
      SPEAK(
        'Greet someone early in the morning, out loud.',
        'Habari za asubuhi',
        'hah-BAR-ee zah ah-soo-BOO-hee — literally "news of the morning", so the za links the two halves.'
      ),
    ],
  },

  'chess-tactics': {
    id: 'chess-tactics',
    title: 'Chess Tactics',
    theory: [
      'Tactics win games: a fork attacks two pieces at once, a pin freezes a piece that cannot move without exposing its king, and a discovered attack unveils a hidden attacker.',
      'Strategy matters too: when ahead in material, trade pieces to simplify into an easy win; doubled rooks on the 7th rank feast on pawns and trap kings.',
    ],
    questions: [
      MCQ(
        'A knight attacks the king and rook at the same time. This tactic is a…',
        'Fork',
        ['Fork', 'Pin', 'Skewer', 'Discovered attack'],
        'One piece, two targets — the fork. Knights are fork machines.'
      ),
      MCQ(
        'A bishop makes an enemy knight unable to move without exposing its king. This is a…',
        'Pin',
        ['Pin', 'Fork', 'Skewer', 'Castle'],
        'Pinned pieces are prisoners — attack what they defend.'
      ),
      MCQ(
        'Moving a piece to unveil an attack from the piece behind it is a…',
        'Discovered attack',
        ['Discovered attack', 'Fork', 'Pin', 'Promotion'],
        'Two threats in one move — one of the strongest ideas in chess.'
      ),
      MCQ(
        'When you are up a queen, trading queens is usually…',
        'Good — it simplifies to an easy win',
        ['Good — it simplifies to an easy win', 'Bad — keep the tension', 'Illegal', 'An automatic draw'],
        'Simplify when ahead: fewer pieces, fewer chances to blunder.'
      ),
      MCQ(
        'Two rooks doubled on the 7th rank typically…',
        'Win pawns and trap the enemy king',
        ['Win pawns and trap the enemy king', 'Lose their power', 'Force a draw', 'Must be traded off'],
        'Pigs on the 7th: the most feared sight in an endgame.'
      ),
      MATCH(
        'Pair each tactic with the shape it makes on the board.',
        [
          { left: 'Fork', right: 'One piece attacks two targets' },
          { left: 'Pin', right: 'A piece is frozen to protect something better' },
          { left: 'Discovered attack', right: 'Moving aside unveils the attacker behind' },
          { left: 'Doubled rooks', right: 'Two rooks stacked on one file' },
        ],
        'A fork attacks twice, a pin paralyses, a discovery attacks from nowhere, and doubled rooks just eat.'
      ),
    ],
  },

  'chess-quiz': {
    id: 'chess-quiz',
    title: 'Chess Checkpoint',
    theory: ['Checkpoint: piece movement, notation, tactics, and mating from the full chess course.'],
    questions: [
      MCQ(
        'How does a knight move?',
        'In an L-shape: two squares one way, one sideways',
        ['In an L-shape: two squares one way, one sideways', 'Diagonally any distance', 'Straight any distance', 'One square in any direction'],
        'Knights jump over pieces — the trickiest mover.'
      ),
      MCQ(
        'White pawn on e2 pushes two squares. Write it:',
        'e4',
        ['e4', 'e3', 'Nf3', 'e5'],
        'Pawns move straight; from rank 2 they may jump two.'
      ),
      MCQ(
        'A pawn attacks two pieces at once. This tactic is a…',
        'Fork',
        ['Fork', 'Pin', 'Skewer', 'Castle'],
        'Forks work with any piece — even lowly pawns.'
      ),
      MCQ(
        'What does O-O mean in notation?',
        'Kingside castle',
        ['Kingside castle', 'Checkmate', 'Draw offer', 'Pawn promotion'],
        'O-O castles kingside; O-O-O castles queenside.'
      ),
      MCQ(
        'Checkmate means…',
        'The king is attacked and cannot escape — game over',
        ['The king is attacked and cannot escape — game over', 'The king is attacked but can move', 'Both sides agree a draw', 'A pawn reaches the far rank'],
        'Check = attacked. Checkmate = no escape. Stalemate = draw.'
      ),
      TEXT(
        'White has an unmoved king on e1 and rook on h1; f1 and g1 are empty and neither square is attacked. Type the notation for the legal kingside castle.',
        ['O-O', '0-0'],
        'O-O is kingside castling when the king and h1 rook are unmoved and the path is safe. O-O-O is queenside, which this position does not allow.',
        { misconceptions: { 'O-O-O': 'That is queenside castling — it needs the a1 rook and the b1/c1/d1 squares clear.' } }
      ),
      MATCH(
        'Pair each notation or term with what it means.',
        [
          { left: 'Nf3', right: 'Knight moves to f3' },
          { left: 'O-O', right: 'Kingside castle' },
          { left: 'Checkmate', right: 'The king is attacked and cannot escape' },
          { left: 'Stalemate', right: 'No legal move, but the king is not attacked' },
        ],
        'Checkmate and stalemate look alike from far away: the difference is whether the king is in check.'
      ),
    ],
  },

  /* ---------------- Full course: English Mastery (Duolingo style) ---------------- */

  'english-basics': {
    id: 'english-basics',
    title: 'English Basics',
    theory: [
      'Start with the building blocks: 26 letters, numbers, and the two little words that confuse everyone — a and an. Use an before vowel sounds (an apple), a everywhere else (a ball).',
      'Plurals usually add -s (books), but watch the rebels: box → boxes, child → children.',
    ],
    questions: [
      MCQ(
        'How many letters are in the English alphabet?',
        '26',
        ['26', '24', '28', '30'],
        '26 letters: A to Z. Master their sounds and spelling follows.'
      ),
      BUILD(
        'Say the first three letters:',
        ['A', 'B', 'C'],
        ['C', 'A', 'D', 'B'],
        'A, B, C — the start of every spelling bee.'
      ),
      MCQ(
        'Fill the gap: "___ apple".',
        'an',
        ['an', 'a', 'the', 'no word needed'],
        'An before vowel SOUNDS: an apple, an hour. A ball, a cat.'
      ),
      MCQ(
        'The plural of "child" is…',
        'children',
        ['children', 'childs', 'childes', 'child'],
        'Irregular rebel: one child, two children. Box → boxes is regular.'
      ),
      BUILD(
        'Say "I am a student":',
        ['I', 'am', 'a', 'student'],
        ['student', 'I', 'am', 'a', 'teacher'],
        'I + am + a + who you are — your first English sentence.'
      ),
      MATCH(
        'Pair each word or rule with the form it needs.',
        [
          { left: 'an', right: 'Before a vowel sound' },
          { left: 'a', right: 'Before a consonant sound' },
          { left: 'children', right: 'The plural of child' },
          { left: 'boxes', right: 'The plural of box' },
        ],
        'An hour takes an because the h is silent; an apple takes an because a is a vowel sound. Sound, not spelling.'
      ),
      LISTEN(
        'Listen and type the sentence about who you are.',
        'I am a student',
        ['I am a student'],
        'Four short words, one be-form: am only ever follows I.'
      ),
      SPEAK(
        'Say your first English sentence out loud.',
        'I am a student',
        'Link am into the rhythm — "eye-am-uh-STOO-dent" — and do not stress the a.'
      ),
    ],
  },

  'english-everyday': {
    id: 'english-everyday',
    title: 'Everyday English',
    theory: [
      'Sound natural: introduce yourself (My name is…), ask back (Where are you from?), mind the moment (Excuse me to pass by, Sorry to apologise).',
      'Time runs the day: What time is it? See you tomorrow. Small phrases, huge confidence.',
    ],
    questions: [
      BUILD(
        'Ask "Where are you from?":',
        ['Where', 'are', 'you', 'from'],
        ['from', 'Where', 'you', 'are', 'what'],
        'The friendliest question in English — memorise the order.'
      ),
      MCQ(
        '"What time is it?" asks for…',
        'The current time',
        ['The current time', 'The day of the week', 'Your age', 'The date'],
        'Time = clock reading. Day = Monday. Date = 1st of June.'
      ),
      MCQ(
        'You step on someone\'s foot. Say…',
        'Sorry',
        ['Sorry', 'Excuse me', 'Thank you', 'Welcome'],
        'Sorry = apologise. Excuse me = pass by or get attention.'
      ),
      BUILD(
        'Say "See you tomorrow":',
        ['See', 'you', 'tomorrow'],
        ['tomorrow', 'See', 'later', 'you'],
        'See you + when: tomorrow, later, soon, on Monday.'
      ),
      MCQ(
        '"Nice to meet you" is said…',
        'When meeting someone for the first time',
        ['When meeting someone for the first time', 'When leaving a party', 'When answering the phone', 'When saying thank you'],
        'First meeting only — then switch to "Good to see you".'
      ),
      MATCH(
        'Pair each phrase with the moment it belongs to.',
        [
          { left: 'Sorry', right: 'You have hurt someone' },
          { left: 'Excuse me', right: 'You need to get past' },
          { left: 'Nice to meet you', right: 'A first introduction' },
          { left: 'What time is it?', right: 'You want the clock' },
          { left: 'See you tomorrow', right: 'You are leaving' },
        ],
        'Sorry apologises after the fact; excuse me asks before it happens — swapping them sounds rude.'
      ),
      LISTEN(
        'Listen and type the friendliest question in English.',
        'Where are you from',
        ['Where are you from'],
        'Where + are + you + from — the auxiliary sits before the subject, which is what makes it a question.'
      ),
      SPEAK(
        'Say your goodbye for tomorrow, out loud.',
        'See you tomorrow',
        'Natives squeeze it to "see-ya-tuh-MOR-oh" — the t is a flap, so it sounds like a soft d.'
      ),
    ],
  },

  'english-tenses': {
    id: 'english-tenses',
    title: 'English Tenses Lab',
    theory: [
      'Three tenses carry 90% of conversation: present simple for habits (She goes), present continuous for right now (I am eating), past simple for finished time (I went).',
      'Spot the -s: he/she/it verbs add -s (go → goes). Spot the clock: now/right now → am/is/are + -ing. Spot yesterday → past form.',
    ],
    questions: [
      MCQ(
        '"She ___ to school every day."',
        'goes',
        ['goes', 'go', 'going', 'gone'],
        'He/she/it + habit → add -s: she goes, he eats.'
      ),
      BUILD(
        'Say "I am eating now":',
        ['I', 'am', 'eating'],
        ['eating', 'I', 'am', 'was'],
        'am + verb-ing = happening right now.'
      ),
      MCQ(
        '"Yesterday I ___ to the market."',
        'went',
        ['went', 'go', 'goes', 'going'],
        'Yesterday = finished past → went (not goed!).'
      ),
      BUILD(
        'Say "They will come tomorrow":',
        ['They', 'will', 'come'],
        ['come', 'They', 'will', 'came'],
        'will + base verb = future. No -s, no -ed.'
      ),
      MCQ(
        '"Right now" signals which tense?',
        'Present continuous',
        ['Present continuous', 'Present simple', 'Past simple', 'Future'],
        'Right now / at the moment → am/is/are + -ing.'
      ),
      MATCH(
        'Pair each sentence with the tense it uses.',
        [
          { left: 'She goes to school every day', right: 'Present simple' },
          { left: 'I am eating now', right: 'Present continuous' },
          { left: 'Yesterday I went to the market', right: 'Past simple' },
          { left: 'They will come tomorrow', right: 'Future with will' },
        ],
        'The time word decides the tense: every day → -s, now → be + -ing, yesterday → past form, tomorrow → will.'
      ),
      LISTEN(
        'Listen and type the sentence about tomorrow.',
        'They will come tomorrow',
        ['They will come tomorrow'],
        'will takes the base verb — no -s on comes, ever, after a modal.'
      ),
      SPEAK(
        'Say what you are doing right now, out loud.',
        'I am eating now',
        'The -ing ending is a short nasal, not "ee-ing": eye-am-EE-ting-now.'
      ),
    ],
  },

  'english-quiz': {
    id: 'english-quiz',
    title: 'English Checkpoint',
    theory: ['Checkpoint: alphabet, articles, everyday phrases, questions, describing and comparing, health, and tenses from the full English course.'],
    questions: [
      MCQ(
        'Fill the gap: "___ hour".',
        'an',
        ['an', 'a', 'the', 'no word needed'],
        'Hour starts with a vowel SOUND (silent h) → an hour.'
      ),
      BUILD(
        'Say "I am a student":',
        ['I', 'am', 'a', 'student'],
        ['student', 'am', 'I', 'a'],
        'I + am + a + who you are.'
      ),
      MCQ(
        '"She ___ TV every evening."',
        'watches',
        ['watches', 'watch', 'watching', 'watched'],
        'She + habit → -es after -ch: she watches.'
      ),
      BUILD(
        'Ask "Where are you from?":',
        ['Where', 'are', 'you', 'from'],
        ['from', 'are', 'Where', 'you'],
        'Word order matters: Where + are + you + from.'
      ),
      MCQ(
        'The plural of "box" is…',
        'boxes',
        ['boxes', 'boxs', 'boxies', 'box'],
        'After -x, add -es: box → boxes, bus → buses.'
      ),
      MCQ(
        'Fill the gap: “___ he call you yesterday?”',
        'Did',
        ['Did', 'Does', 'Do', 'Was'],
        'Yesterday is past, so the auxiliary is did + base verb: did he call.'
      ),
      MCQ(
        'The comparative of “good” is…',
        'better',
        ['better', 'gooder', 'more good', 'best'],
        'Good is irregular: good → better → best. “Best” is the superlative, not the comparative.'
      ),
      BUILD(
        'Give advice: “You shouldn’t drive.”',
        ['You', "shouldn't", 'drive'],
        ['drive', 'You', "shouldn't", 'should'],
        'Should + not contracts to shouldn’t, then the base verb: shouldn’t drive.'
      ),
      TEXT(
        'You are at a clinic and need help. Type a polite sentence asking to see a doctor.',
        ['Could I see a doctor, please?', 'I need a doctor, please.', 'May I see a doctor, please?'],
        'Could I…? and May I…? are the polite request forms; please softens the ask. “I need a doctor” is direct but still acceptable in an emergency — add please for a routine appointment.',
        { misconceptions: { 'I need doctor': 'English needs an article: a doctor.' } }
      ),
      MATCH(
        'Pair each word with the irregular form it hides.',
        [
          { left: 'good', right: 'Its comparative is better' },
          { left: 'best', right: 'Its superlative' },
          { left: 'child', right: 'Its plural is children' },
          { left: 'box', right: 'Its plural is boxes' },
        ],
        'Good/better/best never take -er or -est, and after -x the plural adds -es, not a bare s.'
      ),
      LISTEN(
        'Listen and type the question you would ask a new friend.',
        'Where are you from',
        ['Where are you from'],
        'Rising intonation on the last word marks it as a question — the words themselves never change.'
      ),
      SPEAK(
        'Give someone a piece of advice, out loud.',
        "You shouldn't drive",
        'should-ent contracts hard: "yoo SHUD-nt drive" — the l in should is silent.'
      ),
    ],
  },
};

/* ---------------- Comprehensive sets: Swahili + English (own files) ---------------- */
Object.assign(LANGUAGE_COURSES, SWAHILI_PLUS, ENGLISH_PLUS, SPANISH_PLUS, FRENCH_PLUS, GERMAN_PLUS, CHESS_PLUS);

// Fail loudly at import time — a bad seed breaks the bundle, not a session.
Object.values(LANGUAGE_COURSES).forEach(validateBank);

export function getLanguageLesson(id: string): CourseLesson | undefined {
  return LANGUAGE_COURSES[id];
}
