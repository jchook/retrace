#!/usr/bin/env bash
set -euo pipefail

# Fetch artifacts and documents for given order IDs from a remote host via rsync.
#
# Usage examples:
#   echo "3577 3541 3531" | bin/fetchOrder.sh
#   printf "3577\n3541\n3531\n" | bin/fetchOrder.sh -h madi -r app/server/storage -d server/storage
#   bin/fetchOrder.sh <<< $'3577\n3541\n3531'
#
# Flags:
#   -h <host>   Remote SSH host (default: madi)
#   -r <path>   Remote storage root (default: app/server/storage)
#   -d <path>   Local storage root (default: server/storage)
#   -n          Dry run (prints rsync commands without executing)

REMOTE_HOST="madi"
REMOTE_ROOT="app/server/storage"
LOCAL_ROOT="server/storage"
DRY_RUN=false

while getopts ":h:r:d:n" opt; do
  case $opt in
    h) REMOTE_HOST="$OPTARG" ;;
    r) REMOTE_ROOT="$OPTARG" ;;
    d) LOCAL_ROOT="$OPTARG" ;;
    n) DRY_RUN=true ;;
    :) echo "Option -$OPTARG requires an argument" >&2; exit 2 ;;
    \?) echo "Unknown option: -$OPTARG" >&2; exit 2 ;;
  esac
done
shift $((OPTIND-1))

# Read order IDs from stdin (whitespace/newline separated)
if [ -t 0 ]; then
  echo "Provide order IDs via stdin. Example: echo '3577 3541' | $0" >&2
  exit 2
fi

mapfile -t TOKENS < <(tr ',\t' '  ' | tr -s ' ' | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -n | uniq)
if [ ${#TOKENS[@]} -eq 0 ]; then
  echo "No order IDs detected on stdin" >&2
  exit 2
fi

types=(artifacts documents)

echo "Remote: ${REMOTE_HOST}:${REMOTE_ROOT}"
echo "Local:  ${LOCAL_ROOT}"
echo "Orders: ${TOKENS[*]}"

mkdir -p "${LOCAL_ROOT}/artifacts" "${LOCAL_ROOT}/documents"

rsync_base=(rsync -av --progress)
if $DRY_RUN; then
  rsync_base+=(--dry-run)
fi

for t in "${types[@]}"; do
  for oid in "${TOKENS[@]}"; do
    remote_dir="${REMOTE_HOST}:${REMOTE_ROOT}/${t}/${oid}/"
    local_dir="${LOCAL_ROOT}/${t}/${oid}"
    mkdir -p "${local_dir}"
    echo "Syncing ${remote_dir} -> ${local_dir}/" >&2
    if ! "${rsync_base[@]}" "${remote_dir}" "${local_dir}/"; then
      echo "[warn] Missing or inaccessible: ${remote_dir} (skipping)" >&2
    fi
  done
done

echo "Done."

