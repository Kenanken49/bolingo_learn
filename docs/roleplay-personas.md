# Multilingual Roleplay personas

Roleplay is the app's open-ended conversation mode. Livia and Bingo now teach
Spanish, French and German as **personas**, not as cosmetic skins on one
prompt: they correct differently, ask differently, and keep different energy.

## Cast

| Persona | Role | Teaching method |
| --- | --- | --- |
| **Livia** | Patient conversation mentor | Notices effort first, recasts one mistake at a time, invites a full sentence, offers two options when the learner freezes. |
| **Bingo** | Playful conversation partner | Turns each turn into a tiny game or challenge, celebrates attempts, keeps the pace quick and the stakes low. |

Every pairing has its own opening line and three starter replies in
[lib/roleplayPersonas.ts](../lib/roleplayPersonas.ts). The picker shows the
opening in the target language with its English gloss, so the learner knows
what they are walking into before the chat starts.

## Languages

| Picker | Target language | Default address | Focus |
| --- | --- | --- | --- |
| ES · Español | Spanish | `tú` (`usted` if the learner uses it first) | greetings, introductions, cafés, directions, weekend plans |
| FR · Français | French | `tu` (`vous` if the learner uses it first) | greetings, introductions, politeness, cafés, directions |
| DE · Deutsch | German | `du` (`Sie` if the learner uses it first) | greetings, introductions, ordering, shopping, daily plans |

The prompt keeps the learner at CEFR A1–A2: present tense, high-frequency
words, one idea per sentence, at most one new structure per turn. If the
learner writes English, the tutor answers the meaning but keeps the target line
in the language being practised.

## The reply contract

The Edge Function asks the model for three lines:

```text
TARGET: <reply entirely in the target language>
ENGLISH: <natural English translation>
TIP: <one short coaching note, or none>
```

The parser in
[supabase/functions/_shared/roleplayPersonas.ts](../supabase/functions/_shared/roleplayPersonas.ts)
returns:

```json
{
  "reply": "Hola. ¿Cómo estás?",
  "translation": "Hello. How are you?",
  "tip": "Use “tú” with a friend.",
  "via": "primary"
}
```

`translation` and `tip` are optional in the client. If the model ignores the
format, the raw answer is still shown as the tutor's reply rather than being
replaced with an error; the gloss and tip are simply omitted. `TIP: none` is
dropped on the server.

The client renders the target line as the chat bubble, the English gloss under
a divider, and the coaching note as a small note. The **Hear Livia / Hear
Bingo** button uses the existing `speakAs()` path with the matching Spanish,
French or German locale, so the target line is read in the installed native
voice and in the right character's pacing. The English gloss is never fed to
the target-language voice.

## API shape

Language mode sends both ids; the server rejects a missing or unsupported pair
before spending an LLM call:

```json
{
  "personaId": "livia",
  "languageId": "spanish",
  "history": [
    { "role": "assistant", "content": "Hola, soy Livia…" },
    { "role": "user", "content": "Me llamo Ana." }
  ]
}
```

The old code/career scenarios still send `scenarioId` and return `{ reply }` as
before. The server never accepts a client-supplied system prompt or an
arbitrary language name, so the persona and language whitelist is authoritative.

## Editing and deploying

- Picker copy, opening lines and starters: [lib/roleplayPersonas.ts](../lib/roleplayPersonas.ts).
- Teaching method, language rules, output format and parser: [supabase/functions/_shared/roleplayPersonas.ts](../supabase/functions/_shared/roleplayPersonas.ts).
- Persona ids and language ids must stay identical in both files. The chat UI iterates the catalogs, so adding a fourth language or a third persona without a server prompt is caught by the guard instead of producing a broken session.
- Deploy after changing the prompt or parser:

  ```bash
  supabase functions deploy roleplay-chat
  ```

- No database migration is needed. Roleplay stays stateless: the client sends
  the recent turns (last 20, 2,000 characters per turn) and the server does not
  persist the transcript.

## Premium and privacy

Roleplay remains a Premium feature. The UI gate and the server-side 402 check
are unchanged. The spoken line uses on-device text-to-speech; chat text goes to
the configured LLM only for the current turn. The app does not record the
microphone or score pronunciation in Roleplay — **Say it back** in language
lessons is the separate pronunciation path.

## Checks

```bash
npm run check:roleplay   # catalog, prompt, parser and wiring
npm test                 # includes check:roleplay
```

The guard proves both catalogs cover all six Livia/Bingo × ES/FR/DE pairings,
every opener and starter is unique and non-empty, unsupported pairs are
rejected, the prompt keeps its level/one-question/safety rules, and the
screen and Edge Function still use the shared contract.
