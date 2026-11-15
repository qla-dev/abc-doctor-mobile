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

Playwright checks on 2026-11-15 covered the Expo browser UI against the production API:
invalid/valid login, refresh persistence, workflow preferences and selection, encounter and
feedback display, logout/token revocation, and admin-triggered session revocation. The admin
login and case editor were also checked visually. Voice conversation was not verified: the
production OpenAI key returned an expired-key response. Expo voice currently uses native
WebRTC modules and requires a development build; the Laravel admin preview uses browser WebRTC.

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
