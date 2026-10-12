#!/bin/bash
# سكربت إدارة خريطة الروابط المختصرة studysrvr-links (.ids/map.json)
# الشكل: { "<id6 base62>": "<repo path>" } — مثال: {"Ab3k9x": "مذكرات/الرياضيات/X.pdf.link"}
# الـ id عشوائي ثابت يتولد مرة واحدة ويعيش مع الـ rename (حدّث الـ value فقط).
# الموقع يحل /f?id=XXXXXX عبر raw.githubusercontent.com/.../.ids/map.json
#
# الاستخدام:
#   ./gen-ids.sh                        # يضيف ids للملفات الجديدة فقط (آمن)
#   ./gen-ids.sh --dry-run              # معاينة بدون كتابة
#   ./gen-ids.sh --prune                # + يحذف مدخلات المسارات المحذوفة
#   ./gen-ids.sh --mv "قديم" "جديد"     # ينقل id مع الـ rename (يحافظ على الروابط)
set -euo pipefail

BASE="${STUDYSRVR_LINKS:-$HOME/Desktop/srvr-files}"
IDS_DIR="$BASE/.ids"
MAP="$IDS_DIR/map.json"
LOCK="/tmp/srvr-ids.lock"
ID_LEN=6

DRY_RUN=0
PRUNE=0
MV_OLD=""
MV_NEW=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --prune) PRUNE=1; shift ;;
    --mv) MV_OLD="${2:-}"; MV_NEW="${3:-}"; shift 3 ;;
    *) echo "unknown flag: $1"; exit 1 ;;
  esac
done

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "مقفل - سكربت آخر يعمل (/tmp/srvr-ids.lock)"
  exit 1
fi

mkdir -p "$IDS_DIR"
[[ -f "$MAP" ]] || echo '{}' > "$MAP"

export BASE MAP IDS_DIR ID_LEN DRY_RUN PRUNE MV_OLD MV_NEW

python3 - <<'EOF'
import json, os, secrets, string, subprocess

base = os.environ["BASE"]
map_path = os.environ["MAP"]
id_len = int(os.environ["ID_LEN"])
dry = os.environ["DRY_RUN"] == "1"
prune = os.environ["PRUNE"] == "1"
mv_old = os.environ["MV_OLD"]
mv_new = os.environ["MV_NEW"]

with open(map_path, encoding="utf-8") as f:
    try:
        data = json.load(f)
    except json.JSONDecodeError:
        print("ERROR: map.json غير صالح")
        raise SystemExit(1)
if not isinstance(data, dict):
    print("ERROR: map.json يجب أن يكون object")
    raise SystemExit(1)

alphabet = string.ascii_letters + string.digits

def new_id(taken):
    while True:
        rid = "".join(secrets.choice(alphabet) for _ in range(id_len))
        if rid not in taken:
            return rid

# --- rename: انقل id مع الملف ---
if mv_old or mv_new:
    if not mv_old or not mv_new:
        print("ERROR: --mv يحتاج مسارين: --mv 'قديم' 'جديد'")
        raise SystemExit(1)
    found = [k for k, v in data.items() if v == mv_old]
    if not found:
        print(f"WARN: لا id للمسار القديم: {mv_old} — سيُعامل كملف جديد")
    else:
        for k in found:
            data[k] = mv_new
        print(f"moved id {found} : {mv_old} -> {mv_new}")

# --- كل الملفات القابلة للمشاركة (يستثني .git + .thumbs + .ids) ---
out = subprocess.run(
    ["find", base, "-path", os.path.join(base, ".git"), "-prune",
     "-o", "-path", os.path.join(base, ".thumbs"), "-prune",
     "-o", "-path", os.path.join(base, ".ids"), "-prune",
     "-o", "-type", "f", "-print"],
    capture_output=True, text=True, check=True,
)
paths = sorted(p for p in out.stdout.splitlines() if p)
rel_paths = [os.path.relpath(p, base) for p in paths]

by_path = {v: k for k, v in data.items()}
added = 0
for rel in rel_paths:
    if rel in by_path:
        continue
    rid = new_id(set(data))
    if dry:
        print(f"[dry-run] would add: {rid} -> {rel}")
    else:
        data[rid] = rel
    added += 1

stale = [k for k, v in data.items()
         if not os.path.isfile(os.path.join(base, v))]
if stale:
    if prune and not dry:
        for k in stale:
            print(f"prune: {k} -> {data[k]}")
            del data[k]
    else:
        print(f"stale entries kept ({len(stale)}): استخدم --prune لحذفها")
        for k in stale[:20]:
            print(f"  stale: {k} -> {data[k]}")

if not dry:
    with open(map_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")

print(f"map entries: {len(data)} | added: {added}")
EOF

echo "للدفع: git -C \"$BASE\" add .ids && git commit -m \"feat: ids ...\" && git push origin main"
