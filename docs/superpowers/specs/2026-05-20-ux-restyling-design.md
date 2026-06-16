# UX Restyling — Coordinamenti
**Date:** 2026-05-20  
**Scope:** Cosmetic + micro-interactions only. Zero functional changes.

---

## Goal

Make the app feel more like a polished product to encourage daily usage. Approach B: Layout lift + new components + cosmetic extras.

---

## 1. New CSS Tokens (`index.css`)

Add to `:root`, non-breaking (no existing variables removed):

```css
--shadow-card:  0 1px 3px rgba(44,36,32,0.06), 0 4px 12px rgba(44,36,32,0.04);
--shadow-hover: 0 4px 16px rgba(196,113,74,0.12), 0 1px 4px rgba(44,36,32,0.08);
--shadow-modal: 0 8px 40px rgba(44,36,32,0.16);
--radius-card:  14px;
--transition-base: 0.18s ease;
--transition-slow: 0.3s ease;
```

---

## 2. DailySplash Component (`DailySplash.tsx`)

**Trigger:** appears 400ms after login. Shown once per calendar day via `localStorage` key `cm_splash_YYYY-MM-DD`. If key exists → skip.

**Visual structure:**
- Overlay: `rgba(44,36,32,0.45)` backdrop with blur
- Card: `var(--bianco)`, `var(--shadow-modal)`, `border-radius: 20px`, max-width 420px, slide-up animation (`translateY(20px)→0`, opacity 0→1, 300ms)
- Top row: date left-aligned, dismiss `×` right
- Badge: `💡 Funzione del giorno` chip in `--terra-light` / `--terra`
- Title: DM Serif Display, 22px, `--inchiostro`
- Description: DM Sans 14px, `--inchiostro-light`, max 2 lines
- CTA button: primary style (`--terra` bg), navigates to target page, closes modal
- Secondary link: "Scopri più tardi" — dismisses only

**Tip rotation** (`new Date().getDay()`, 0=Sunday):

| Day | Feature | Target page |
|-----|---------|-------------|
| 0 Sun | Assistente AI — chiedi chi sostituisce un assente | `chat` |
| 1 Mon | Turni — cambio manuale con candidati ordinati per idoneità | `turni` |
| 2 Tue | Archiviazione — storico conservato per utenti/operatori | `utenti` |
| 3 Wed | Ricerca per zona — chiedi all'AI chi lavora in una zona | `chat` |
| 4 Thu | Operatori preferiti per equipe — seleziona tutta un'equipe | `utenti` |
| 5 Fri | Gap ore — scopri utenti con ore scoperte | `dashboard` |
| 6 Sat | Email riepilogo — invia i turni del giorno automaticamente | `chat` |

**Props:** `onClose: () => void`, `onNavigate: (pagina: Pagina) => void`

**Integration:** `App.tsx` renders `<DailySplash>` after auth, passes `setPagina` as `onNavigate`.

---

## 3. Layout.tsx — Sidebar Enhancements

### 3a. Live badge "turni scoperti"
- New endpoint: `GET /api/dashboard/badges` → `{ turniScoperti: number }`
- `Layout.tsx` fetches on mount (fire-and-forget, no loading state)
- If `turniScoperti > 0`: dot `8px` circle, `--terra` bg, pulse animation, positioned top-right of the "Turni" nav icon
- Pulse: `@keyframes pulse { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.7; transform:scale(1.3) } }`, 1.8s infinite

### 3b. User avatar
- Replace plain text name with: initials circle (28px, `--terra-light` bg, `--terra` text, `border-radius: 50%`, DM Sans 11px bold) + name/email stack alongside

### 3c. Nav hover refinement
- Hover bg: `rgba(255,255,255,0.07)` (was 0.06) + transition `var(--transition-base)`
- Active item: keep `--terra` bg, add subtle `box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08)`

### 3d. Logo micro-text
- Below the `menti` italic: `fontSize: 9px, color: rgba(255,255,255,0.2), letterSpacing: '0.15em'` → text `"POWERED BY AI"`

---

## 4. PageTransition Component (`PageTransition.tsx`)

Wrapper `<div>` with CSS animation on mount:

```css
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page-enter { animation: pageEnter var(--transition-slow) forwards; }
```

`App.tsx`: wraps `{renderPagina()}` in `<PageTransition key={pagina}>`. The `key` prop forces remount on navigation → triggers animation every time.

---

## 5. SkeletonCard Component (`SkeletonCard.tsx`)

Props: `width?: string, height?: number, borderRadius?: number, lines?: number`

Default: shimmer block(s) with:
```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
background: linear-gradient(90deg, var(--sabbia) 25%, var(--bordo) 50%, var(--sabbia) 75%);
background-size: 800px 100%;
animation: shimmer 1.4s infinite linear;
```

Used in:
- `Operatori.tsx`: replace `<div>Caricamento...</div>` with 6 skeleton cards in the same grid
- `Utenti.tsx`: same pattern

---

## 6. Cosmetic Extras (scattered improvements)

### Modal.tsx
- Add `backdropFilter: 'blur(4px)'` to overlay
- Add `boxShadow: 'var(--shadow-modal)'` to inner card

### Primary buttons (globally)
- Add `boxShadow: '0 2px 8px rgba(196,113,74,0.25)'`
- Hover: lift with `boxShadow: 'var(--shadow-hover)'`, `transform: translateY(-1px)`
- Active: `transform: translateY(0)`

### Input focus glow
- Add global style in `index.css`:
  ```css
  input:focus, select:focus, textarea:focus {
    box-shadow: 0 0 0 3px rgba(196,113,74,0.15);
    outline: none;
  }
  ```

### Card hover in Operatori.tsx + Utenti.tsx
- Already have inline `onMouseEnter` shadow — replace with `var(--shadow-hover)` token

---

## 7. Backend: `/api/dashboard/badges` endpoint

Lightweight endpoint, no new Prisma models:

```typescript
app.get("/api/dashboard/badges", async (req, res) => {
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const domani = new Date(oggi); domani.setDate(oggi.getDate()+1);
  const scoperti = await prisma.intervento.count({
    where: { data: { gte: oggi, lt: domani }, operatoreId: null }
  });
  res.json({ turniScoperti: scoperti });
});
```

---

## 8. Files Changed

| File | Change type |
|------|-------------|
| `frontend/src/index.css` | +tokens, +keyframes, +input focus |
| `frontend/src/components/DailySplash.tsx` | NEW |
| `frontend/src/components/PageTransition.tsx` | NEW |
| `frontend/src/components/SkeletonCard.tsx` | NEW |
| `frontend/src/components/Layout.tsx` | badges, avatar, hover, logo |
| `frontend/src/components/Modal.tsx` | blur + shadow |
| `frontend/src/components/Operatori.tsx` | skeleton loader, shadow token |
| `frontend/src/components/Utenti.tsx` | skeleton loader, shadow token |
| `frontend/src/App.tsx` | integrate DailySplash + PageTransition |
| `backend/src/index.ts` | +/api/dashboard/badges |

---

## Constraints

- No changes to routing logic, API calls, data models, or auth
- All animations respect `prefers-reduced-motion` via `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }`
- `DailySplash` never blocks navigation — dismiss always works
