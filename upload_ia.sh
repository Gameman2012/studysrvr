#!/bin/bash
# سكربت رفع مذكرات studysrvr-links إلى archive.org — identifier ثابت studysrvr-batch-2026
# الاستخدام:
#   IA_IDENTIFIER=studysrvr-batch-2026 ./upload_ia.sh "/home/mahmoud/Desktop/srvr-files/مذكرات/الرياضيات/علا غير محلول.pdf"
#   ./upload_ia.sh                         # batch لكل binary متبقي في srvr-files -> studysrvr-batch-2026
#   ./upload_ia.sh --dry-run /path/to/file # معاينة بدون رفع
# ملاحظة: لا تنشئ slug منفصل لكل ملف — الإضافة لنفس الـ item لا تُحتسب spam
set -e
BASE="${STUDYSRVR_LINKS:-$HOME/Desktop/srvr-files}"
TEMP="$HOME/Desktop/pdfs-temp"
mkdir -p "$TEMP"

DRY_RUN=0
if [ "$1" = "--dry-run" ]; then DRY_RUN=1; shift; fi

slugify() {
  python3 -c "
import re, sys, unicodedata
s = sys.argv[1].lower()
s = unicodedata.normalize('NFKD', s)
s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
print(s[:40] or 'file')
" "$1"
}

# ثمبنيل أول صفحة من الملف المحلي قبل نقله لـ pdfs-temp.
# mapping: $BASE/مذكرات/علوم/X.pdf -> $BASE/.thumbs/مذكرات/علوم/X.pdf.jpg
# للصور (jpeg) لا حاجة — الموقع يستخدم الصورة نفسها.
# ملفات خارج $BASE تُتخطى (لا نعرف مرآتها).
make_local_thumb() {
  local SRC="$1"
  case "${SRC,,}" in *.pdf) ;; *) return 0;; esac
  command -v pdftoppm >/dev/null 2>&1 || { echo "WARN: pdftoppm missing, skip thumb"; return 0; }
  local REL="${SRC#$BASE/}"
  [ "$REL" = "$SRC" ] && return 0
  local THUMB="$BASE/.thumbs/${REL}.jpg"
  [ -f "$THUMB" ] && { echo "thumb exists: $THUMB"; return 0; }
  mkdir -p "$(dirname "$THUMB")"
  local OUT="${THUMB%.jpg}"
  if timeout 30 pdftoppm -f 1 -l 1 -jpeg -r 100 -singlefile "$SRC" "$OUT" 2>/dev/null; then
    if command -v magick >/dev/null 2>&1; then
      timeout 30 magick "$THUMB" -thumbnail "600x>" -quality 82 "$THUMB" 2>/dev/null || true
    elif command -v convert >/dev/null 2>&1; then
      timeout 30 convert "$THUMB" -thumbnail "600x>" -quality 82 "$THUMB" 2>/dev/null || true
    fi
    echo "thumb OK: $THUMB ($(wc -c < "$THUMB") bytes)"
  else
    echo "WARN: thumb failed for $SRC"
  fi
}

upload_one() {
  local SRC="$1"
  local IDENT="$2"
  if [ ! -f "$SRC" ]; then echo "ERROR: not found: $SRC"; return 1; fi
  local FILENAME=$(basename "$SRC")
  make_local_thumb "$SRC"
  local ENCODED=$(python3 -c "import urllib.parse, pathlib, sys; print(urllib.parse.quote(pathlib.Path(sys.argv[1]).name))" "$SRC")
  local URL="https://archive.org/download/${IDENT}/${ENCODED}"
  echo "=== $SRC -> $IDENT ==="
  echo "URL: $URL"
  if [ "$DRY_RUN" = 1 ]; then echo "[dry-run] skip ia upload"; return 0; fi
  if ia upload "$IDENT" "$SRC" --metadata="mediatype:texts" --metadata="collection:opensource" --metadata="title:$FILENAME" 2>&1; then
    mv "$SRC" "$TEMP/"
    printf '%s' "$URL" > "${SRC}.link"
    # validate single line no newline
    if grep -q $'\n' "${SRC}.link" 2>/dev/null; then echo "WARN: .link has newline"; fi
    echo "OK: ${SRC}.link ($(wc -c < "${SRC}.link") bytes)"
  else
    echo "FAILED: $IDENT (spam? wait 24h or use batch)"
    return 1
  fi
}

batch_upload() {
  local IDENT="${IA_IDENTIFIER:-studysrvr-batch-2026}"
  mapfile -d '' FILES < <(find "$BASE" -type f -not -path "*/.git/*" -not -name "*.link" -print0 | sort -z)
  if [ ${#FILES[@]} -eq 0 ]; then echo "لا يوجد ملفات binary متبقية في $BASE"; return 0; fi
  echo "Batch upload ${#FILES[@]} files -> $IDENT"
  printf '%s\n' "${FILES[@]}"
  echo "ثمبنيل محلي قبل الرفع:"
  for SRC in "${FILES[@]}"; do make_local_thumb "$SRC"; done
  if [ "$DRY_RUN" = 1 ]; then echo "[dry-run] skip ia upload"; return 0; fi
  if ia upload "$IDENT" "${FILES[@]}" --metadata="mediatype:texts" --metadata="collection:opensource" --metadata="title:studysrvr batch" 2>&1; then
    for SRC in "${FILES[@]}"; do
      mv "$SRC" "$TEMP/"
      local ENCODED=$(python3 -c "import urllib.parse, pathlib, sys; print(urllib.parse.quote(pathlib.Path(sys.argv[1]).name))" "$SRC")
      printf '%s' "https://archive.org/download/${IDENT}/${ENCODED}" > "${SRC}.link"
      echo "CREATED ${SRC}.link"
    done
  else
    echo "Batch FAILED"
    return 1
  fi
}

# single file mode: default IDENT is studysrvr-batch-2026 (لا slug منفصل)
if [ -n "$1" ] && [ -f "$1" ]; then
  SRC="$1"
  IDENT="${IA_IDENTIFIER:-studysrvr-batch-2026}"
  if [ -z "${IA_IDENTIFIER:-}" ]; then
    echo "default IDENT: $IDENT (تجاوز بـ IA_IDENTIFIER=... إن لزم)"
  fi
  upload_one "$SRC" "$IDENT"
else
  batch_upload
fi

echo "=== Done ==="
echo "srvr-files links:"; find "$BASE" -name "*.link" 2>/dev/null | wc -l
echo "pdfs-temp:"; ls -lh "$TEMP" 2>&1 | head -20
echo "لعمل push: git -C \"$BASE\" add -A && git commit -m \"feat: ...\" && git push origin main"
