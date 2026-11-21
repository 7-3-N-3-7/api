#!/usr/bin/env bash
set -euo pipefail

KCADM="/opt/keycloak/bin/kcadm.sh"
SERVER_URL="http://keycloak:8080/auth"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM="EduJournal"

echo "[keycloak-init] Authenticating kcadm against ${SERVER_URL}..."
"$KCADM" config credentials \
  --server "$SERVER_URL" \
  --realm master \
  --user "$ADMIN_USER" \
  --password "$ADMIN_PASS"

echo "[keycloak-init] Disabling sslRequired on master and ${REALM} realms for local HTTP dev..."
"$KCADM" update realms/master -s sslRequired=none
"$KCADM" update "realms/${REALM}" -s sslRequired=none

echo "[keycloak-init] Granting realm-admin role to service-account-platform-admin..."
"$KCADM" add-roles -r "$REALM" \
  --uusername service-account-platform-admin \
  --cclientid realm-management \
  --rolename realm-admin || true

echo "[keycloak-init] Enabling unmanagedAttributePolicy=ENABLED on ${REALM} user profile..."
PROFILE_JSON="$("$KCADM" get users/profile -r "$REALM")"
if printf '%s' "$PROFILE_JSON" | grep -q '"unmanagedAttributePolicy"'; then
  printf '%s' "$PROFILE_JSON" | sed -E 's/"unmanagedAttributePolicy"[[:space:]]*:[[:space:]]*"[^"]*"/"unmanagedAttributePolicy":"ENABLED"/' > /tmp/profile.json
else
  printf '%s' "${PROFILE_JSON/\{/\{\"unmanagedAttributePolicy\":\"ENABLED\",}" > /tmp/profile.json
fi
"$KCADM" update users/profile -r "$REALM" -f /tmp/profile.json

echo "[keycloak-init] Ensuring platform-frontend client has rootUrl and baseUrl..."
FRONTEND_CLIENT_UUID="$("$KCADM" get clients -r "$REALM" -q clientId=platform-frontend --fields id --format csv --noquotes | tr -d '\r\n')"
if [ -n "$FRONTEND_CLIENT_UUID" ]; then
  "$KCADM" update "clients/${FRONTEND_CLIENT_UUID}" -r "$REALM" \
    -s 'rootUrl=http://localhost' \
    -s 'baseUrl=/da'
fi

echo "[keycloak-init] Local Keycloak IAM initialization complete."
