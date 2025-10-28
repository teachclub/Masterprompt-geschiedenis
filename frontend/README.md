# Frontend (Vite + React + TypeScript)

## Frontend dev (mock)

Start lokaal met de mock-ready frontend:

1. Ga naar de frontend folder:
   cd frontend
2. Installeer dependencies:
   npm install
3. Kopieer .env.example naar .env.local (optioneel):
   cp .env.example .env.local
   - VITE_API_BASE: basis-URL van je API (default http://localhost:8080)
   - VITE_USE_MOCK=1 activeert lokale mock-responses in de API-helper.
4. Start de dev server:
   npm run dev
5. Open in host browser:
   "$BROWSER" http://localhost:5173
