#!/bin/bash
# SessionStart hook for Claude Code on the web.
# Installs Node dependencies and generates the Prisma client so that typecheck,
# lint, and the Vitest suite work in a fresh remote session.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Install dependencies. `npm install` (not `npm ci`) so the resolved node_modules
# is preserved in the cached container state and re-runs stay fast/idempotent.
npm install

# Generate the Prisma client — required by `npm run typecheck` and the test suite.
npx prisma generate
