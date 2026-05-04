#!/usr/bin/env bash
# Render startup wrapper — prints diagnostics then starts uvicorn
set -euo pipefail

echo "=== RENDER STARTUP ==="
echo "Python: $(python3 --version 2>&1)"
echo "PWD: $(pwd)"
echo "DATABASE_URL prefix: ${DATABASE_URL:0:25}..."
echo "SECRET_KEY set: ${SECRET_KEY:+YES}"
echo "PORT: ${PORT:-NOT SET}"
echo "==="

echo "Testing Python import..."
python3 -c "
import sys, traceback
sys.path.insert(0, '.')
try:
    from backend.main import app
    print('Import: OK')
except Exception as e:
    print('Import FAILED:', type(e).__name__, str(e))
    traceback.print_exc()
    sys.exit(1)
"

echo "Starting uvicorn..."
exec python3 -m uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-10000}" \
    --log-level info
