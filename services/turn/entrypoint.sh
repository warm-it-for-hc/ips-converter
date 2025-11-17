#!/bin/sh
set -eu

TURN_PORT="${TURN_PORT:-3478}"
TURN_REALM="${TURN_REALM:-ips-share}"
TURN_USERNAME="${TURN_USERNAME:-ips-share-user}"
TURN_PASSWORD="${TURN_PASSWORD:-ips-share-pass}"
TURN_MIN_PORT="${TURN_MIN_PORT:-49160}"
TURN_MAX_PORT="${TURN_MAX_PORT:-49200}"
TURN_PUBLIC_IP="${TURN_PUBLIC_IP:-}"
TURN_LISTEN_IP="${TURN_LISTEN_IP:-0.0.0.0}"
TURN_RELAY_IP="${TURN_RELAY_IP:-0.0.0.0}"
CONFIG_FILE="/tmp/turnserver.conf"

cat >"${CONFIG_FILE}" <<EOF
fingerprint
lt-cred-mech
realm=${TURN_REALM}
user=${TURN_USERNAME}:${TURN_PASSWORD}
no-tls
no-dtls
no-cli
pidfile="/var/run/turnserver.pid"
listening-port=${TURN_PORT}
listening-ip=${TURN_LISTEN_IP}
relay-ip=${TURN_RELAY_IP}
min-port=${TURN_MIN_PORT}
max-port=${TURN_MAX_PORT}
EOF

if [ -n "${TURN_PUBLIC_IP}" ]; then
  echo "external-ip=${TURN_PUBLIC_IP}" >>"${CONFIG_FILE}"
fi

exec turnserver -c "${CONFIG_FILE}" -v
