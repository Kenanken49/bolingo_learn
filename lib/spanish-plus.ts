/**
 * Spanish expansion — Course 4 (comprehensive set).
 * Original lessons written for Bolingo; sequencing follows standard
 * beginner-Spanish syllabi. Merged into LANGUAGE_COURSES in
 * lib/languages.ts — quiz, SRS, and guidebook work unchanged.
 */
import { MCQ, BUILD, type CourseLesson } from './quizBank';

export const SPANISH_PLUS: Record<string, CourseLesson> = {
  'spanish-greetings': {
    id: 'spanish-greetings',
    title: 'Spanish Greetings & Politeness',
    theory: [
      'Hola opens everything; Buenos días (morning), Buenas tardes (afternoon), Buenas noches (night)Ride the clock. ¿Cómo estás? asks a friend, ¿Cómo está usted? respects an elder — tú for friends, usted for respect.',
      'Always land with por favor, gracias, and perdón. De nada answers gracias; ¡Bienvenidos! welcomes everyone.',
    ],
    questions: [
      MCQ(
        '“Buenas noches” is said…',
        'At night',
        ['At night', 'In the morning', 'At noon', 'At farewell only'],
        'Noches = night. Tardes = afternoon, días = morning.'
      ),
      BUILD(
        'Ask a friend “How are you?”:',
        ['Cómo', 'estás'],
        ['estás', 'Cómo', 'está', 'estoy'],
        '¿Cómo estás? — tú form, friends and family.'
      ),
      MCQ(
        '“¿Cómo está usted?” differs from “¿Cómo estás?” in…',
        'Formality',
        ['Formality', 'Tense', 'Number', 'Meaning'],
        'Usted = respect (elders, officials). Tú = friends.'
      ),
      BUILD(
        'Answer “thanks” with “you are welcome”:',
        ['De', 'nada'],
        ['nada', 'De', 'Gracias', 'Favor'],
        'Gracias → De nada. A tiny perfect pair.'
      ),
      MCQ(
        '“¡Bienvenidos!” means…',
        'Welcome! (to everyone)',
        ['Welcome! (to everyone)', 'Goodbye!', 'Congratulations!', 'Good luck!'],
        'Bienvenido (one man), bienvenida (one woman), bienvenidos (all).'
      ),
    ],
  },

  'spanish-numbers-time': {
    id: 'spanish-numbers-time',
    title: 'Spanish Numbers & Time',
    theory: [
      'Count: uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez — then veinte, treinta… cien. Son las tres = it is 3 o’clock; Es la una = it is 1 o’clock (only one is singular!).',
      'Days run lunes to domingo; months enero to diciembre. Hoy = today, mañana = tomorrow, ayer = yesterday.',
    ],
    questions: [
      MCQ(
        '“Siete” means…',
        'Seven',
        ['Seven', 'Six', 'Eight', 'Ten'],
        'Seis 6, siete 7, ocho 8 — chant the run.'
      ),
      BUILD(
        'Say “It is 3 o’clock”:',
        ['Son', 'las', 'tres'],
        ['tres', 'Son', 'Es', 'las'],
        'Plural hours take Son las; only 1 o’clock takes Es la una.'
      ),
      MCQ(
        '“Mañana” means…',
        'Tomorrow',
        ['Tomorrow', 'Morning', 'Yesterday', 'Today'],
        'Mañana does double duty: tomorrow AND morning. Context decides.'
      ),
      BUILD(
        'Say “ten” (10):',
        ['Diez'],
        ['Nueve', 'Diez', 'Once', 'Doce'],
        'Nueve 9, diez 10, once 11, doce 12.'
      ),
      MCQ(
        '“Es la una” is used because…',
        'One o’clock is singular',
        ['One o’clock is singular', 'Nights are singular', 'Una is formal', 'It is a question'],
        'La una = the one (hour). Every other hour is las.'
      ),
    ],
  },

  'spanish-food': {
    id: 'spanish-food',
    title: 'Spanish Food & Drink',
    theory: [
      'Order like a local: Quiero… (I want…), La cuenta, por favor (the bill, please). El agua, el pan, el café, la leche, el arroz, el pollo, la fruta — hunger solved.',
      'Tengo hambre = I am hungry (I HAVE hunger), tengo sed = I am thirsty. Me gusta = I like it; me encanta = I love it.',
    ],
    questions: [
      MCQ(
        '“El pollo” means…',
        'The chicken',
        ['The chicken', 'The fish', 'The bread', 'The rice'],
        'Pollo = chicken, pescado = fish, pan = bread.'
      ),
      BUILD(
        'Say “I want coffee”:',
        ['Quiero', 'café'],
        ['café', 'Quiero', 'Tengo', 'Agua'],
        'Quiero + anything: quiero agua, quiero la cuenta.'
      ),
      MCQ(
        '“Tengo hambre” literally means…',
        'I have hunger',
        ['I have hunger', 'I eat hunger', 'I am hunger', 'My hunger eats'],
        'Spanish HAS hunger and thirst: tengo hambre, tengo sed.'
      ),
      BUILD(
        'Ask for the bill politely:',
        ['La', 'cuenta'],
        ['cuenta', 'La', 'Quiero', 'Menú'],
        'La cuenta, por favor — the magic exit words.'
      ),
      MCQ(
        '“Me encanta” means…',
        'I love it',
        ['I love it', 'I hate it', 'I want it', 'I need it'],
        'Gusta = like, encanta = love. Me encanta el café!'
      ),
    ],
  },

  'spanish-travel': {
    id: 'spanish-travel',
    title: 'Spanish Travel & Directions',
    theory: [
      'Move with confidence: ¿Dónde está…? (where is…?), a la izquierda (left), a la derecha (right), todo recto (straight). La estación, el aeropuerto, el hotel, el baño — the big four.',
      'Ride anything: el autobús, el tren, el taxi. ¿Cuánto cuesta? (how much?), ¿A qué hora sale? (what time does it leave?).',
    ],
    questions: [
      MCQ(
        '“¿Dónde está el baño?” asks for…',
        'The bathroom’s location',
        ['The bathroom’s location', 'The bath’s price', 'Bath time', 'A bad room'],
        'Dónde = where. Dónde está…? unlocks every city.'
      ),
      BUILD(
        'Say “to the left”:',
        ['A', 'la', 'izquierda'],
        ['izquierda', 'A', 'derecha', 'la'],
        'Izquierda = left, derecha = right. Todo recto = straight on.'
      ),
      MCQ(
        '“¿A qué hora sale?” asks for…',
        'The departure time',
        ['The departure time', 'The ticket price', 'The platform', 'The arrival'],
        'Salir = to leave. ¿A qué hora…? pins any schedule.'
      ),
      BUILD(
        'Ask “How much does it cost?”:',
        ['Cuánto', 'cuesta'],
        ['cuesta', 'Cuánto', 'Cuesta', 'Cuestan'],
        '¿Cuánto cuesta? — singular thing. ¿Cuánto cuestan? — many.'
      ),
      MCQ(
        '“El tren” means…',
        'The train',
        ['The train', 'The bus', 'The taxi', 'The plane'],
        'Tren = train, autobús = bus, avión = plane.'
      ),
    ],
  },

  'spanish-family': {
    id: 'spanish-family',
    title: 'Spanish Family & Descriptions',
    theory: [
      'Meet la familia: la madre, el padre, el hermano, la hermana, el hijo, la hija, el amigo. Mi/mis = my, tu/tus = your, su/sus = his/her/their.',
      'Describe with ser + adjective, matching gender and number: alto/alta, altos/altas; pequeño, grande, feliz. Soy alto = I am tall.',
    ],
    questions: [
      MCQ(
        '“La hermana” means…',
        'The sister',
        ['The sister', 'The brother', 'The mother', 'The daughter'],
        'Hermana = sister, hermano = brother. La familia grows.'
      ),
      BUILD(
        'Say “my brothers” (more than one):',
        ['Mis', 'hermanos'],
        ['hermanos', 'Mi', 'Mis', 'Tu'],
        'Mi → mis before plurals: mis hermanos, mis amigos.'
      ),
      MCQ(
        '“Soy alta” is said by…',
        'A tall woman/girl',
        ['A tall woman/girl', 'A tall man', 'Tall children', 'Anyone tall'],
        'Adjectives agree: -o men, -a women, -os/-as plurals.'
      ),
      BUILD(
        'Say “your (friend’s) mother”:',
        ['Tu', 'madre'],
        ['madre', 'Su', 'Tu', 'Mi'],
        'Tu = your (friend), su = his/her/their. Madre = mother.'
      ),
      MCQ(
        '“El hijo” means…',
        'The son',
        ['The son', 'The daughter', 'The father', 'The child (neutral)'],
        'Hijo = son, hija = daughter, hijos = children/sons.'
      ),
    ],
  },

  'spanish-verbs-present': {
    id: 'spanish-verbs-present',
    title: 'Spanish Present Verbs',
    theory: [
      'Three endings rule the present: -ar (hablar), -er (comer), -ir (vivir). Hablo, hablas, habla, hablamos, hablan — the endings sing the person.',
      'Must-knows: soy (I am), tengo (I have), quiero (I want), puedo (I can). Estar describes place and mood: estoy en casa, estoy feliz.',
    ],
    questions: [
      BUILD(
        'Say “I speak Spanish”:',
        ['Hablo', 'español'],
        ['español', 'Hablo', 'Hablas', 'Habla'],
        '-ar verbs: hablo (I), hablas (you), habla (he/she).'
      ),
      MCQ(
        '“Comemos” means…',
        'We eat',
        ['We eat', 'You eat', 'They eat', 'He eats'],
        '-er verbs: como, comes, come, comemos, comen.'
      ),
      BUILD(
        'Say “I am happy” (feeling → estar):',
        ['Estoy', 'feliz'],
        ['feliz', 'Soy', 'Estoy', 'Estás'],
        'Estar = how/where: estoy feliz. Ser = what: soy alto.'
      ),
      MCQ(
        '“Puedo” means…',
        'I can',
        ['I can', 'I want', 'I have', 'I go'],
        'Poder → puedo. Querer → quiero. Tener → tengo.'
      ),
      BUILD(
        'Say “They live here” (vivir):',
        ['Viven', 'aquí'],
        ['aquí', 'Viven', 'Vivo', 'Vives'],
        '-ir verbs: vivo, vives, vive, viven. Aquí = here.'
      ),
    ],
  },

  'spanish-past': {
    id: 'spanish-past',
    title: 'Spanish Past Stories',
    theory: [
      'Yesterday speaks in preterite: hablé (I spoke), comí (I ate), viví (I lived). -ar takes -é, -er/-ir take -í — one accent, whole past.',
      'The rebels: fui (I went/was), tuve (I had), hice (I did/made), dije (I said). Ayer = yesterday, la semana pasada = last week.',
    ],
    questions: [
      MCQ(
        '“Hablé” means…',
        'I spoke',
        ['I spoke', 'I speak', 'I will speak', 'Speak!'],
        'Hablé with the accent = finished past. Hablo = now.'
      ),
      BUILD(
        'Say “I ate rice” (comer → comí):',
        ['Comí', 'arroz'],
        ['arroz', 'Comí', 'Como', 'Comer'],
        'Comí: -er past takes -í. Arroz = rice.'
      ),
      MCQ(
        '“Fui” can mean…',
        'I went / I was',
        ['I went / I was', 'I go', 'I will go', 'Go!'],
        'Ser and ir share fui in the past — context picks.'
      ),
      BUILD(
        'Say “last week”:',
        ['La', 'semana', 'pasada'],
        ['pasada', 'La', 'semana', 'ayer'],
        'La semana pasada frames any finished story.'
      ),
      MCQ(
        '“Hice” means…',
        'I did / I made',
        ['I did / I made', 'I do', 'I say', 'I have'],
        'Hacer → hice. Dije = I said, tuve = I had.'
      ),
    ],
  },

  'spanish-final': {
    id: 'spanish-final',
    title: 'Spanish Final Exam',
    theory: ['Final exam: greetings, numbers, food, travel, family, present verbs, and past stories — the whole comprehensive course.'],
    questions: [
      BUILD(
        'Ask a friend “How are you?”:',
        ['Cómo', 'estás'],
        ['estás', 'Cómo', 'está', 'estoy'],
        'Tú form for friends: ¿Cómo estás?'
      ),
      MCQ(
        '“Son las tres” tells…',
        'The time (3 o’clock)',
        ['The time (3 o’clock)', 'Three are sons', 'Three things', 'Tuesday'],
        'Son las + hour. Es la una for 1 o’clock only.'
      ),
      BUILD(
        'Say “They live here”:',
        ['Viven', 'aquí'],
        ['aquí', 'Viven', 'Vivo', 'Vivimos'],
        '-ir present: viven = they live.'
      ),
      MCQ(
        '“Tengo hambre” means…',
        'I am hungry',
        ['I am hungry', 'I have ham', 'I eat bread', 'I am thirsty'],
        'Tengo hambre = I have hunger. Tengo sed = thirsty.'
      ),
      MCQ(
        '“Hablé” vs “hablo”: the difference is…',
        'Past vs present',
        ['Past vs present', 'Formal vs casual', 'Loud vs quiet', 'None'],
        'The accent marks the finished past: hablé = I spoke.'
      ),
      BUILD(
        'Ask “Where is the station?”:',
        ['Dónde', 'está'],
        ['está', 'Dónde', 'Cuánto', 'Está'],
        '¿Dónde está…? + place. La estación = the station.'
      ),
    ],
  },

  'spanish-questions': {
    id: 'spanish-questions',
    title: 'Spanish Questions & Negation',
    theory: [
      'Spanish questions carry an opening ¿ and usually put the question word first: ¿Dónde está el baño? (Where is the bathroom?), ¿Cuándo llegas? (When do you arrive?), ¿Por qué estudias español? (Why do you study Spanish?).',
      'A yes/no question can simply rise in pitch: ¿Hablas español? The subject can come before or after the verb — ¿Tú hablas español? and ¿Hablas tú español? both work.',
      'Negation is no before the verb: No hablo francés. Double negatives are normal and emphatic: No veo nada (I see nothing), No hay nadie (there is nobody). Use tú with friends and usted in formal situations.',
    ],
    questions: [
      MCQ(
        'Which word means “where”?',
        'dónde',
        ['dónde', 'cuándo', 'quién', 'cómo'],
        'Dónde = where, cuándo = when, quién = who, cómo = how.'
      ),
      BUILD(
        'Ask “Where is the bathroom?”',
        ['Dónde', 'está', 'el', 'baño'],
        ['baño', 'Dónde', 'está', 'el', 'cuándo'],
        '¿Dónde está…? + place. El baño = the bathroom; está = is (location).'
      ),
      MCQ(
        '“No hablo francés” means…',
        'I don’t speak French',
        ['I don’t speak French', 'I speak French', 'I don’t study French', 'I want to learn French'],
        'No before the verb negates the whole sentence: no hablo = I don’t speak.'
      ),
      BUILD(
        'Say “I don’t have time”:',
        ['No', 'tengo', 'tiempo'],
        ['tiempo', 'No', 'tengo', 'tiene'],
        'No + tengo + tiempo. Tiene is the usted/él form, not yo.'
      ),
      MCQ(
        '“No veo nada” means…',
        'I see nothing',
        ['I see nothing', 'I don’t see the water', 'I see everything', 'I don’t want to see'],
        'Spanish keeps both negatives: no + veo + nada. Literally “I don’t see nothing,” meaning I see nothing.'
      ),
    ],
  },

  'spanish-health': {
    id: 'spanish-health',
    title: 'Spanish Health & Emergencies',
    theory: [
      'Say what hurts with doler: Me duele la cabeza (I have a headache), Me duele el estómago (my stomach hurts). For plural body parts use duelen: Me duelen los pies.',
      'Symptoms: Tengo fiebre (I have a fever), Tengo tos (I have a cough). Ask for help with Necesito un médico (I need a doctor), ¿Dónde está la farmacia? (where is the pharmacy?), or Llame a una ambulancia (call an ambulance — formal).',
      'Allergies: Soy alérgico/a a los cacahuetes. Use ¿Puede ayudarme? for a polite “Can you help me?”.',
    ],
    questions: [
      MCQ(
        '“Me duele la cabeza” means…',
        'I have a headache',
        ['I have a headache', 'I have a stomach ache', 'My feet hurt', 'I am dizzy'],
        'Me duele + singular body part: la cabeza = the head. Duelen is for plural parts.'
      ),
      BUILD(
        'Say “I need a doctor”:',
        ['Necesito', 'un', 'médico'],
        ['médico', 'Necesito', 'un', 'médica'],
        'Necesito = I need; un médico = a doctor. Médica is the feminine form of the profession.'
      ),
      MCQ(
        '“Tengo fiebre” means…',
        'I have a fever',
        ['I have a fever', 'I have a cough', 'I am cold', 'I have a headache'],
        'Tener + fiebre = to have a fever. Tos is a cough.'
      ),
      BUILD(
        'Ask “Where is the pharmacy?”',
        ['Dónde', 'está', 'la', 'farmacia'],
        ['farmacia', 'Dónde', 'está', 'la', 'el'],
        '¿Dónde está la farmacia? — farmacia is feminine, so la farmacia.'
      ),
      MCQ(
        '“Soy alérgico a los cacahuetes” means…',
        'Peanuts make me ill',
        ['Peanuts make me ill', 'I love peanuts', 'I am carrying peanuts', 'Peanuts are expensive'],
        'Alérgico/a a… names the trigger. Say it clearly before ordering food.'
      ),
    ],
  },
};
