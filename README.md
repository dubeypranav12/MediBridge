# MediBridge (React)

React + Vite version of the MediBridge project. Layout, CSS and behaviour are the same as the original
HTML/CSS/JS version, with a new **medical documents** feature.

## Run
    npm install
    npm run dev        # open the URL shown (usually http://localhost:5173)
    npm run build      # production build in /dist

## Demo accounts (password demo1234)
- Patient: patient@demo.test
- Doctor:  doctor@demo.test

## New: documents
- Patient dashboard -> "My medical documents": asked to upload a **medical history** document (required
  reminder shown until done), plus lab reports, prescriptions, scans, insurance, ID, etc.
  PDF / JPG / PNG / Word / text, up to 1.5 MB each. View, download and delete your own files.
- Doctor dashboard -> "Patient documents": every patient's files, filter by patient / type / search,
  view and download (read-only).

Data is kept in the browser's localStorage (same as the original demo), so use the same browser
to see a patient's upload from the doctor account. A real deployment would need a backend + file storage.

## Structure
- src/App.jsx - hash router (same #/routes as before)
- src/pages/ - Home, Login, Register, Finder, Request, Tracking, Patient, Doctor
- src/components/ - AppShell (header/sidebar/modal/toast), Documents (new), ui
- src/lib/ - store (localStorage + live updates), data (hospitals, seed), documents (file helpers)
- src/index.css - original style.css + a small block for the documents UI
