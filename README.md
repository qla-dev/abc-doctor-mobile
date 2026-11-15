# abc-doctor-mobile

## Browser preview against production

The doctor-facing app is this Expo project. Laravel hosts the API and admin panel.

```sh
npm ci
EXPO_PUBLIC_API_BACKEND=production npm run web -- --port 8088
```

Open `http://localhost:8088`, sign in, then select **MarkAI → Voice practice**.
Enable the workflows you want and choose **Start workflow** or **Surprise me**.
**Settings → Sign out** revokes the current token. Browser tokens use tab-scoped session
storage and survive refresh; native tokens use SecureStore.

Administrators sign in at `https://qla.dev/abc/backend/public/admin`. Use **Users → New user**
to create a doctor account with **Administrator** switched off. Set a password of at least
12 characters. There is no public signup. **Revoke mobile sessions** signs that user's app
sessions out on their next API request.

The production examples contain three workflows and nine cases. In the admin panel,
**Workflows** defines shared stages and assessment expectations; **Scenario Cases** defines
the patient story, visible facts, information to discover, and hidden clinical explanation.
Save edits, use **Review with AI**, and **Publish saved draft** when ready. Existing attempts
keep their original case snapshot.

## Conversation modes

Settings and conversation controls share one remembered mode per signed-in user on this device/browser.
The selection applies to new and reopened conversations; it does not replace their saved case or history.
High-quality voice uses OpenAI Realtime. Low-quality voice, Speak → read, Type → hear, and Type → read
use backend/OpenRouter replies, with device/browser recognition and synthesis where selected.
Dictaphone requires speech input. Tihi sufler always returns text, including in OpenAI mode.

Native apps need a new development/release build for `expo-speech-recognition` and its permissions.
Web uses browser WebRTC, Web Speech recognition and speech synthesis. Availability and languages depend
on the browser/platform; recognition may use platform network services. Missing voices/permissions are
reported without switching providers. Replies remain readable when playback fails.

Completed transcripts and backend turns enter a user-scoped persistent outbox before upload. Stable IDs
make retry safe after a lost response. Reopening flushes pending turns before loading history. Backend
input and reply commit atomically under a conversation lock, so a retry returns the original pair.
Mode changes drain an active call before switching engines. Backgrounding stops audio; reopening starts
idle and requires an explicit microphone tap. Speech interrupted before a final transcript cannot be recovered.
Typed drafts survive reload. Preferences do not synchronize between devices.

Browser verification (2026-11-16), using a temporary SQLite database and real OpenRouter replies:
- Visually inspected phone-width catalogue/chat and desktop layout; mode controls, speech-only composer,
  visible error messages and retry controls.
- Real text messages, remembered mode after reload, and lost HTTP response recovery without duplicated turns.
- Started/stopped browser recognition; injected final recognition events to verify both STT modes through
  the real backend. This validates integration, not recognition accuracy.
- Type → hear and low-quality voice reach device TTS; this Chromium installation has no speech voices,
  so verified the bounded failure message and retained written replies. Audible output remains unverified.
- OpenAI Realtime connection/reconnect is blocked by the configured expired API key. Live high-quality
  audio still needs verification after rotating that key. Native microphone/playback need device checks.

## Patient simulation and voice continuity

The backend saves a complete patient case when a conversation is created. The app renders
`conversation.patient`; it must never generate replacement clinical facts locally. Setup choices
are sent as `case_setup` when starting the conversation.

Live calls restore the backend's saved user and assistant messages before enabling the microphone.
Only an empty conversation whose skill opens the conversation sends `response.create`. Closing a
call flushes completed transcripts, and starting another call waits for their uploads. Transcript
item IDs make upload retries idempotent.

Deploy the backend's `2026_11_15_000001_add_patient_case_to_conversations` migration and API changes
before shipping this client. Older conversations retain their dialogue but have no saved clinical
dossier; they display no newly invented patient or test results.

## Checks

Use Node 22.18+ (or a current supported Node release):

```sh
npm ci
npm test
npm run typecheck
```

The tests exercise history restoration, initial greetings, failed restores, transcript ordering,
upload retries, microphone gating and call cancellation with a simulated WebRTC transport. A real
device call is still needed to evaluate audio quality and the live model's adherence to the case.
