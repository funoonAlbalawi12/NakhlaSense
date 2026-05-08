# Backend

This project now uses Firestore as its backend for:

- `users`: user profile documents with `role`
- `zones`: zone polygons and assignment metadata
- `alerts`: system alerts and status workflow
- `telemetry`: periodic monitoring snapshots from the dashboard
- `analyses`: crop health image-analysis records
- `recommendations`: action library for abnormal conditions
- `activity_logs`: audit trail for admin review

## RBAC model

- `admin`
  - read/write `zones`
  - read/write `alerts`
  - read/write `telemetry`
  - read/write `analyses`
  - read/write `recommendations`
  - read all `users`
- `operator`
  - read `zones`
  - read `alerts`
  - create `alerts`
  - create `telemetry`
  - create `analyses`
  - read own `user` profile
- `farmer`
  - read `zones`
  - read `alerts`
  - read `analyses`
  - read own `user` profile

The Firestore security contract is defined in [firestore.rules](/c:/Users/funoo/Desktop/NakhlaSense/firestore.rules).

## Important requirement

Firestore RBAC depends on a profile document existing at:

`users/{firebaseAuthUid}`

The app now creates that document automatically for authenticated Firebase users in:

- [src/firebase/services/userProfileService.js](/c:/Users/funoo/Desktop/NakhlaSense/src/firebase/services/userProfileService.js)
- [src/contexts/AuthContext.js](/c:/Users/funoo/Desktop/NakhlaSense/src/contexts/AuthContext.js)

Default role for a new Firebase-authenticated user is `operator`. Promote admins by changing the `role` field in Firestore.

## Deploy rules

If you use Firebase CLI, deploy the rules with:

```bash
firebase deploy --only firestore:rules
```

## Frontend integration

Firestore-backed services live in:

- [src/firebase/services/alertsService.js](/c:/Users/funoo/Desktop/NakhlaSense/src/firebase/services/alertsService.js)
- [src/firebase/services/zonesService.js](/c:/Users/funoo/Desktop/NakhlaSense/src/firebase/services/zonesService.js)
- [src/firebase/services/telemetryService.js](/c:/Users/funoo/Desktop/NakhlaSense/src/firebase/services/telemetryService.js)

For local demo logins (`loginDev`), these services fall back to `localStorage` so the app still runs without Firebase Auth.
