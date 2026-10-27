/**
 * World Languages & Chess — Course 4 banks (Duolingo style).
 * Owns the ES/FR/DE/SW + chess lesson data and its accessor; courses.ts
 * merges LANGUAGE_COURSES so getCourseLesson() behavior is identical and
 * the quiz engine, SRS, and guidebook need no changes.
 */
import { MCQ, BUILD, validateBank, type CourseLesson } from './quizBank';

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
    ],
  },

  'spanish-quiz': {
    id: 'spanish-quiz',
    title: 'Spanish Checkpoint',
    theory: ['Checkpoint: greetings, phrases, and gender from the full Spanish course.'],
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
    ],
  },

  'french-quiz': {
    id: 'french-quiz',
    title: 'French Checkpoint',
    theory: ['Checkpoint: greetings, phrases, and gender from the full French course.'],
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
    ],
  },

  'german-quiz': {
    id: 'german-quiz',
    title: 'German Checkpoint',
    theory: ['Checkpoint: greetings, phrases, and gender from the full German course.'],
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
    ],
  },

  'swahili-quiz': {
    id: 'swahili-quiz',
    title: 'Swahili Checkpoint',
    theory: ['Checkpoint: greetings, phrases, and verbs from the full Swahili course.'],
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
    ],
  },
};

// Fail loudly at import time — a bad seed breaks the bundle, not a session.
Object.values(LANGUAGE_COURSES).forEach(validateBank);

export function getLanguageLesson(id: string): CourseLesson | undefined {
  return LANGUAGE_COURSES[id];
}
