#!/usr/bin/env bash
# Install and run Apache Superset with the built-in MCP server.
# Verified with apache-superset 6.1.0 on Python 3.11.
set -euo pipefail

VENV="${SUPERSET_VENV:-$HOME/superset-venv}"
HOME_DIR="${SUPERSET_HOME_DIR:-$HOME/superset}"
ADMIN_PASSWORD="${SUPERSET_ADMIN_PASSWORD:-admin}"

# 1. Virtualenv + packages (fastmcp extra enables the MCP server)
python3 -m venv "$VENV"
"$VENV/bin/pip" install --upgrade pip setuptools wheel
"$VENV/bin/pip" install "apache-superset[fastmcp]" pillow

# 2. Minimal config
mkdir -p "$HOME_DIR"
export SUPERSET_CONFIG_PATH="$HOME_DIR/superset_config.py"
if [ ! -f "$SUPERSET_CONFIG_PATH" ]; then
  cat > "$SUPERSET_CONFIG_PATH" <<EOF
SECRET_KEY = "$(python3 -c 'import secrets; print(secrets.token_urlsafe(42))')"
SQLALCHEMY_DATABASE_URI = "sqlite:///$HOME_DIR/superset.db"
EOF
fi

# 3. Initialize metadata DB, admin user, roles
"$VENV/bin/superset" db upgrade
"$VENV/bin/superset" fab create-admin \
  --username admin --firstname Admin --lastname User \
  --email admin@example.com --password "$ADMIN_PASSWORD" || true
"$VENV/bin/superset" init

# 4. Run web UI (8088) and MCP server (5008)
nohup "$VENV/bin/superset" run -h 0.0.0.0 -p 8088 > "$HOME_DIR/web.log" 2>&1 &
nohup "$VENV/bin/superset" mcp run --host 0.0.0.0 --port 5008 > "$HOME_DIR/mcp.log" 2>&1 &

echo "Superset web UI : http://localhost:8088 (admin / $ADMIN_PASSWORD)"
echo "MCP endpoint    : http://localhost:5008/mcp"
