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

# Provide the environment variables that `src/env.ts` validates at module load, so a
# fresh web session can run `npm run typecheck` and the full `npm run test` suite (one
# test file transitively imports src/env.ts and otherwise fails to load). These are
# NON-SECRET, ephemeral dev values — the same approach CI uses (it generates throwaway
# secrets at runtime). Each var is only set when it is not already present, so a properly
# configured environment (a real DATABASE_URL, secrets, etc.) is never overridden.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  set_if_unset() {
    # $1 = var name, $2 = default value
    if [ -z "$(printenv "$1" || true)" ]; then
      printf 'export %s=%q\n' "$1" "$2" >> "$CLAUDE_ENV_FILE"
    fi
  }
  # Placeholder Postgres URL: satisfies the URL schema so unit tests / typecheck load.
  # (Unit tests and typecheck do not open a DB connection.)
  set_if_unset DATABASE_URL   "postgresql://postgres@localhost:5432/mckinney"
  set_if_unset DIRECT_URL     "postgresql://postgres@localhost:5432/mckinney"
  set_if_unset NEXT_PUBLIC_SITE_URL "http://localhost:3000"
  set_if_unset NEXTAUTH_SECRET   "$(openssl rand -hex 24)"
  set_if_unset ENCRYPTION_KEY    "$(openssl rand -hex 16)"
  set_if_unset TOKEN_HMAC_SECRET "$(openssl rand -hex 24)"
  set_if_unset CRON_SECRET       "$(openssl rand -hex 24)"
fi
