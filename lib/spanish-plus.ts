/**
 * Spanish expansion — Course 4 (comprehensive set).
 * Original lessons written for Bolingo; sequencing follows standard
 * beginner-Spanish syllabi. Merged into LANGUAGE_COURSES in
 * lib/languages.ts — quiz, SRS, and guidebook work unchanged.
 */
import { MCQ, BUILD, TEXT, MATCH, LISTEN, SPEAK, type CourseLesson } from './quizBank';

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
      MATCH(
        'Pair each phrase with the moment it belongs to.',
        [
          { left: 'Buenos días', right: 'Morning' },
          { left: 'Buenas tardes', right: 'Afternoon' },
          { left: 'Buenas noches', right: 'Night' },
          { left: 'De nada', right: 'Answering gracias' },
          { left: '¡Bienvenidos!', right: 'Welcoming a group' },
        ],
        'The clock picks the greeting, and de nada is the only correct reply to gracias.'
      ),
      LISTEN(
        'Listen and type the question you ask a friend.',
        'Cómo estás',
        ['Cómo estás', 'Como estas'],
        'estás with the accent is the tú form; está without it is usted.'
      ),
      SPEAK(
        'Answer someone who thanked you, out loud.',
        'De nada',
        'Two flat syllables, no stress drama: deh-NAH-dah — it means “of nothing”.'
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
      MATCH(
        'Pair each number with its value.',
        [
          { left: 'Seis', right: '6' },
          { left: 'Siete', right: '7' },
          { left: 'Ocho', right: '8' },
          { left: 'Diez', right: '10' },
          { left: 'Doce', right: '12' },
        ],
        'Seis, siete, ocho then a jump: diez, once, doce — the teens break the pattern on purpose.'
      ),
      LISTEN(
        'Listen and type what the clock says.',
        'Son las tres',
        ['Son las tres'],
        'Son las + hour for every hour except one, which is singular: es la una.'
      ),
      SPEAK(
        'Say the only singular hour out loud.',
        'Es la una',
        'es-lah-OO-nah — the s of es links straight into la, so it sounds like one word.'
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
      MATCH(
        'Pair each Spanish food-word with its meaning.',
        [
          { left: 'El pollo', right: 'The chicken' },
          { left: 'El pescado', right: 'The fish' },
          { left: 'El pan', right: 'The bread' },
          { left: 'La cuenta', right: 'The bill' },
          { left: 'Tengo sed', right: 'I am thirsty' },
        ],
        'Tener hambre/sed literally means to have hunger/thirst — Spanish owns its appetites.'
      ),
      LISTEN(
        'Listen and type what you would order.',
        'Quiero café',
        ['Quiero café'],
        'Quiero takes any noun: quiero agua, quiero la cuenta, quiero el pollo.'
      ),
      SPEAK(
        'Ask for the bill, out loud.',
        'La cuenta por favor',
        'Four even syllables and a rising favor — the rise is what makes it a request.'
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
      MATCH(
        'Pair each travel phrase with what you are asking for.',
        [
          { left: '¿Dónde está el baño?', right: 'A location' },
          { left: '¿A qué hora sale?', right: 'A departure time' },
          { left: '¿Cuánto cuesta?', right: 'A price' },
          { left: 'A la izquierda', right: 'A direction' },
          { left: 'Todo recto', right: 'Straight on' },
        ],
        'Three question words cover travel: dónde (where), a qué hora (when), cuánto (how much).'
      ),
      LISTEN(
        'Listen and type the price question.',
        'Cuánto cuesta',
        ['Cuánto cuesta', 'Cuanto cuesta'],
        'The accent on cuánto turns a statement into a question — writing marks the rise that speech carries.'
      ),
      SPEAK(
        'Give someone a turning instruction, out loud.',
        'A la izquierda',
        'ah-lah-thee-KWER-dah; in Spain the z sounds run through the tongue, elsewhere they are soft.'
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
      MATCH(
        'Pair each family word with its meaning.',
        [
          { left: 'La hermana', right: 'The sister' },
          { left: 'El hermano', right: 'The brother' },
          { left: 'La hija', right: 'The daughter' },
          { left: 'El hijo', right: 'The son' },
          { left: 'Mis hermanos', right: 'My brothers' },
        ],
        'The -a/-o swap does all the work; only plurals force mi to become mis.'
      ),
      LISTEN(
        'Listen and type the phrase about siblings.',
        'Mis hermanos',
        ['Mis hermanos'],
        'mi becomes mis before a plural noun — the possessive agrees in number, not gender.'
      ),
      SPEAK(
        'Talk about a friend’s mother, out loud.',
        'Tu madre',
        'TOO MAH-dreh — and Spanish vowels never glide into English diphthongs.'
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
      MATCH(
        'Pair each verb form with the person it names.',
        [
          { left: 'Hablo', right: 'I speak' },
          { left: 'Comemos', right: 'We eat' },
          { left: 'Puedo', right: 'I can' },
          { left: 'Quiero', right: 'I want' },
          { left: 'Viven', right: 'They live' },
        ],
        'Three different infinitives, one rule: the ending names the subject, so the pronoun is optional.'
      ),
      LISTEN(
        'Listen and type how you say you are happy.',
        'Estoy feliz',
        ['Estoy feliz'],
        'Estar for a feeling, ser for what you are: estoy feliz but soy alto.'
      ),
      SPEAK(
        'Say which language you speak, out loud.',
        'Hablo español',
        'AH-bloh es-pah-NYOL — the ny is one sound, pushed through the palate, not n + y.'
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
      MATCH(
        'Pair each past form with what it means.',
        [
          { left: 'Hablé', right: 'I spoke' },
          { left: 'Comí', right: 'I ate' },
          { left: 'Viví', right: 'I lived' },
          { left: 'Fui', right: 'I went or I was' },
          { left: 'Hice', right: 'I did or made' },
        ],
        'Regular pasts wear one accent at the end; fui and hice are rebels you simply memorise.'
      ),
      LISTEN(
        'Listen and type what you ate.',
        'Comí arroz',
        ['Comí arroz'],
        'Comí is finished past — the accent on the last syllable is the whole tense marker.'
      ),
      SPEAK(
        'Set a story in last week, out loud.',
        'La semana pasada',
        'lah seh-MAH-nah pah-SAH-dah — the feminine article and adjective both agree with semana.'
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
      MCQ(
        'You are at a café in Madrid. You want water and the bill. Which pair is most natural?',
        'Un agua, por favor. La cuenta, por favor.',
        [
          'Un agua, por favor. La cuenta, por favor.',
          'Agua cuenta por favor.',
          'Yo quiero agua y cuenta.',
          'Una agua, la cuenta.',
        ],
        'Por favor softens both requests, and la cuenta is the bill. Politeness is part of the language, not decoration.'
      ),
      TEXT(
        'Type the Spanish for “I don’t understand.”',
        ['No entiendo.', 'No comprendo.'],
        'No entiendo and no comprendo both mean “I don’t understand”; entiendo is the most common everyday choice.',
        { misconceptions: { 'No entiendo nada': 'That means “I understand nothing” — stronger than the neutral phrase.' } }
      ),
      MATCH(
        'Pair each phrase with the situation it fits.',
        [
          { left: 'Ayer', right: 'Talking about yesterday' },
          { left: 'La semana pasada', right: 'Framing a finished story' },
          { left: 'Tengo hambre', right: 'You need food' },
          { left: 'Tengo sed', right: 'You need a drink' },
        ],
        'Time words and body words are the two things a beginner actually needs to say out loud.'
      ),
      LISTEN(
        'Listen and type what they tell you about the time.',
        'Son las tres',
        ['Son las tres'],
        'Son las, not Es las — plural hours keep the plural verb.'
      ),
      SPEAK(
        'Say the one phrase that saves any conversation, out loud.',
        'No entiendo',
        'no en-ten-YEH-do — admit you do not understand and people switch tactics instead of repeating louder.'
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
      MATCH(
        'Pair each question word with what it asks for.',
        [
          { left: 'Dónde', right: 'Place' },
          { left: 'Cuándo', right: 'Time' },
          { left: 'Quién', right: 'Person' },
          { left: 'Cómo', right: 'Manner' },
          { left: 'Por qué', right: 'Reason' },
        ],
        'Five question words cover almost every survival question. The spoken stress is marked, so the accent is part of the word — quien without an accent is not a question.'
      ),
      LISTEN(
        'Listen and type the excuse they give about time.',
        'No tengo tiempo',
        ['No tengo tiempo'],
        'No + tengo + tiempo — the negative sits directly before the verb, and tengo is the yo form.'
      ),
      SPEAK(
        'Ask out loud whether someone speaks Spanish.',
        'Hablas español',
        'say it with the rising pitch that turns a statement into a question — Spanish needs no inversion.'
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
      MATCH(
        'Pair each symptom with what you are telling the pharmacist.',
        [
          { left: 'Me duele la cabeza', right: 'My head hurts' },
          { left: 'Me duele el estómago', right: 'My stomach hurts' },
          { left: 'Tengo fiebre', right: 'I have a fever' },
          { left: 'Tengo tos', right: 'I have a cough' },
          { left: 'Necesito un médico', right: 'I need a doctor' },
        ],
        'Doler names the body part; tener names the symptom you carry. Both open the door at a pharmacy counter.'
      ),
      LISTEN(
        'Listen and type the question this person is asking in the street.',
        'Dónde está la farmacia',
        ['Dónde está la farmacia'],
        '¿Dónde está + the place? — farmacia is feminine, so la farmacia, never el.'
      ),
      SPEAK(
        'Ask a stranger for help, politely, out loud.',
        'Puede ayudarme',
        'the usted form puede plus the infinitive ayudarme is the polite way to open any request for assistance.'
      ),
    ],
  },

  'spanish-adjectives': {
    id: 'spanish-adjectives',
    title: 'Spanish Adjectives & Agreement',
    theory: [
      'Adjectives in Spanish match the noun they describe in gender and number. Masculine: el chico alto (the tall boy), feminine: la chica alta (the tall girl). Plural adds -s or -es: los chicos altos, las chicas altas.',
      'Compare things with más... que (more... than) or menos... que (less... than): Este libro es más interesante que ese. For equality, use tan... como: Ella es tan alta como su hermano.',
    ],
    questions: [
      MCQ(
        'Which adjective form goes with "las casas" (the houses)?',
        'blancas',
        ['blancas', 'blanco', 'blanca', 'blancos'],
        'Casas is feminine plural, so the adjective must be blancas.'
      ),
      BUILD(
        'Say “The boy is tall”:',
        ['El', 'chico', 'es', 'alto'],
        ['alto', 'El', 'chico', 'es', 'alta'],
        'Chico is masculine singular, so it takes alto, not alta.'
      ),
      MCQ(
        '“Más rápido que el tren” means…',
        'Faster than the train',
        ['Faster than the train', 'Slower than the train', 'As fast as the train', 'Next to the train'],
        'Más... que is the comparative of superiority: faster than.'
      ),
      BUILD(
        'Say “He is as tall as Juan”:',
        ['Él', 'es', 'tan', 'alto', 'como', 'Juan'],
        ['como', 'Él', 'es', 'tan', 'alto', 'Juan', 'que'],
        'Tan... como expresses equality: as tall as.'
      ),
      MCQ(
        'What is the irregular comparative of "bueno" (good)?',
        'Mejor',
        ['Mejor', 'Más bueno', 'Mayor', 'Peor'],
        'Bueno becomes mejor (better); malo becomes peor (worse).'
      ),
      MATCH(
        'Pair each adjective with its opposite.',
        [
          { left: 'Grande', right: 'Pequeño' },
          { left: 'Alto', right: 'Bajo' },
          { left: 'Bueno', right: 'Malo' },
          { left: 'Rápido', right: 'Lento' },
          { left: 'Fácil', right: 'Difícil' },
        ],
        'Spanish adjectives pair up naturally: grande/pequeño, alto/bajo, rápido/lento.'
      ),
      LISTEN(
        'Listen and type the comparison.',
        'Más rápido que el tren',
        ['Más rápido que el tren'],
        'Más with an accent means more, and que introduces the second term of comparison.'
      ),
      SPEAK(
        'Say “The boy is tall” out loud.',
        'El chico es alto',
        'El CHEE-co es AHL-to: keep the o vowel crisp and round.'
      ),
    ],
  },

  'spanish-politeness': {
    id: 'spanish-politeness',
    title: 'Spanish Politeness & Courtesy',
    theory: [
      'Politeness opens doors everywhere in the Spanish-speaking world. Use Disculpe to get attention or apologize politely to an adult, and Perdón when you bump into someone.',
      'Con permiso is used when squeezing past someone or asking to leave the table. Close with Muchas gracias, and answer with De nada (you are welcome) or No hay problema (no problem).',
    ],
    questions: [
      MCQ(
        'You need to squeeze past someone in a crowded bus. What do you say?',
        'Con permiso',
        ['Con permiso', 'Hola', 'Adiós', 'De nada'],
        'Con permiso is the universal polite phrase for asking to pass.'
      ),
      BUILD(
        'Say “Excuse me, sir” politely:',
        ['Disculpe', 'señor'],
        ['señor', 'Disculpe', 'Gracias', 'Hola'],
        'Disculpe is the formal usted imperative of disculpar.'
      ),
      MCQ(
        '“Lo siento mucho” means…',
        'I am very sorry',
        ['I am very sorry', 'Thank you very much', 'You are welcome', 'Please wait'],
        'Sentir = to feel. Lo siento mucho literally means “I feel it very much”.'
      ),
      BUILD(
        'Say “Thank you very much”:',
        ['Muchas', 'gracias'],
        ['gracias', 'Muchas', 'Mucho', 'De'],
        'Gracias is feminine plural, so it pairs with muchas, not mucho.'
      ),
      MCQ(
        'Someone says “Gracias”. Which is a friendly reply?',
        'No hay problema',
        ['No hay problema', 'Por favor', 'Lo siento', 'Disculpe'],
        'No hay problema (no problem) or De nada (you are welcome) replies to thanks.'
      ),
      MATCH(
        'Pair each courtesy phrase with its English meaning.',
        [
          { left: 'Disculpe', right: 'Excuse me' },
          { left: 'Lo siento', right: 'I am sorry' },
          { left: 'Con permiso', right: 'Pardon me (passing)' },
          { left: 'Muchas gracias', right: 'Thank you very much' },
          { left: 'De nada', right: 'You are welcome' },
        ],
        'Disculpe gets attention; lo siento expresses apology; con permiso clears a path.'
      ),
      LISTEN(
        'Listen and type the sincere apology.',
        'Lo siento mucho',
        ['Lo siento mucho'],
        'Lo siento mucho is the empathetic way to express sympathy or apology.'
      ),
      SPEAK(
        'Ask politely to pass by someone, out loud.',
        'Con permiso',
        'Con per-MEE-so: a clear, soft rhythm that lets everyone know you are passing through.'
      ),
    ],
  },

  'spanish-introductions': {
    id: 'spanish-introductions',
    title: 'Spanish Introductions & Origins',
    theory: [
      'Introduce yourself with Me llamo... (My name is...) or Mi nombre es... (My name is...). Ask someone with ¿Cómo te llamas? (casual) or ¿Cómo se llama usted? (formal).',
      'Talk about origins with ser + de: ¿De dónde eres? -> Soy de España / Soy de México. Talk about where you live with vivir: Vivo en Madrid. Close an introduction warmly with ¡Mucho gusto! (Pleasure to meet you!).',
    ],
    questions: [
      MCQ(
        '“¿Cómo te llamas?” asks for…',
        'Your name',
        ['Your name', 'Your age', 'Your country', 'Your job'],
        '¿Cómo te llamas? literally means “How do you call yourself?”.'
      ),
      BUILD(
        'Say “My name is Carlos”:',
        ['Me', 'llamo', 'Carlos'],
        ['Carlos', 'Me', 'llamo', 'Te', 'llama'],
        'Me llamo + name is the most natural way to state your name.'
      ),
      MCQ(
        '“¿De dónde eres?” means…',
        'Where are you from?',
        ['Where are you from?', 'Where do you live?', 'Where are you going?', 'Where is the hotel?'],
        'De dónde = from where; eres = you are (ser).'
      ),
      BUILD(
        'Say “I am from Spain”:',
        ['Soy', 'de', 'España'],
        ['España', 'Soy', 'de', 'Estoy', 'en'],
        'Origins take ser: Soy de España. Location takes estar.'
      ),
      MCQ(
        'A new acquaintance says “Mucho gusto”. What does that mean?',
        'Nice to meet you',
        ['Nice to meet you', 'Good luck', 'Have a nice trip', 'Goodbye'],
        'Mucho gusto = great pleasure / nice to meet you.'
      ),
      MATCH(
        'Pair each introduction phrase with its function.',
        [
          { left: 'Me llamo', right: 'Stating your name' },
          { left: 'Soy de', right: 'Stating your origin' },
          { left: 'Vivo en', right: 'Stating your residence' },
          { left: 'Mucho gusto', right: 'Pleased to meet you' },
          { left: 'Encantado', right: 'Delighted (greeting)' },
        ],
        'Me llamo names you, soy de tells your origin, and vivo en tells where you live today.'
      ),
      LISTEN(
        'Listen and type the polite introduction response.',
        'Mucho gusto',
        ['Mucho gusto'],
        'Mucho gusto is the standard, warm response to meeting someone new.'
      ),
      SPEAK(
        'Say where you are from, out loud.',
        'Soy de España',
        'Soy deh es-PAH-nyah: the ñ sounds like the "ny" in canyon.'
      ),
    ],
  },

  'spanish-language': {
    id: 'spanish-language',
    title: 'Spanish Languages & Understanding',
    theory: [
      'Ask about language ability with hablar: ¿Hablas inglés? (Do you speak English?) or formal ¿Habla usted español?. Reply with Hablo un poco de español (I speak a little Spanish).',
      'When you are lost in a fast conversation, save yourself with: No entiendo (I don’t understand), ¿Puede hablar más despacio, por favor? (Can you speak slower, please?), and ¿Puede repetir? (Can you repeat?).',
    ],
    questions: [
      MCQ(
        '“No entiendo” means…',
        'I do not understand',
        ['I do not understand', 'I do not know', 'I do not speak', 'I cannot hear'],
        'Entender = to understand. No entiendo is the first life-saving phrase in any language.'
      ),
      BUILD(
        'Ask “Do you speak English?” casually:',
        ['Hablas', 'inglés'],
        ['inglés', 'Hablas', 'Habla', 'español'],
        '¿Hablas inglés? — tú form with friend or peer.'
      ),
      MCQ(
        'You need someone to slow down. What do you say?',
        'Más despacio, por favor',
        ['Más despacio, por favor', 'Más rápido, por favor', 'No me gusta', 'Adiós'],
        'Despacio = slowly; más despacio = more slowly.'
      ),
      BUILD(
        'Say “I speak a little Spanish”:',
        ['Hablo', 'un', 'poco', 'de', 'español'],
        ['español', 'Hablo', 'un', 'poco', 'de', 'mucho'],
        'Hablo = I speak; un poco de = a little bit of.'
      ),
      MCQ(
        '“¿Puede repetir?” asks…',
        'Can you repeat?',
        ['Can you repeat?', 'Can you write it down?', 'Can you call someone?', 'Can you translate?'],
        'Repetir = to repeat. Puede repetir is the formal polite request.'
      ),
      MATCH(
        'Pair each language phrase with what it communicates.',
        [
          { left: 'No entiendo', right: 'I do not understand' },
          { left: 'Más despacio', right: 'Speak slower' },
          { left: 'Puede repetir', right: 'Ask for a repetition' },
          { left: 'Un poco', right: 'A little bit' },
          { left: 'Hablo inglés', right: 'I speak English' },
        ],
        'No entiendo admits confusion; más despacio and puede repetir ask for help.'
      ),
      LISTEN(
        'Listen and type the plea for a slower pace.',
        'Más despacio por favor',
        ['Más despacio por favor'],
        'Más despacio = slower; por favor = please.'
      ),
      SPEAK(
        'Say you speak a little Spanish, out loud.',
        'Hablo un poco de español',
        'AH-blo oon PO-co deh es-pah-NYOL: remember the h in hablo is completely silent.'
      ),
    ],
  },

  'spanish-money': {
    id: 'spanish-money',
    title: 'Spanish Shopping & Money',
    theory: [
      'In markets and shops, ask the price with ¿Cuánto cuesta? (singular item) or ¿Cuánto cuestan? (plural items). You can also ask ¿Cuánto es? (How much is it in total?).',
      'Describe prices with caro (expensive) and barato (cheap): Es demasiado caro (It is too expensive). Payment: ¿Puedo pagar con tarjeta? (Can I pay with card?) or en efectivo (in cash). At a café, ask La cuenta, por favor (The check, please).',
    ],
    questions: [
      MCQ(
        '“¿Cuánto cuesta?” asks…',
        'How much does it cost?',
        ['How much does it cost?', 'Where is it?', 'Do you have more?', 'What time is it?'],
        'Costar = to cost. ¿Cuánto cuesta? is the primary shopping question.'
      ),
      BUILD(
        'Say “It is very expensive”:',
        ['Es', 'muy', 'caro'],
        ['caro', 'Es', 'muy', 'barato'],
        'Es = it is, muy = very, caro = expensive. Barato is cheap.'
      ),
      MCQ(
        'How do you say “Can I pay with a card?”',
        '¿Puedo pagar con tarjeta?',
        ['¿Puedo pagar con tarjeta?', '¿Tiene efectivo?', '¿Cuánto cuesta?', '¿Dónde está el banco?'],
        'Tarjeta = card; pagar = to pay.'
      ),
      BUILD(
        'Ask for the check at a restaurant:',
        ['La', 'cuenta', 'por', 'favor'],
        ['favor', 'La', 'cuenta', 'por', 'el'],
        'La cuenta, por favor = The bill/check, please.'
      ),
      MCQ(
        '“En efectivo” means…',
        'In cash',
        ['In cash', 'By credit card', 'With a discount', 'For free'],
        'Efectivo = cash. Con tarjeta = by card.'
      ),
      MATCH(
        'Pair each shopping phrase with its meaning.',
        [
          { left: 'Cuánto cuesta', right: 'Asking price' },
          { left: 'Muy caro', right: 'Too expensive' },
          { left: 'Muy barato', right: 'Very cheap' },
          { left: 'Con tarjeta', right: 'By card' },
          { left: 'La cuenta', right: 'The bill' },
        ],
        'Cuánto cuesta asks the price, caro/barato evaluates it, and la cuenta asks to pay.'
      ),
      LISTEN(
        'Listen and type the question asked at the market.',
        'Cuánto cuesta esto',
        ['Cuánto cuesta esto'],
        '¿Cuánto cuesta esto? = How much does this cost? Esto is the neutral "this".'
      ),
      SPEAK(
        'Ask for the restaurant check, out loud.',
        'La cuenta por favor',
        'Lah KWEN-tah por fah-VOR: clear, courteous, and recognized in every restaurant.'
      ),
    ],
  },
};
