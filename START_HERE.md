# Collade AI — START HERE

## ✅ THE CORRECT FOLDER IS:

```
/Users/samemmanuelvenugopal/Downloads/colladeai (5)
```

**NOT** colladeai (1), (3), or (4) — those are old Base44 versions.

### How to tell which folder is correct:

| Folder | Status |
|--------|--------|
| `colladeai (5)` | ✅ **USE THIS** — Supabase, credits.js, llm.js |
| `colladeai (1)` | ❌ Old Base44 + partial Supabase |
| `colladeai (3)` | ❌ Old Base44 |
| `colladeai (4)` | ❌ Old Base44 |

---

## 🚀 Run the app (copy-paste these commands)

```bash
cd "/Users/samemmanuelvenugopal/Downloads/colladeai (5)"
npm install
npm run dev
```

Or double-click / run:
```bash
bash "/Users/samemmanuelvenugopal/Downloads/colladeai (5)/start.sh"
```

Open: **http://localhost:5173**

---

## 🔍 Find your folder if lost

```bash
find ~/Downloads -maxdepth 2 -name "package.json" -path "*colladeai*" 2>/dev/null | while read f; do
  dir=$(dirname "$f")
  name=$(grep '"name"' "$f" | head -1)
  echo "$dir → $name"
done
```

You want the one that shows `"name": "collade-ai"`.

---

## 🗄️ Supabase setup (run once)

1. Open **Supabase → SQL Editor**
2. Run `supabase/fix-credits.sql`
3. Replace `YOUR-USER-UUID` with your ID from **Authentication → Users**
4. Add Groq key: **Project Settings → Edge Functions → Secrets** → `GROQ_API_KEY`
5. Deploy Edge Function from `supabase/functions/career-search/index.ts`

---

## ✅ Test checklist

### Credits
- Console: `[Credits] DEDUCT verified: 9999`
- Refresh page → still 9999
- Supabase Table Editor → balance = 9999

### AI
- Must be logged in
- Console: `[Auth] Valid access token ready`
- Console: `[AI] Response status: 200`

### Welcome popup
- Hidden if you have >5 credits
- Hidden after first dismiss

### Payment buttons
- Hidden if credits > 100

---

## ⚠️ "package.json not found" error

You ran `npm run dev` from the **wrong directory**. Always:

```bash
cd "/Users/samemmanuelvenugopal/Downloads/colladeai (5)"
```

before running npm commands.
