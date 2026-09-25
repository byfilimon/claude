#!/usr/bin/env bash
# Заливает dist/ на VPS и запускает server-setup.sh. Работает в GitHub Actions и локально:
#   npm run build && VPS_HOST=46.36.220.54 bash deploy/deploy.sh
# Переменные (секреты репозитория): VPS_HOST, VPS_USER (по умолч. root), VPS_SSH_KEY или VPS_PASSWORD,
# необязательно VPS_PORT, DOMAIN, CERT_EMAIL.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${VPS_HOST:?нужен секрет VPS_HOST}"
USER_="${VPS_USER:-root}"
PORT="${VPS_PORT:-22}"
DOMAIN="${DOMAIN:-zamer.2pietro.com.pl}"

SSH_OPTS=(-p "$PORT" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20)
if [ -n "${VPS_SSH_KEY:-}" ]; then
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  printf '%s\n' "$VPS_SSH_KEY" > ~/.ssh/deploy_key && chmod 600 ~/.ssh/deploy_key
  SSH=(ssh -i ~/.ssh/deploy_key "${SSH_OPTS[@]}")
elif [ -n "${VPS_PASSWORD:-}" ]; then
  command -v sshpass >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq sshpass; }
  export SSHPASS="$VPS_PASSWORD"
  SSH=(sshpass -e ssh -o PubkeyAuthentication=no "${SSH_OPTS[@]}")
else
  # локальный запуск: обычный ssh (ключ из ssh-agent или ввод пароля)
  SSH=(ssh "${SSH_OPTS[@]}")
fi

tar -C dist -czf - . | "${SSH[@]}" "$USER_@$VPS_HOST" 'cat > /tmp/zamer-dist.tgz'
"${SSH[@]}" "$USER_@$VPS_HOST" "DOMAIN='$DOMAIN' CERT_EMAIL='${CERT_EMAIL:-}' bash -s" < deploy/server-setup.sh
