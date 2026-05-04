#!/usr/bin/env bash
# Render startup wrapper — prints diagnostics then starts uvicorn
# NOTE: no -u flag so unset vars don't crash us

echo "=== RENDER STARTUP ==="
echo "Python: $(python3 --version 2>&1)"
echo "PWD: $(pwd)"
echo "DATABASE_URL prefix: ${DATABASE_URL:-NOT_SET}" | cut -c1-50
echo "SECRET_KEY set: $([ -n "${SECRET_KEY:-}" ] && echo YES || echo NO)"
echo "PORT: ${PORT:-NOT_SET}"
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
if [ $? -ne 0 ]; then
    echo "ERROR: Python import failed, aborting."
    exit 1
fi

echo "Starting uvicorn on port ${PORT:-10000}..."
exec python3 -m uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-10000}" \
    --log-level info
