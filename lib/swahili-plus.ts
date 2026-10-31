/**
 * Swahili expansion — Course 4 (comprehensive set).
 * Original lessons written for Bolingo; topic sequencing informed by open
 * curricula including the FSI Swahili Basic Course (US public domain).
 * Merged into LANGUAGE_COURSES in lib/languages.ts — quiz, SRS, and
 * guidebook work unchanged. Vocabulary cross-checked against the bundled
 * offline kamusi (assets/dict/sw.json) where possible.
 */
import { MCQ, BUILD, TEXT, type CourseLesson } from './quizBank';

export const SWAHILI_PLUS: Record<string, CourseLesson> = {
  'swahili-greetings': {
    id: 'swahili-greetings',
    title: 'Swahili Greetings & Replies',
    theory: [
      'Swahili greets by time of day and by respect. Elders receive Shikamoo (I hold peace) and answer Marahaba (I accept). Peers trade Hujambo? (are you well?) and answer Sijambo (I am well). Habari za asubuhi? (morning news?) is answered Nzuri (good).',
      'Never rush a greeting — ask twice, smile once. Follow any greeting with Uko vipi? (how are you, really?) and you sound like a local.',
    ],
    questions: [
      MCQ(
        'A young person greets an elder with “Shikamoo”. The elder replies…',
        'Marahaba',
        ['Marahaba', 'Sijambo', 'Nzuri', 'Karibu'],
        'Shikamoo → Marahaba. Respect offered, respect accepted.'
      ),
      BUILD(
        'Greet a peer: “Are you well?”',
        ['Hujambo'],
        ['Sijambo', 'Hujambo', 'Marahaba', 'Nzuri'],
        'Hujambo? asks it; Sijambo answers it — a perfect pair.'
      ),
      MCQ(
        '“Habari za asubuhi?” is the greeting for…',
        'Morning',
        ['Morning', 'Evening', 'Night', 'Midday meal'],
        'Asubuhi = morning. Jioni = evening, usiku = night.'
      ),
      BUILD(
        'Answer “Habari yako?” (your news?) the short way:',
        ['Nzuri'],
        ['Mbaya', 'Nzuri', 'Pole', 'Tafadhali'],
        'Nzuri = good/fine. Short, warm, always correct.'
      ),
      MCQ(
        '“Uko vipi?” means…',
        'How are you (really)?',
        ['How are you (really)?', 'Where are you?', 'Who are you?', 'How old are you?'],
        'Uko vipi deepens the greeting — ask it after Habari.'
      ),
    ],
  },

  'swahili-numbers': {
    id: 'swahili-numbers',
    title: 'Swahili Numbers & Money',
    theory: [
      'Count to ten: moja, mbili, tatu, nne, tano, sita, saba, nane, tisa, kumi. Eleven is kumi na moja (ten and one) — the pattern never breaks, so twenty is ishirini and one hundred is mia moja.',
      'At the market ask Bei gani? (what price?) and hear Shilingi elfu tano (five thousand shillings). Pesa = money, ghali = expensive, rahisi = cheap.',
    ],
    questions: [
      MCQ(
        '“Tatu” means…',
        'Three',
        ['Three', 'Two', 'Five', 'Ten'],
        'Moja 1, mbili 2, tatu 3 — chant them in order.'
      ),
      BUILD(
        'Say “ten”:',
        ['Kumi'],
        ['Tisa', 'Kumi', 'Saba', 'Nane'],
        'Tisa 9, kumi 10. Kumi na moja = 11.'
      ),
      MCQ(
        '“Bei gani?” asks for…',
        'The price',
        ['The price', 'The time', 'The place', 'The name'],
        'Bei = price. Bei gani? opens every market bargain.'
      ),
      BUILD(
        'Say “five thousand shillings”:',
        ['Shilingi', 'elfu', 'tano'],
        ['tano', 'Shilingi', 'elfu', 'mia'],
        'Elfu = thousand: elfu tano = 5000. Mia moja = 100.'
      ),
      MCQ(
        'The seller names a wild price. You say “Ghali!” — meaning…',
        'Expensive!',
        ['Expensive!', 'Cheap!', 'Free!', 'Sold!'],
        'Ghali = expensive, rahisi = cheap. Bargain with a smile.'
      ),
    ],
  },

  'swahili-noun-classes': {
    id: 'swahili-noun-classes',
    title: 'Swahili Noun Classes',
    theory: [
      'Every Swahili noun belongs to a family that changes its clothes. People take m-/wa-: mtoto (child) → watoto (children). Things take ki-/vi-: kiti (chair) → viti (chairs). Adjectives must match: mtoto mdogo (small child), viti vidogo (small chairs).',
      'Learn the pair, not the word: mti/miti (tree/trees), kitabu/vitabu (book/books). The prefix tells you singular or plural at a glance.',
    ],
    questions: [
      MCQ(
        '“Watoto” means…',
        'Children',
        ['Children', 'Child', 'Chairs', 'Books'],
        'Mtoto → watoto: the m-/wa- people family.'
      ),
      BUILD(
        'Make “chairs” from kiti:',
        ['Viti'],
        ['Viti', 'Kiti', 'Ziti', 'Miti'],
        'Ki-/vi- things family: kiti → viti, kitabu → vitabu.'
      ),
      MCQ(
        '“Mtoto mdogo” shows…',
        'Adjective agreement with the noun class',
        ['Adjective agreement with the noun class', 'Past tense', 'A question', 'A plural verb'],
        'Mdogo matches m-: mtoto mdogo, but viti vidogo.'
      ),
      BUILD(
        'Say “small books” (book = kitabu):',
        ['Vitabu', 'vidogo'],
        ['vidogo', 'Kitabu', 'Vitabu', 'kidogo'],
        'Plural first (vitabu), then the matching adjective (vidogo).'
      ),
      MCQ(
        '“Miti” (trees) is the plural of…',
        'Mti',
        ['Mti', 'Mto', 'Mtihani', 'Mita'],
        'M-/mi- family for plants: mti → miti.'
      ),
    ],
  },

  'swahili-family': {
    id: 'swahili-family',
    title: 'Swahili Family & Possessives',
    theory: [
      'Family first: mama (mother), baba (father), kaka (brother), dada (sister), mtoto (child), rafiki (friend). Possessives glue to the noun: mama yangu (my mother), baba yako (your father), kaka yake (his/her sibling).',
      'Yangu = my, yako = your, yake = his/her, yetu = our. Jina langu ni… (my name is…) already taught you the pattern — now own it.',
    ],
    questions: [
      MCQ(
        '“Dada” means…',
        'Sister',
        ['Sister', 'Brother', 'Mother', 'Aunt'],
        'Dada = sister, kaka = brother. Shikamoo, dada!'
      ),
      BUILD(
        'Say “my mother”:',
        ['Mama', 'yangu'],
        ['yangu', 'Mama', 'yako', 'Baba'],
        'Mama + yangu. Swap in yako (your) or yake (his/her).'
      ),
      MCQ(
        '“Baba yako” means…',
        'Your father',
        ['Your father', 'My father', 'His father', 'Our father'],
        'Yako = your. Baba yako — ask about family with respect.'
      ),
      BUILD(
        'Say “our friend” (friend = rafiki):',
        ['Rafiki', 'yetu'],
        ['yetu', 'Rafiki', 'yangu', 'yake'],
        'Yetu = our. Rafiki yetu — friendship, plural included.'
      ),
      MCQ(
        '“Kaka yake” means…',
        'His/her brother',
        ['His/her brother', 'My brother', 'Your sister', 'Their mother'],
        'Yake = his/her. One word covers both — context decides.'
      ),
    ],
  },

  'swahili-food-market': {
    id: 'swahili-food-market',
    title: 'Swahili Food & Market',
    theory: [
      'Eat your way fluent: chakula (food), wali (rice), samaki (fish), nyama (meat), matunda (fruit), maji (water), chai (tea). Hungry? Nasikia njaa (I feel hunger). Thirsty? Nasikia kiu.',
      'At the sokoni (market): Nataka… (I want…), Kuna…? (is there…?), Bei gani? (what price?). Tafadhali and asante wrap every deal.',
    ],
    questions: [
      MCQ(
        '“Samaki” means…',
        'Fish',
        ['Fish', 'Meat', 'Rice', 'Fruit'],
        'Samaki = fish, nyama = meat, wali = rice.'
      ),
      BUILD(
        'Say “I want water”:',
        ['Nataka', 'maji'],
        ['maji', 'Nataka', 'Chakula', 'Kuna'],
        'Nataka + anything: nataka chai, nataka matunda.'
      ),
      MCQ(
        '“Nasikia njaa” means…',
        'I am hungry',
        ['I am hungry', 'I am thirsty', 'I am tired', 'I am full'],
        'Kusikia njaa = to feel hunger. Kiu = thirst.'
      ),
      BUILD(
        'Ask “Is there rice?” at the market:',
        ['Kuna', 'wali'],
        ['wali', 'Kuna', 'Nataka', 'Bei'],
        'Kuna…? = is there…? Kuna samaki? Kuna matunda?'
      ),
      MCQ(
        '“Matunda” means…',
        'Fruit',
        ['Fruit', 'Vegetables', 'Spices', 'Bread'],
        'Matunda = fruit (plural). Tunda moja = one fruit.'
      ),
    ],
  },

  'swahili-travel': {
    id: 'swahili-travel',
    title: 'Swahili Travel & Directions',
    theory: [
      'Move like a local: Wapi? (where?), Hapa (here), Pale (there), kushoto (left), kulia (right), moja kwa moja (straight). Basi = bus, daladala = minibus, nauli = fare, tiketi = ticket.',
      'Ask Wapi stesheni? (where is the station?) and follow Twende! (let us go!). Karibu Tanzania — safari njema (safe journey)!',
    ],
    questions: [
      MCQ(
        '“Wapi?” means…',
        'Where?',
        ['Where?', 'When?', 'How?', 'Who?'],
        'Wapi = where. Wapi choo? has saved a thousand travellers.'
      ),
      BUILD(
        'Ask “Where is the bus?”:',
        ['Basi', 'liko', 'wapi'],
        ['wapi', 'Basi', 'liko', 'Hapa'],
        'Basi liko wapi? Liko = it-is-located. Hapa = here.'
      ),
      MCQ(
        '“Kushoto” means…',
        'Left',
        ['Left', 'Right', 'Straight', 'Back'],
        'Kushoto = left, kulia = right, moja kwa moja = straight.'
      ),
      BUILD(
        'Say “Let us go!”:',
        ['Twende'],
        ['Twende', 'Njoo', 'Kaa', 'Rudi'],
        'Twende! — one word, whole journey. Safari njema!'
      ),
      MCQ(
        '“Nauli” is the…',
        'Fare',
        ['Fare', 'Ticket', 'Bus', 'Driver'],
        'Nauli = fare you pay; tiketi = the ticket itself.'
      ),
    ],
  },

  'swahili-verbs-daily': {
    id: 'swahili-verbs-daily',
    title: 'Swahili Daily Verbs',
    theory: [
      'Five verbs run your day: -enda (go), -ja (come), -fanya (do), -penda (like/love), -taka (want). Conjugate across people in the present: ninaenda (I go), unaenda (you go), anaenda (he/she goes), tunaenda (we go), wanaenda (they go).',
      'Same skeleton every time: subject prefix + -na- + stem. Swap the stem, keep the rhythm — ninapenda, unataka, wanafanya.',
    ],
    questions: [
      BUILD(
        'Say “I love tea” (love = -penda):',
        ['Ninapenda', 'chai'],
        ['chai', 'Ninapenda', 'Unapenda', 'Anapenda'],
        'Ni-na-penda: I + present + love. Chai on the side.'
      ),
      MCQ(
        '“Tunaenda” means…',
        'We are going',
        ['We are going', 'You are going', 'They are going', 'I am going'],
        'Tu- = we. Tunaenda sokoni = we are going to the market.'
      ),
      BUILD(
        'Say “You (one person) want water”:',
        ['Unataka', 'maji'],
        ['maji', 'Unataka', 'Ninataka', 'Anataka'],
        'U-na-taka: you + present + want.'
      ),
      MCQ(
        '“Wanafanya” breaks down to…',
        'They are doing',
        ['They are doing', 'We are doing', 'He is doing', 'I am doing'],
        'Wa-na-fanya: they + present + do.'
      ),
      BUILD(
        'Say “She is coming” (come = -ja):',
        ['Anakuja'],
        ['Ninakuja', 'Anakuja', 'Unakuja', 'Tunakuja'],
        'A-na-kuja: she + present + come. -ja doubles the u.'
      ),
    ],
  },

  'swahili-time-tense': {
    id: 'swahili-time-tense',
    title: 'Swahili Time & Perfect Tense',
    theory: [
      'Swahili time starts at sunrise: saa moja asubuhi = 7am (hour one of the morning), saa kumi na mbili jioni = 6pm. Jana = yesterday, leo = today, kesho = tomorrow, sasa = now.',
      'Finished actions wear -me-: nimemaliza (I have finished), umekula? (have you eaten?). -me- = done and dusted; -li- = simple past story.',
    ],
    questions: [
      MCQ(
        '“Kesho” means…',
        'Tomorrow',
        ['Tomorrow', 'Yesterday', 'Today', 'Now'],
        'Jana → leo → kesho: yesterday, today, tomorrow.'
      ),
      BUILD(
        'Say “I have finished” (finish = -maliza):',
        ['Nimemaliza'],
        ['Nilimaliza', 'Nimemaliza', 'Nitamaliza', 'Ninamaliza'],
        'Ni-me-maliza: -me- marks the completed state.'
      ),
      MCQ(
        '“Saa moja asubuhi” is…',
        '7 in the morning',
        ['7 in the morning', '1 in the morning', '12 noon', '6 in the evening'],
        'Swahili clocks start at 6am: saa moja = 7am. Asubuhi = morning.'
      ),
      BUILD(
        'Ask “Have you eaten?” (eat = -kula):',
        ['Umekula'],
        ['Ulikula', 'Umekula', 'Utakula', 'Unakula'],
        'U-me-kula?: -me- asks about the finished state.'
      ),
      MCQ(
        '“Sasa” means…',
        'Now',
        ['Now', 'Later', 'Never', 'Soon'],
        'Sasa = now. Twende sasa! = let us go now!'
      ),
    ],
  },

  'swahili-final': {
    id: 'swahili-final',
    title: 'Swahili Final Exam',
    theory: [
      'Final exam: greetings, numbers, noun classes, family, food, travel, questions and negation, adjectives, health, verbs, and time — the whole comprehensive course.',
    ],
    questions: [
      BUILD(
        'Greet an elder respectfully and pick the reply pair:',
        ['Shikamoo'],
        ['Marahaba', 'Shikamoo', 'Sijambo', 'Nzuri'],
        'Shikamoo opens it; the elder answers Marahaba.'
      ),
      MCQ(
        '“Vitabu vidogo” means…',
        'Small books',
        ['Small books', 'Big books', 'Small chairs', 'My books'],
        'Ki-/vi- agreement: vitabu + vidogo. Class match wins.'
      ),
      BUILD(
        'Say “We are going to the market tomorrow”:',
        ['Tunaenda', 'sokoni', 'kesho'],
        ['kesho', 'Tunaenda', 'sokoni', 'jana'],
        'Tu-na-enda + sokoni (to the market) + kesho.'
      ),
      MCQ(
        '“Umekula?” asks…',
        'Have you eaten?',
        ['Have you eaten?', 'Will you eat?', 'Are you eating?', 'Did you cook?'],
        '-me- perfect tense: the finished state, asked politely.'
      ),
      MCQ(
        '“Bei gani?” + “Ghali!” means the buyer thinks it is…',
        'Too expensive',
        ['Too expensive', 'Too cheap', 'Free', 'Sold out'],
        'Price asked, price judged: ghali = expensive, rahisi = cheap.'
      ),
      BUILD(
        'Say “My name is Amina, I love tea”:',
        ['Jina', 'langu', 'ni', 'Amina'],
        ['Amina', 'Jina', 'ni', 'langu'],
        'Introduce first: jina langu ni… — then ninapenda chai!'
      ),
      MCQ(
        '“Je, una pesa?” is asking…',
        'Do you have money?',
        ['Do you have money?', 'Where is the money?', 'How much is it?', 'Do you want money?'],
        'Je opens a yes/no question and una pesa is “you have money” — the answer is ndiyo or hapana.'
      ),
      MCQ(
        '“Yeye ni mrefu kuliko mimi” means…',
        'He is taller than me',
        ['He is taller than me', 'He is as tall as me', 'I am taller than him', 'He is very tall'],
        'Kuliko = than, and mrefu takes the m- agreement of a class 1 person.'
      ),
      BUILD(
        'Say “I have a fever”:',
        ['Nina', 'homa'],
        ['homa', 'Nina', 'kikohozi', 'dawa'],
        'Nina = I have; homa = fever. Kikohozi is a cough and dawa is medicine.'
      ),
      MCQ(
        'At a market stall in Dar es Salaam, you want the price and two mangoes. Which pair is most natural?',
        'Bei gani? Naomba maembe mawili.',
        [
          'Bei gani? Naomba maembe mawili.',
          'Bei gani? Naomba maembe mbili.',
          'Bei gani? Naomba embe mawili.',
          'Bei gani? Nataka maembe mawili sana.',
        ],
        'Bei gani? asks the price; naomba is a polite request. Maembe is class 6, so the pair is mawili, not mbili.'
      ),
      TEXT(
        'Type the Swahili for “I don’t understand.”',
        ['Sielewi.', 'Sikuelewi.'],
        'Sielewi is the neutral “I don’t understand”; sikuelewi adds “you” — I don’t understand you. Both are useful, but sielewi is the safer default.',
        { misconceptions: { 'Sijui': 'Sijui means “I don’t know.” Use sielewi for “I don’t understand.”' } }
      ),
    ],
  },

  'swahili-questions': {
    id: 'swahili-questions',
    title: 'Swahili Questions & Negation',
    theory: [
      'Open a yes/no question with Je: Je, unakwenda sokoni? (Are you going to the market?). Question words take the answer’s place: Unakwenda wapi? (Where are you going?), Unaitwa nani? (What are you called?), Kwa nini unacheka? (Why are you laughing?).',
      'The present negative drops -na- and swaps the subject prefix: ninapenda → sipendi (I don’t like), unasoma → husomi (you don’t read), anafanya kazi → hafanyi kazi (he doesn’t work). Plural follows the same pattern: hatupendi, hampendi, hawapendi.',
      'For possession and existence: sina (I don’t have), hatuna (we don’t have), hakuna (there is no). Keep the noun after the verb — Hakuna maji means there is no water.',
    ],
    questions: [
      MCQ(
        'Which word opens a yes/no question in Swahili?',
        'Je',
        ['Je', 'Na', 'Ni', 'Kwa'],
        'Je, unakwenda sokoni? — Je turns the statement into a question.'
      ),
      BUILD(
        'Ask “Where are you going?”',
        ['Unakwenda', 'wapi'],
        ['wapi', 'Unakwenda', 'nani', 'lini'],
        'Unakwenda (you are going) + wapi (where). The question word closes the question.'
      ),
      MCQ(
        '“Sipendi chai” means…',
        'I don’t like tea',
        ['I don’t like tea', 'I am drinking tea', 'I want tea', 'I don’t have tea'],
        'Si- is the I-negative prefix; -penda = like. Sipendi chai = I don’t like tea.'
      ),
      BUILD(
        'Say “We don’t have money”:',
        ['Hatuna', 'pesa'],
        ['pesa', 'Hatuna', 'Sina', 'chakula'],
        'Hatuna = we don’t have (hatu- + na). Sina is the singular I form.'
      ),
      MCQ(
        '“Hakuna maji” means…',
        'There is no water',
        ['There is no water', 'The water is cold', 'I don’t want water', 'Bring the water'],
        'Hakuna = there is no. Maji = water.'
      ),
    ],
  },

  'swahili-adjectives': {
    id: 'swahili-adjectives',
    title: 'Swahili Adjectives & Agreement',
    theory: [
      'Adjectives follow the noun and agree with its class: mtoto mzuri (a good child), watoto wazuri (good children); kitabu kizuri (a good book), vitabu vizuri (good books).',
      'Class 9/10 nouns often take n-: nyumba nzuri (a good house), nyumba ndogo (a small house). Learn each noun with its adjective pair, not the adjective alone.',
      'Compare with kuliko: Yeye ni mrefu kuliko mimi (He is taller than me). Common opposites: -kubwa/-dogo (big/small), -refu/-fupi (tall/short), -pya/-zee (new/old), -zuri/-baya (good/bad).',
    ],
    questions: [
      MCQ(
        'Choose the correct pair for “a good child”:',
        'mtoto mzuri',
        ['mtoto mzuri', 'mtoto wazuri', 'watoto mzuri', 'mtoto vizuri'],
        'Mtoto is class 1; its adjective takes m-: mtoto mzuri. Watoto wazuri is the plural.'
      ),
      BUILD(
        'Say “big books”:',
        ['Vitabu', 'vikubwa'],
        ['vikubwa', 'Vitabu', 'kubwa', 'vidogo'],
        'Vitabu is class 8 plural, so the adjective takes vi-: vitabu vikubwa.'
      ),
      MCQ(
        '“Nyumba ndogo” means…',
        'A small house',
        ['A small house', 'A big house', 'A new house', 'Many houses'],
        'Nyumba is class 9/10; the adjective takes n-: ndogo = small.'
      ),
      BUILD(
        'Say “The tree is tall”:',
        ['Mti', 'ni', 'mrefu'],
        ['mrefu', 'Mti', 'ni', 'fupi'],
        'Mti (tree) is class 3, so tall is mrefu. Ni links subject and adjective.'
      ),
      MCQ(
        '“Kuliko” is used to…',
        'Compare two things',
        ['Compare two things', 'Mean “very”', 'Mark a question', 'Mean “and”'],
        'Yeye ni mrefu kuliko mimi — he is taller than me. Kuliko = than.'
      ),
    ],
  },

  'swahili-health': {
    id: 'swahili-health',
    title: 'Swahili Health & Emergencies',
    theory: [
      'Naumwa means I am ill — literally “it hurts me”. Name the place with na: Naumwa na kichwa (headache), Naumwa na tumbo (stomach ache).',
      'Nina homa (I have a fever), nina kikohozi (I have a cough). Ask for help plainly: Nisaidie! (Help me!), Nahitaji daktari (I need a doctor), Hospitali iko wapi? (Where is the hospital?).',
      'At the pharmacy ask for dawa (medicine); in an emergency say Piga simu ya dharura (call the emergency number).',
    ],
    questions: [
      MCQ(
        '“Naumwa na tumbo” means…',
        'My stomach hurts',
        ['My stomach hurts', 'I am hungry', 'I ate too much', 'My head hurts'],
        'Naumwa = it hurts me; na tumbo = in the stomach. Naumwa na kichwa is the headache.'
      ),
      BUILD(
        'Say “I need a doctor”:',
        ['Nahitaji', 'daktari'],
        ['daktari', 'Nahitaji', 'dawa', 'hospitali'],
        'Nahitaji = I need; daktari = doctor. Dawa is medicine, hospitali the building.'
      ),
      MCQ(
        '“Nisaidie!” means…',
        'Help me!',
        ['Help me!', 'I am fine', 'Excuse me', 'Goodbye'],
        'Nisaidie is the direct plea for help — say it loudly and clearly.'
      ),
      BUILD(
        'Ask “Where is the hospital?”',
        ['Hospitali', 'iko', 'wapi'],
        ['wapi', 'Hospitali', 'iko', 'daktari'],
        'Hospitali iko wapi? — iko = it is (located), wapi = where.'
      ),
      MCQ(
        'At the pharmacy you ask for…',
        'dawa',
        ['dawa', 'chakula', 'maji', 'kitabu'],
        'Dawa = medicine. Chakula is food, maji is water, kitabu is a book.'
      ),
    ],
  },

  'swahili-politeness': {
    id: 'swahili-politeness',
    title: 'Swahili Politeness & Sympathy',
    theory: [
      'Swahili softens every request. Samahani (sorry / excuse me) opens one, Tafadhali (please) smooths it, and Asante (thank you) closes it. Karibu means welcome — the natural reply to Asante — and also “come in”.',
      'Kumradhi is the formal “pardon me” heard in announcements and on phrase cards. Pole sana is sympathy, not an apology for a mistake: use it when someone is hurt or has bad news, and Samahani when you are the one who bumped, interrupted or arrived late. Hamna shida (or Hakuna shida) = no problem; Ni sawa = it’s fine.',
    ],
    questions: [
      MCQ(
        'You bump into someone in a crowd. What do you say?',
        'Samahani',
        ['Samahani', 'Asante', 'Karibu', 'Kwaheri'],
        'Samahani = sorry / excuse me. Asante thanks them, Karibu welcomes them, Kwaheri says goodbye.'
      ),
      BUILD(
        'Say “Please help me”:',
        ['Nisaidie', 'tafadhali'],
        ['tafadhali', 'Nisaidie', 'asante', 'pole'],
        'Nisaidie = help me; tafadhali = please. Either order works — Tafadhali nisaidie is just as natural.'
      ),
      MCQ(
        '“Asante sana” means…',
        'Thank you very much',
        ['Thank you very much', 'You are welcome', 'I am sorry', 'See you later'],
        'Asante = thank you; sana = very. Asante sana is the warm, everyday thank-you.'
      ),
      BUILD(
        'Reply “You’re welcome” to Asante:',
        ['Karibu'],
        ['Karibu', 'Tafadhali', 'Pole', 'Kwaheri'],
        'Karibu is the standard reply to thanks. It also means welcome / come in.'
      ),
      MCQ(
        'A friend tells you their grandmother died. Which reply fits?',
        'Pole sana',
        ['Pole sana', 'Tafadhali', 'Karibu', 'Asante sana'],
        'Pole sana expresses sympathy. Samahani would suggest you were at fault.'
      ),
    ],
  },

  'swahili-introductions': {
    id: 'swahili-introductions',
    title: 'Swahili Introductions & Origins',
    theory: [
      'Ask a name formally with Jina lako ni nani? and casually with Unaitwaje? Answer Jina langu ni … or Ninaitwa …; Mimi ni … works in both registers.',
      'Origin uses -toka: Umetoka wapi? (formal) / Unatoka wapi? Answer Nimetoka Kenya. Residence uses -ishi or -kaa: Unaishi wapi? / Unakaa wapi? — Naishi Nairobi. Close an introduction with Nimefurahi kukutana nawe (nice to meet you).',
    ],
    questions: [
      MCQ(
        'Which question is the casual way to ask someone’s name?',
        'Unaitwaje?',
        ['Unaitwaje?', 'Jina lako ni nani?', 'Umetoka wapi?', 'Unaishi wapi?'],
        'Unaitwaje? = what are you called? Jina lako ni nani? is the formal version.'
      ),
      BUILD(
        'Say “My name is Amina”:',
        ['Jina', 'langu', 'ni', 'Amina'],
        ['Amina', 'Jina', 'langu', 'ni', 'yako'],
        'Jina = name, langu = my, ni = is. Jina langu ni Amina. Ninaitwa Amina says the same thing.'
      ),
      MCQ(
        '“Umetoka wapi?” asks…',
        'Where are you from?',
        ['Where are you from?', 'Where do you live?', 'What is your name?', 'How old are you?'],
        '-toka = come from. Answer Nimetoka Kenya (I am from Kenya). Residence uses -ishi instead.'
      ),
      BUILD(
        'Say “I am from Kenya”:',
        ['Nimetoka', 'Kenya'],
        ['Nimetoka', 'Kenya', 'Naishi', 'Ujerumani'],
        'Nimetoka = I have come from / I am from. Naishi is “I live”, not “I am from”.'
      ),
      MCQ(
        'You live in Nairobi. Best answer to “Unaishi wapi?”',
        'Naishi Nairobi',
        ['Naishi Nairobi', 'Nimetoka Nairobi', 'Ninaitwa Nairobi', 'Nimefurahi Nairobi'],
        'Naishi = I live. Nimetoka Nairobi would mean you come from Nairobi; the question asks where you live.'
      ),
    ],
  },

  'swahili-language': {
    id: 'swahili-language',
    title: 'Swahili Languages & Understanding',
    theory: [
      'Language names wear Ki-: Kiswahili, Kiingereza (English), Kiarabu (Arabic), Kijerumani (German), Kijapani (Japanese). Ask Unazungumza Kiingereza? — in the street you will also hear Unaongea Kiingereza?',
      'When you are lost: Sielewi (I don’t understand), Sema polepole tafadhali (speak slowly, please), Unaweza kurudia? (can you repeat?). Naelewa = I understand; Kidogo tu = just a little.',
    ],
    questions: [
      MCQ(
        '“Sielewi” means…',
        'I don’t understand',
        ['I don’t understand', 'I don’t speak', 'I don’t know', 'I don’t want it'],
        'Sielewi is the negative of naelewa (I understand) — the phrase for “it has not landed”.'
      ),
      BUILD(
        'Ask “Do you speak English?” in standard Swahili:',
        ['Unazungumza', 'Kiingereza'],
        ['Kiingereza', 'Unazungumza', 'Unaongea', 'Kiarabu'],
        'Unazungumza = you speak; Kiingereza = English. Unaongea Kiingereza? is the common colloquial variant.'
      ),
      MCQ(
        'You need the speaker to slow down. Which sentence do you use?',
        'Sema polepole tafadhali.',
        ['Sema polepole tafadhali.', 'Sema haraka tafadhali.', 'Unaweza kurudia?', 'Naelewa.'],
        'Polepole = slowly; sema = speak. Unaweza kurudia? asks for a repeat, not a slower pace.'
      ),
      BUILD(
        'Say “I speak a little Swahili”:',
        ['Nazungumza', 'Kiswahili', 'kidogo'],
        ['kidogo', 'Nazungumza', 'Kiswahili', 'Kiingereza'],
        'Nazungumza = I speak; kidogo = a little. Kidogo tu adds “just a little”.'
      ),
      MCQ(
        '“Unaweza kurudia?” asks…',
        'Can you repeat?',
        ['Can you repeat?', 'Can you help me?', 'Can you write it?', 'Can you speak English?'],
        'Kurudia = to repeat. Add tafadhali to keep it polite.'
      ),
    ],
  },

  'swahili-money': {
    id: 'swahili-money',
    title: 'Swahili Money & Bargaining',
    theory: [
      'Ask the price with Bei gani? or Bei yake ni ngapi? (How much is it?). Ghali = expensive, rahisi = cheap; Punguza bei = lower the price. Numbers: moja … kumi, elfu = thousand, mia = hundred.',
      'Money talk: standard Swahili is Una pesa? (do you have money?); in the market you will hear the colloquial Uko na pesa? Sina pesa = I have no money. Zimetosha = that’s enough (for things), and Bas! stops a negotiation.',
    ],
    questions: [
      MCQ(
        '“Bei yake ni ngapi?” asks…',
        'How much does it cost?',
        ['How much does it cost?', 'Where is it?', 'What is it?', 'Do you have it?'],
        'Bei = price, ngapi = how many / how much. Bei gani? asks the same thing.'
      ),
      BUILD(
        'Say “It is very expensive”:',
        ['Ni', 'ghali', 'sana'],
        ['ghali', 'Ni', 'sana', 'rahisi'],
        'Ni = it is, ghali = expensive, sana = very. Rahisi is the opposite: cheap.'
      ),
      MCQ(
        'You say “Punguza bei.” The seller understands…',
        'Lower the price',
        ['Lower the price', 'I will take it', 'It is cheap', 'No change'],
        'Punguza = reduce; bei = price. The friendly follow-up is “Punguza kidogo” — reduce it a little.'
      ),
      BUILD(
        'Say “I don’t have money”:',
        ['Sina', 'pesa'],
        ['pesa', 'Sina', 'Nina', 'bei'],
        'Sina = I don’t have; pesa = money. Uko na pesa? is the colloquial way a seller asks if you have any.'
      ),
      MCQ(
        '“Shilingi elfu tano” is…',
        '5,000 shillings',
        ['5,000 shillings', '500 shillings', '50 shillings', '5 shillings'],
        'Elfu = thousand, tano = five. Shilingi elfu tano = 5,000 shillings.'
      ),
    ],
  },
};
