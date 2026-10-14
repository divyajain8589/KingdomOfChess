# Kingdom of Chess: UI revamp spec ("The Academy Notebook")

**Figma frames read:** none. Figma was not used, as instructed, and is not authorised in this session anyway. If the client has Figma files, they need to connect Figma in their claude.ai connector settings.

**What I looked at:** every page in `frontend/src/app`, every component in `frontend/src/components`, and fresh Playwright screenshots of /login, /coach, /coach/tournaments/[id], /student, /student/tournaments/[id] and /student/schedule at 1400px and 375px. They are in `/private/tmp/claude-501/-Users-akshatbhanawat-Desktop-dj-Kingdom-of-Chess/f34053f2-9069-4559-99af-5a9dc776738f/scratchpad/pw/shots/`, next to the existing match screenshots. I played no games.

**File edited:** only `/Users/akshatbhanawat/Desktop/dj/Kingdom of Chess/frontend/src/app/globals.css`, and only its `@theme inline`, `:root` and `.dark` blocks. `@layer base` is unchanged. I checked it with a standalone Tailwind compile (`@tailwindcss/node`): every new utility resolves (`text-h1`, `text-eyebrow`, `text-clock`, `shadow-card`, `shadow-raised`, `bg-board-dark`, `bg-brand-orange-soft`, `ease-spring`, and so on).

**Restart needed:** the running `next dev` (pid 91124) is not picking up file changes. The browser still gets the old CSS even after `touch`, so restart the dev server to see the new tokens. Nothing was committed.

---

## 1. Design direction

**"The Academy Notebook."** Warm cream paper, navy ink, and orange used like a coach's marker pen. Pages read like a well-made scoresheet:
- a small orange eyebrow (`— TOURNAMENTS`);
- a tight, heavy navy headline, sometimes with one italic orange word (*live*, *move*, *champion*);
- monospace for anything a chess player would write on a scoresheet: time controls, dates, scores, clocks, moves.

The chessboard pattern is the brand texture, not stock icons. Cards are white sheets on paper with a soft warm border, not grey shadcn boxes. Navy "night" panels are kept for the big moments: the login hero, matchmaking, the game-over moment and the tournament winner.

**Principles**
1. **One loud thing per screen.** Each screen has exactly one primary CTA (navy, or orange for "play now" actions) and one hero element (on the match page, the board). Everything else is quieter: outline or ghost buttons, muted text.
2. **Write it like a scoresheet.** Metadata goes in mono, label-less where the format explains itself (`5+0`, `13/10/2026 · 20:59`, `1–0`). Do not put a lucide icon next to every fact.
3. **Colour always has words.** Win, draw, loss, status and turn always carry a text label. Colour only reinforces it.
4. **Kid-sized, parent-credible.** Tap targets are at least 44px, copy is warm and short, and nothing is babyish: no emoji in headlines, no cartoon fonts.
5. **Motion means something is happening.** Pulsing appears only on live things: a live pill, your running clock, matchmaking. Everything respects `prefers-reduced-motion`.

---

## 2. Design tokens (already written to globals.css)

**Theme decision:** the product is **light-only**. `.dark` is kept as a navy "night study" palette in sync with `:root`, so shadcn primitives never fall back to neutral grey. Do not ship a theme toggle.

**Token changes (variable: old → new)**

| Variable | Old | New | Notes |
|---|---|---|---|
| `--background` | 0.978 0.012 80 | `oklch(0.967 0.016 79.4)` | #faf3e8 paper |
| `--foreground` | 0.145 0 0 | `oklch(0.248 0.049 253.4)` | #0f2238 navy ink, 14.6:1 on paper |
| `--card`, `--popover` | white | white (unchanged) | |
| `--card-foreground`, `--popover-foreground` | 0.145 0 0 | navy ink | |
| `--primary` | 0.34 0.09 252 | `oklch(0.344 0.091 251.4)` | #0b3a66, 11.6:1 with white |
| `--primary-foreground` | 0.985 0 0 | `oklch(0.99 0.009 78.3)` | |
| `--secondary`, `--muted` | 0.97 0 0 / 0.95 0.012 80 | `oklch(0.937 0.025 81.1)` | warm inset |
| `--muted-foreground` | 0.556 0 0 | `oklch(0.514 0.029 257.7)` | #5d6878; 5.1:1 on paper, 4.7:1 on inset |
| `--accent` / `--accent-foreground` | grey | `oklch(0.939 0.016 248)` / navy | hover tint |
| `--destructive` | 0.577 0.245 27 | `oklch(0.538 0.189 24.9)` | #c42b30, 5.6:1 with white |
| `--border` | 0.9 0.015 80 | `oklch(0.893 0.033 81)` | #e7dac4 |
| `--input` | 0.922 0 0 | `oklch(0.825 0.048 80.7)` | #d6c3a3, visible input edge |
| `--ring` | 0.55 0.12 252 | `oklch(0.646 0.194 41.1)` | #ea580c. Use at **full opacity with ring-offset**: 3.2:1 on cream, 3.3:1 beside navy |
| `--radius` | 0.625rem | `0.75rem` | lg 12, xl 16, 2xl 20, 3xl 28 |
| `--brand-orange` | 0.68 0.19 47 | `oklch(0.705 0.187 47.6)` | #f97316, fills and decor only |
| `--chart-1…5` | greys | navy, info blue, board blue, orange, gold | |
| `--sidebar-*` | greys | cream / navy equivalents | |

**New tokens.** Each is exposed as a Tailwind colour (e.g. `bg-surface-inset`, `text-win`).

- **Surfaces:** `surface-raised` #fffbf5, `surface-inset` #f3e9d8, `surface-inset-strong` #ece0cb, `surface-night` (navy panel), `border-strong` #d6c3a3.
- **Primary:** `primary-hover` #0a3159, `primary-soft` #e3ecf5.
- **Orange:**
  - `brand-orange-ink` #b03a0a: orange text at body sizes (5.5:1 on paper).
  - `brand-orange-display` #ea580c: the italic accent word in headlines of 24px or more only.
  - `brand-orange-soft` #fdebd9.
  - `brand-orange-foreground`: navy. Orange buttons use **navy text** (5.7:1). White on #f97316 is 2.8:1 and fails.
- **Semantic:** each ink colour passes AA (at least 4.5:1) on its soft colour.
  - `success` #146c36 on `success-soft`
  - `warning` #9c4a06 on `warning-soft`
  - `danger` #c42b30 on `danger-soft`
  - `info` #1d64ad on `info-soft`
- **Results:** `win` and `win-soft` alias success; `draw` #4b5d78 slate on `draw-soft`; `loss` and `loss-soft` alias danger.
- **Medals:** `gold` #d4a017, `gold-soft` #fbf0cc, `gold-ink` #8a6100 (text), `silver` #9aa5b1, `bronze` #b8743a.
- **Board:** `board-light` #f3e7d3, `board-dark` #7b9bbe, `board-last-light` #f6d48f, `board-last-dark` #d9a75c, `board-frame` (navy).
- **Type scale** (utilities; each sets size, line-height, tracking and weight):

| Utility | Size | Line-height | Tracking | Weight | Use |
|---|---|---|---|---|---|
| `text-display` | 44px | 1.05 | -0.035em | 800 | login hero, game-over headline |
| `text-h1` | 32px | 1.15 | -0.025em | 800 | page titles; use `text-[26px] sm:text-h1` on mobile |
| `text-h2` | 22px | 1.25 | -0.015em | 700 | section titles |
| `text-h3` | 17px | 1.4 | | 700 | card titles |
| `text-body` | 15px | 1.6 | | | default body; set on `body` |
| `text-small` | 13px | 1.45 | | | |
| `text-eyebrow` | 11px | 16px | 0.16em | 700 | always add `uppercase` |
| `text-clock` | 32px | 1 | | 700 | always with `font-mono tabular-nums` |

- **Shadows:**
  - `shadow-card`: hairline plus a 3px blur.
  - `shadow-raised`: hover and floating panels.
  - `shadow-pop`: dialogs and the game-over card.
  - `shadow-cta`: navy glow under primary CTAs.
  - `shadow-cta-orange`.
  - All shadows are navy-tinted, never black.
- **Easing:** `ease-out-soft` (0.22,1,0.36,1) and `ease-spring` (0.34,1.56,0.64,1).
- **Spacing rhythm:** a 4px base.
  - Page gutter: `px-4 sm:px-6`.
  - Page top: `pt-6 sm:pt-10`.
  - Gap between page sections: `space-y-10`.
  - Gap inside a section: `space-y-4`.
  - Card padding: `p-5 sm:p-6`.
  - Max width: `max-w-6xl`. The match page uses `max-w-[1200px]`.

**Fonts.** Keep Plus Jakarta Sans as the only text face and Geist Mono for metadata and clocks. A serif would not add enough.

In `layout.tsx`, load the full range so the italic accent words and 800 headlines render as real faces, not synthetic ones:

```ts
Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400","500","600","700","800"], style: ["normal","italic"] })
```

Also in the foundation work: body text is weight 500, with `font-feature-settings: "ss01"` off.

**CSS for the foundation group to add to globals.css.** These are outside the token blocks, so I did not add them.

```css
@layer base {
  body { @apply bg-background text-foreground text-body font-medium; }
  h1,h2,h3 { @apply text-foreground text-balance; }
  :focus-visible { outline: none; }
}
@utility eyebrow { @apply text-eyebrow uppercase text-brand-orange-ink; }
@utility checker { /* brand texture; set --checker-color and --checker-size */
  background-image: conic-gradient(var(--checker-color, oklch(0.248 0.049 253.4 / 0.04)) 25%, transparent 0 50%, var(--checker-color, oklch(0.248 0.049 253.4 / 0.04)) 0 75%, transparent 0);
  background-size: var(--checker-size, 28px) var(--checker-size, 28px);
}
@utility focus-ring { @apply outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background; }
@keyframes live-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
@keyframes clock-breathe { 0%,100% { box-shadow: 0 0 0 0 oklch(0.538 0.189 24.9 / .45) } 50% { box-shadow: 0 0 0 6px oklch(0.538 0.189 24.9 / 0) } }
@keyframes knight-hop { 0%,100% { transform: translateY(0) rotate(0) } 40% { transform: translateY(-14px) rotate(-8deg) } 60% { transform: translateY(-14px) rotate(4deg) } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
```

---

## 3. Signature elements

### 3.1 Eyebrow
Markup: `<p className="eyebrow">— Your tournaments</p>`. It uses a real em dash followed by a space, sits 8px above the title (`mb-2`), and appears on every page header and on major section headers. Never put two eyebrows in one card.

### 3.2 Headline accent word
Markup: `<em className="not-italic … ">`. Use real italics: `italic font-extrabold text-brand-orange-display`. At most one accent word per screen, and only in display, h1 or h2 text of 24px or larger.

Examples:
- "Tournaments, played *live*."
- "Your *move*."
- "Ready for your next *game*?"

### 3.3 Logo (`components/logo.tsx`, replaces the lucide Crown)
The wordmark is HTML text with an inline SVG crown sitting on the **O of "KINGDOM"**.

```tsx
<span className="inline-flex items-baseline font-extrabold uppercase tracking-[0.08em] text-primary leading-none text-[15px] sm:text-base">
  KINGD<span className="relative inline-block">O
    <svg viewBox="0 0 24 14" aria-hidden className="absolute left-1/2 -top-[0.62em] w-[0.86em] -translate-x-1/2 fill-brand-orange">
      <path d="M2 11.5 4 2.5l4.6 4.6L12 .8l3.4 6.3L20 2.5l2 9z"/><rect x="2" y="12.2" width="20" height="1.8" rx=".9"/>
    </svg></span>M <span className="text-brand-orange-ink">OF</span> CHESS
</span>
```

- Add `aria-label="Kingdom of Chess"` on the wrapper.
- **Logo mark** (`LogoMark`): a `size-9 rounded-[10px] bg-primary grid place-items-center` tile with the same crown SVG in brand orange at `w-5`. Use it on the mobile header, as the favicon, and in the login hero at `size-14`.
- **Variant `onNight`:** wordmark in `text-primary-foreground`, "OF" in `brand-orange`.

### 3.4 Board theme (react-chessboard v5 `options`)
- **Squares:**
  - `lightSquareStyle: { backgroundColor: "var(--board-light)" }`
  - `darkSquareStyle: { backgroundColor: "var(--board-dark)" }`
- **Frame:** wrap the board in a navy bezel: `rounded-2xl bg-board-frame p-1.5 sm:p-2 shadow-raised`. Inner wrapper: `overflow-hidden rounded-[10px]`. This frame is the single biggest "bespoke" cue.
- **Coordinates:** `showNotation: true`.
  - `alphaNotationStyle` and `numericNotationStyle`: `{ fontFamily: "var(--font-geist-mono)", fontSize: 10, fontWeight: 600, color: "oklch(0.248 0.049 253.4 / .55)" }`.
  - Set `numericNotationStyle.top: 3` and `left: 4`.
  - Set `alphaNotationStyle.bottom: 2` and `right: 4`.
- **Last move:** stop using the orange rgba overlay. On blue squares it turns muddy brown (visible in the current screenshot). Replace the square colour with a parity helper: `isDark(sq) = (file + rank) % 2 === 0`, where a1 is dark. From and to squares get `backgroundColor: isDark ? "var(--board-last-dark)" : "var(--board-last-light)"`; the from square at 85% via `opacity` is not possible, so both squares use full fill.
- **Selected piece:** same fill as last move, plus `boxShadow: "inset 0 0 0 3px var(--primary)"`.
- **Legal-move dot:** `backgroundImage: "radial-gradient(circle, oklch(0.248 0.049 253.4 / .32) 17%, transparent 19%)"`.
- **Legal capture:** a ring instead of a dot: `radial-gradient(circle, transparent 60%, oklch(0.248 0.049 253.4 / .32) 62%, oklch(0.248 0.049 253.4 / .32) 76%, transparent 78%)`.
- **Check:** `backgroundImage: "radial-gradient(circle, oklch(0.6 0.22 25 / .95) 0%, oklch(0.6 0.22 25 / .55) 40%, transparent 72%)"`. It layers over the last-move fill.
- **Drop target hover:** `dropSquareStyle: { boxShadow: "inset 0 0 0 4px var(--brand-orange)" }`.
- **Dragging:** `draggingPieceStyle: { transform: "scale(1.12)", filter: "drop-shadow(0 6px 8px oklch(0.248 0.049 253.4 / .35))" }`. The ghost piece is left at opacity .35.
- **Review mode:** the bezel changes to `bg-brand-orange` and a small tab hangs off the top-left of the frame (see 5.6).
- **Piece art:** keep the default set. Reuse `defaultPieces` from `react-chessboard` (e.g. `defaultPieces.wQ()`) for the promotion picker and illustrations, instead of Unicode glyphs, which render inconsistently.

### 3.5 Checker texture
The `checker` utility (see 2).
- On paper: `--checker-color: oklch(0.248 0.049 253.4 / .035)`.
- On navy: `--checker-color: oklch(1 0 0 / .045)`, 32px.
- Use it on the login hero, the page-header band on detail pages (fading out with `mask-image: linear-gradient(to bottom, black, transparent)`), empty-state tiles, the matchmaking card and the game-over card. Never use it behind body text at more than 5% opacity.

### 3.6 StatusPill
This is the tournament status. It replaces the Badge colour hacks.
- Shape: `inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold`.
- It always has a 6px leading dot (`size-1.5 rounded-full bg-current`).

| Status | Classes | Label | Dot |
|---|---|---|---|
| draft | `bg-surface-inset text-muted-foreground` | Draft | hollow (`ring-1 ring-current bg-transparent`) |
| open | `bg-info-soft text-info` | Open to join | |
| ongoing | `bg-brand-orange-soft text-brand-orange-ink` | Live now | `animate-[live-pulse_1.6s_ease-in-out_infinite]` |
| completed | `bg-success-soft text-success` | Finished | |

**LivePill** is used for individual games: `bg-brand-orange text-brand-orange-foreground h-6 rounded-full px-2.5 text-[11px] font-extrabold tracking-[0.12em]` with the text "LIVE" and a pulsing navy dot.

### 3.7 Rank medal
- Ranks 1 to 3: a 28px circle (`size-7 rounded-full grid place-items-center text-[13px] font-extrabold`).

| Rank | Fill | Text |
|---|---|---|
| 1 | gold | `text-gold-ink`, with `ring-2 ring-gold/40` and a tiny crown SVG (8px) above the circle |
| 2 | `bg-silver/25` | `text-foreground` |
| 3 | `bg-bronze/20` | `text-bronze` |

- Ranks 4 and up: plain mono `text-muted-foreground`, centred in the same 28px box.
- Ranks still unknown (no games played yet): "–".
- Add `aria-label="1st place"` and so on.

### 3.8 Avatar initials (`PlayerAvatar`)
- shadcn `Avatar` with `AvatarFallback`. Show two initials (first and last name), `font-extrabold`.
- Sizes: sm 28px, md 36px, lg 48px (player cards on the match page).
- Colour is picked by hashing `userId` (sum of char codes mod 6). bg/fg pairs:
  - navy-soft / navy: `bg-primary-soft text-primary`
  - orange-soft / orange-ink
  - success-soft / success
  - gold-soft / gold-ink
  - info-soft / info
  - draw-soft / draw
- Add `ring-2 ring-card` when avatars overlap.
- On the match page, the player's piece colour appears as an 12px chip at the bottom-right of the avatar: a white or black circle with a `ring-1 ring-border-strong` border. This shows who plays which colour without a text label cluttering the card. The name row still says "White" or "Black" in the sub-line.

### 3.9 Empty-state illustrations
These are a 96px tile: `size-24 rounded-2xl checker [--checker-size:24px] bg-surface-raised ring-1 ring-border grid place-items-center`, with one `defaultPieces` piece (48px) inside.
- No tournaments: white king, rotated -8deg.
- No games yet: white knight.
- No players: white pawn, with a second pawn at 40% opacity offset by 10px.
- Nothing scheduled: black rook.
- Error: black king lying on its side (`rotate-90`, the "resigned" king), which is a gentle and very chess way to say something broke.

---

## 4. Shared components

### 4.1 AppShell (`components/app-shell.tsx`)

**Desktop (`md:` and up)**
- Header: sticky, `h-16 bg-background/85 backdrop-blur border-b border-border`, inner `max-w-6xl px-6 flex items-center gap-8`.
- Left: the logo (wordmark).
- Nav: text links `h-16 inline-flex items-center text-[14px] font-semibold text-muted-foreground hover:text-foreground`.
  - Active link: `text-foreground` plus a 3px orange underline bar (`after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-brand-orange`), with `aria-current="page"`.
  - No grey pill background.
- Right side:
  - **ConnectionDot:** a status chip, not an icon. Show `h-7 rounded-full px-2.5 text-[12px] font-semibold` only when *not* connected: `bg-warning-soft text-warning` with "Reconnecting…" and a spinning `Loader2` (size-3). When connected, show only an 8px `bg-success` dot with `aria-label="Live updates on"` and a tooltip "Live updates on". Showing a green Wi-Fi icon all the time is noise.
  - **UserMenu:** a `DropdownMenu` trigger (`h-10 rounded-full pl-1 pr-3 gap-2 hover:bg-surface-inset focus-ring`) holding `PlayerAvatar sm`, the first name (`text-[14px] font-bold`) and a `ChevronDown` (size-4, muted).
  - Menu content: a label block (full name, plus a role chip "Coach" or "Student" in `text-eyebrow text-muted-foreground`), a separator, "My schedule" (students only), and "Sign out" (`LogOut` icon) in `text-destructive`.

**Mobile (below `md`)**
- Header `h-14`: LogoMark plus the compact wordmark ("KINGDOM OF CHESS" at 13px), then the ConnectionDot and the avatar-only UserMenu trigger (`size-10`) on the right.
- Students get a **bottom tab bar**: `fixed inset-x-0 bottom-0 z-30 h-16 pb-[env(safe-area-inset-bottom)] bg-card border-t border-border grid grid-cols-2`.
  - Tabs: "Play" (`Swords` icon) → /student, and "Schedule" (`CalendarDays`) → /student/schedule.
  - Each tab: `flex flex-col items-center justify-center gap-1 text-[11px] font-bold`. Active: `text-primary`, with the icon in a `h-7 w-12 rounded-full bg-primary-soft` capsule.
  - `main` gets `pb-24 md:pb-10`.
- Coaches have one destination, so they get no tab bar. Their logo links home.
- **Hide the tab bar on /matches/[id]** so the board gets the space.

**Main:** `mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 pt-6 sm:pt-10 pb-10`.

### 4.2 PageHeader (new `components/page-header.tsx`)
Props: `eyebrow`, `title` (ReactNode, so it can contain the accent word), `description?`, `actions?`, `back?: {href,label}`, `meta?: ReactNode`.

```
<header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
  <div className="max-w-2xl">
    {back && <Link className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full pl-2 pr-3 text-[13px] font-semibold text-muted-foreground hover:bg-surface-inset hover:text-foreground focus-ring"><ArrowLeft className="size-4"/>{label}</Link>}
    <p className="eyebrow mb-2">— {eyebrow}</p>
    <h1 className="text-[26px] leading-tight font-extrabold tracking-tight sm:text-h1">{title}</h1>
    {description && <p className="mt-2 text-body text-muted-foreground">{description}</p>}
    {meta && <div className="mt-4">{meta}</div>}
  </div>
  {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
</header>
```

- On mobile, actions stack under the text and the primary action is `w-full`.
- `meta` is a **MetaLine**: `font-mono text-[13px] text-muted-foreground` items separated by `·` (a `text-border-strong` middot). Example: `5+0 · 13/10/2026, 20:59 · 4 players`. No icons.

### 4.3 Stat tiles (`components/stat.tsx`)
- `Stat({label, value, sub?, tone?})`: `rounded-xl bg-surface-inset px-4 py-3`.
  - label: `text-eyebrow uppercase text-muted-foreground`.
  - value: `mt-1 font-mono text-[26px] font-bold tabular-nums leading-none text-foreground`.
  - sub: `text-[12px] text-muted-foreground`, e.g. "/ 4".
- `tone="accent"` changes it to `bg-primary text-primary-foreground` and is reserved for the player's rank.
- Group them in `grid grid-cols-3 gap-2`.

### 4.4 Cards
Foundation changes `ui/card.tsx`. The default Card is:
- `rounded-xl bg-card border border-border shadow-card` (remove `ring-1 ring-foreground/10`), with `--card-spacing: --spacing(5)` and `sm:--spacing(6)`.
- `CardTitle`: `text-h3`.
- `CardFooter`: `bg-surface-raised border-t border-border`.

Add a `variant` prop:
- `"night"`: `bg-surface-night text-primary-foreground border-transparent shadow-raised`, with the checker overlay. Used for matchmaking, game over and the winner.
- `"inset"`: `bg-surface-inset border-transparent shadow-none`.

Make a whole card clickable with `after:absolute after:inset-0` on the title link, and give it hover `shadow-raised -translate-y-0.5 transition ease-out-soft duration-200`.

### 4.5 Buttons (`ui/button.tsx`, foundation)
- **Base:** `rounded-lg font-bold`. Replace the focus classes with `focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`, and remove the `ring/50` opacity.
- **Sizes:**
  - `default` h-10 px-4 text-[14px]
  - `sm` h-9 px-3 text-[13px]
  - `lg` h-12 px-6 text-[15px] rounded-xl
  - `xl` (new) h-14 px-7 text-[16px] rounded-xl, for the main "play" CTAs
  - `icon` size-10, `icon-sm` size-9, `icon-lg` size-12
  - Drop `xs` from usage; it can stay in the file.
- **Variants:**
  - `default`: `bg-primary text-primary-foreground hover:bg-primary-hover shadow-cta active:translate-y-px`.
  - `play` (new): `bg-brand-orange text-brand-orange-foreground hover:bg-[color-mix(in_oklch,var(--brand-orange),black_6%)] shadow-cta-orange`. Use it **only** for the "Find an opponent", "Resume your game" and "Play again" actions.
  - `outline`: `bg-card border-border-strong text-foreground hover:bg-surface-inset`.
  - `ghost`: `text-muted-foreground hover:text-foreground hover:bg-surface-inset`.
  - `destructive`: `bg-danger-soft text-danger hover:bg-danger hover:text-white`.
  - `onNight` (new): `bg-white/10 text-primary-foreground ring-1 ring-white/20 hover:bg-white/15`.
- **Disabled:** `opacity-50 cursor-not-allowed shadow-none`.
- **Loading:** keep the label and swap the leading icon for `Loader2 animate-spin`, with `aria-busy`.

### 4.6 Tabs (`ui/tabs.tsx`, foundation)
Use underline tabs, not grey segmented pills.
- `TabsList`: `h-11 gap-6 border-b border-border bg-transparent p-0 rounded-none w-full justify-start overflow-x-auto`.
- `TabsTrigger`: `h-11 px-0 text-[14px] font-bold text-muted-foreground data-[state=active]:text-foreground` with a 3px orange bottom bar when active (`data-[state=active]:after:…bg-brand-orange`).
- Count badges inside triggers: `ml-1.5 rounded-full bg-surface-inset px-1.5 font-mono text-[11px]`.

### 4.7 DataTable style (`ui/table.tsx`, foundation)
- Wrapper: `rounded-xl border border-border bg-card overflow-hidden`.
- `TableHeader` row: `bg-surface-inset`. `TableHead`: `h-10 text-eyebrow uppercase text-muted-foreground font-bold`.
- Rows: `h-14 border-border/70 hover:bg-surface-raised`.
- Numbers: `font-mono tabular-nums`.
- Highlighted "you" row: `bg-primary-soft/60` plus a 3px left bar `shadow-[inset_3px_0_0_var(--primary)]`, with a "You" chip `rounded-full bg-primary px-1.5 text-[10px] font-extrabold uppercase text-primary-foreground`.
- On mobile, tables lose secondary columns (`hidden sm:table-cell`) but never scroll sideways.

### 4.8 States (`components/states.tsx`)
- **EmptyState:** `flex flex-col items-center text-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface-raised px-6 py-10`.
  - Contents: the illustration tile (3.9), a title (`text-h3`), a description (`text-[14px] text-muted-foreground max-w-sm`), and an optional action (`Button size="lg"`).
  - Prop: `art: "king" | "knight" | "pawns" | "rook" | "error"`.
- **ErrorState:** the same shape with a solid `border-danger/25 bg-danger-soft/40` border and the "error" art.
  - Title: "Hmm, that didn't load".
  - Description: the `errorMessage(err)`, then " Check your internet and try again."
  - Button: `outline lg` with `RotateCw`, labelled "Try again".
  - Add `role="alert"`.
- **Skeletons:** `Skeleton` gets `bg-surface-inset-strong animate-pulse rounded-lg`. Match the shape of the real content; no generic h-12 bars. Provide:
  - `TournamentRowSkeleton`: a 56px card with a 40% title bar, a 25% meta bar and a pill on the right.
  - `TableSkeleton rows={n}`: a header bar plus rows with a circle and two bars.
  - `MatchSkeleton`: see 5.6.

### 4.9 Toasts (`ui/sonner.tsx`, foundation)
- Position: `top-center` on mobile, `bottom-right` on desktop.
- Style: `toastOptions.classNames`:
  - toast: `rounded-xl border border-border bg-card shadow-pop text-[14px] font-semibold text-foreground`
  - success icon: `text-success`
  - error: `border-danger/30`
- Copy:
  - "You're in! Good luck in {name}."
  - "Opponent found! Let's play."
  - "PGN copied"
  - "Tournament created"
  - "Saved"
  - "You've left {name}"
- Toasts never carry game-critical information; that belongs in the page.

### 4.10 ActiveMatchBanner (sticky reminder)
- A night card strip: `rounded-2xl bg-surface-night text-primary-foreground p-4 sm:p-5 flex items-center gap-4 checker [--checker-color:oklch(1_0_0/.05)]`.
- Left: a pulsing `bg-brand-orange` dot, then the title "Your game is still on!" (font-extrabold) and the sub-line "Your clock might be ticking. Jump back in." (`text-primary-foreground/75 text-[14px]`).
- Right: `Button variant="play" size="lg"` labelled "Resume game" with `ArrowRight`.
- On mobile it stacks and the button is full width.

---

## 5. Screens

### 5.1 /login (`app/login/page.tsx`, `login-form.tsx`)
Replace the centred card on a blank page with a **split layout**.

**Desktop (`lg:` and up):** `grid min-h-screen lg:grid-cols-[1.1fr_1fr]`.
- **Left: hero panel.** `relative bg-surface-night text-primary-foreground checker [--checker-size:40px] [--checker-color:oklch(1_0_0/.045)] p-12 flex flex-col justify-between overflow-hidden`.
  - Top: the logo, `onNight` variant.
  - Middle:
    - Eyebrow (`text-brand-orange`, which is fine on navy; 6.9:1): "— Kingdom of Chess Academy".
    - Headline `text-display max-w-[12ch]`: "Tournaments, played *live*." The word *live* is italic `text-brand-orange`.
    - Sub-line `mt-4 max-w-md text-[17px] text-primary-foreground/75`: "Real games against your classmates, with real clocks and a live leaderboard your coach can follow."
  - Bottom: a **decorative mini board**. It is a static `Chessboard` in `allowDragging:false` mode, or a 6×6 CSS grid of squares in board colours with three `defaultPieces` (wN, bQ, wK), `w-[340px] rotate-[-4deg] rounded-2xl p-2 bg-board-frame shadow-pop`. It is `aria-hidden`. Next to it sits a mono caption "1. e4 e5 2. Nf3 …" at /50 opacity.
- **Right: form column.** `flex items-center justify-center bg-background p-12`, with `w-full max-w-[400px]` inside.
  - Eyebrow: "— Welcome back".
  - Title `text-h1`: "Sign in to play".
  - Description: "Use the email and password from your coach."
  - Fields:
    - `Label` is `text-[13px] font-bold`.
    - `Input` is `h-12 rounded-xl bg-card border-input text-[15px] px-4 focus-ring`.
    - The password field has a show/hide icon button inside: `Eye`/`EyeOff`, `size-9`, with `aria-label` set to "Show password" or "Hide password".
  - Error: an `Alert` in danger-soft style above the fields: "That email and password don't match. Try again or ask your coach." Use the server message when it is not a 401.
  - Submit: `Button size="xl" w-full`, label "Sign in". While pending: "Signing in…" with a spinner.
  - **Demo accounts:** a "Try a demo account" divider (an eyebrow centred between two hairlines), then a `grid grid-cols-2 gap-2` of `outline` buttons, each `h-12 justify-start gap-3`.
    - Each button holds a `PlayerAvatar sm`, the name (bold) and the role (`text-[12px] text-muted-foreground`, "Coach" or "Student").
    - Coach spans both columns.
    - Clicking fills the fields **and submits**.
    - Footnote in mono `text-[12px] text-muted-foreground`: "Password for all demo accounts: password123".

**Mobile:** a single column.
- The hero becomes a top band `bg-surface-night px-5 pt-8 pb-10 rounded-b-[28px]`: logo, then a 30px headline "Tournaments, played *live*." No mini board.
- The form sits on paper below it, `px-5 -mt-4`, inside a `Card` (`p-5`).
- The demo grid stays two columns.

**States**
- Pending: inputs are disabled and the button shows a spinner.
- Error: the alert plus `aria-invalid` on both fields.
- Redirecting: the button reads "Taking you in…".

**Motion:** the hero headline fades and rises in on load (`animate-in fade-in slide-in-from-bottom-2 duration-500`).

### 5.2 /coach (`app/(app)/coach/page.tsx`, `tournament-card.tsx`, `tournament-form.tsx`)

**Header:** PageHeader.
- Eyebrow: "Coach dashboard".
- Title: "Your *tournaments*".
- Description: "Create a tournament, open it for your students, and follow every game live."
- Action: `Button size="lg"` labelled "New tournament" with `Plus`.

**Summary strip (new, desktop):** `grid grid-cols-4 gap-3`, with Stat tiles computed from the list: "Live now", "Open to join", "Drafts", "Finished". Clicking a tile sets the filter tab. Hidden on mobile, where the tabs already do this.

**Filter:** underline Tabs: All · Drafts · Open · Live · Finished, each with a count chip.

**List:** replace the identical card grid with a **ledger list**. Each tournament is a row card.
- Container: `grid gap-3`, single column, at full width.
- Each row: `Card` with `flex-row items-center gap-5 p-4 sm:p-5`.
  1. **Date block:** `w-16 shrink-0 rounded-xl bg-surface-inset py-2 text-center`. It shows the day in `font-mono text-[22px] font-bold` and the month in `text-eyebrow uppercase text-muted-foreground` ("OCT"). It is `aria-hidden`; the full date is in the meta line.
  2. **Main:**
     - Title (`text-h3`, a stretched link).
     - Description, one line clamped, `text-[14px] text-muted-foreground`, hidden on mobile.
     - MetaLine: `5+0 · 13/10/2026, 20:59 · 4 players`.
     - For completed tournaments, the winner: `Crown` gold icon (size-3.5) plus "Won by Kabir Singh" in `text-gold-ink font-semibold`.
  3. **Right:** the StatusPill. For ongoing tournaments, a progress meter underneath: "3/6 games", with a `h-1.5 w-24 rounded-full bg-surface-inset` track and a `bg-brand-orange` fill. Then a `ChevronRight` (muted).
- **Mobile:** the date block stays at `w-14`. The meta wraps, and the pill moves under the title.
- **Ordering:** live first, then open, then draft, then finished, then by date.

**States**
- **Loading:** 3 × `TournamentRowSkeleton`.
- **Empty (All):** art "king".
  - Title: "No tournaments yet".
  - Description: "Set one up in a minute. Pick a time control, add your students, and you're ready."
  - CTA: "Create your first tournament".
- **Empty (filtered):** art "rook", title "Nothing here", description "No {label} tournaments right now.", ghost button "Show all".
- **Error:** ErrorState with retry.

**Create dialog** (`DialogContent className="sm:max-w-lg rounded-2xl p-0"`):
- Header: `p-6 border-b`, with eyebrow "— New tournament", title "Set up a tournament", and description "Round robin: everyone plays everyone once."
- Body `p-6 space-y-5`:
  - Name input, placeholder "Saturday Blitz Arena".
  - Description textarea, placeholder "Tell students what to expect".
  - **Time control:** replace the free inputs with preset **chips**. A `grid grid-cols-4 gap-2` of toggle buttons, each `h-14 rounded-xl border bg-card`, showing the mono preset plus a tiny label ("Blitz" for 3–5 minutes, "Rapid" for 10–15). Selected: `border-primary bg-primary-soft ring-2 ring-primary`. The last chip, "Custom", reveals the minutes and increment inputs.
  - Start: a datetime-local input with the helper "Your time zone: Asia/Kolkata" in mono.
  - Status: a two-option segmented control, "Save as draft" or "Open for students now".
- Footer: `p-6 bg-surface-raised border-t`, with "Cancel" (ghost) and "Create tournament" (default). Validation errors show inline under each field in `text-danger text-[13px]`.
- On mobile the dialog becomes a bottom sheet: `max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-b-none max-sm:max-h-[92dvh] overflow-y-auto`.

### 5.3 /coach/tournaments/[id] (`app/(app)/coach/tournaments/[id]/page.tsx`, `leaderboard.tsx`, `match-list.tsx`)

**Header band:** a full-bleed band behind the PageHeader: `-mx-4 sm:-mx-6 px-4 sm:px-6 pt-2 pb-8 checker` with a bottom fade mask.
- Back link: "All tournaments".
- Eyebrow: the status phrase. "— Draft", "— Open for registration", "— Live now · 3 of 6 games played", or "— Finished on 14/10/2026".
- Title: the tournament name, with the StatusPill inline after it on desktop and below it on mobile.
- Description and MetaLine.
- **Actions**, by status:
  - draft: "Edit" (outline, `Pencil`), "Delete" (destructive variant, `Trash2`), and the primary "Open registration".
  - open: "Edit", "Move back to draft" (ghost), "Delete", and the primary "Start tournament" (`Play`).
  - ongoing: "Edit" and the primary "End tournament".
  - completed: none.
  - On mobile, the primary action is full-width and the others go into a `DropdownMenu` behind an `icon-lg` `MoreHorizontal` button with `aria-label="More actions"`.
- **Confirm dialogs** (AlertDialog `rounded-2xl`):
  - Open: "Open {name} for registration?" / "Students will see it and can join straight away." / buttons "Open registration" and "Not yet".
  - Start: "Start the tournament?" / "Registration closes and players can start finding opponents. The player list and time control are then locked." / "Start now".
  - End: "End the tournament now?" / "Matchmaking stops and the current leader becomes the winner. It also ends by itself once everyone has played everyone." / "End tournament".
  - Delete: "Delete {name}?" / "This removes the tournament and everyone's registration. You can't undo this." / "Delete", with the destructive action on the right.

**Progress strip** (ongoing and completed): a `Card variant="inset"` with `grid grid-cols-3 sm:grid-cols-4` Stat tiles: "Games played 3/6", "Live now 1", "Players 4", "Decisive 2" (that last one desktop only). Beneath sits a full-width segmented progress bar with one segment per game:
- played: `bg-primary`
- live: `bg-brand-orange` with pulse
- remaining: `bg-surface-inset-strong`

**Tabs:** Leaderboard · Games (count) · Players (count). The default tab is Players for draft and open tournaments, Leaderboard otherwise.

**Leaderboard tab** (`LeaderboardCard`):
- **Podium (only when the tournament is completed, or ongoing with at least one game played):** three columns, `grid grid-cols-3 items-end gap-3`, ordered 2 · 1 · 3.
  - Each column: `PlayerAvatar lg`, the name, the points in mono, and a plinth block `rounded-t-xl bg-surface-inset` with heights h-16, h-24 and h-12, showing the rank medal on top.
  - The champion column, when completed: plinth `bg-gold-soft`, a crown above the avatar, and the label "Champion" (eyebrow, gold-ink).
  - On mobile the podium shrinks: avatars md, plinths h-10, h-14, h-8.
- **Completed winner banner:** a `Card variant="night"` above the podium.
  - Eyebrow "— Champion".
  - Title "Kabir Singh" plus `text-brand-orange` "3½ pts".
  - When the top spot is shared: "Shared first place: Kabir and Diya", listing every co-leader.
- **Table:** columns Rank (medal) · Player (avatar sm plus name, with the "You" chip where relevant) · Pts (mono bold, `text-[16px]`) · W/D/L · SB.
  - W/D/L shows as three tiny mono figures coloured win, draw and loss with letters: `2W 1D 0L`.
  - SB has an underlined-dotted header with a Tooltip: "Sonneborn–Berger: the tiebreak. It adds up the scores of the players you beat, plus half for draws."
  - Mobile: Rank · Player · Pts · W/D/L in compact `2-1-0` form; SB is hidden.
- Footnote: "Win 1 · Draw ½ · Loss 0. Ties are split by SB, then by number of wins." (`text-[12px] text-muted-foreground`).
- Rows reorder with `transition-[transform] duration-300 ease-out-soft` when a live update arrives. Briefly flash a changed row: `bg-brand-orange-soft` fading over 1.2s.
- Empty: art "pawns", title "No players yet", description "Players show up here once they join."

**Games tab** (`MatchList`): redesign rows as **pairing rows**, not a white/result/black table.
- Each row is a grid: `[White player] [score] [Black player] [meta] [action]`.
  - Player cells: avatar sm plus name. The winner's name is `font-extrabold`; the loser's is `text-muted-foreground`.
  - Score: a mono pill `min-w-16 h-8 rounded-lg bg-surface-inset text-center font-bold`, showing "1–0", "0–1" or "½–½". For live games, the LivePill instead.
  - Meta: `describeResult` in `text-[12px] text-muted-foreground` ("by checkmate") plus the date in mono.
  - Action: "Watch" (`play`-style outline, `Eye`) for live games; "Replay" (ghost) for finished ones.
- **Live games pin to the top** under a sub-header: eyebrow "— Live now".
- **Mobile:** each game is a stacked card. White on line 1 and black on line 2, each with a result marker (a filled dot for the winner); the score pill sits on the right, vertically centred. The whole card is tappable.
- Empty: art "knight", title "No games yet", description "Games appear here as soon as players are paired."

**Players tab:**
- When editable, an add row: `Select` (h-12, w-full sm:w-72, placeholder "Add a student…", or "Everyone's already in" when the list is empty) plus a "Add" button.
- List: `ul` rows `h-16`, each with an avatar md, the name (bold), a sub-line with the email and "joined 13/10/2026" in mono `text-[12px]`, and a ghost "Remove" button. The button is `icon-sm` with `aria-label="Remove {name}"` on mobile.
- Locked note when not editable: an inset strip with a `Lock` icon and the text "The player list is locked once the tournament starts."
- Empty: art "pawns", title "No players yet", description "Open registration so students can join, or add them here."

**Loading:** a header skeleton (eyebrow bar, title bar at 60%, meta bar), a tabs bar, then `TableSkeleton rows=4`.

### 5.4 /student (`app/(app)/student/page.tsx`)

**Header:** PageHeader.
- Eyebrow: "Hi, {firstName}".
- Title: "Ready to *play*?"
- Description: "Join a tournament, then find an opponent when it starts."

**Order:** ActiveMatchBanner (if any), then "Playing now", then "Join a tournament".

**"Playing now"** (ongoing tournaments the student has joined): **feature cards**, `grid gap-4 md:grid-cols-2`.
- Each is a `Card` with an orange top rule: `border-t-4 border-t-brand-orange`.
  - Eyebrow: "— Live now".
  - Title `text-h2`.
  - MetaLine.
  - A mini stat row: "Your rank #2", "Points 1½", "Games left 2".
  - The full-width **"Find an opponent"** button (`play` variant, size xl). It uses the FindOpponent component, so the waiting state appears inline (see 5.5).
- Ongoing tournaments the student hasn't joined: a compact row with the text "Registration closed" and a ghost "Watch" link.

**"Join a tournament"** (open tournaments): ledger rows like the coach list, with a right-hand action.
- Not joined: `Button size="lg"` labelled "Join".
- Joined: a `bg-success-soft text-success` pill with `Check` and the label "You're in", plus a ghost "Leave" link (an `icon-sm` button with `aria-label` on mobile).
- The meta adds "Starts 15/10/2026, 21:59".

**States**
- **Loading:** two feature-card skeletons, then three row skeletons.
- **No ongoing tournaments:** hide the section entirely, unless both sections are empty.
- **Both empty:** art "king".
  - Title: "No tournaments right now".
  - Description: "Your coach will open one soon. Check back later!"
  - No CTA.
- **Open section empty:** an inset strip reading "No new tournaments to join. Check back soon!"
- **Error:** ErrorState.

**Mobile:** cards are full width, and the bottom tab bar is visible.

### 5.5 /student/tournaments/[id] (`app/(app)/student/tournaments/[id]/page.tsx`, `find-opponent.tsx`)

**Header:** as on the coach detail page (checker band, back link "All tournaments", StatusPill, MetaLine). No action buttons.

**PlayPanel** is the hero of this page: a full-width card directly under the header. Its content depends on the state.

| State | Card | Content |
|---|---|---|
| open, not joined | default | Eyebrow "— Registration open"; title "Want to play?"; text "Everyone plays everyone once. Games start when your coach begins the tournament."; `Button size="xl"` "Join tournament"; ghost "Not now". |
| open, joined | inset | `Check` success chip "You're in!"; text "Games start when your coach starts the tournament: 15/10/2026, 21:59."; ghost "Leave tournament", which confirms first with "Leave {name}?" / "You can join again while registration is open." |
| ongoing, joined, idle | night | Eyebrow (`text-brand-orange`) "— Your next game"; title "Find an *opponent*"; sub-line "You'll be paired with someone you haven't played yet. 2 games left."; `Button variant="play" size="xl"` "Find an opponent" (`Swords`); a small progress row of opponent avatar chips (played ones at 40% opacity with a tick, remaining ones at full). |
| ongoing, joined, **searching** | night | See "Matchmaking state" below. |
| ongoing, joined, has an active game | night | Title "Your game is on!"; `play xl` "Resume your game". |
| ongoing, joined, everyone played | inset | "You've played everyone. Brilliant work! Results update as the last games finish." |
| ongoing, not joined | inset | "Registration closed. You can still watch the live games below." |
| completed | night | Champion layout: crown, "Congratulations, {winner}!", and the student's own result "You finished #3 of 4 with 1½ points." A tie reads "Shared first place: {names}". |
| disconnected (any play state) | | The CTA is disabled with the label "Connecting…" and a spinner. |

**Matchmaking state** (`FindOpponent` when `queued`). This is the delightful moment.
- Inside the night card, a **3×3 mini board** (`size-28 rounded-xl overflow-hidden grid grid-cols-3 ring-4 ring-white/10`) in board colours. A white knight (`defaultPieces.wN`, 44px) hops between squares in an L-shape: a CSS keyframe that moves through 3 positions every 2.4s, with `knight-hop` on each landing.
- Under reduced motion: a static knight with a 3-dot ellipsis.
- Title: "Finding your opponent…".
- The sub-line rotates every 4s through:
  - "Looking for someone you haven't played yet."
  - "{n} players are looking too." (when `waiting > 1`)
  - "Tip: control the centre early!"
  - "Tip: check, capture, threat, in that order."
- A mono elapsed timer, "0:12", at `text-primary-foreground/60`.
- Button: `onNight` "Stop searching" (`X`).
- `aria-live="polite"` on the title.
- When a match is found: a toast "Opponent found! Let's play.", the card flashes `bg-brand-orange` for 300ms, then the app navigates.

**Below the PlayPanel**, on desktop `grid lg:grid-cols-[1fr_380px] gap-6`:
- **Left:** Leaderboard, the same component as the coach view, with the student's row highlighted. The podium shows only when completed.
- **Right:** "My games": eyebrow "— Your results", then pairing rows from the student's perspective, each starting with a **result chip**:
  - Win: `W` on `bg-win-soft text-win`.
  - Draw: `D` on draw-soft.
  - Loss: `L` on loss-soft.
  - Each chip: `size-8 rounded-lg font-extrabold`, plus a visually hidden word ("Win", "Draw", "Loss"). The opponent's name and termination follow.
  - Empty: art "knight", title "No games yet", description "Your games will show up here."

On mobile everything stacks: PlayPanel, then My games, then Leaderboard. The student's own results come before the standings.

### 5.6 /student/schedule (`app/(app)/student/schedule/page.tsx`)

**Header:**
- Eyebrow: "My schedule".
- Title: "What's *next*".
- Description: "Your tournaments, who you still need to play, and every game you've finished."

**Section "Coming up & live":** one card per tournament, `grid gap-4 md:grid-cols-2`.
- Card head: the StatusPill, the title (`text-h3`) and the MetaLine.
- Ongoing: a Stat row with `Rank` (accent tone, e.g. "#2 / 4"), `Points` ("1½") and `Played` ("2").
- **"Still to play":** overlapping avatar chips with names. Each chip is `inline-flex h-9 items-center gap-2 rounded-full bg-surface-inset pl-1 pr-3 text-[13px] font-semibold`. Over 4 players, show "+2 more".
- Footer CTA, ongoing with remaining opponents: FindOpponent `play lg`, full width.
- Open (not started): a countdown line in mono, "Starts in 2 days · 15/10/2026, 21:59".
- All opponents played: a success inset with the text "You've played everyone. Well done!"
- Only one player registered: "Waiting for more players to join."

**Section "Match history":** pairing rows from the student's perspective, with the result chip, opponent avatar and name, the tournament name (muted, md and up), the date in mono, and "Replay".
- Group rows by month: an eyebrow header such as "— October 2026".
- Mobile: two-line rows.

**States**
- **Loading:** 2 card skeletons, then a 4-row table skeleton.
- **Nothing scheduled:** art "rook".
  - Title: "Nothing on your schedule".
  - Description: "Join a tournament and your games will show up here."
  - CTA: "Find a tournament", linking to /student.
- **No history:** art "knight", title "No games yet", description "Your finished games will be listed here, so you can replay them."
- **Error:** ErrorState per section, so one failing section doesn't blank the page.

### 5.7 /matches/[id], the hero (`app/(app)/matches/[id]/page.tsx`, `components/live/*`)

**Page frame:** `max-w-[1200px]`. The bottom tab bar is hidden on this route.

**Top bar** (`flex items-center justify-between h-12`):
- Left: back link (ghost pill) with the tournament name, truncated.
- Right, in order:
  - The time control in a mono chip: `h-7 rounded-full bg-surface-inset px-2.5 font-mono text-[12px] font-bold`.
  - "Watching" when spectating: `bg-info-soft text-info` pill with `Eye`.
  - Status: the LivePill, or "Finished" in a success pill.

**Layout**
- **Desktop (`lg:` and up):** `grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start`.
- **Board column:** `mx-auto w-full max-w-[min(680px,calc(100dvh-13rem))]`. The 13rem budget covers the header, top bar and two player strips.
- **Mobile (375px):** the board is full bleed: the column uses `-mx-4` and the board frame drops its radius to `rounded-none p-1`, giving about a 367px board. Player strips sit directly above and below the board. The turn banner and controls come next, then the moves panel. Below `lg`, the side panel content follows the board.

**PlayerStrip** (replaces the ChessClock row; the top strip is the opponent, the bottom strip is "you"):
- Container: `flex items-center gap-3 py-2`. No card box, so the board stays the hero.
- **Left:** `PlayerAvatar md` with a colour chip, then the name (`text-[15px] font-bold truncate`) and a "You" chip for the player.
- **Sub-line:** captured-material summary, the captured pieces as `defaultPieces` at 14px overlapping with `-ml-1.5`, plus "+2" in mono `text-[12px] text-muted-foreground`. This needs a FEN-diff helper (count pieces versus the starting set). If that is out of scope, show "White" or "Black" instead.
- **Right: Clock.** `ml-auto min-w-[112px] h-12 rounded-xl px-3 font-mono text-clock tabular-nums text-right` (on mobile `h-11 text-[26px] min-w-[96px]`). States:

| State | Classes | Extra |
|---|---|---|
| idle, not this side's turn | `bg-surface-inset text-muted-foreground` | |
| active, this side's turn, more than 20s | `bg-primary text-primary-foreground shadow-cta` | a 4px orange running bar under the digits (`absolute bottom-1 inset-x-3 h-[3px] rounded-full bg-brand-orange`) that pulses gently |
| low time, under 20s, active | `bg-danger text-white` | `animate-[clock-breathe_1s_ease-in-out_infinite]`. Under 10s, tenths show (already in `formatClock`). A `Timer` icon at size-4 sits before the digits so colour is not the only signal. Announce once at 20s via an `aria-live="assertive"` sr-only line: "20 seconds left". |
| low time, not active | `bg-danger-soft text-danger` | |
| flagged (0:00) | `bg-danger text-white line-through decoration-2` | |
| game over | `bg-surface-inset text-foreground` | frozen value |

  Clock motion: a colour transition of 150ms. Never animate the digits.

**Turn banner** (between the bottom player strip and the controls on mobile; at the top of the side panel on desktop):
`h-14 rounded-2xl flex items-center justify-center gap-2.5 text-[18px] font-extrabold`, with `aria-live="polite"`.

| State | Style | Copy |
|---|---|---|
| My turn | `bg-brand-orange text-brand-orange-foreground shadow-cta-orange`, a quick `ease-spring` scale-in (`animate-in zoom-in-95`) | "Your move!" (`Hand` or `MousePointerClick` icon) |
| Opponent's turn | `bg-surface-inset text-muted-foreground` | "{Opponent first name} is thinking…" with 3 animated dots |
| Sending move | same as opponent's turn | "Sending your move…" |
| Check, my turn | `bg-danger text-white` | "Check! Protect your king." |
| Check, opponent's turn | inset | "Check! {Opponent} must move their king." |
| Spectating | `bg-info-soft text-info` | "White to move" or "Black to move", with a white or black piece dot |
| Reviewing past moves | `bg-warning-soft text-warning` | "Looking at move 12 of 30" plus `outline sm` "Back to live" |
| Game over | hidden; the GameOver panel replaces it | |

**Board** (see 3.4): navy bezel with `max-w-full aspect-square`.
- When it's my turn the bezel gets `ring-4 ring-brand-orange/60` (a ring plus the banner text, so not colour alone).
- While reviewing: an orange bezel and a tab `absolute -top-3 left-4 h-6 rounded-full bg-brand-orange px-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-orange-foreground` reading "Replay mode".
- Not my turn, or spectating: the cursor is default and no hover affordance appears.

**Reconnecting banner:** replaces the inline strip.
- An overlay **on the board**: `absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-[2px] rounded-[10px]` with a card `rounded-xl bg-card shadow-pop px-5 py-4 text-center`.
- Content: a `Loader2` spinner, title "Reconnecting…", and the line "Hang tight. Your clock is safe on the server and the game will continue right where it left off."
- Also show the warning ConnectionDot in the header.
- The board stays visible underneath.
- When reconnected: a toast "Back online!" (success).

**Controls card** (players only, live game). `grid grid-cols-2 gap-2`:
- "Offer draw": `outline lg`, `Handshake`.
  - After offering: disabled, label "Draw offered", plus a muted line "Waiting for {opponent} to answer…".
- "Resign": `outline lg text-danger hover:bg-danger-soft`, `Flag`.
  - AlertDialog: "Resign this game?" / "{Opponent} will get the win. Sure you want to stop here?" / buttons "Keep playing" (default, autofocus) and "Resign" (destructive).
- Disabled while disconnected, with the Tooltip "Waiting for connection…".
- **Draw offered to me:** an incoming card that slides in above the controls (`animate-in slide-in-from-top-2`).
  - Card: `rounded-2xl border-2 border-info bg-info-soft p-4`.
  - Title: `Handshake` icon plus "{Opponent} offers a draw".
  - Sub-line: "Take it, or keep playing for the win?"
  - Buttons: "Accept draw" (default) and "Keep playing" (outline), both lg and equal width.
  - Make it `role="alertdialog"` and focus "Keep playing" first so a stray Enter doesn't accept.

**Moves panel** (`MoveList`):
- Card with eyebrow "— Moves" and the move count in mono on the right ("Move 14").
- A scroll area `h-64 lg:h-[calc(100dvh-30rem)] min-h-56`.
- Rows: `grid grid-cols-[2.25rem_1fr_1fr]` with a zebra `odd:bg-surface-raised`.
  - Move number: mono muted.
  - Each move: a button `h-8 rounded-md px-2 font-mono text-[14px] font-semibold hover:bg-surface-inset focus-ring`.
  - Current move: `bg-primary text-primary-foreground`.
  - Moves with check get a `+` badge; mate gets `#` in the danger colour.
- Navigation bar: `icon` (size-10) outline buttons for First, Prev, Next and Live, each with an aria-label.
  - Keyboard: ← and → step through moves, Home and End jump to the ends, but only when focus is not in an input.
  - "Copy PGN" is a ghost sm button with `Copy`; the toast says "PGN copied".
- Empty: "No moves yet. White starts!"
- On mobile, the moves render first as a **horizontal strip** under the controls (`flex overflow-x-auto gap-1`, numbered chips, the current one auto-scrolled into view). An "All moves" toggle expands the full grid.

**Promotion picker:** shows only on a promotion move, as now.
- Prefer an **on-board popover** anchored over the target square's file: a vertical `rounded-xl bg-card shadow-pop ring-1 ring-border` column of 4 `size-[12.5%-of-board]` buttons. The board is dimmed behind it with `bg-board-frame/40`.
- If anchoring is too costly, keep the Dialog but restyle it:
  - Title: "Pick your new piece".
  - Description: "Your pawn made it to the end!"
  - A `grid grid-cols-4 gap-3` of `size-18 rounded-xl border-2 border-border hover:border-primary hover:bg-primary-soft focus-ring` buttons with `defaultPieces` art in the player's colour and a caption under each: "Queen", "Rook", "Bishop", "Knight".
  - The queen is pre-focused.
  - Cancel: ghost "Undo".
- Keys Q, R, B and N select a piece.

**Game over moment:** in the side panel (desktop) or replacing the turn banner and controls (mobile).
1. When `status` flips to completed: 400ms after the final move, the board bezel tints by outcome (win: `ring-4 ring-win`, loss: none, draw: `ring-4 ring-draw/50`).
2. **GameOver card** (`Card variant="night"`, `shadow-pop`, `animate-in fade-in zoom-in-95 duration-300 ease-spring`):
   - **Win:**
     - Crown SVG at 40px, with a gold orange bounce-in.
     - Eyebrow "— Victory".
     - Title `text-display`: "You *won*!"
     - Sub-line: `describeResult`, e.g. "Checkmate with your queen." The fallback is "White won by checkmate".
     - Score pill: "1–0".
     - Optional confetti: 24 tiny squares in board colours and orange, CSS-only, 1.2s. Skip under reduced motion.
   - **Loss:**
     - Knight art.
     - Eyebrow "— Good game".
     - Title: "Nice try!"
     - Sub-line: "{Opponent} won by {termination}."
     - Encouraging line: "Every game makes you stronger. Replay it to see what happened!"
     - Tone: never red, and no "You lost". The word "Loss" appears only in the hidden text of the result chip and in history.
   - **Draw:**
     - A pair of kings.
     - Eyebrow "— Draw".
     - Title: "It's a *draw*!"
     - Sub-line: "Draw by agreement", "by stalemate", and so on.
   - **Spectator:** eyebrow "— Final"; title "White wins" or "Draw"; then `describeResult`.
   - **Actions:**
     - `play xl` "Play next game", when the tournament is still ongoing and the player is a participant. It runs FindOpponent inline, so the matchmaking state appears right here.
     - `onNight lg` "Replay this game", which jumps to move 1.
     - Ghost (on night) "See the leaderboard".
   - Points line: "+1 point · You're now #2 in {tournament}". Derive the rank from the leaderboard query if it's cheap; otherwise drop the rank part.
3. Announce the result via `aria-live`.

**Spectating** (coaches, or students watching):
- No controls, no turn-banner orange.
- Orientation is White at the bottom, with a "Flip board" icon button (`ArrowUpDown`, `aria-label="Flip board"`) in the top bar.
- The info pill reads "Watching".
- The bottom player strip says "White" or "Black" instead of "You".

**Loading (`MatchSkeleton`):** two strip skeletons (a circle, a bar, and a 112×48 clock block) around a square `aspect-square rounded-2xl` skeleton with a faint checker, and a side panel with a 56px banner bar and a 256px moves block.

**Error:** ErrorState in a `max-w-md` card with art "error".
- Title: "We couldn't open this game".
- Description: the message plus "It may have been removed, or the link is wrong."
- Actions: "Try again" and "Back to tournaments".

---

## 6. Implementation plan

### (a) Foundation: one engineer, must land first
**Owns:**
- `src/app/globals.css`: tokens are done. Add the `@layer base` and `@utility` blocks from section 2.
- `src/app/layout.tsx`: font weights and italic.
- `src/components/ui/button.tsx`: sizes, the `play` and `onNight` variants, focus.
- `src/components/ui/card.tsx`: border, shadow, `variant`.
- `src/components/ui/tabs.tsx`: underline.
- `src/components/ui/table.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/input.tsx`: h-12 and rounded-xl when `size="lg"`, otherwise h-10.
- `src/components/ui/dialog.tsx` and `alert-dialog.tsx`: rounded-2xl, shadow-pop, mobile sheet.
- `src/components/ui/sonner.tsx`
- `src/components/app-shell.tsx`: header, UserMenu, ConnectionDot, mobile tab bar.
- `src/components/logo.tsx`: wordmark and LogoMark.
- `src/components/states.tsx`: Empty/Error/skeleton shapes plus illustrations.
- `src/components/status-badge.tsx`: becomes StatusPill and LivePill.
- New `src/components/page-header.tsx`: PageHeader and MetaLine.
- New `src/components/stat.tsx`
- New `src/components/player-avatar.tsx`
- New `src/components/rank-medal.tsx`
- New `src/components/result-chip.tsx`
- `src/components/active-match-banner.tsx`
- Favicon: `src/app/icon.svg` with the LogoMark (replace `favicon.ico`).

### (b) Screen groups: in parallel after the foundation, with no shared files
1. **[login]** `src/app/login/page.tsx`, `src/app/login/login-form.tsx`.
2. **[coach pages]**
   - `src/app/(app)/coach/page.tsx`
   - `src/app/(app)/coach/tournaments/[id]/page.tsx`
   - `src/components/tournament-form.tsx`
   - `src/components/tournament-card.tsx`, which becomes the ledger row. Students consume it; the coach group owns it and must keep the `footer` prop API.
   - `src/components/leaderboard.tsx`: podium, table and SB tooltip.
   - `src/components/match-list.tsx`: pairing rows plus the `perspective` mode, since both coach and student use these.

   Students only *use* these components; they don't edit them.
3. **[student pages + schedule]**
   - `src/app/(app)/student/page.tsx`
   - `src/app/(app)/student/tournaments/[id]/page.tsx`: PlayPanel states.
   - `src/app/(app)/student/schedule/page.tsx`
   - `src/components/find-opponent.tsx`: the matchmaking knight state, the `play` variant and the `onNight` styling via a `tone` prop. The match page's game-over card imports it read-only.
4. **[match page + live]**
   - `src/app/(app)/matches/[id]/page.tsx`: split it into `src/components/live/board.tsx` (frame, square styles, review tab, reconnect overlay), `player-strip.tsx`, `turn-banner.tsx`, `match-controls.tsx` (draw/resign/incoming offer), `promotion-picker.tsx` and `game-over.tsx`, all new.
   - `src/components/live/chess-clock.tsx`
   - `src/components/live/move-list.tsx`
   - New `src/lib/board-theme.ts`: `isDarkSquare` and the style constants.
   - New `src/lib/material.ts`: a captured-pieces helper.

---

## Open questions for the user
1. **Logo:** is the crown on the O of "KINGDOM" correct, or does the client's mark put it on the O of "OF"? Do they have an SVG of the real logo we should use instead of the spec'd recreation?
2. **Dark mode:** I chose light-only and kept `.dark` only as a safety net. Is that OK?
3. **Captured-material line on the player strips:** this is a nice touch but adds a small helper. Keep it in scope, or ship "White"/"Black" for now?
4. **On-board promotion popover vs. restyled dialog:** the popover feels more bespoke but costs more to build. Which do you want for this round?
5. **Confetti on a win:** keep it (CSS-only, skipped under reduced motion) or drop it to stay understated for parents and coaches?
6. **Demo-account buttons** on the login page: keep them for the sales demo, or put them behind an env flag in production?
