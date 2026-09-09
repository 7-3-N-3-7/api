#!/bin/bash
# ==============================================================================
# Installer for the Governance Pre-Commit Hook
# Run this from the root of any repository to install the TruffleHog hook.
# ==============================================================================

HOOK_DIR=".git/hooks"
HOOK_FILE="${HOOK_DIR}/pre-commit"

if [ ! -d ".git" ]; then
  echo "❌ Error: You must run this script from the root of a Git repository."
  exit 1
fi

echo "Installing TruffleHog pre-commit hook..."

cat << 'EOF' > $HOOK_FILE
#!/bin/sh
# ---------------------------------------------------------
# Enterprise Governance: TruffleHog Pre-Commit Hook
# ---------------------------------------------------------
echo "🕵️  Running TruffleHog secret scan on staged files..."

# We use docker to run TruffleHog locally without needing it installed natively.
# --only-verified ensures we don't block commits for fake/test credentials
docker run --rm -v "$PWD:/pwd" trufflesecurity/trufflehog:latest git file:///pwd --fail --only-verified

if [ $? -ne 0 ]; then
  echo "❌ TruffleHog found verified secrets! Commit blocked."
  echo "Please remove the secrets, amend your commit, and try again."
  exit 1
fi

echo "✅ Secret scan passed."
exit 0
EOF

# Git Bash drops executable flags, so we use chmod
chmod +x $HOOK_FILE

echo "✅ Successfully installed pre-commit hook at ${HOOK_FILE}!"
