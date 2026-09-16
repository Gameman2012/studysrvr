# دليل مستودع الروابط — للـ AI

> المرجع الوحيد لتعديل `Gameman2012/studysrvr-links` المعروض في `/m` (`src/pages/Home.tsx` + `src/lib/github.ts:74`). اتبعه حرفياً.

## 1. الفكرة
- repo عادي يُعرض عبر GitHub Contents API.
- `src/components/FileList.tsx:5`: مجلد = button، ملف `.pdf.link`/`.jpeg.link` = `<a>` يحذف آخر 5 أحرف للعرض (`displayName`) وعند الضغط `fetch(download_url).text() -> window.open(url)` (`FileList.tsx:13`). محتوى الـ `.link` سطر واحد URL فقط.

## 2. الهيكل
- مجلدان جذريان فقط: `كتب المادة/` و `مذكرات/` — لا ملفات في الـ root.
- مجلدات عربية كاملة (`الرياضيات`, `العلوم`...) — استخدم `core.quotepath false`.
- مثال:
```
كتب المادة/الرياضيات/كتاب المادة.pdf.link → https://elibrary.moe.edu.kw/api/File/preview/book/3625
مذكرات/الرياضيات/علا غير محلول.pdf.link    → https://archive.org/download/studysrvr-batch-2026/<encoded>
```

## 3. قواعد التسمية
| النوع | الامتداد | المحتوى |
|---|---|---|
| كتاب elibrary | `.pdf.link` | سطر واحد `https://elibrary.moe.edu.kw/api/File/preview/book/XXXX` بدون newline (`printf '%s'`) |
| مذكرة/صورة archive.org | `.pdf.link` أو `.jpeg.link` | سطر واحد `https://archive.org/download/<identifier>/<encoded>` |

- identifier ثابت **دائماً** `studysrvr-batch-2026` — لا تنشئ `studysrvr-<slug>-2026` منفصل لكل مذكرة. السبب: إنشاء item جديد على archive.org يُحتسب ضد حد spam (6 items/اليوم)، بينما الإضافة لعنصر موجود (`ia upload studysrvr-batch-2026 <file>`) لا تُعتبر spam. الإرسال يكون **واحدة واحدة** (`upload_one`) لنفس الـ identifier.
  - الاستثناء الوحيد: `studysrvr-batch2-2026` قديم (legacy) — ابقِ روابطه كما هي ولا تستخدمه للجديد.
- لا ترفع PDF binary — دائماً `*.link`. الأصل يُنقل لـ `~/Desktop/pdfs-temp` بعد الرفع.

## 4. Workflow (إلزامي) — clone واحد فقط

> العمل كله في `~/Desktop/srvr-files` (clone مباشر). لا clone ثاني للمقارنة — استخدم `git diff`.

### 4.1 Clone (مرة واحدة)
```bash
git clone https://github.com/Gameman2012/studysrvr-links.git "$HOME/Desktop/srvr-files"
git -C "$HOME/Desktop/srvr-files" config core.quotepath false
mkdir -p "$HOME/Desktop/pdfs-temp"
# S3 لـ archive.org (مرة واحدة): ~/.config/ia.ini من https://archive.org/account/s3.php
```

### 4.2 Edit — المستخدم يضع الملف وأنت تحوله
المستخدم يضع الملف في مساره النهائي داخل `~/Desktop/srvr-files` أو يخبرك بالمسار، وأنت تنفذ:

**مذكرة جديدة (عبر السكربت — دائماً batch):**
```bash
IA_IDENTIFIER=studysrvr-batch-2026 ./upload_ia.sh "$HOME/Desktop/srvr-files/مذكرات/الرياضيات/علا غير محلول.pdf"
# السكربت يرفع بـ ia upload studysrvr-batch-2026، ينقل الأصل لـ pdfs-temp، وينشئ .link تلقائياً
# لا تستخدم slug منفصل — كل المذكرات لنفس الـ identifier لتجنب spam
```

**كتاب elibrary (بدون رفع):**
```bash
printf '%s' 'https://elibrary.moe.edu.kw/api/File/preview/book/XXXX' > "$HOME/Desktop/srvr-files/كتب المادة/الرياضيات/كتاب المادة.pdf.link"
```

**نقل/حذف:**
```bash
git -C "$HOME/Desktop/srvr-files" mv "قديم.pdf.link" "جديد.pdf.link"
git -C "$HOME/Desktop/srvr-files" rm "مذكرات/قديم.pdf.link"
```

**معرفة ما تغير (بدل diff بين مجلدين):**
```bash
git -C "$HOME/Desktop/srvr-files" status
git -C "$HOME/Desktop/srvr-files" diff --cached --stat
find "$HOME/Desktop/srvr-files" -type f -not -path "*/.git/*" -not -name "*.link" | sort
```

### 4.3 Commit & Push
```bash
git -C "$HOME/Desktop/srvr-files" add -A
git -C "$HOME/Desktop/srvr-files" diff --cached --name-status
find "$HOME/Desktop/srvr-files" -name "*.link" -exec sh -c 'echo "==$1"; cat "$1"; echo; wc -c < "$1"' _ {} \;
git -C "$HOME/Desktop/srvr-files" commit -m "feat: <وصف>"
gh auth setup-git; git -C "$HOME/Desktop/srvr-files" push origin main
```

### 4.4 Verify
```bash
curl -s "https://api.github.com/repos/Gameman2012/studysrvr-links/contents?ref=main" | python3 -c "import json,sys; print([x['name'] for x in json.load(sys.stdin)])"
curl -s "https://raw.githubusercontent.com/Gameman2012/studysrvr-links/main/كتب%20المادة/الرياضيات/كتاب%20المادة.pdf.link"
```

## 5. محظورات
- لا تعدل `studysrvr-v2` لإضافة محتوى — المحتوى في `studysrvr-links` فقط.
- لا `rm -rf` لملفات متتبعة — استخدم `git rm`.
- لا تنشئ identifier جديد على archive.org لكل ملف — استخدم دائماً `studysrvr-batch-2026` (الإضافة لنفس الـ item لا تُحتسب spam؛ إنشاء item جديد هو ما يُحظر 6/اليوم). `studysrvr-batch2-2026` legacy فقط.

## 6. مرجع كود
`src/pages/Home.tsx` `src/lib/github.ts:74` `src/components/FileList.tsx:5` `src/config.ts:3`
