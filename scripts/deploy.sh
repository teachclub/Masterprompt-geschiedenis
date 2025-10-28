#!/usr/bin/env bash
set -euo pipefail

# Deploy script voor Cloud Run
PROJECT_ID="prompt-to-lesson-ck1"
REGION="europe-west4"
SERVICE_NAME="masterprompt-backend"
REPO_NAME="masterprompt-repo"

log() { printf "• %s\n" "$*"; }
success() { printf "✅ %s\n" "$*"; }
error() { printf "❌ %s\n" "$*"; exit 1; }

# Controleer of gcloud ingelogd is
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 >/dev/null; then
  error "Niet ingelogd bij gcloud. Run: gcloud auth login"
fi

# Zet project
log "Project instellen: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

# Schakel benodigde services in
log "Services inschakelen..."
gcloud services enable run.googleapis.com \
  aiplatform.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com

# Maak Artifact Registry repository aan (als het nog niet bestaat)
log "Artifact Registry repository controleren..."
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" >/dev/null 2>&1; then
  log "Repository aanmaken: $REPO_NAME"
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Masterprompt backend images"
fi

# Bouw en push image
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:$TIMESTAMP"

log "Image bouwen en pushen: $IMAGE_TAG"
gcloud builds submit --tag "$IMAGE_TAG"

# Deploy naar Cloud Run
log "Deployen naar Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID,GEMINI_VERTEX_LOCATION=europe-west1,GEMINI_MODEL_SUGGEST=gemini-1.5-flash,GEMINI_MODEL_GENERATE=gemini-1.5-pro,ALLOWED_ORIGIN=https://$PROJECT_ID.web.app"

# Haal service URL op
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")

# Zet IAM rechten voor service account
log "IAM rechten instellen..."
SA=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(spec.template.spec.serviceAccountName)")
if [ -z "$SA" ]; then
  SA="$PROJECT_ID-compute@developer.gserviceaccount.com"
fi

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA" \
  --role="roles/aiplatform.user"

success "Deployment voltooid!"
echo "Service URL: $SERVICE_URL"
echo "Health check: curl -sS $SERVICE_URL/health | jq ."
echo ""
echo "Voor frontend deployment:"
echo "1. Zet API_BASE_URL naar: $SERVICE_URL"
echo "2. Deploy frontend naar Firebase: https://$PROJECT_ID.web.app"
echo "3. CORS is al ingesteld voor: https://$PROJECT_ID.web.app"
