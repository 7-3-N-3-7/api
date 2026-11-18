#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

echo "============================================================"
echo " Vipps MobilePay Production Setup - 73N37 (CVR 46688244)"
echo " API endpoint : https://api.vipps.no"
echo " Secrets target: $ENV_FILE (sikret med chmod 600)"
echo " Ingen hemmeligheder udskrives i terminal eller logs."
echo "============================================================"
echo ""

if [ ! -f "$ENV_FILE" ]; then
  touch "$ENV_FILE"
fi

read -rp "1) Indtast Merchant Serial Number (MSN) fra portal.vippsmobilepay.com: " INPUT_MSN
if [ -z "$INPUT_MSN" ]; then
  echo "FEJL: Merchant Serial Number (MSN) må ikke være tom."
  exit 1
fi

read -rp "2) Indtast offentlig HTTPS base-URL til callback [https://73n37.dk]: " INPUT_PUBLIC_URL
INPUT_PUBLIC_URL="${INPUT_PUBLIC_URL:-https://73n37.dk}"

read -rp "3) Klinik / Default Payout IBAN [DK5000400440116243]: " INPUT_CLINIC_IBAN
INPUT_CLINIC_IBAN="${INPUT_CLINIC_IBAN:-DK5000400440116243}"

read -rp "4) Therapist-adgang Payout IBAN (4 DKK/md) [DK8130000012345678]: " INPUT_THERAPIST_IBAN
INPUT_THERAPIST_IBAN="${INPUT_THERAPIST_IBAN:-DK8130000012345678}"

read -rp "5) Management-adgang Payout IBAN (5 DKK/md) [DK9230000087654321]: " INPUT_MGMT_IBAN
INPUT_MGMT_IBAN="${INPUT_MGMT_IBAN:-DK9230000087654321}"

read -rsp "6) Indtast VIPPS_CLIENT_ID (skjult input): " INPUT_CLIENT_ID
echo ""
read -rsp "7) Indtast VIPPS_CLIENT_SECRET (skjult input): " INPUT_CLIENT_SECRET
echo ""
read -rsp "8) Indtast VIPPS_SUBSCRIPTION_KEY (Ocp-Apim-Subscription-Key, skjult input): " INPUT_SUB_KEY
echo ""

if [ -z "$INPUT_CLIENT_ID" ] || [ -z "$INPUT_CLIENT_SECRET" ] || [ -z "$INPUT_SUB_KEY" ]; then
  echo "FEJL: client_id, client_secret og subscription_key skal alle udfyldes."
  exit 1
fi

export INPUT_MSN INPUT_PUBLIC_URL INPUT_CLINIC_IBAN INPUT_THERAPIST_IBAN INPUT_MGMT_IBAN
export INPUT_CLIENT_ID INPUT_CLIENT_SECRET INPUT_SUB_KEY ENV_FILE

python3 - <<'PY'
import os
from pathlib import Path

env_path = Path(os.environ["ENV_FILE"])
lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []

updates = {
    "VIPPS_API_BASE_URL": "https://api.vipps.no",
    "VIPPS_MERCHANT_NAME": "73N37",
    "VIPPS_MERCHANT_CVR": "46688244",
    "VIPPS_PUBLIC_BASE_URL": os.environ["INPUT_PUBLIC_URL"].strip().rstrip("/"),
    "VIPPS_MERCHANT_SERIAL_NUMBER": os.environ["INPUT_MSN"].strip(),
    "VIPPS_CLINIC_DEFAULT_MSN": os.environ["INPUT_MSN"].strip(),
    "VIPPS_THERAPIST_VIPPS_MSN": os.environ["INPUT_MSN"].strip(),
    "VIPPS_MANAGEMENT_VIPPS_MSN": os.environ["INPUT_MSN"].strip(),
    "VIPPS_CLINIC_DEFAULT_IBAN": os.environ["INPUT_CLINIC_IBAN"].strip(),
    "VIPPS_THERAPIST_PAYOUT_IBAN": os.environ["INPUT_THERAPIST_IBAN"].strip(),
    "VIPPS_MANAGEMENT_PAYOUT_IBAN": os.environ["INPUT_MGMT_IBAN"].strip(),
    "VIPPS_CLIENT_ID": os.environ["INPUT_CLIENT_ID"].strip(),
    "VIPPS_CLIENT_SECRET": os.environ["INPUT_CLIENT_SECRET"].strip(),
    "VIPPS_SUBSCRIPTION_KEY": os.environ["INPUT_SUB_KEY"].strip(),
    "VIPPS_REMOTE_ENABLED": "true",
}

seen = set()
new_lines = []
for line in lines:
    stripped = line.strip()
    if stripped and not stripped.startswith("#") and "=" in line:
        key = line.split("=", 1)[0].strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}")
            seen.add(key)
            continue
    new_lines.append(line)

for key, val in updates.items():
    if key not in seen:
        new_lines.append(f"{key}={val}")

env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
PY

chmod 600 "$ENV_FILE"
echo "[OK] .env opdateret med Vipps MobilePay Production-hemmeligheder (chmod 600)."

echo "[..] Tester direkte forbindelse mod https://api.vipps.no/accesstoken/get ..."
HTTP_CODE="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "https://api.vipps.no/accesstoken/get" \
  -H "client_id: ${INPUT_CLIENT_ID}" \
  -H "client_secret: ${INPUT_CLIENT_SECRET}" \
  -H "Ocp-Apim-Subscription-Key: ${INPUT_SUB_KEY}" \
  -H "Merchant-Serial-Number: ${INPUT_MSN}" \
  -H "Vipps-System-Name: EduJournal-73N37" \
  -H "Vipps-System-Version: 1.0.0" \
  -H "Vipps-System-Plugin-Name: com.platform.killbill.vipps-mobilepay-plugin" \
  -H "Vipps-System-Plugin-Version: 1.0.0" || echo "000")"

echo "[INFO] Vipps /accesstoken/get HTTP-status: $HTTP_CODE"
if [ "$HTTP_CODE" != "200" ]; then
  echo "[ADVARSEL] Forventede HTTP 200 fra Vipps Production. Kontrollér API-nøgler og MSN i portal.vippsmobilepay.com."
else
  echo "[OK] Vipps Production Access Token godkendt!"
fi

echo "[..] Genstarter backend med opdaterede Docker Secrets..."
(cd "$ROOT_DIR" && docker compose up -d backend)

echo ""
echo "Færdig! Backend bruger nu live Vipps MobilePay for 73N37 (CVR 46688244)."
