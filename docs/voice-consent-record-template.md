# Cloned Voice Consent Record

> **Operator template.** Copy this file to your secure operations folder before
> filling it in. Never commit a completed record, speaker identity documents,
> signatures, or provider verification screenshots to this repository.
>
> This record documents consent for a cloned voice. It is not a substitute for a
> signed agreement or legal review. Check the current provider terms and the law
> in the speaker's market before deploying the voice.

## Machine-readable companion

The `audio:preflight` consent gate reads JSON, not this Markdown file. Create a
companion `voice-consent.json` next to the signed record, outside this
repository, and pass its path with `--consent` or `TTS_CONSENT_RECORD`.

| Field | Required | Value |
| --- | --- | --- |
| `templateVersion` | Yes | `2026-10-30` |
| `recordId` | Yes | The Record ID from the summary below |
| `status` | Yes | `Active` |
| `completed` | Yes | `true` only after sections 1–8 are complete |
| `provider` | Yes | `ElevenLabs` |
| `voiceId` | Yes | The deployed voice ID |
| `workspaceId` | Yes | The provider workspace that owns the voice |
| `voiceType` | Yes | A clone type, e.g. `Professional Voice Clone` |
| `speaker` | Yes | Speaker's legal name (not printed by the preflight) |
| `signedOn` | Yes | Speaker signature date, `YYYY-MM-DD` |
| `reviewDueOn` | No | Review/renewal date, `YYYY-MM-DD`; a past date fails |
| `approvedBy` | Yes | Operator who approved the deployment |
| `approvedOn` | Yes | Approval date, `YYYY-MM-DD` |

The preflight checks the record against the live voice and workspace and rejects
a Draft, Suspended or Revoked record, an incomplete record, a past review date,
and a record for another voice or workspace. The full example and commands are
in [audiobook-voice.md](audiobook-voice.md#cloned-voice-consent-record).

## Record summary

| Field | Value |
| --- | --- |
| Record ID | `VC-____` |
| Template version | `2026-10-30` |
| Record owner (operator) | |
| Created on | |
| Last reviewed on | |
| Status | `Draft` / `Signed` / `Active` / `Suspended` / `Revoked` |
| Project / surface | Bolingo Learn audiobook narration |
| Voice ID | |
| Deployment environment | `staging` / `production` / both |

## 1. Voice and provider

| Field | Value |
| --- | --- |
| Provider | ElevenLabs / other |
| Provider workspace ID | |
| Voice name | |
| Voice ID | |
| Voice type | Professional Voice Clone / Instant Voice Clone / Other |
| Clone created on | |
| TTS model ID(s) | e.g. `eleven_multilingual_v2` |
| Supported languages | |
| Narration use | Full mix / per-question segments / both |

Do not paste API keys, identity-document numbers, or full provider screenshots
into this record. Store those separately in the secure ops location named below.

## 2. Speaker and consent holder

| Field | Value |
| --- | --- |
| Speaker legal name | |
| Preferred name | |
| Contact for consent matters | |
| Country / jurisdiction | |
| Adult or minor | Adult / Minor |
| Guardian name (if minor) | |
| Guardian contact (if minor) | |
| Identity verification method | e.g. provider verification, witnessed signing |
| Secure location of verification | Path or ticket reference outside this repository |
| Source recordings used for cloning | Description and date range |
| Secure location of source recordings | Path or ticket reference outside this repository |

## 3. Permitted scope

Check every use the speaker has approved. Leave unchecked anything that was not
explicitly approved.

- [ ] Create and store a cloned synthetic voice from the speaker's recordings.
- [ ] Generate synthetic narration for Bolingo Learn lessons and audiobooks.
- [ ] Use the voice in the Bolingo Learn app, web player, and downloaded audio.
- [ ] Use the voice in Bolingo Learn marketing, app-store listings, and demos.
- [ ] Modify pacing, pronunciation, and mixing for lesson playback.
- [ ] Use the voice in the listed languages: ______________________________.
- [ ] Use the voice in the listed territories: _____________________________.
- [ ] Use the voice for the term described below.
- [ ] Compensation terms are recorded separately at: ______________________.

**Term:** `One year` / `Two years` / `Perpetual` / other: ____________________

**Start date:** ____________________  **Review / renewal date:** ______________

**Attribution required?** `No` / `Yes — wording:` ___________________________

## 4. Excluded and restricted uses

Record any use the speaker refused or limited. Write `None` if there are no
additional restrictions.

- Excluded topics or content:
- Excluded languages or territories:
- Excluded media or channels:
- Political, adult, medical, or endorsement restrictions:
- Other:

The voice must not be used to imply a real person's endorsement, impersonate a
public figure, or reproduce a third-party audiobook narrator.

## 5. Speaker attestations

The speaker or guardian must initial or sign each statement.

- [ ] I have read this record and understand that the cloned voice can say
      things I did not record.
- [ ] My consent is voluntary, informed, and given without coercion.
- [ ] I am the speaker, or I am the speaker's parent or legal guardian.
- [ ] I have the right to authorize cloning of this voice.
- [ ] I authorize use of the listed source recordings to create and maintain
      the clone.
- [ ] The recordings used for cloning do not include an unconsented third party.
- [ ] I approve the permitted scope, term, languages, and territories above.
- [ ] I understand how to withdraw consent and how stored audio will be handled.
- [ ] I completed the provider's own voice-cloning consent flow where required.
- [ ] I have received the compensation or attribution recorded for this use.

**Speaker / guardian initials:** ________  **Date:** ________________________

## 6. Provider consent verification

| Field | Value |
| --- | --- |
| Provider consent flow completed | `Yes` / `No` / not required |
| Verification reference or consent ID | |
| Verification date | |
| Verified by (operator) | |
| Secure location of provider proof | Path or ticket reference outside this repository |

For ElevenLabs Professional Voice Cloning, the speaker must complete the
provider's verified consent flow. A provider verification is necessary but does
not replace the speaker's written approval in this record.

## 7. Signatures

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| Speaker | | | |
| Parent / guardian (if minor) | | | |
| Operator / record owner | | | |
| Witness (if required) | | | |

## 8. Pre-deployment gate

Do not set or deploy `TTS_VOICE_ID` for this voice until every item is complete.
Record the date and operator for each check.

- [ ] This record is signed and its status is `Active`.
- [ ] The machine-readable JSON companion matches this record and is available
      to the preflight; it is stored outside this repository.
- [ ] The voice ID and provider workspace match the deployed key.
- [ ] The provider consent verification is complete and stored securely.
- [ ] `npm run audio:preflight` passes for this voice ID.
- [ ] The preflight output is recorded at: ______________________________.
- [ ] Full-mix and segment previews were listened to and approved.
- [ ] `TTS_VOICE_ID` is set in Supabase secrets for the intended environment.
- [ ] The revocation contact and audio-deletion plan are recorded.
- [ ] The completed record is stored outside this repository.

**Deployment approved by:** ____________________  **Date:** ________________

**Environment(s):** ___________________________  **Voice ID:** ____________

## 9. Suspension, revocation, and renewal

When consent is withdrawn or the term ends, stop new generation immediately:
remove the voice from the provider, clear or replace `TTS_VOICE_ID`, and delete
stored full-mix and segment MP3s that used it. Rotating the voice ID alone does
not remove old audio.

| Event | Date | Requested by | Actions taken | Operator |
| --- | --- | --- | --- | --- |
| Suspended | | | | |
| Revoked | | | | |
| Renewed | | | | |

**Revocation contact:** _______________________________________________

**Audio deletion completed on:** ______________________________________

## Change log

| Date | Change | Operator |
| --- | --- | --- |
| | Template completed | |
| | | |
