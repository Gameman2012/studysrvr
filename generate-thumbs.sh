#!/bin/bash
# سكربت توليد ثمبنيل أول صفحة لملفات studysrvr-links
# mapping: srvr-files/**/*.pdf.link --> srvr-files/.thumbs/**/*.pdf.jpg (صورة حقيقية)
# للصور (*.jpeg.link) لا يولد thumb — الموقع يستخدم الصورة نفسها
# اليتيمة تُنقل لـ ~/Desktop/pdfs-temp/.thumbs بدل حذف
#
# الاستخدام:
#   ./generate-thumbs.sh                              # يولد النواقص فقط (100dpi/600px)
#   ./generate-thumbs.sh --dry-run                    # معاينة بدون تحميل
#   ./generate-thumbs.sh --limit 2                     # تجربة أول N ملف فقط
#   ./generate-thumbs.sh --dpi 150 --width 800 --force # إعادة توليد بدقة أعلى
#   ./generate-thumbs.sh --prune                       # نقل thumbs اليتيمة لـ pdfs-temp/.thumbs
set -euo pipefail

BASE="${STUDYSRVR_LINKS:-$HOME/Desktop/srvr-files}"
CACHE="$BASE/.thumbs"
ARCHIVE="$HOME/Desktop/pdfs-temp/.thumbs"
LOCK="/tmp/srvr-thumbs.lock"
JOBS_FILE="/tmp/srvr-thumbs-jobs.list"

DPI=100
WIDTH=600
FORCE=0
DRY_RUN=0
PRUNE=0
LIMIT=0
JOBS=8

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --force) FORCE=1; shift ;;
    --prune) PRUNE=1; shift ;;
    --limit) LIMIT="$2"; shift 2 ;;
    --dpi) DPI="$2"; shift 2 ;;
    --width) WIDTH="$2"; shift 2 ;;
    --jobs) JOBS="$2"; shift 2 ;;
    *) echo "unknown flag: $1"; exit 1 ;;
  esac
done

# --- lock: يمنع تشغيل نسختين متوازيتين ---
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "مقفل - سكربت آخر يعمل (/tmp/srvr-thumbs.lock)"
  exit 1
fi

mkdir -p "$CACHE" "$ARCHIVE"

# --- المرحلة 1: mirror المجلدات (يستثني BASE نفسه + .git + .thumbs) ---
while IFS= read -r -d '' d; do
  [[ "$d" == "$BASE" ]] && continue
  rel="${d#$BASE/}"
  case "$rel" in
    .thumbs*|.git*) continue ;;
  esac
  mkdir -p "$CACHE/$rel"
done < <(find "$BASE" \( -path "$BASE/.git" -o -path "$CACHE" \) -prune -o -type d -print0)

# --- المرحلة 2: نقل اليتيمة بدل حذف (فقط مع --prune) ---
if [[ "$PRUNE" == "1" ]]; then
  moved=0
  while IFS= read -r -d '' t; do
    rel="${t#$CACHE/}"
    base_noext="${rel%.jpg}"   # يعيد ".pdf" (مثل: مذكرات/علوم/x.pdf)
    broken_noext="${base_noext%.pdf}-broken.pdf"
    if [[ ! -f "$BASE/$base_noext.link" && ! -f "$BASE/$broken_noext.link" ]]; then
      if [[ "$DRY_RUN" == "1" ]]; then
        echo "[dry-run] would move orphan: $t"
      else
        stamp=$(date +%s)
        mv -v "$t" "$ARCHIVE/$(basename "$t").$stamp"
      fi
      moved=$((moved + 1))
    fi
  done < <(find "$CACHE" -type f -name "*.jpg" -print0)
  find "$CACHE" -type d -empty -delete 2>/dev/null || true
  echo "prune done: moved $moved orphan(s) to $ARCHIVE"
  [[ "$DRY_RUN" == "1" ]] && exit 0
fi

# --- المرحلة 3: بناء قائمة المهام (النواقص فقط ما لم --force) ---
: > "$JOBS_FILE"
count_all=0
count_todo=0
while IFS= read -r -d '' link; do
  count_all=$((count_all + 1))
  # تخطي الروابط الموسومة -broken (ثمبنيلها موجود بالاسم الأصلي)
  if [[ "$link" == *-broken.pdf.link ]]; then
    continue
  fi
  # mapping: *.pdf.link --> .thumbs/*.pdf.jpg (مع .pdf في الاسم)
  rel="${link#$BASE/}"
  thumb="$CACHE/${rel%.link}.jpg"
  if [[ "$FORCE" != "1" && -f "$thumb" ]]; then
    continue
  fi
  if [[ "$LIMIT" -gt 0 && "$count_todo" -ge "$LIMIT" ]]; then
    continue
  fi
  url=$(cat "$link")
  printf '%s|%s|%s\n' "$link" "$url" "$thumb" >> "$JOBS_FILE"
  count_todo=$((count_todo + 1))
done < <(find "$BASE" -name "*.pdf.link" -print0 | sort -z)

echo "pdf.link total: $count_all | todo: $count_todo (dpi=$DPI width=$WIDTH jobs=$JOBS)"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "--- [dry-run] jobs ---"
  cat "$JOBS_FILE"
  exit 0
fi

if [[ "$count_todo" == "0" ]]; then
  echo "لا يوجد نواقص - كل الـ thumbs موجودة (استخدم --force للإعادة)"
  exit 0
fi

# --- المرحلة 4: توليد متوازي (xargs -P) — أول صفحة فقط ---
export DPI WIDTH
load_thumb() {
  local link="$1" url="$2" thumb="$3"
  local tmp out
  echo "[$(date +%T)] START $link" >&2
  tmp=$(mktemp /tmp/thumb_XXXXXX.pdf)
  mkdir -p "$(dirname "$thumb")"
  echo "[$(date +%T)] curl -> $url" >&2
  if ! timeout 120 curl -sL --retry 2 --retry-all-errors --connect-timeout 20 --max-time 300 "$url" -o "$tmp"; then
    echo "[$(date +%T)] FAIL curl: $link" >&2
    rm -f "$tmp"
    return 0
  fi
  echo "[$(date +%T)] curl OK ($(stat -c %s "$tmp") bytes)" >&2
  echo "[$(date +%T)] pdfinfo ..." >&2
  if ! timeout 30 pdfinfo "$tmp" >/dev/null 2>&1; then
    echo "[$(date +%T)] FAIL invalid pdf: $link" >&2
    rm -f "$tmp"
    return 0
  fi
  echo "[$(date +%T)] pdfinfo OK" >&2
  out="${thumb%.jpg}"
  echo "[$(date +%T)] pdftoppm r=$DPI ..." >&2
  if timeout 30 pdftoppm -f 1 -l 1 -jpeg -r "$DPI" -singlefile "$tmp" "$out" 2>/dev/null; then
    # توحيد العرض عبر resize إضافي لو لزم (ImageMagick fallback للتحجيم فقط)
    if command -v magick >/dev/null 2>&1; then
      timeout 30 magick "$thumb" -thumbnail "${WIDTH}x>" -quality 82 "$thumb" 2>/dev/null || true
    elif command -v convert >/dev/null 2>&1; then
      timeout 30 convert "$thumb" -thumbnail "${WIDTH}x>" -quality 82 "$thumb" 2>/dev/null || true
    fi
    echo "[$(date +%T)] OK: $thumb ($(stat -c %s "$thumb") bytes)" >&2
  else
    echo "[$(date +%T)] FAIL pdftoppm: $link" >&2
  fi
  rm -f "$tmp"
  echo "[$(date +%T)] DONE $link" >&2
}
export -f load_thumb

# heartbeat: رسالة "أنا لازلت موجوداً" كل 10 ثواني أثناء التوليد
( while true; do echo "[$(date +%T)] أنا لازلت موجوداً" >&2; sleep 10; done ) &
HEARTBEAT_PID=$!
trap "kill $HEARTBEAT_PID 2>/dev/null" EXIT

xargs -a "$JOBS_FILE" -d '\n' -P "$JOBS" -n 1 bash -c 'IFS="|" read -r link _rest <<< "$1"; url=$(echo "$1" | cut -d"|" -f2- | rev | cut -d"|" -f2- | rev); thumb=$(echo "$1" | rev | cut -d"|" -f1 | rev); load_thumb "$link" "$url" "$thumb"' _

kill "$HEARTBEAT_PID" 2>/dev/null
trap - EXIT

echo "=== Done ==="
echo "thumbs now: $(find "$CACHE" -type f -name "*.jpg" | wc -l)"
echo "size: $(du -sh "$CACHE" | cut -f1)"
echo "للدفع: git -C \"$BASE\" add .thumbs && git commit -m \"feat: thumbs ...\" && git push origin main"
