# abc-doctor-mobile

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
