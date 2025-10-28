# Masterprompt Geschiedenis — Het Vreemde Verleden

## Voor geschiedenisdocenten

Korte inleiding voor geschiedenisdocenten: deze tool genereert een panklare les met echte bronnen rond presentisme en historisch redeneren. Je krijgt na je keuze een complete opdracht in de stijl van Het Vreemde Verleden, inclusief docenteninstructie (WAT–HOE–WAAROM), leerlingenteksten, bronvragen, tabellen en reflectie. Feedback is welkom via HIER STOPT HET HELAAS

## Hoe het werkt

Deze applicatie genereert in twee stappen een complete geschiedenisles die leerlingen van een presentistisch startpunt naar historisch redeneren brengt. In Stap 1 kies je uit vijf voorstellen met elk een hoofdvraag in duidelijke leerlingentaal die bewust de bril van nu opzet. In Stap 2 bouwt de app een kant-en-klare les: docent- én leerlingversie, acht echte bronnen (voornamelijk primair), analysevragen, antwoordmodel en een selecteerbare oorzakenlijst boven de tabel. Leerlingen kiezen max. drie oorzaken, verzamelen bewijs uit bronnen uit verschillende dimensies (politiek, economisch, sociaal-cultureel, religie/ideologisch, emotie/propaganda, juridisch/fiscaal), vullen de tabel en herpositioneren hun oordeel in een thema-specifiek 2×2-kwadrant. Zo leren ze contextualiseren: begrijpen hoe en waarom mensen toen anders dachten en handelden. De les eindigt met het herformuleren van de hoofdvraag met de bril van toen en een korte discussie waarin begrijpen ≠ goedkeuren centraal staat. Output is schoon Markdown, direct bruikbaar voor Canvas of print.

## Live Website

🌐 **Frontend**: https://prompt-to-lesson-ck1.web.app  
🔧 **Backend API**: https://masterprompt-backend-4dovp45gha-ez.a.run.app

## Lokale Ontwikkeling

### Vereisten
- Node.js 22+
- GCP account met Vertex AI toegang
- gcloud CLI geïnstalleerd en ingelogd

### Setup
```bash
# Clone repository
git clone <repository-url>
cd Masterprompt-geschiedenis

# Installeer dependencies
npm install

# Kopieer en vul .env bestand
cp .env.example .env
# Vul GCP_PROJECT_ID en andere variabelen in

# Authenticatie
gcloud auth application-default login
gcloud config set project <your-project-id>
```

### Server starten
```bash
# Start lokale server
scripts/server-control.sh start

# Test API
./test-api.sh

# Rooktests
bash scripts/test-local.sh
```

### Deployment
```bash
# Deploy naar Cloud Run
scripts/deploy.sh
```

## API Endpoints

- `GET /health` - Server status
- `GET /api/masterprompt` - Masterprompt instructies
- `POST /api/suggest` - Genereer 5 lesvoorstellen
- `POST /api/generate` - Genereer complete les
- `GET /api/tijdvakken` - Beschikbare tijdvakken

## Technische Stack

- **Backend**: Node.js + Express + Vertex AI (Gemini)
- **Frontend**: React/Vue (Firebase Hosting)
- **Infrastructure**: Google Cloud Run + Firebase
- **AI Models**: Gemini 1.5 Flash (suggest) + Gemini 1.5 Pro (generate)

## Didactische Aanpak

Gebaseerd op Tim Huijgen's "Het Vreemde Verleden" methodiek:
- Anti-presentisme door contextualisering
- Van presentistische startvraag naar historisch begrip
- Multiperspectiviteit via verschillende dimensies
- Begrijpen ≠ goedkeuren principe

## Licentie

Privé project voor educatief gebruik.
