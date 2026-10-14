# MediBridge frontend

Production-connected React/Vite client for the MediBridge Express API.

## Run locally

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

`.env` must contain:

```dotenv
VITE_API_URL=https://medibridge-3-icg4.onrender.com/api
```

The app deliberately fails to start or build when `VITE_API_URL` is missing. Set `VITE_API_BASE_URL` only when a deployed response-delay prediction service is available; otherwise that feature displays an unavailable state.

## Authentication and data

- The backend owns authentication in a Secure, SameSite=None, HttpOnly cookie.
- Every API request uses `credentials: "include"`.
- No token, user record, case, invoice, document, or draft is persisted in browser storage.
- Public registration creates patient accounts only. Doctor and driver accounts are administrator-provisioned.
- Hospital, fleet, case, document, appointment, and invoice records come from the Render API.

## Tracking modes

- **Live Tracking** reads a case from `#/tracking?case=CB-xxxx` and displays only persisted driver GPS. When GPS has not arrived it says **Waiting for driver live location**.
- **Presentation Simulation** is an isolated frontend-only animation at `#/presentation-tracking`. It makes no API calls and creates no cases, payments, or ambulance assignments.

## Production build

```powershell
$env:VITE_API_URL='https://medibridge-3-icg4.onrender.com/api'
npm run build
npm audit --omit=dev
```

For Vercel, set `VITE_API_URL` in the Preview and Production environments. Deploy the `frontend-integration` branch as a Preview and verify it before merging to `main`.
