# kk_v1

Short, focused README template for the kk_v1 project.

## Overview
Kuteera Kitchen v1 is a full‑stack app for daily menu setup, kitchen production planning, and order tracking. It serves small kitchens/cloud kitchens that need a clean workflow from menu → production → orders.

## Features
- Daily menu creation & publish (Breakfast/Lunch/Dinner)
- Kitchen production planning with category-wise tracking
- Orders management and basic analytics

## Project structure
Replace or adapt to match the actual repository contents.
```
kk_v1/
├── README.md
├── frontend/        # Next.js (TypeScript)
├── backend/         # FastAPI (Python)
├── docs/            # design docs, architecture, usage notes
├── scripts/         # helper scripts (build, dev, etc.)
├── .gitignore
├── LICENSE
└── docker-compose.yml (optional)
```

## Requirements
- Node >= 18
- Python >= 3.10
- MySQL >= 8 (local or Docker)
- Docker (optional)
- pnpm (optional; or use npm/yarn)

## Setup / Install

### Frontend (Next.js)
```bash
cd frontend
pnpm i                       # or: npm install / yarn
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE=http://localhost:8000/api
pnpm dev                     # or: npm run dev
```

### Backend (FastAPI, venv)
```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env         # fill DB_*, CORS_ORIGINS
uvicorn app.main:app --reload --port 8000
```

### Database (MySQL quickstart)
```sql
CREATE DATABASE kuteera CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kk_user'@'%' IDENTIFIED BY 'kk_password';
GRANT ALL PRIVILEGES ON kuteera.* TO 'kk_user'@'%';
FLUSH PRIVILEGES;
```

## Running
Local dev (two terminals):

```bash
# Terminal 1 - backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 - frontend
cd frontend
pnpm dev   # or npm run dev
```

Open:
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

## Tests
```bash
# frontend
pnpm test           # or npm test

# backend
pytest -q
```

## Contributing
- Create a feature branch from `develop`
- Keep changes scoped to a single concern
- Open an MR with description, test notes, and screenshots where relevant

## License
MIT (or update to your preferred license) — ensure a LICENSE file exists.

## Notes
- Update environment variables (frontend `.env.local`, backend `.env`) as needed.
- Keep data fetching, filtering, and UI rendering separate. Maintain existing structure, naming, and formatting.
