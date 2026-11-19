/**
 * Course 13 · Applied Cryptography.
 *
 * Not a mathematics course: a decisions course. Every item asks which
 * primitive to use for a job, what it does and does not protect, and what the
 * most common real mistake looks like. Written as banks of CourseLesson so the
 * Path and the quiz engine treat it exactly like the other tracks.
 */

import { BUILD, MATCH, MCQ, TEXT, type CourseLesson } from '../quizBank';

export const TRACK_CRYPTO: Record<string, CourseLesson> = {
  'crypto-symmetric': {
    id: 'crypto-symmetric',
    title: 'Secrets at rest: cipher choice and key custody',
    theory: [
      'Encryption answers one question: can someone who reads the stored bytes learn the plaintext? It never answers the harder question, which is who held the key while the encryption ran. A vault is only as strong as the ring on the guard’s belt, and in software the guard is a configuration file, an environment variable, or a developer who pasted a key into a repository once in 2021.',
      'A modern symmetric cipher for stored data is an authenticated mode such as AES-GCM or ChaCha20-Poly1305. “Authenticated” means the ciphertext carries a tag that fails if a single bit changed, so an attacker cannot hand your program a mutated payload and watch what it does with it. A cipher without that tag is not merely older: it is a system that decrypts garbage and then trusts it.',
      'Reuse of a nonce or initialisation vector with the same key is the classic failure, and for some stream modes it is total: two ciphertexts under the same keystream can be combined to reveal both plaintexts. Generate a fresh random nonce per message, store it next to the ciphertext — it is not secret — and let the library handle it rather than inventing a counter.',
      'Key custody is the part that is actually hard. Keys belong in a secret store or KMS, never in the source tree; they are rotated on a schedule and on suspicion; and encrypted data at large scale is usually envelope-encrypted, where a per-record data key is wrapped by a master key that the application cannot export. If your backup file and your key file live in the same bucket, you have a folder with a label on it.',
    ],
    questions: [
      MCQ(
        'What does an authenticated cipher mode such as AES-GCM give you that a bare block cipher does not?',
        'A tag that fails decryption when the ciphertext was altered',
        [
          'A tag that fails decryption when the ciphertext was altered',
          'A faster key schedule for large files',
          'Freedom from needing a random nonce',
          'A way to decrypt without the key when data is corrupt',
        ],
        'Integrity is the point. Unauthenticated encryption is malleable, and a program that decrypts and then acts on attacker-modified bytes has a serious bug, whatever the cipher.'
      ),
      MCQ(
        'Why is reusing a nonce under the same key dangerous in a stream-based mode?',
        'The keystream repeats, and combining the two ciphertexts exposes the plaintexts',
        [
          'The keystream repeats, and combining the two ciphertexts exposes the plaintexts',
          'The tag becomes longer and storage grows',
          'It silently downgrades the cipher to ECB',
          'It only affects performance, not security',
        ],
        'This is the single most common implementation bug. Generate a fresh nonce per message and let it travel with the ciphertext.'
      ),
      MCQ(
        'What is envelope encryption?',
        'Each record is encrypted with a data key that a master key wraps',
        [
          'Each record is encrypted with a data key that a master key wraps',
          'Encrypting the file twice with two different algorithms',
          'Mailing the key to the operator separately from the data',
          'Storing the key inside the encrypted payload for recovery',
        ],
        'Rotation gets cheap: re-wrap the data keys, leave the ciphertexts alone. And the master key can live somewhere the application cannot export it.'
      ),
      MCQ(
        'Your encrypted export and its key are stored in the same object bucket. What have you built?',
        'An ordinary folder: the protection depends on bucket access, not on crypto',
        [
          'An ordinary folder: the protection depends on bucket access, not on crypto',
          'Defense in depth, because two controls exist',
          'A correctly rotated key arrangement',
          'A zero-knowledge store for that file',
        ],
        'Anyone who can read the bucket can read the data, so the real control is the bucket policy. Put the key where the data thief is not.'
      ),
      MATCH(
        'Pair each crypto asset with where it belongs',
        [
          { left: 'Master key', right: 'KMS or HSM, never exported to the app' },
          { left: 'Per-record nonce', right: 'Stored in plaintext beside the ciphertext' },
          { left: 'Session secret for signing', right: 'Secret store, rotated and versioned' },
          { left: 'Encrypted customer row', right: 'The database, where it is meant to be seen only decrypted' },
          { left: 'Public certificate', right: 'Anywhere, including the handshake in clear view' },
        ],
        'Nonces and certificates are not secrets and are fine in the open. Keys are secrets, and their location is the actual security design.'
      ),
      TEXT(
        'Which property does an authenticated mode add to confidentiality: the ability to detect that ciphertext was changed. Name it in one word.',
        ['integrity', 'authenticity', 'message authenticity'],
        'Confidentiality hides content; integrity or authenticity says nobody tampered with it. Authenticated encryption provides both, which is why it is the default choice.'
      ),
    ],
  },

  'crypto-hashing': {
    id: 'crypto-hashing',
    title: 'Hashing, MACs, and signatures: three jobs, three tools',
    theory: [
      'A hash is a fingerprint, not an encryption. It is one-way, deterministic, and tiny: change one input byte and the output changes completely. You use it when you need to compare or detect, never when you need to read the original later — which is why a checksum is the right tool for a download and the wrong tool for a document you must show again.',
      'A hash alone proves nothing about who produced a message, because anyone can compute the same hash. A message authentication code, HMAC or the tag from an authenticated cipher, is a keyed check: only someone holding the key can produce a value that verifies. Use it for cookies, webhooks, API request signing, and any token that must not be editable by its holder.',
      'A digital signature differs in the key model: the signer holds a private key and any number of verifiers hold the matching public key. That gives you non-repudiation — a third party can be shown the proof without being given the ability to forge it — which a MAC cannot, because everyone who verifies a MAC can also create one.',
      'Pick by who must check it and who must not be able to produce it. One service both creates and verifies: MAC. Many verifiers, or proof to an outsider: signature. Nothing about secrecy of content: plain hash. Getting this wrong is common and quiet; the code works, the tests pass, and only an attacker reading the design document notices.',
    ],
    questions: [
      MCQ(
        'A webhook receiver must confirm the call really came from the sender. What does it need?',
        'A keyed MAC over the body, compared in constant time',
        [
          'A keyed MAC over the body, compared in constant time',
          'A plain SHA-256 of the body, which anyone can compute',
          'The sender public IP address on a shortlist',
          'A random nonce stored on the receiver side',
        ],
        'The hash detects accidents, the MAC detects an adversary. Compare with a constant-time function, and include a timestamp so a captured signature cannot be replayed forever.'
      ),
      MCQ(
        'What can a signature provide that a HMAC cannot?',
        'Proof to a third party who holds only the public key',
        [
          'Proof to a third party who holds only the public key',
          'Faster verification on many small messages',
          'Confidentiality of the signed content',
          'Immunity to a leaked private key',
        ],
        'Everyone who can verify a MAC can also forge one, since they hold the same secret. Asymmetric keys split those abilities, and that split is the whole point.'
      ),
      MCQ(
        'A team stores document images and wants to detect silent corruption. Which primitive fits?',
        'A content hash stored beside each object',
        [
          'A content hash stored beside each object',
          'A symmetric cipher with a rotating key',
          'A digital signature from the upload service',
          'A random identifier generated at upload time',
        ],
        'Detecting change with no secrecy requirement and no need to recover content: a hash is exactly that tool, and it verifies without a key.'
      ),
      BUILD(
        'Build the verification order for a signed request.',
        [
          'parse header',
          'recompute HMAC with shared secret',
          'constant-time compare',
          'check timestamp window',
        ],
        [
          'parse header',
          'recompute HMAC with shared secret',
          'constant-time compare',
          'check timestamp window',
          'decrypt body with private key',
          'hash the response instead',
          'skip compare when the header is present',
        ],
        'Recompute, compare in constant time, then bound the age of the request. A timing-leaky comparison and an unlimited replay window are the two ways correct code still gets broken.'
      ),
      MATCH(
        'Pair each job with the primitive built for it',
        [
          { left: 'Detect a corrupted download', right: 'Hash' },
          { left: 'Prove a cookie was not edited', right: 'HMAC or AEAD tag' },
          { left: 'Let any client verify an update', right: 'Digital signature' },
          { left: 'Read the value again later', right: 'Symmetric encryption' },
          { left: 'Compare passwords without storing them', right: 'Slow password hash' },
        ],
        'The last row previews the next lesson: password checking is its own job, with its own tool, and it is the place where people reach for the wrong row most often.'
      ),
    ],
  },

  'crypto-workshop-keys': {
    id: 'crypto-workshop-keys',
    title: 'Paper workshop: design the protection for four columns',
    theory: [
      'A study-report service stores four things it should not have been storing the way it does: a session token in a cookie that the client can edit, an exported report file that anyone with the URL can read, a learner email address that must be readable in the app, and the account passwords as plain SHA-256. Four columns, four different requirements, and the same mistake in all of them: one tool applied everywhere.',
      'Work the list in order of who must be able to read the result. The cookie needs a MAC and nothing else, because the server is the only reader. The report needs a capability in the URL — an unguessable random token — or an authenticated encryption of the path, because the reader is a browser that must not learn the rules. The email needs encryption with a keyed lookup, because the app shows it and the database must still find a row by it. Passwords need a slow hash with a per-user salt and nothing reversible.',
      'Write the decision down beside the column, in the migration file if nowhere else. Six months from now the next engineer will otherwise “simplify” the four cases back into one, and the fix will look like a regression they had no way to know about.',
    ],
    questions: [
      BUILD(
        'Order the four fixes from cheapest to most invasive.',
        ['sign cookie', 'token in report URL', 'encrypt email column', 'rehash passwords on next login'],
        [
          'sign cookie',
          'token in report URL',
          'encrypt email column',
          'rehash passwords on next login',
          'rotate the master key',
          'add a WAF rule',
        ],
        'A signature is a one-line change at write time. A URL token changes the sharing model. An encrypted column needs key custody and a lookup strategy. Password rehashing cannot happen until the user returns, so it takes months.'
      ),
      MCQ(
        'The cookie holds a serialized session object. What is the minimal correct fix?',
        'Keep the content but append a MAC the server verifies',
        [
          'Keep the content but append a MAC the server verifies',
          'Base64-encode the object so it is unreadable',
          'Shorten the expiry to one hour and change nothing else',
          'Store the cookie in local storage instead',
        ],
        'Encoding is not protection. The requirement is that the client cannot edit the value undetected, which is exactly what a keyed MAC gives.'
      ),
      MCQ(
        'Why is encrypting the email column not enough on its own?',
        'Lookups by email need a deterministic or keyed search value, which is its own design',
        [
          'Lookups by email need a deterministic or keyed search value, which is its own design',
          'Encryption always changes the length of an address',
          'Email addresses are public data and never need protection',
          'The column must instead be hashed with the same hash as the password',
        ],
        'You still need to find the row. Common patterns are a blind-index HMAC of the value plus an encrypted copy for display, which keeps search and secrecy separate.'
      ),
      TEXT(
        'Name the property a password hash must have that a file checksum deliberately does not.',
        ['slow', 'slow to compute', 'expensive', 'work factor', 'key stretching'],
        'A checksum wants speed because you compute millions. A password hash wants a high, tunable cost so an offline crack buys little per second — which is why bcrypt, scrypt and Argon2 exist.'
      ),
      MATCH(
        'Pair each column with the requirement that decides its tool',
        [
          { left: 'Session cookie', right: 'The client must not be able to edit it' },
          { left: 'Shared report URL', right: 'The reader has no account and no key' },
          { left: 'Email address', right: 'Must be displayed and also searchable' },
          { left: 'Password', right: 'Never needed in plaintext again' },
          { left: 'Export timestamp', right: 'Only tamper detection is required' },
        ],
        'Read the right column before choosing the primitive. Every bad decision in this area starts from a tool rather than from a requirement.'
      ),
    ],
  },

  'crypto-quiz-1': {
    id: 'crypto-quiz-1',
    title: 'Checkpoint: cipher choice and key custody',
    theory: [
      'This checkpoint covers authenticated encryption, nonces, where keys live, and the difference between hashing, MACs and signatures.',
      'Items restate the two lessons and the four-column workshop, including the ordering that made password rehashing the slowest fix.',
    ],
    questions: [
      MCQ(
        'Which choice best describes a modern default for data at rest?',
        'An authenticated cipher mode with a fresh nonce per record',
        [
          'An authenticated cipher mode with a fresh nonce per record',
          'A block cipher in raw ECB mode for speed',
          'A cryptographic hash of the plaintext',
          'A reversible obfuscation with an XOR key',
        ],
        'ECB leaks structure, a hash is not reversible, and XOR with a short key is a puzzle, not cryptography. Authenticated encryption with a fresh nonce is the baseline.'
      ),
      MCQ(
        'The application can export its own encryption key at runtime. What is true?',
        'Anyone with code execution or a source leak can decrypt the data',
        [
          'Anyone with code execution or a source leak can decrypt the data',
          'The data is still safe, because the key is never stored with it',
          'It only matters if the cipher is older than AES',
          'Rotating the key monthly removes the problem entirely',
        ],
        'A key the process can read is a key an attacker can read once they are the process. A KMS or HSM keeps the decryption operation away from export.'
      ),
      MCQ(
        'A learner asks you to recover their forgotten password. What is the correct answer?',
        'You cannot: offer a reset flow instead',
        [
          'You cannot: offer a reset flow instead',
          'Decrypt it with the application key',
          'Reverse the hash with a rainbow table lookup',
          'Ask the database for the stored plaintext copy',
        ],
        'A system that can answer that question is a system whose password store is also a plaintext store. Reset flow, verify identity, then write a new slow hash.'
      ),
      MATCH(
        'Pair each practice with the failure it prevents',
        [
          { left: 'Fresh nonce per message', right: 'Keystream reuse exposing both plaintexts' },
          { left: 'Authenticated mode', right: 'Acting on tampered ciphertext' },
          { left: 'Master key in a KMS', right: 'A source leak becoming a data leak' },
          { left: 'Constant-time compare', right: 'Timing oracle on a secret' },
          { left: 'Timestamp window on signed requests', right: 'Replaying a captured valid request' },
        ],
        'Each of these is cheap and each is a specific attack. Naming the attack is how you remember why the practice is not decoration.'
      ),
      TEXT(
        'Type the two-word name of the mode family that gives confidentiality and integrity in one operation.',
        ['authenticated encryption', 'AEAD'],
        'Authenticated encryption with associated data: one call, one key, and a ciphertext that refuses to decrypt when touched.'
      ),
      TEXT(
        'In the four-column workshop, which fix was ordered last and why?',
        ['rehash passwords on next login', 'password rehashing needs the user to return', 'because the user must log in again'],
        'Nothing about the stored hash can be improved until that person authenticates, so the migration stays open for months and the old rows remain the weak ones.'
      ),
    ],
  },

  'crypto-passwords': {
    id: 'crypto-passwords',
    title: 'Password storage, salts, and slow hashes',
    theory: [
      'Store a slow hash, never an encryption and never a fast digest. Argon2id, scrypt and bcrypt exist for this job: each has a tunable cost that makes one attempt expensive, so a stolen database buys an attacker work per guess instead of billions of guesses per second. SHA-256 of a password is a fast digest, and hardware that runs it at terahashes per second is ordinary.',
      'A salt is a unique random value per user, stored in plaintext beside the hash. It does not hide anything; it makes each row a separate attack, so one precomputed table cannot crack the whole table, and two users with the same password no longer share a hash. Never reuse a salt and never use the email address as one.',
      'A pepper is a secret mixed into the hash that lives outside the database, in configuration or a KMS. It means a database dump alone is not enough to start cracking. It costs you a key-management problem and a careful rotation plan, so treat it as a second layer, not as a substitute for a slow hash.',
      'The last line of defence is the rate limit and the lockout policy on the verification endpoint, plus not leaking which half failed. “User not found” and “wrong password” as different responses is an account enumeration oracle; verify against a dummy hash so the timing does not answer the question either.',
    ],
    questions: [
      MCQ(
        'Why is a per-user random salt necessary when the hash function is already slow?',
        'It makes every row a separate attack, defeating precomputed and shared work',
        [
          'It makes every row a separate attack, defeating precomputed and shared work',
          'It hides the password length inside the stored value',
          'It lets the hash be reversed for a legitimate login',
          'It removes the need to tune the cost parameter',
        ],
        'Slowness costs the attacker per guess. A salt costs them per user, so a table built for one victim is useless against the next.'
      ),
      MCQ(
        'What is the practical difference between a salt and a pepper?',
        'The salt is unique, public and stored with the hash; the pepper is a shared secret kept elsewhere',
        [
          'The salt is unique, public and stored with the hash; the pepper is a shared secret kept elsewhere',
          'They are two names for the same value',
          'The pepper is per-user and the salt is global',
          'A pepper is only used for tokens, never for passwords',
        ],
        'Salt stops tables and cross-user reuse. Pepper stops a database-only breach. Only the first is optional in practice; you need both to be safe in different ways.'
      ),
      MCQ(
        'The login endpoint answers “user not found” or “wrong password”. What did that buy an attacker?',
        'A list of which accounts exist, for targeted guessing',
        [
          'A list of which accounts exist, for targeted guessing',
          'Nothing, since no secret was revealed',
          'A timing side channel on the password itself',
          'A reason to add a second salt to the hash',
        ],
        'Enumeration is a real capability: it turns random guessing into guessing against known accounts. Answer identically and do the same work either way.'
      ),
      MATCH(
        'Pair each defence with what it stops',
        [
          { left: 'Argon2id with high cost', right: 'Fast offline cracking of one hash' },
          { left: 'Unique random salt', right: 'Rainbow tables and reuse across rows' },
          { left: 'Pepper in a KMS', right: 'A pure database dump being crackable' },
          { left: 'Rate limit plus lockout', right: 'Online guessing against the endpoint' },
          { left: 'Identical error responses', right: 'Account enumeration' },
        ],
        'These are five different attacks. A team that has only the first one has a hashing library, not a password system.'
      ),
      TEXT(
        'Name the hash family you would pick for new password storage today (one word).',
        ['argon2', 'argon2id', 'bcrypt', 'scrypt'],
        'Argon2id is the current default recommendation, memory-hard so that GPUs and ASICs lose their advantage. bcrypt and scrypt remain acceptable when a vetted library is the practical choice.'
      ),
      MCQ(
        'A legacy table stores MD5(password). What is the correct migration?',
        'Rehash on successful login, and keep the old path until rows stop being read',
        [
          'Rehash on successful login, and keep the old path until rows stop being read',
          'Rewrite every row now with Argon2 of the old hash',
          'Ask all users to choose a new password by email',
          'Encrypt the MD5 column so the digest cannot be read',
        ],
        'Only the login moment has the plaintext. Wrapping the weak hash in a strong one helps against a dump and is still not a substitute for rehashing, and forced resets burn trust you will need later.'
      ),
    ],
  },

  'crypto-tls': {
    id: 'crypto-tls',
    title: 'TLS, certificates, and trusting a key',
    theory: [
      'TLS solves a problem encryption alone cannot: which key belongs to this hostname? The handshake negotiates ephemeral keys so that a recording of the session does not decrypt later sessions, and it presents a certificate so the client can tell whether it is talking to the real host or to whoever is closest on the network.',
      'A certificate is a public key plus a name plus a signature from a certification authority, and trust is a chain that ends at a root your operating system already carries. The failure modes are operational rather than mathematical: an expired certificate, a chain missing the intermediate, a hostname that does not match, or a client that skips verification for a test server and never takes it back out.',
      'A certificate from a browser extension or a store cannot prove who issued a token to your own service — that is a different trust problem, solved by signing with a key only the issuer holds. Same for API keys in a URL query string: TLS protects them in transit, but they land in server logs, browser history and referrer headers, which is why the header is the correct home.',
      'The policy layer is HSTS: a header that tells a browser to refuse plain HTTP for your domain from now on, which closes the redirect window that a network attacker would otherwise use. Verify in staging with the same strictness as production, and monitor expiry the way you monitor disk space, because every team has been paged by one.',
    ],
    questions: [
      MCQ(
        'What does a certificate actually bind together?',
        'A public key and a name, under a signature from an issuer',
        [
          'A public key and a name, under a signature from an issuer',
          'A private key and the server disk it is stored on',
          'A session key and the client that requested it',
          'An IP address and a trust-on-first-use pin',
        ],
        'The interesting part is the signature: your system trusts the binding because a chain of trusted issuers vouched for it, not because the key looks right.'
      ),
      MCQ(
        'A teammate adds “ignore certificate errors” in a staging client. What is the real risk?',
        'That line ships, and every session through it becomes interceptable',
        [
          'That line ships, and every session through it becomes interceptable',
          'None, since staging holds no real data',
          'That the handshake will negotiate a weaker cipher',
          'That HSTS will refuse to load on staging',
        ],
        'Disabling verification is disabling the only thing TLS adds over raw encryption. Staging is where the flag gets written; production is where it survives the next refactor.'
      ),
      MCQ(
        'Why must an access token be signed rather than merely base64-encoded?',
        'The holder can edit an unsigned payload, and the server has no way to notice',
        [
          'The holder can edit an unsigned payload, and the server has no way to notice',
          'Encodings are slower to parse than signatures',
          'A signature also keeps the token contents secret from the holder',
          'So that the token can be shorter on the wire',
        ],
        'JWT payloads are readable by design. The signature is what stops a client changing “role”: “admin”. Confidentiality, if you need it, is a separate mechanism.'
      ),
      MATCH(
        'Pair each mechanism with the question it answers',
        [
          { left: 'Certificate chain', right: 'Is this the key for that hostname?' },
          { left: 'Ephemeral key exchange', right: 'Can a recording decrypt sessions later?' },
          { left: 'HSTS', right: 'Will the browser ever try plain HTTP here?' },
          { left: 'Token signature', right: 'Did the issuer approve these claims?' },
          { left: 'Certificate expiry', right: 'How long can a stolen key keep working?' },
        ],
        'Five questions, five mechanisms. A connection that “uses HTTPS” may answer none of them, which is why the checklist matters more than the padlock.'
      ),
      TEXT(
        'Expand the four letters of the header that makes a browser refuse plain HTTP for your domain.',
        ['HTTP Strict Transport Security', 'HSTS'],
        'Strict-Transport-Security, sent once over a trusted connection, and the browser stops offering the attacker an unencrypted first request.'
      ),
      MCQ(
        'Where should a long-lived API key go in a request?',
        'In a header, so it stays out of logs and history',
        [
          'In a header, so it stays out of logs and history',
          'In the query string, so it is cached with the URL',
          'Inside the request body only, never the transport',
          'In a cookie named for the service, for reuse',
        ],
        'URLs are copied into access logs, proxies, browser history and referrer headers. Query-string keys leak in four places your code does not control.'
      ),
    ],
  },

  'crypto-workshop-audit': {
    id: 'crypto-workshop-audit',
    title: 'Paper workshop: audit a login endpoint',
    theory: [
      'The endpoint under review accepts a POST with email and password, queries the user row, compares hashes with a plain string equality, returns 404 for an unknown email and 401 for a wrong password, and has no rate limit. It uses TLS, it uses Argon2, and it is still the weakest thing in the build — which is the lesson: correct primitives do not compose into a correct system.',
      'Work outside-in. First the transport and the headers, where the only finding is a missing HSTS entry. Then the response shape, where two status codes answer a question the attacker asked for free. Then the comparison, where a normal equality leaks bytes of the expected value through timing — irrelevant for a hash with a salt, decisive for a webhook signature, and the kind of thing you want fixed while the code is short.',
      'Then the limits, which belong at the edge and in the application, because an edge limiter that counts IP addresses punishes a school and a per-account lockout that counts nothing lets an attacker park on one account forever. Write the finding as a sentence with the attack in it, and the fix stops being debatable.',
    ],
    questions: [
      BUILD(
        'Order the audit from transport to policy.',
        ['check TLS config and HSTS', 'read status codes and error text', 'inspect the comparison code', 'review rate limits and lockout'],
        [
          'check TLS config and HSTS',
          'read status codes and error text',
          'inspect the comparison code',
          'review rate limits and lockout',
          'rotate the signing key',
          'rewrite the login form',
        ],
        'Outside-in keeps you honest: the cheapest and most visible layer first, where a missing header is a five-minute fix, down into the code where the arguments start.'
      ),
      MCQ(
        'The endpoint returns 404 for an unknown email and 401 for a wrong password. What is the fix?',
        'One response and one status for both cases, with comparable work done either way',
        [
          'One response and one status for both cases, with comparable work done either way',
          'Keep both codes but add a rate limit in front',
          'Return 200 with a flag so nothing is revealed',
          'Log the attempt and show a captcha on the second try',
        ],
        'The rate limit slows the enumeration, it does not remove it. Uniform response, and a dummy hash verification when the user is absent so the timing matches too.'
      ),
      MCQ(
        'A webhook signature is compared with the ordinary equality operator. Why is that worth changing?',
        'It returns on the first differing byte, so response times can reveal the expected value',
        [
          'It returns on the first differing byte, so response times can reveal the expected value',
          'It is slower than needed for large payloads',
          'It cannot compare values that contain a colon',
          'It will fail when the signature is base64 encoded',
        ],
        'Constant-time comparison exists for exactly this. The attack needs many measurements over a network, and remote timing is noisier than the papers assume — the fix costs one function call.'
      ),
      TEXT(
        'Write the two-word control that stops unlimited guesses against one account (one word, or two).',
        ['rate limit', 'rate limiting', 'lockout', 'throttling'],
        'Rate limiting at the edge and per-account throttling in the application, with a lockout that does not become a denial-of-service tool against your own users.'
      ),
      MATCH(
        'Pair each finding with the attack it enables',
        [
          { left: 'Missing HSTS', right: 'First request forced to plain HTTP' },
          { left: 'Two distinct status codes', right: 'Account enumeration' },
          { left: 'Ordinary equality on a secret', right: 'Timing measurement of the expected value' },
          { left: 'No limiter', right: 'Unlimited online guessing' },
          { left: 'Lockout by email only', right: 'Denial of service against a chosen account' },
        ],
        'The last row is the trap in the obvious fix: a lockout policy is also a weapon pointed at your own users unless it is paired with proof of ownership to clear it.'
      ),
    ],
  },

  'crypto-quiz-2': {
    id: 'crypto-quiz-2',
    title: 'Checkpoint: passwords, TLS, and trust',
    theory: [
      'This checkpoint covers password storage and its layers, certificates and what TLS really answers, and the login audit that put the pieces in order.',
      'Items restate the second unit and its workshop, including why the uniform error response mattered more than the extra rate limit.',
    ],
    questions: [
      MCQ(
        'A stored password hash includes a per-user salt. What does the salt protect against?',
        'One precomputation or one shared result breaking many accounts',
        [
          'One precomputation or one shared result breaking many accounts',
          'The attacker guessing a specific weak password',
          'The hash being reversed with enough memory',
          'An insider reading the plaintext password',
        ],
        'Slowness is what raises the cost of guessing a password; the salt is what stops that cost being amortised across the entire table.'
      ),
      MCQ(
        'What does TLS give a login POST on a site with no HSTS?',
        'Encryption for that request, but nothing stopping a first plain-HTTP visit',
        [
          'Encryption for that request, but nothing stopping a first plain-HTTP visit',
          'Assurance that every future visit is encrypted',
          'Protection against a forged certificate on that host',
          'A guarantee the credentials are never logged',
        ],
        'TLS protects the connection it is on. HSTS is the policy that removes the connection where it is not, and it must be fetched over a secured visit first.'
      ),
      MCQ(
        'The service signs its own session tokens with HMAC. Which decision follows from that?',
        'Only this service can verify them, which is a feature until you need a second verifier',
        [
          'Only this service can verify them, which is a feature until you need a second verifier',
          'Tokens cannot be validated without decrypting the payload',
          'Any partner with the public key can check a token',
          'The signature must be replaced by a certificate',
        ],
        'A shared-secret MAC is correct for one issuer and one verifier. The moment another service must validate independently, you need signatures and published keys.'
      ),
      MATCH(
        'Pair each stored value with its correct treatment',
        [
          { left: 'Password', right: 'Slow hash, unique salt, no recovery path' },
          { left: 'Reset token', right: 'Store a hash of it, with a short expiry' },
          { left: 'Credit card PAN', right: 'Tokenise, or encrypt under a KMS key and scope' },
          { left: 'Webhook body signature', right: 'Constant-time compare over the raw bytes' },
          { left: 'Email for display', right: 'Encrypt for reading, blind index for lookup' },
        ],
        'Note the second row: a reset token is a bearer secret, so a database dump must not hand out working links — which is why the token is stored as a digest.'
      ),
      TEXT(
        'In the audit, which layer was inspected first?',
        ['transport', 'the transport layer', 'TLS config', 'tls and headers'],
        'Outside-in: transport and headers first, then response shape, then comparison code, then limits. Cheapest fix, most visible, least argument.'
      ),
      MCQ(
        'A team wants to add a pepper to its password hashes. What must exist first?',
        'A key-management and rotation plan for a secret that outlives the code',
        [
          'A key-management and rotation plan for a secret that outlives the code',
          'A faster hash function to absorb the extra work',
          'A second salt column in the users table',
          'Nothing: a pepper is just an extra salt',
        ],
        'A pepper is a long-lived secret mixed into stored values. Without rotation and a plan for the day it is lost, it can turn into permanent rehashing instead of safety.'
      ),
    ],
  },

  'crypto-final': {
    id: 'crypto-final',
    title: 'Cryptography final exam: choose the primitive',
    theory: [
      'The final is a decision test. Each item states a requirement from a real feature and asks which primitive, mode, or key arrangement satisfies it, including the cases where the answer is that no cipher helps.',
      'Items restate all four lessons and both workshops. Where you hesitate, the explanation names the lesson to reopen.',
    ],
    questions: [
      MCQ('A background worker must read an encrypted report and the key sits in a KMS. What does the application hold?', 'Permission to ask the KMS to decrypt, and never the key itself', ['Permission to ask the KMS to decrypt, and never the key itself', 'The exported key, cached in memory for the process life', 'A copy of the key encrypted with the master key', 'Nothing: the KMS decrypts the whole bucket on a schedule'], 'That distinction is the design. A process that can request a decryption operation is not a process that owns a key, and the difference shows up the day someone reads its memory.'),
      MCQ('Which requirement cannot be met by any cipher?', 'Recovering a forgotten password', ['Recovering a forgotten password', 'Reading an encrypted column', 'Detecting a modified ciphertext', 'Rotating a data key'], 'That is the job of a hash, and hashes are not reversible by construction. Anything that promises recovery is storing a plaintext somewhere.'),
      MCQ('A signed download URL must stop working after an hour. What makes that true?', 'The expiry timestamp is inside the signed string', ['The expiry timestamp is inside the signed string', 'The server deletes the file after an hour', 'The token is encrypted with a short-lived key', 'The CDN caches the signature for sixty minutes'], 'A signature covers the bytes it is given. Put the deadline in those bytes and verification fails the moment it passes, with no cleanup job and no state.'),
      TEXT('Name the primitive pair behind TLS: a certificate chain and an ephemeral what?', ['key exchange', 'ephemeral key exchange', 'ECDHE', 'session key'], 'Ephemeral key exchange gives forward secrecy: the recorded session cannot be decrypted later, even if the certificate private key is compromised.'),
      MATCH('Pair each line of the audit with the layer it belongs to', [{ left: 'Strict-Transport-Security', right: 'Response headers' }, { left: 'One status code for both failures', right: 'Response shape' }, { left: 'constant-time equals', right: 'Comparison code' }, { left: 'Throttle by account and by edge', right: 'Limits and policy' }, { left: 'Per-user salt', right: 'Storage format' }], 'The audit is a checklist because crypto failures are usually layer mistakes: the right algorithm in the wrong place, or no control at all on the layer where the guessing happens.'),
      TEXT('In twelve words or fewer, state the rule for a nonce.', ['a fresh nonce for every message', 'never reuse a nonce with the same key'], 'Unique per key, generated randomly or as a strict counter, and stored beside the ciphertext in plaintext — it is not a secret, it is only required to be new.'),
      MCQ('A teammate proposes encrypting passwords instead of hashing them. What is the objection?', 'It makes a key leak a plaintext leak, which is the outcome we are avoiding', ['It makes a key leak a plaintext leak, which is the outcome we are avoiding', 'Encrypted values are too long for a password column', 'The app could not then verify a login without a database read', 'Hashing is slower than encryption for short strings'], 'Verification only ever needs “does this input match?” — no recovery, and that is what a slow hash gives you. Encryption adds a secret whose compromise is worse than the database dump.'),
    ],
  },
};
