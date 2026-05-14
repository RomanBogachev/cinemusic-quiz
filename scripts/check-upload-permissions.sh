#!/usr/bin/env bash

set -Eeuo pipefail

VOLUME="cinemusic-quiz_cinemusic_uploads"
DOMAIN=""
COMPOSE_DIR="."
SAMPLE_FILE=""
FIX=0
YES=0
CHECK_SELINUX=1

MOUNTPOINT=""
VOLUME_DIR=""
VOLUMES_DIR=""
DOCKER_ROOT=""
SAMPLE_RELATIVE=""
HTTP_STATUS=""
UPLOADS_HEADER=""
RESULT=0
SELINUX_STATUS="unknown"

usage() {
  cat <<'EOF'
Usage:
  sudo ./scripts/check-upload-permissions.sh --volume cinemusic-quiz_cinemusic_uploads --domain https://quiz.indigo-cat.ru

Options:
  --volume NAME        Docker uploads volume name. Default: cinemusic-quiz_cinemusic_uploads
  --domain URL         Public domain, for example https://quiz.indigo-cat.ru
  --compose-dir PATH   Project directory for optional docker compose/nginx diagnostics. Default: current directory
  --sample-file PATH   Relative uploads path to check, for example images/example.jpg
  --fix               Apply safe chmod fixes after confirmation
  --yes, -y           Do not ask for FIX confirmation
  --check-selinux     Check SELinux status. Default: enabled
  --no-selinux        Skip SELinux checks
  --help, -h          Show this help

The --fix mode applies only:
  chmod o+x <docker-root>
  chmod o+x <docker-root>/volumes
  chmod o+x <docker-root>/volumes/<volume>
  chmod -R o+rX <docker-root>/volumes/<volume>/_data

It does not change owners, does not use chmod 777, and does not touch other volumes.
EOF
}

log() {
  printf '\033[1;34m==>\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2
}

error() {
  printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2
  RESULT=1
}

fail() {
  error "$*"
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is missing: $1"
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --volume) VOLUME="${2:-}"; shift 2 ;;
      --domain) DOMAIN="${2:-}"; shift 2 ;;
      --compose-dir) COMPOSE_DIR="${2:-}"; shift 2 ;;
      --sample-file) SAMPLE_FILE="${2:-}"; shift 2 ;;
      --fix) FIX=1; shift ;;
      --yes|-y) YES=1; shift ;;
      --check-selinux) CHECK_SELINUX=1; shift ;;
      --no-selinux) CHECK_SELINUX=0; shift ;;
      --help|-h) usage; exit 0 ;;
      *) fail "Unknown option: $1" ;;
    esac
  done
}

validate_volume() {
  if ! printf '%s' "$VOLUME" | grep -Eq '^[A-Za-z0-9_.-]+$'; then
    fail "Unsafe volume name: $VOLUME"
  fi
}

mode_digit_has() {
  local digit="$1"
  local mask="$2"
  [ $((digit & mask)) -eq "$mask" ]
}

mode_for_path() {
  stat -c '%a' "$1" 2>/dev/null || printf ''
}

owner_for_path() {
  stat -c '%U:%G' "$1" 2>/dev/null || printf 'unknown:unknown'
}

perms_for_path() {
  stat -c '%A' "$1" 2>/dev/null || ls -ld "$1" 2>/dev/null | awk '{print $1}'
}

check_other_execute() {
  local path="$1"
  local mode
  mode="$(mode_for_path "$path")"
  [ -n "$mode" ] || return 1
  local other="${mode: -1}"
  mode_digit_has "$other" 1
}

check_other_read_execute() {
  local path="$1"
  local mode
  mode="$(mode_for_path "$path")"
  [ -n "$mode" ] || return 1
  local other="${mode: -1}"
  mode_digit_has "$other" 5
}

print_path_check() {
  local label="$1"
  local path="$2"
  local expectation="$3"
  local ok=1

  if [ ! -e "$path" ]; then
    error "$label does not exist: $path"
    return
  fi

  case "$expectation" in
    ox) check_other_execute "$path" && ok=0 || ok=1 ;;
    orx) check_other_read_execute "$path" && ok=0 || ok=1 ;;
  esac

  printf '%-18s %-55s owner=%-18s perms=%-11s %s\n' \
    "$label:" "$path" "$(owner_for_path "$path")" "$(perms_for_path "$path")" "$([ "$ok" -eq 0 ] && printf OK || printf FAILED)"

  if [ "$ok" -ne 0 ]; then
    case "$expectation" in
      ox) error "$label must be traversable by nginx workers: chmod o+x $path" ;;
      orx) error "$label must be readable/traversable by nginx workers: chmod -R o+rX $path" ;;
    esac
  fi
}

preflight() {
  need_command docker
  need_command find
  need_command grep
  need_command awk

  if [ "$FIX" -eq 1 ] && [ "$(id -u)" -ne 0 ]; then
    fail "Run with sudo to fix permissions."
  fi

  validate_volume
  COMPOSE_DIR="$(cd "$COMPOSE_DIR" && pwd)"
}

inspect_volume() {
  log "Inspecting Docker volume: $VOLUME"
  if ! MOUNTPOINT="$(docker volume inspect "$VOLUME" --format '{{ .Mountpoint }}' 2>/dev/null)"; then
    fail "Docker volume not found or not accessible: $VOLUME"
  fi

  [ -n "$MOUNTPOINT" ] || fail "Docker returned an empty mountpoint for volume: $VOLUME"
  [ -d "$MOUNTPOINT" ] || fail "Volume mountpoint does not exist: $MOUNTPOINT"

  VOLUME_DIR="$(dirname "$MOUNTPOINT")"
  VOLUMES_DIR="$(dirname "$VOLUME_DIR")"
  DOCKER_ROOT="$(dirname "$VOLUMES_DIR")"

  printf 'Upload volume: %s\n' "$VOLUME"
  printf 'Mountpoint:    %s\n' "$MOUNTPOINT"
  printf 'Volume dir:    %s\n' "$VOLUME_DIR"
}

show_namei() {
  if command -v namei >/dev/null 2>&1; then
    log "Path permissions via namei"
    namei -l "$MOUNTPOINT" || true
  fi
}

check_permissions() {
  log "Checking filesystem permissions"
  print_path_check "docker root" "$DOCKER_ROOT" ox
  print_path_check "volumes dir" "$VOLUMES_DIR" ox
  print_path_check "volume dir" "$VOLUME_DIR" ox
  print_path_check "_data" "$MOUNTPOINT" orx

  if [ -d "$MOUNTPOINT" ]; then
    local inaccessible_count
    inaccessible_count="$(
      { find "$MOUNTPOINT" \( -type d ! -perm -o+rx -o -type f ! -perm -o+r \) -print 2>/dev/null || true; } | wc -l | tr -d '[:space:]'
    )"
    if [ "${inaccessible_count:-0}" -gt 0 ]; then
      error "$inaccessible_count upload entries are not world-readable/traversable under $MOUNTPOINT"
      { find "$MOUNTPOINT" \( -type d ! -perm -o+rx -o -type f ! -perm -o+r \) -print 2>/dev/null || true; } | head -20
    fi
  fi
}

count_uploads() {
  log "Counting upload files"
  local dir count
  for dir in images audio video covers; do
    count=0
    if [ -d "$MOUNTPOINT/$dir" ]; then
      count="$(find "$MOUNTPOINT/$dir" -type f 2>/dev/null | wc -l | tr -d '[:space:]')"
    fi
    printf '  %s: %s\n' "$dir" "$count"
  done
}

pick_sample_file() {
  if [ -n "$SAMPLE_FILE" ]; then
    SAMPLE_RELATIVE="${SAMPLE_FILE#/}"
    SAMPLE_RELATIVE="${SAMPLE_RELATIVE#uploads/}"
    if [ ! -f "$MOUNTPOINT/$SAMPLE_RELATIVE" ]; then
      error "Sample file was not found in uploads volume: $SAMPLE_RELATIVE"
    fi
    return
  fi

  SAMPLE_RELATIVE="$(find "$MOUNTPOINT/images" -type f 2>/dev/null | head -1 | sed "s#^$MOUNTPOINT/##" || true)"
  if [ -z "$SAMPLE_RELATIVE" ]; then
    SAMPLE_RELATIVE="$(find "$MOUNTPOINT" -mindepth 2 -type f 2>/dev/null | head -1 | sed "s#^$MOUNTPOINT/##" || true)"
  fi

  if [ -z "$SAMPLE_RELATIVE" ]; then
    warn "No upload files found. HTTP media check will be skipped."
  else
    printf 'Sample file: %s\n' "$SAMPLE_RELATIVE"
  fi
}

check_http() {
  [ -n "$DOMAIN" ] || return 0
  [ -n "$SAMPLE_RELATIVE" ] || return 0

  if ! command -v curl >/dev/null 2>&1; then
    warn "curl is not installed. HTTP check skipped."
    return 0
  fi

  log "Checking HTTP access to sample upload"
  local url headers
  url="${DOMAIN%/}/uploads/$SAMPLE_RELATIVE"
  printf 'Sample URL: %s\n' "$url"

  headers="$(curl -k -sS -I --max-time 20 "$url" || true)"
  printf '%s\n' "$headers"
  HTTP_STATUS="$(printf '%s\n' "$headers" | awk 'BEGIN{IGNORECASE=1} /^HTTP\// {code=$2} END{print code}')"
  UPLOADS_HEADER="$(printf '%s\n' "$headers" | awk 'BEGIN{IGNORECASE=1} /^X-Uploads-Location:/ {print $2; exit}' | tr -d '\r')"

  case "$HTTP_STATUS" in
    200) ;;
    403) error "HTTP 403 for sample upload. Nginx likely cannot read/traverse the uploads volume path, or SELinux blocks access." ;;
    404) error "HTTP 404 for sample upload. Check nginx alias, sample path and volume mountpoint." ;;
    502) error "HTTP 502 for /uploads. Static nginx location may not be matched and request may be proxied to app." ;;
    "") error "Could not determine HTTP status for sample upload." ;;
    *) error "Unexpected HTTP status for sample upload: $HTTP_STATUS" ;;
  esac

  if [ "$UPLOADS_HEADER" != "nginx-static" ]; then
    error "X-Uploads-Location: nginx-static header is missing. Request may not hit the static nginx location."
  fi
}

check_nginx_config() {
  if ! command -v nginx >/dev/null 2>&1; then
    warn "nginx command not found. Nginx config check skipped."
    return 0
  fi

  log "Checking nginx config for /uploads location"
  local config
  config="$(nginx -T 2>/dev/null || true)"
  if [ -z "$config" ]; then
    warn "Could not read nginx config with nginx -T. Run with sudo if needed."
    return 0
  fi

  printf '%s\n' "$config" | grep -q 'location[[:space:]]\+\^~[[:space:]]\+/uploads/' || warn "Nginx config does not show location ^~ /uploads/."
  printf '%s\n' "$config" | grep -q "alias[[:space:]]\+$MOUNTPOINT/" || warn "Nginx config does not show alias $MOUNTPOINT/."
  printf '%s\n' "$config" | grep -q 'X-Uploads-Location' || warn "Nginx config does not show X-Uploads-Location header."
}

check_selinux() {
  [ "$CHECK_SELINUX" -eq 1 ] || return 0
  if ! command -v getenforce >/dev/null 2>&1; then
    SELINUX_STATUS="not installed"
    return 0
  fi

  log "Checking SELinux"
  SELINUX_STATUS="$(getenforce 2>/dev/null || printf unknown)"
  printf 'SELinux: %s\n' "$SELINUX_STATUS"

  if command -v ls >/dev/null 2>&1; then
    ls -Zd "$MOUNTPOINT" 2>/dev/null || true
  fi

  if [ "$SELINUX_STATUS" = "Enforcing" ]; then
    warn "SELinux is Enforcing. chmod may not be enough for nginx static files."
    cat <<EOF
Suggested SELinux commands:
  dnf install -y policycoreutils-python-utils
  semanage fcontext -a -t httpd_sys_content_t '$MOUNTPOINT(/.*)?'
  restorecon -Rv '$MOUNTPOINT'
  systemctl reload nginx
EOF
  fi
}

confirm_fix() {
  [ "$FIX" -eq 1 ] || return 0

  log "Permission fix plan"
  cat <<EOF
Will run:
  chmod o+x '$DOCKER_ROOT'
  chmod o+x '$VOLUMES_DIR'
  chmod o+x '$VOLUME_DIR'
  chmod -R o+rX '$MOUNTPOINT'
EOF

  if [ "$YES" -eq 1 ]; then
    return 0
  fi

  printf 'Type FIX to continue: '
  local answer
  read -r answer
  [ "$answer" = "FIX" ] || fail "Confirmation failed. No changes were made."
}

apply_fix() {
  [ "$FIX" -eq 1 ] || return 0
  confirm_fix

  log "Applying permission fixes"
  chmod o+x "$DOCKER_ROOT"
  chmod o+x "$VOLUMES_DIR"
  chmod o+x "$VOLUME_DIR"
  chmod -R o+rX "$MOUNTPOINT"
}

print_summary() {
  log "Summary"
  cat <<EOF
Upload volume: $VOLUME
Mountpoint: $MOUNTPOINT
Sample file: ${SAMPLE_RELATIVE:-none}
HTTP status: ${HTTP_STATUS:-not checked}
X-Uploads-Location: ${UPLOADS_HEADER:-not checked}
SELinux: $SELINUX_STATUS
Result: $([ "$RESULT" -eq 0 ] && printf OK || printf FAILED)
EOF

  if [ "$RESULT" -ne 0 ]; then
    cat <<EOF

Recommended actions:
  sudo ./scripts/check-upload-permissions.sh --volume '$VOLUME' ${DOMAIN:+--domain '$DOMAIN'} --fix

If SELinux is Enforcing, also apply the semanage/restorecon commands printed above.
EOF
  fi
}

main() {
  parse_args "$@"
  preflight
  inspect_volume
  show_namei
  check_permissions
  count_uploads
  pick_sample_file
  check_nginx_config
  check_selinux
  apply_fix

  if [ "$FIX" -eq 1 ]; then
    RESULT=0
    log "Rechecking permissions after --fix"
    check_permissions
  fi

  check_http
  print_summary
  exit "$RESULT"
}

main "$@"
