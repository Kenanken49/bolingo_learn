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
};

// Fail loudly at import time — a bad seed breaks the bundle, not a session.
Object.values(LANGUAGE_COURSES).forEach(validateBank);

export function getLanguageLesson(id: string): CourseLesson | undefined {
  return LANGUAGE_COURSES[id];
}
