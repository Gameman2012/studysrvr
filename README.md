# StudySrvr — Study Hub

مستكشف ملفات دراسية مبني على Vite + React + Tailwind v4 + shadcn/ui.
يعرض مجلدات وملفات مستودع GitHub مباشرة، مع فتح ملفات PDF بسهولة.

## التشغيل

```bash
bun install
bun run dev       # تطوير
bun run build     # بناء للإنتاج
bun run preview   # معاينة البناء
```

## الإعداد

عدّل رابط المستودع في `.env`:

```env
VITE_REPO_URL=https://github.com/owner/repo/tree/main/folder
```

يُحوَّل الرابط تلقائياً لصيغة GitHub API (يدعم `github.com/owner/repo` و `/tree/branch/path` و `api.github.com`).
