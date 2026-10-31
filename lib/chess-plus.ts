/**
 * Chess expansion — Course 4 (comprehensive set, Duolingo Chess style).
 * Original lessons written for Bolingo covering the standard beginner
 * syllabus: opening principles, mating patterns, basic endgames, deeper
 * tactics, and positional strategy. Merged into LANGUAGE_COURSES in
 * lib/languages.ts — quiz, SRS, and guidebook work unchanged.
 */
import { MCQ, BUILD, TEXT, type CourseLesson } from './quizBank';

export const CHESS_PLUS: Record<string, CourseLesson> = {
  'chess-openings': {
    id: 'chess-openings',
    title: 'Chess Openings',
    theory: [
      'Openings follow three laws: control the center (e4, d4, Nf3), develop knights and bishops fast, and castle early for king safety. Never move the same piece twice while others sleep.',
      'Answer 1. e4 with 1…e5 or 1…c5; answer 1. d4 with 1…d5 or 1…Nf6. Traps punish greed — develop first, grab pawns later.',
    ],
    questions: [
      MCQ(
        'The opening’s first job is…',
        'Control the center',
        ['Control the center', 'Trade queens', 'Push flank pawns', 'Move the king up'],
        'Center pawns and knights first: e4, d4, Nf3, Nc3.'
      ),
      BUILD(
        'Castle kingside in notation:',
        ['O-O'],
        ['O-O-O', 'O-O', '0-0', 'Ke1'],
        'O-O (letter O) castles kingside; O-O-O queenside.'
      ),
      MCQ(
        'After 1. e4, a sound Black reply is…',
        '1…e5 or 1…c5',
        ['1…e5 or 1…c5', '1…h5', '1…Na6', '1…f6'],
        'Meet center with center or counterplay — not wing pawns.'
      ),
      MCQ(
        'Castling early gives you…',
        'A safe king + connected rooks',
        ['A safe king + connected rooks', 'An extra queen', 'Two moves in a row', 'A draw'],
        'Castle by move 10 in most openings. Safety first.'
      ),
      BUILD(
        'A knight develops toward the center. From g1 it goes to:',
        ['Nf3'],
        ['Nh3', 'Nf3', 'Ne2', 'Ng1'],
        'Nf3 attacks the center and frees castling. Nh3 sulks.'
      ),
    ],
  },

  'chess-mate-patterns': {
    id: 'chess-mate-patterns',
    title: 'Checkmate Patterns',
    theory: [
      'Mates repeat like songs. Back-rank mate: a rook or queen lands on the 8th rank while the king’s own pawns cage it. Scholar’s mate (Qh5/Qxf7) punishes beginners who ignore f7.',
      'Smothered mate: a knight checks a king buried in its own pieces. Ladder mate: two rooks walk the king down the board, rank by rank.',
    ],
    questions: [
      MCQ(
        'Back-rank mate works because…',
        'The king’s own pawns block its escape',
        ['The king’s own pawns block its escape', 'The queen is pinned', 'Castling is illegal', 'The knight jumps far'],
        'A rook on the 8th rank + pawn wall = mate. Give luft with h3!'
      ),
      BUILD(
        'Scholar’s mate finishes on which square?',
        ['Qxf7'],
        ['Qxf7', 'Qxh5', 'Qxd5', 'Qe2'],
        'Qh5 then Qxf7#: f7 is weakest near the king. Defend it early!'
      ),
      MCQ(
        'Smothered mate is delivered by…',
        'A knight',
        ['A knight', 'A bishop', 'A pawn', 'The king'],
        'A knight checks a king smothered by its own pieces. Beautiful.'
      ),
      BUILD(
        'Ladder mate uses which two pieces?',
        ['Rook', 'rook'],
        ['rook', 'Rook', 'queen', 'bishop'],
        'Two rooks alternate checks, pushing the king down. Rook + rook.'
      ),
      MCQ(
        'To stop back-rank mates, you…',
        'Push a luft pawn (h3/g3)',
        ['Push a luft pawn (h3/g3)', 'Avoid castling', 'Trade rooks', 'Keep the queen home'],
        'Luft = breathing room. One pawn step saves the king.'
      ),
    ],
  },

  'chess-endgames': {
    id: 'chess-endgames',
    title: 'Essential Endgames',
    theory: [
      'Few pieces, pure technique. King + queen vs king: push to the edge, keep the queen a knight’s jump away, mate on the rim. King + rook vs king: box the king with the rook, march yours up, mate.',
      'Opposition: kings face off with one square between — whoever does NOT move holds the key. A passed pawn plus a supporting king wins; alone, it falls.',
    ],
    questions: [
      MCQ(
        'Queen vs lone king: mate happens…',
        'On the edge of the board',
        ['On the edge of the board', 'In the center', 'On move one', 'By stalemate'],
        'Push to the rim, queen a knight-move away, king close. Mate.'
      ),
      BUILD(
        'The winning endgame technique is called:',
        ['Opposition'],
        ['Opposition', 'Forking', 'Pinning', 'Fianchetto'],
        'Opposition: kings one square apart — the mover loses ground.'
      ),
      MCQ(
        'Rook vs lone king wins by…',
        'Boxing the king smaller, then mating',
        ['Boxing the king smaller, then mating', 'Sacrificing the rook', 'Repeating checks fast', 'Promoting a pawn'],
        'Cut the box with rook checks, walk your king up, mate.'
      ),
      MCQ(
        'A passed pawn usually needs…',
        'Its king’s support to promote',
        ['Its king’s support to promote', 'Nothing — it always queens', 'A knight beside it', 'To move twice'],
        'No blockers ahead, but the king must escort it home.'
      ),
      BUILD(
        'Stalemate means the game is a:',
        ['Draw'],
        ['Win', 'Draw', 'Loss', 'Replay'],
        'No legal moves + not in check = draw. Mate needs CHECK.'
      ),
    ],
  },

  'chess-tactics-2': {
    id: 'chess-tactics-2',
    title: 'Advanced Tactics',
    theory: [
      'Beyond forks and pins: discovered attacks (move one piece, unleash another), double checks (both pieces check — the king MUST move), and deflection (drag a defender away).',
      'Decoys lure a piece to a bad square; clearance sacrifices open a line. Ask every move: what moved, what woke up, who is undefended?',
    ],
    questions: [
      MCQ(
        'A discovered attack happens when…',
        'Moving one piece unleashes another’s attack',
        ['Moving one piece unleashes another’s attack', 'Two knights fork', 'A pawn promotes', 'The king castles'],
        'Move the mask, fire the battery. Two threats, one move.'
      ),
      BUILD(
        'Against a double check, the king must:',
        ['Move'],
        ['Move', 'Block', 'Capture', 'Castle'],
        'Two checkers — no block, no capture both. King moves!'
      ),
      MCQ(
        'Deflection means…',
        'Dragging a defender off its duty',
        ['Dragging a defender off its duty', 'Blocking a check', 'Trading queens', 'Losing on purpose'],
        'Sacrifice to pull the guard away, then strike the target.'
      ),
      MCQ(
        '“En passant” captures…',
        'A pawn that just jumped two squares',
        ['A pawn that just jumped two squares', 'Any pawn nearby', 'The king', 'A promoted piece'],
        'Side pawn takes as if it moved one. Use it or lose it — immediately!'
      ),
      BUILD(
        'A battery lines up queen + rook on the:',
        ['File'],
        ['Rank', 'File', 'Diagonal', 'Square'],
        'Battery on a file or rank: double the pressure, double the fun.'
      ),
    ],
  },

  'chess-strategy': {
    id: 'chess-strategy',
    title: 'Positional Strategy',
    theory: [
      'Tactics win pieces; strategy wins positions. Place knights on outposts (supported, unattackable by pawns), bishops on long diagonals, rooks on open files and the 7th rank.',
      'Pawn structure is destiny: doubled pawns are weak, isolated pawns need guarding, passed pawns must be pushed. Trade bad bishops, keep good ones.',
    ],
    questions: [
      MCQ(
        'A knight outpost is…',
        'A supported square no enemy pawn can attack',
        ['A supported square no enemy pawn can attack', 'Any corner square', 'The starting square', 'A square with two knights'],
        'Outpost knights (e.g. Nd5 supported) rule whole sectors.'
      ),
      MCQ(
        'Rooks belong…',
        'On open files and the 7th rank',
        ['On open files and the 7th rank', 'Behind pawns', 'In corners', 'On diagonals'],
        'Open file + 7th rank = rook heaven, feasting on pawns.'
      ),
      BUILD(
        'A pawn with no enemies ahead of it is:',
        ['Passed'],
        ['Isolated', 'Passed', 'Doubled', 'Backward'],
        'Passed pawns must be pushed! They demand the enemy’s attention.'
      ),
      MCQ(
        'Doubled pawns are usually…',
        'Weak — hard to defend, block each other',
        ['Weak — hard to defend, block each other', 'Strong — double power', 'Equal — no difference', 'Winning — always'],
        'Stacked pawns guard nothing and clog files. Avoid them.'
      ),
      MCQ(
        '“Good bishop” means…',
        'Its pawns stand on the opposite color',
        ['Its pawns stand on the opposite color', 'It never moves', 'It is near the king', 'It takes knights'],
        'Pawns on light squares → dark bishop is “good”. Free the bad one!'
      ),
    ],
  },

  'chess-final': {
    id: 'chess-final',
    title: 'Chess Final Exam',
    theory: ['Final exam: moves, notation, openings, mating patterns, endgames, tactics, and strategy — the whole comprehensive course.'],
    questions: [
      MCQ(
        'How does a knight move?',
        'In an L-shape: two squares one way, one sideways',
        ['In an L-shape: two squares one way, one sideways', 'Diagonally any distance', 'Straight any distance', 'One square any way'],
        'The jumper — the only piece that leaps over others.'
      ),
      BUILD(
        'Castle kingside in notation:',
        ['O-O'],
        ['O-O-O', 'O-O', '0-0', 'Kg1'],
        'O-O kingside, O-O-O queenside. Safety in two characters.'
      ),
      MCQ(
        'Back-rank mate needs…',
        'A rook/queen on the 8th rank + a caged king',
        ['A rook/queen on the 8th rank + a caged king', 'Two knights', 'No pawns moved', 'Opposite castling'],
        'Pawn wall + last-rank invader = mate. Push luft!'
      ),
      BUILD(
        'Stalemate means the game is a:',
        ['Draw'],
        ['Win', 'Draw', 'Loss', 'Replay'],
        'No moves + not in check = draw. Check first, celebrate after.'
      ),
      MCQ(
        '“J’adoube” — touch-move means…',
        'A touched piece must move if legal',
        ['A touched piece must move if legal', 'You may take back moves', 'Clocks pause', 'Draws are offered'],
        'Touch-move: touch it, move it. Adjust only saying “j’adoube”.'
      ),
      BUILD(
        'Queen vs king mates on the board’s:',
        ['Edge'],
        ['Center', 'Edge', 'Corner square only', 'Back rank'],
        'Push to the rim and finish. Technique beats hope.'
      ),
      MCQ(
        'You have a passed pawn on the seventh rank and rooks on the board. What is the strongest plan?',
        'Support promotion with your rook behind the pawn.',
        [
          'Support promotion with your rook behind the pawn.',
          'Trade rooks immediately and race the king.',
          'Move the pawn sideways to safety.',
          'Offer a draw before promoting.',
        ],
        'A passed pawn on the seventh is a winning threat: put the rook behind it, escort it, and force the defender to give way.'
      ),
      TEXT(
        'Type the notation for queenside castling.',
        ['O-O-O', '0-0-0'],
        'Queenside castling is O-O-O (three symbols); kingside is O-O. Use letter O, not zero, in standard notation.',
        { misconceptions: { 'O-O': 'O-O is kingside castling. Queenside has three symbols: O-O-O.' } }
      ),
    ],
  },
};
