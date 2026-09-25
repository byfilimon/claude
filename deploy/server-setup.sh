#!/usr/bin/env bash
# Выполняется НА СЕРВЕРЕ (root) из GitHub Actions: ssh root@host 'bash -s' < deploy/server-setup.sh
# Ожидает архив сборки в /tmp/zamer-dist.tgz. Идемпотентен — можно запускать при каждом деплое.
#
# 1. Ищет уже настроенный сайт для $DOMAIN (nginx или apache, в т.ч. созданный панелью) и берёт его docroot.
#    Если сайта нет — создаёт виртуальный хост nginx (или apache, если стоит только он) с корнем /var/www/zamer.
# 2. Распаковывает сборку в docroot, выставляет владельца как у каталога.
# 3. Если для домена нет сертификата — выпускает Let's Encrypt через certbot (HTTPS обязателен для Bluetooth).
set -euo pipefail

DOMAIN="${DOMAIN:-zamer.2pietro.com.pl}"
ARCHIVE=/tmp/zamer-dist.tgz
DEFAULT_ROOT=/var/www/zamer
CERT_EMAIL="${CERT_EMAIL:-}"

log() { echo "[zamer] $*"; }
[ -f "$ARCHIVE" ] || { echo "Нет $ARCHIVE" >&2; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

# ---------- поиск существующей конфигурации ----------
find_nginx_root() {
  local f
  f=$(grep -rlsE "server_name[^;]*[[:space:]]$DOMAIN([[:space:];]|$)" /etc/nginx 2>/dev/null | head -1) || true
  [ -n "$f" ] || return 1
  NGINX_CONF="$f"
  # root из блока server с нашим доменом (берём первый root после server_name)
  awk -v d="$DOMAIN" '
    $0 ~ "server_name" && index($0, d) { found=1 }
    found && $1 == "root" { gsub(/;/, "", $2); print $2; exit }
  ' "$f"
}

find_apache_root() {
  local dirs=() f
  for d in /etc/apache2 /etc/httpd; do [ -d "$d" ] && dirs+=("$d"); done
  [ ${#dirs[@]} -gt 0 ] || return 1
  f=$(grep -rlsiE "Server(Name|Alias).*[[:space:]]$DOMAIN([[:space:]]|$)" "${dirs[@]}" | head -1) || true
  [ -n "$f" ] || return 1
  APACHE_CONF="$f"
  grep -iE '^[[:space:]]*DocumentRoot' "$f" | head -1 | awk '{gsub(/"/, "", $2); print $2}'
}

WEB=""
DOCROOT=""
NGINX_CONF=""
APACHE_CONF=""

if have nginx; then
  WEB=nginx
  DOCROOT=$(find_nginx_root || true)
fi
if [ -z "$DOCROOT" ] && { have apache2 || have httpd; }; then
  r=$(find_apache_root || true)
  if [ -n "$r" ]; then WEB=apache; DOCROOT="$r"; fi
  [ -z "$WEB" ] && WEB=apache
fi

if [ -n "$NGINX_CONF$APACHE_CONF" ] && [ -z "$DOCROOT" ]; then
  echo "Для $DOMAIN уже есть конфиг (${NGINX_CONF}${APACHE_CONF}), но без каталога сайта (root/DocumentRoot)." >&2
  echo "Вероятно, это прокси. Не трогаю — поправьте конфиг вручную." >&2
  exit 1
fi

# ---------- создание виртуального хоста, если его нет ----------
if [ -z "$DOCROOT" ]; then
  DOCROOT="$DEFAULT_ROOT"
  mkdir -p "$DOCROOT"
  if [ -z "$WEB" ]; then
    log "Веб-сервер не найден — ставлю nginx"
    apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx
    WEB=nginx
  fi
  if [ "$WEB" = nginx ]; then
    if [ -d /etc/nginx/sites-available ]; then
      NGINX_CONF=/etc/nginx/sites-available/zamer.conf
      ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/zamer.conf
    else
      NGINX_CONF=/etc/nginx/conf.d/zamer.conf
    fi
    log "Создаю $NGINX_CONF"
    cat > "$NGINX_CONF" <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    root $DOCROOT;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
    # service worker и index.html не кэшируем, чтобы обновления приходили сразу
    location = /sw.js { add_header Cache-Control "no-cache"; }
    location = /index.html { add_header Cache-Control "no-cache"; }
    location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
}
NGX
    nginx -t
    systemctl reload nginx
  else
    if [ -d /etc/apache2/sites-available ]; then
      APACHE_CONF=/etc/apache2/sites-available/zamer.conf
    else
      APACHE_CONF=/etc/httpd/conf.d/zamer.conf
    fi
    log "Создаю $APACHE_CONF"
    cat > "$APACHE_CONF" <<APC
<VirtualHost *:80>
    ServerName $DOMAIN
    DocumentRoot $DOCROOT
    <Directory $DOCROOT>
        Require all granted
        AllowOverride None
    </Directory>
</VirtualHost>
APC
    if have a2ensite; then a2ensite -q zamer; apachectl configtest; systemctl reload apache2
    else apachectl configtest; systemctl reload httpd; fi
  fi
else
  log "Найден сайт $DOMAIN ($WEB, ${NGINX_CONF}${APACHE_CONF}), каталог $DOCROOT"
fi

# ---------- выкладка файлов ----------
mkdir -p "$DOCROOT"
TMP=$(mktemp -d)
tar -xzf "$ARCHIVE" -C "$TMP"
cp -a "$TMP"/. "$DOCROOT"/
rm -rf "$TMP" "$ARCHIVE"
OWNER=$(stat -c '%U:%G' "$DOCROOT")
[ "$OWNER" = "root:root" ] || chown -R "$OWNER" "$DOCROOT"
log "Файлы выложены в $DOCROOT (владелец $OWNER)"

# ---------- HTTPS ----------
if [ -d "/etc/letsencrypt/live/$DOMAIN" ] || grep -rqs "ssl_certificate.*$DOMAIN\|SSLCertificateFile.*$DOMAIN" /etc/nginx /etc/apache2 /etc/httpd 2>/dev/null; then
  log "Сертификат для $DOMAIN уже есть"
else
  log "Выпускаю сертификат Let's Encrypt для $DOMAIN"
  if ! have certbot; then
    apt-get update -qq
    if [ "$WEB" = nginx ]; then pkg=python3-certbot-nginx; else pkg=python3-certbot-apache; fi
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot "$pkg"
  fi
  if [ -n "$CERT_EMAIL" ]; then mail=(-m "$CERT_EMAIL"); else mail=(--register-unsafely-without-email); fi
  certbot "--$WEB" -d "$DOMAIN" --non-interactive --agree-tos --redirect "${mail[@]}" \
    || log "ВНИМАНИЕ: certbot не смог выпустить сертификат — сайт доступен только по HTTP, Bluetooth работать не будет"
fi

log "Готово: https://$DOMAIN/"
