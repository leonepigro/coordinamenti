# UX Restyling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add polished "app feel" to Coordinamenti — card shadows, page transitions, skeleton loaders, live sidebar badges, and a daily feature tip modal — with zero functional changes.

**Architecture:** Additive only. New CSS tokens in `index.css`, three new components (`DailySplash`, `PageTransition`, `SkeletonCard`), enhancements to `Layout.tsx`, `Modal.tsx`, `Operatori.tsx`, `Utenti.tsx`, `App.tsx`, and one new lightweight backend endpoint.

**Tech Stack:** React 18, TypeScript, inline styles + CSS variables, Express/Prisma backend.

---

## File Map

| File | Action |
|------|--------|
| `frontend/src/index.css` | Add shadow/radius/transition tokens, shimmer keyframe, input focus glow, page-enter keyframe, reduced-motion override |
| `frontend/src/components/SkeletonCard.tsx` | NEW — shimmer placeholder block |
| `frontend/src/components/PageTransition.tsx` | NEW — fade+slide wrapper on page change |
| `frontend/src/components/DailySplash.tsx` | NEW — once-per-day feature tip modal |
| `frontend/src/components/Layout.tsx` | Live badge on Turni nav item, user avatar initials, logo micro-text, hover polish |
| `frontend/src/components/Modal.tsx` | Add backdrop blur + shadow-modal |
| `frontend/src/components/Operatori.tsx` | Replace loading div with SkeletonCard grid; replace inline shadow with token |
| `frontend/src/components/Utenti.tsx` | Same as Operatori |
| `frontend/src/App.tsx` | Integrate DailySplash (once-per-day guard) + PageTransition key={pagina} |
| `backend/src/index.ts` | Add GET /api/dashboard/badges endpoint |

---

## Task 1: CSS tokens + global cosmetic

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add tokens and keyframes to `:root` and global styles**

Replace the entire `frontend/src/index.css` content — or append after the existing `:root` block — with the additions below. Keep everything that exists, add only the new blocks:

```css
/* ADD to :root — after existing variables */
:root {
  /* existing vars unchanged … */
  --shadow-card:  0 1px 3px rgba(44,36,32,0.06), 0 4px 12px rgba(44,36,32,0.04);
  --shadow-hover: 0 4px 16px rgba(196,113,74,0.12), 0 1px 4px rgba(44,36,32,0.08);
  --shadow-modal: 0 8px 40px rgba(44,36,32,0.16);
  --radius-card:  14px;
  --transition-base: 0.18s ease;
  --transition-slow: 0.3s ease;
}

/* ADD at end of file */

/* Shimmer animation for skeleton loaders */
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}

/* Page enter animation */
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Pulse animation for live badges */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.7; transform: scale(1.35); }
}

/* Input focus glow */
input:focus,
select:focus,
textarea:focus {
  box-shadow: 0 0 0 3px rgba(196,113,74,0.15) !important;
  outline: none !important;
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 2: Verify**

Start dev server (`npm run dev` in `frontend/`). Open app in browser. Check devtools → Elements → `:root` and confirm the 6 new CSS variables appear. No visual breakage expected.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: add shadow/transition tokens, shimmer/pageEnter/pulse keyframes, input focus glow"
```

---

## Task 2: Backend badges endpoint

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add endpoint**

Find the block of `app.get("/api/dashboard/…")` routes and add before `app.post("/api/chat/stream"`:

```typescript
app.get("/api/dashboard/badges", async (_req, res) => {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);
  const turniScoperti = await prisma.intervento.count({
    where: { data: { gte: oggi, lt: domani }, operatoreId: null },
  });
  res.json({ turniScoperti });
});
```

- [ ] **Step 2: Verify**

With backend running, call:
```
curl http://localhost:3001/api/dashboard/badges
```
Expected: `{"turniScoperti":0}` (or a number if there are uncovered shifts today).

- [ ] **Step 3: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: add /api/dashboard/badges endpoint for live sidebar indicator"
```

---

## Task 3: SkeletonCard component

**Files:**
- Create: `frontend/src/components/SkeletonCard.tsx`

- [ ] **Step 1: Create component**

```tsx
export default function SkeletonCard({
  width = "100%",
  height = 120,
  borderRadius = 14,
}: {
  width?: string;
  height?: number;
  borderRadius?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background:
          "linear-gradient(90deg, var(--sabbia) 25%, var(--bordo) 50%, var(--sabbia) 75%)",
        backgroundSize: "800px 100%",
        animation: "shimmer 1.4s infinite linear",
        flexShrink: 0,
      }}
    />
  );
}
```

- [ ] **Step 2: Verify builds**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors referencing SkeletonCard.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SkeletonCard.tsx
git commit -m "feat: add SkeletonCard shimmer component"
```

---

## Task 4: PageTransition component

**Files:**
- Create: `frontend/src/components/PageTransition.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useEffect, useRef } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    requestAnimationFrame(() => {
      el.style.transition =
        "opacity var(--transition-slow), transform var(--transition-slow)";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }, []);

  return (
    <div ref={ref} style={{ height: "100%", willChange: "opacity, transform" }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PageTransition.tsx
git commit -m "feat: add PageTransition fade-slide component"
```

---

## Task 5: DailySplash component

**Files:**
- Create: `frontend/src/components/DailySplash.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useState, useEffect } from "react";
import type { Pagina } from "../App";

const TIPS: {
  titolo: string;
  descrizione: string;
  cta: string;
  pagina: Pagina;
}[] = [
  {
    titolo: "Assistente AI",
    descrizione:
      "Chiedi chi può sostituire un operatore assente oggi — l'AI consulta disponibilità, skill e preferenze in tempo reale.",
    cta: "Apri Assistente",
    pagina: "chat",
  },
  {
    titolo: "Cambio manuale turni",
    descrizione:
      "Clicca su qualsiasi intervento nella griglia per riassegnarlo. I candidati sono già ordinati per idoneità.",
    cta: "Vai ai Turni",
    pagina: "turni",
  },
  {
    titolo: "Archiviazione",
    descrizione:
      "Utenti e operatori possono essere archiviati con motivo e data. Lo storico è sempre consultabile nella tab Archiviati.",
    cta: "Gestisci Utenti",
    pagina: "utenti",
  },
  {
    titolo: "Ricerca per zona",
    descrizione:
      "Chiedi all'assistente chi lavora in una zona specifica — cerca per indirizzo tra operatori e utenti.",
    cta: "Apri Assistente",
    pagina: "chat",
  },
  {
    titolo: "Operatori preferiti per equipe",
    descrizione:
      "Nella scheda utente puoi assegnare operatori raggruppati per equipe e selezionare un'intera equipe con un click.",
    cta: "Gestisci Utenti",
    pagina: "utenti",
  },
  {
    titolo: "Gap ore",
    descrizione:
      "Dalla dashboard vedi subito quali utenti hanno ore scoperte rispetto al contratto e puoi proporre nuove attività.",
    cta: "Vai alla Dashboard",
    pagina: "dashboard",
  },
  {
    titolo: "Email riepilogo",
    descrizione:
      "Chiedi all'assistente di inviare il riepilogo dei turni del giorno — gli operatori ricevono la loro agenda via email.",
    cta: "Apri Assistente",
    pagina: "chat",
  },
];

export function getSplashKey() {
  return `cm_splash_${new Date().toISOString().slice(0, 10)}`;
}

export default function DailySplash({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (p: Pagina) => void;
}) {
  const [visible, setVisible] = useState(false);
  const tip = TIPS[new Date().getDay() % 7];
  const oggi = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(getSplashKey(), "1");
    onClose();
  }

  function goToFeature() {
    localStorage.setItem(getSplashKey(), "1");
    onNavigate(tip.pagina);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(44,36,32,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
      onClick={dismiss}
    >
      <div
        style={{
          background: "var(--bianco)",
          borderRadius: 20,
          padding: "28px 28px 24px",
          maxWidth: 420,
          width: "calc(100vw - 40px)",
          boxShadow: "var(--shadow-modal)",
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "transform 0.3s ease, opacity 0.3s ease",
          opacity: visible ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--grigio)",
              textTransform: "capitalize",
            }}
          >
            {oggi}
          </div>
          <button
            onClick={dismiss}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "var(--grigio)",
              padding: "0 0 0 12px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--terra-light)",
            color: "var(--terra-dark)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 500,
            marginBottom: 14,
          }}
        >
          💡 Funzione del giorno
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            color: "var(--inchiostro)",
            lineHeight: 1.25,
            marginBottom: 10,
          }}
        >
          {tip.titolo}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 14,
            color: "var(--inchiostro-light)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {tip.descrizione}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={goToFeature}
            style={{
              flex: 1,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "var(--terra)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(196,113,74,0.3)",
              transition: "transform var(--transition-base), box-shadow var(--transition-base)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "var(--shadow-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(196,113,74,0.3)";
            }}
          >
            {tip.cta}
          </button>
          <button
            onClick={dismiss}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "none",
              color: "var(--grigio)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Più tardi
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify builds**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DailySplash.tsx
git commit -m "feat: add DailySplash once-per-day feature tip modal"
```

---

## Task 6: App.tsx integration

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add imports**

At the top of `App.tsx`, add:

```tsx
import DailySplash, { getSplashKey } from "./components/DailySplash";
import PageTransition from "./components/PageTransition";
```

- [ ] **Step 2: Add splash state**

Inside the `App` component, after `const [messaggioPendente, …]`:

```tsx
const [mostraSplash, setMostraSplash] = useState(false);

useEffect(() => {
  if (autenticato && utente?.ruolo !== "operatore") {
    if (!localStorage.getItem(getSplashKey())) {
      setMostraSplash(true);
    }
  }
}, [autenticato, utente]);
```

- [ ] **Step 3: Wrap page render with PageTransition and render DailySplash**

In the `return` block, inside `<Layout>`, wrap the page content and add `DailySplash`:

```tsx
return (
  <Layout
    pagina={pagina}
    setPagina={setPagina}
    onLogout={() => { auth.logout(); setAutenticato(false); }}
    utente={utente}
  >
    <PageTransition key={pagina}>
      {pagina === "dashboard" && <Dashboard onNavigate={setPagina} onChiediSuggerimento={chiediSuggerimento} />}
      {pagina === "mappa" && <Mappa />}
      {pagina === "turni" && <TurniGriglia />}
      {pagina === "operatori" && <Operatori />}
      {pagina === "utenti" && <Utenti />}
      {pagina === "equipe" && <Equipe />}
      {pagina === "indisponibilita" && <Indisponibilita />}
      {pagina === "skill" && <Skill />}
      {pagina === "piani" && <PianiAssistenziali />}
      {pagina === "servizi" && <TipiServizio />}
      {pagina === "chat" && (
        <ChatAI
          messaggi={messaggi}
          setMessaggi={setMessaggi}
          messaggioPendente={messaggioPendente}
          setMessaggioPendente={(v) => setMessaggioPendente(v)}
        />
      )}
      {pagina === "utenti-app" && utente?.ruolo === "admin" && <GestioneAccount />}
    </PageTransition>

    {mostraSplash && (
      <DailySplash
        onClose={() => setMostraSplash(false)}
        onNavigate={(p) => { setPagina(p); setMostraSplash(false); }}
      />
    )}
  </Layout>
);
```

- [ ] **Step 4: Verify**

Open app in browser. First visit of the day: splash appears after 400ms with today's tip. Click CTA → navigates to target page, splash closes. Refresh → no splash (localStorage key set). Navigate between pages → fade+slide animation fires.

To force splash to show again for testing: run in browser console:
```js
localStorage.removeItem(Object.keys(localStorage).find(k => k.startsWith('cm_splash_')))
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: integrate DailySplash and PageTransition in App"
```

---

## Task 7: Layout.tsx sidebar enhancements

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Add badges fetch**

After the existing `useEffect` for `/config` and `/version`, add:

```tsx
const [turniScoperti, setTurniScoperti] = useState(0);

useEffect(() => {
  api.get<{ turniScoperti: number }>("/dashboard/badges")
    .then((res) => setTurniScoperti(res.data.turniScoperti))
    .catch(() => {});
}, []);
```

- [ ] **Step 2: Add user avatar initials helper**

Before the `return`, add:

```tsx
const inizialiUtente = (utenteLocale?.nome ?? utente?.nome ?? "")
  .split(" ")
  .map((n: string) => n[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();
```

- [ ] **Step 3: Update logo area — add micro-text**

Find the logo block (the `<div>` with `"DM Serif Display"` font and `menti`) and add after the `<span style={{ fontStyle: "italic" }}>menti</span>`:

```tsx
<div
  style={{
    fontSize: 9,
    color: "rgba(255,255,255,0.2)",
    letterSpacing: "0.15em",
    marginTop: 6,
    textTransform: "uppercase" as const,
  }}
>
  Powered by AI
</div>
```

- [ ] **Step 4: Add pulse badge on Turni nav item**

In the nav button render, find where `{v.label}` is rendered and update the button content for `v.id === "turni"`:

```tsx
<button key={v.id} onClick={() => naviga(v.id)} style={{ /* existing styles */ }}>
  <span style={{ fontSize: 13, opacity: attiva ? 1 : 0.7, position: "relative" as const }}>
    {v.icona}
    {v.id === "turni" && turniScoperti > 0 && (
      <span
        style={{
          position: "absolute" as const,
          top: -3,
          right: -4,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--terra)",
          animation: "pulse 1.8s infinite",
        }}
      />
    )}
  </span>
  {v.label}
</button>
```

- [ ] **Step 5: Replace user name with avatar + name**

Find the `<button>` that opens `setProfiloAperto` (shows name + email). Replace its inner content:

```tsx
<button
  onClick={() => { setProfiloAperto(true); setSidebarAperta(false); }}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textAlign: "left" as const,
    marginBottom: 10,
  }}
  title="Modifica profilo"
>
  <div
    style={{
      width: 30,
      height: 30,
      borderRadius: "50%",
      background: "var(--terra-light)",
      color: "var(--terra-dark)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 600,
      flexShrink: 0,
    }}
  >
    {inizialiUtente}
  </div>
  <div>
    <div style={{ fontSize: 12, color: "var(--bianco)", fontWeight: 500 }}>
      {utenteLocale?.nome ?? utente?.nome ?? ""}
    </div>
    <div style={{ fontSize: 11, color: "var(--grigio)" }}>
      {utenteLocale?.email ?? utente?.email ?? utente?.ruolo ?? ""}
    </div>
  </div>
</button>
```

- [ ] **Step 6: Verify**

Check sidebar: "Powered by AI" micro-text visible, user avatar circle shows initials, pulse dot on Turni if any uncovered shifts today.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "style: sidebar — live badge turni scoperti, user avatar, logo micro-text"
```

---

## Task 8: Modal.tsx cosmetic

**Files:**
- Modify: `frontend/src/components/Modal.tsx`

- [ ] **Step 1: Read current Modal.tsx**

Open `frontend/src/components/Modal.tsx`. Find the overlay `<div>` (full-screen backdrop) and the inner card `<div>`.

- [ ] **Step 2: Add blur to overlay**

On the overlay div, add to its style:
```tsx
backdropFilter: "blur(4px)",
WebkitBackdropFilter: "blur(4px)",
```

- [ ] **Step 3: Add shadow to card**

On the inner card div, add to its style:
```tsx
boxShadow: "var(--shadow-modal)",
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Modal.tsx
git commit -m "style: Modal — backdrop blur + shadow-modal"
```

---

## Task 9: Operatori.tsx + Utenti.tsx — skeleton + shadow tokens

**Files:**
- Modify: `frontend/src/components/Operatori.tsx`
- Modify: `frontend/src/components/Utenti.tsx`

### Operatori.tsx

- [ ] **Step 1: Import SkeletonCard**

At top of `Operatori.tsx`:
```tsx
import SkeletonCard from "./SkeletonCard";
```

- [ ] **Step 2: Replace loading state**

Find:
```tsx
if (loading) return <div style={{ padding: 32, color: "var(--grigio)", fontSize: 14 }}>Caricamento...</div>;
```

Replace with:
```tsx
if (loading) return (
  <div style={{ padding: 32 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} height={160} />
      ))}
    </div>
  </div>
);
```

- [ ] **Step 3: Replace inline card hover shadow with token**

In the card `onMouseEnter` handler, find the hardcoded shadow string:
```tsx
e.currentTarget.style.boxShadow = "0 2px 12px rgba(196,113,74,0.08)";
```
Replace with:
```tsx
e.currentTarget.style.boxShadow = "var(--shadow-hover)";
```

### Utenti.tsx

- [ ] **Step 4: Apply same changes to Utenti.tsx**

Import `SkeletonCard`, replace loading div with skeleton grid (same pattern as Operatori), update card hover shadow to `var(--shadow-hover)`. Note: Utenti uses a table layout rather than a card grid — use a skeleton list instead:

```tsx
if (loading) return (
  <div style={{ padding: 32 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i} height={52} borderRadius={10} />
      ))}
    </div>
  </div>
);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Operatori.tsx frontend/src/components/Utenti.tsx
git commit -m "style: skeleton loaders for Operatori + Utenti, shadow-hover token"
```

---

## Task 10: Final polish + push

- [ ] **Step 1: Full visual pass**

Navigate through all pages. Check:
- [ ] Page transitions fire on each navigation (fade + 6px slide)
- [ ] Splash appears on first load, not on second (check localStorage)
- [ ] CTA in splash navigates correctly
- [ ] Skeleton shows briefly before Operatori/Utenti load
- [ ] Sidebar shows user avatar + initials
- [ ] "Powered by AI" micro-text visible
- [ ] Modal has blur backdrop
- [ ] Input focus shows terra glow ring
- [ ] No console errors

- [ ] **Step 2: Push to staging + merge main**

```bash
git push origin staging
git checkout main
git merge staging
git push origin main
git checkout staging
```

---

## Self-Review Notes

- `getSplashKey()` exported from `DailySplash.tsx` and used in `App.tsx` — consistent.
- `turniScoperti` state in `Layout.tsx` fetched from `/api/dashboard/badges` (Task 2).
- `PageTransition key={pagina}` forces remount on navigation — triggers useEffect animation correctly.
- `prefers-reduced-motion` override in Task 1 covers all animations globally.
- Operatori loading check: currently `if (loading) return …` — replacement skeleton returns early the same way, no structural change.
- `DailySplash` only shown for non-operatore roles (`utente?.ruolo !== "operatore"`), consistent with sidebar voci filtering.
