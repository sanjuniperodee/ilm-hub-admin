# ILM HUB Admin — design system

The admin panel is a back-office tool. Content managers spend hours in it editing
Arabic lessons, so the brief is **calm, dense, predictable** — it belongs to the same
brand as the mobile app (bronze, gold, sand, Montserrat, Noto Sans Arabic) but it is
quieter than the app.

- Theme: `src/theme/` (`tokens.ts` for raw values, `theme.ts` for the MUI theme, `augment.ts` for custom keys)
- Components: `src/components/ui/` — import from `src/components/ui` (barrel `index.ts`)
- App shell: `src/components/Layout.tsx`
- Global CSS: `src/index.css` (fonts, CSS variables for non-MUI HTML, scrollbars)

UI language is Russian. Write copy in sentence case.

---

## 1. Visual idea

One bold element and everything else quiet.

- **The bold element is the dark ink navigation rail** (`#1C1612`) with a gold active
  marker and a faint eight-pointed-star (khatam / girih) texture behind the logo. The
  logo is the star with the letter «ع» (first letter of «علم», knowledge). The login
  screen repeats this: a dark panel with a large gold «عِلْم».
- **The work area is quiet**: warm off-white canvas, white surfaces with hairline warm
  borders, no shadows on surfaces, no gradients, no hover lifts.
- Colour is used for meaning (status, primary action, focus), not decoration.

## 2. Tokens

### Colour

| Role | Token | Hex | Notes |
|---|---|---|---|
| Primary action, links | `palette.primary.main` / `color.bronze[600]` | `#8F6337` | 5.2:1 on white. Filled buttons, links, active tab indicator |
| Primary hover | `primary.dark` / `bronze[700]` | `#6F4B28` | |
| Brand bronze | `primary.light` / `brand.bronze` / `bronze[500]` | `#B68A60` | Mobile brand colour. **Only 3.1:1 on white — never for text.** Focus rings, chart lines, icons in stat cards, logo |
| Brand gold | `secondary.main` / `brand.gold` / `gold[400]` | `#EBCA70` | Accent on dark rail, Premium. Never as text on white |
| Sand | `brand.sand` / `sand[200]` | `#F6E5CE` | Selected rows/menu items, icon tiles, avatars |
| Bronze tint | `bronze[50]` | `#FAF3EA` | Row hover, dropzone hover |
| Canvas | `background.default` / `surface.canvas` | `#FAF6F0` | Page background |
| Surface | `background.paper` | `#FFFFFF` | Cards, tables, inputs |
| Sunken | `surface.sunken` / `neutral[50]` | `#FCFAF7` | Table header, card footers, muted cards |
| Divider / card border | `divider` / `neutral[200]` | `#E9E0D4` | |
| Strong border | `surface.borderStrong` / `neutral[300]` | `#D9CCBB` | Outlined buttons, dashed dropzone |
| Input outline | `neutral[400]` | `#A39382` | 3:1 — meets WCAG 1.4.11 for field boundaries |
| Text | `text.primary` / `ink[600]` | `#221C17` | |
| Secondary text | `text.secondary` / `neutral[600]` | `#6B6159` | 6:1 on white |
| Rail | `ink[900]` / `ink[800]` / `ink[700]` | `#1C1612` / `#2A221C` / `#3A2F27` | Sidebar bg / hover / active |

Semantic colours (each has `main` for text/icons, `dark` for text on `soft`, `light`, `soft` background):

| | main | soft |
|---|---|---|
| success | `#3F7A35` | `#EAF3E1` |
| warning | `#9A6212` | `#FBF0D9` |
| error | `#B53A32` | `#FBE9E7` |
| info | `#2D6A82` | `#E3F0F4` |

Rules: use theme paths (`'primary.main'`, `'text.secondary'`, `'divider'`, `'surface.sunken'`)
in `sx`. Import `color` from `src/theme` only when no theme path exists (rail colours,
soft semantic backgrounds). **No raw hex in pages.** The old indigo values (`#6366F1`,
`#818CF8`, `#0F172A`, `#F8FAFC`) still hard-coded in un-migrated pages must be removed.

### Typography

Montserrat (400/500/600/700) for UI, Noto Sans Arabic (400/500/600) for Arabic — both
self-hosted via `@fontsource`. Inter and Gilroy are loaded only because the rich-text
editor offers them as content fonts.

| Variant | Size / weight | Use |
|---|---|---|
| `h4` (rendered as `h1` by PageHeader) | 22px / 700 | Page title — **one per page, via `<PageHeader>`** |
| `h6` | 16px / 600 | SectionCard / dialog section titles |
| `subtitle1` | 15px / 600 | FormSection titles, empty-state titles |
| `subtitle2` | 13px / 600 | Field-group labels, StatGroup titles |
| `body1` | 14px / 400, lh 1.55 | Default text, inputs, table cells |
| `body2` | 13px / 400 | Secondary text, descriptions |
| `caption` | 12px | Hints, timestamps. Never smaller than 12px |
| `arabic` | Noto Sans Arabic 22px, lh 1.9 | Prefer `<ArabicText>` |

`h1`–`h3` exist for legacy pages; new pages should not use them directly.

Don'ts: no ALL-CAPS labels or table headers, no letter-spaced eyebrows above headings,
no gradient text, no `fontFamily: 'serif'` for Arabic.

### Spacing, radius, elevation, layout

- Spacing: MUI 8px scale. Common: 0.5 (4), 1 (8), 1.5 (12), 2 (16), 2.5 (20), 3 (24), 4 (32).
  Page gutters: 12 / 24 / 32px (xs / sm / md). Section gap: 16–24px (`gap: 2`–`3`).
- Radius hierarchy (`radius` token): `xs 4` kbd · `sm 6` chips, nav items, menu items ·
  `md 8` buttons, inputs (theme default) · `lg 12` cards, tables, menus · `xl 16` dialogs.
  Do not override radii per page.
- Elevation: surfaces are **flat with a 1px border** (`Paper elevation={0}` default). Shadows
  are only for overlays (menus, popovers, dialogs, toasts) — warm-tinted, `shadow.md/lg`.
- Layout tokens: sidebar 248px / 68px collapsed, top bar 56px, `layout.formMaxWidth` 880px
  for single-column forms. List pages and editors use the full width.
- Breakpoints (MUI defaults): `md` 900px switches the sidebar from drawer to permanent;
  below 1200px the sidebar starts collapsed (user choice is remembered).

### Motion

`motion.fast` 120ms (hover/colour), `base` 180ms (collapse), `slow` 240ms (sidebar width),
easing `cubic-bezier(0.2, 0, 0, 1)`. Motion only answers user actions. No entrance
animations on cards. `prefers-reduced-motion` disables transitions globally (CssBaseline).

---

## 3. App shell (`Layout.tsx`)

- **Sidebar**: grouped navigation — Обзор · Обучение (Курсы и уроки) · Слова · Ислам ·
  Пользователи · Администрирование (admin only). Groups collapse (state in
  `localStorage['ilm-admin.sidebar.closedGroups']`); the group of the current page is
  re-opened automatically. Rail mode shows icons with tooltips. Toggle: button at the
  bottom or the **`[`** key (ignored while typing).
- **Role filtering is unchanged**: `ROLE_NAV_PATHS` (content_manager → dashboard, content,
  words, islam; support → dashboard, users) and the admin-only group. Use the exported
  `isPathAllowedForRole(path, role)` when a page links to other sections (Dashboard does).
- **Top bar**: breadcrumbs (auto-derived from the route; pages can replace them with real
  names via `useShellBreadcrumbs`), a slot for page actions (`<TopBarActions>`), user menu
  (email from the JWT if present, role chip, «Выйти»).
- **Mobile / tablet < 900px**: temporary drawer with a close button; closes on navigation.
- **Skip link** «Перейти к содержимому» → `<main id="main-content">`.

Route guards (`PrivateRoute`, `ProtectedRoute`) live in `App.tsx` and were not changed.

---

## 4. Components (`src/components/ui`)

All components accept `sx` (merged last). JSDoc with examples is in each file.

### PageHeader
Every routed page starts with it.
```tsx
<PageHeader
  backTo={`/content/courses/${courseId}`}
  breadcrumbs={[{ label: 'Курсы', to: '/content' }, { label: course.title, to: `/content/courses/${course.id}` }, { label: lesson.title }]}
  title={lesson.title}
  subtitle="Блоки урока в порядке показа в приложении"
  status={<StatusChip status={lesson.isPublished ? 'published' : 'draft'} />}
  actions={<><Button variant="outlined">Предпросмотр</Button><Button variant="contained">Сохранить</Button></>}
>
  <Tabs …/>   {/* optional: tabs / toolbar under the title */}
</PageHeader>
```
Props: `title`, `subtitle?`, `breadcrumbs?: {label, to?}[]`, `backTo?`, `backLabel?`, `status?`,
`actions?`, `children?`, `disableGutterBottom?`.

### SectionCard
Bordered surface with optional header/footer. One per logical block; don't nest.
Props: `title?`, `description?`, `actions?`, `footer?`, `padding?: 'normal' | 'dense' | 'none'`
(`none` for full-bleed tables/lists), `variant?: 'default' | 'muted'`, `headingLevel?`, `id?`.

### FormSection
Groups fields under a heading. `layout="aside"` (default) puts the title in a left column
when the section is ≥ 720px wide (container query — safe inside cards/dialogs);
`layout="stacked"` always stacks. `divider` (default true) separates consecutive sections.
```tsx
<SectionCard title="Урок" footer={<><Button variant="outlined">Отмена</Button><Button variant="contained">Сохранить</Button></>}>
  <FormSection title="Основное" description="Как урок выглядит в списке." divider={false}>
    <TextField label="Название" required fullWidth />
  </FormSection>
  <FormSection title="Доступ"><FormControlLabel control={<Switch />} label="Premium-урок" /></FormSection>
</SectionCard>
```

### DataTable
MUI Table with sorting, pagination, skeleton loading, error and empty states.
Props: `columns: { id, header, render?, sortable?, sortValue?, align?, width?, minWidth?, hideBelow?: 'sm'|'md'|'lg', nowrap? }[]`,
`rows`, `getRowId`, `aria-label` (required), `loading?`, `error?`, `onRetry?`, `emptyState?`,
`onRowClick?` (row becomes keyboard-focusable, Enter opens), `selectedRowId?`, `dense?`,
`stickyHeader?`, `maxHeight?`, `defaultSort?` (client sort) **or** `sort` + `onSortChange`
(server sort), `pagination?: true` (client) **or** `{ page, rowsPerPage, total, onPageChange, onRowsPerPageChange? }`
(server), `rowsPerPageOptions?`, `initialRowsPerPage?` (25).
While refetching with rows present it shows a thin progress bar instead of skeletons.
For drag-and-drop ordering (lessons, blocks) keep plain MUI `Table`/lists with dnd-kit,
but reuse the same states (`LoadingState`, `EmptyState`, `ErrorState`).

### Toolbar + SearchField
```tsx
<Toolbar hasActiveFilters={!!q || level !== 'all'} onReset={reset} summary={`Найдено ${total}`}
         actions={<Button variant="outlined" startIcon={<FileDownloadOutlined />}>Экспорт</Button>}>
  <SearchField value={q} onChange={setQ} placeholder="Слово, перевод или корень" enableSlashShortcut />
  <TextField select label="Уровень" value={level} onChange={…} sx={{ minWidth: 140 }}>…</TextField>
</Toolbar>
```
`Toolbar` props: `children`, `actions?`, `onReset?`, `hasActiveFilters?`, `summary?`, `variant?: 'plain' | 'card'`.
`SearchField` props: `value` (committed), `onChange` (debounced, trimmed; also on Enter/clear),
`debounceMs?` (300), `placeholder?`, `label?` (accessible name, default «Поиск»),
`enableSlashShortcut?` («/» focuses), `rtl?` (Arabic search), `autoFocus?`, `fullWidth?`.
Escape clears.

### States: LoadingState, EmptyState, ErrorState
- `LoadingState variant="spinner" | "page" | "table" | "cards" | "form" | "list"`, `rows?`, `label?`, `minHeight?`.
  Match the skeleton to the final layout.
- `EmptyState title description? icon? action? secondaryAction? size?: 'sm' | 'md'`.
  Say what is missing and what to do. Separate «нет данных» (offer create) from
  «ничего не найдено» (offer reset filters).
- `ErrorState title? error? onRetry? retrying? action? variant?: 'block' | 'inline'`.
  `error` can be an axios error — it is converted with `getErrorMessage`.
- `getErrorMessage(err, fallback?)` — use it for every toast / Alert from an API error.
  Never show raw «Network Error» or English backend text.

### ConfirmDialog / useConfirm
Replace every `window.confirm`:
```tsx
const confirm = useConfirm()
if (!(await confirm({ title: 'Удалить аят?', description: 'Аят 255 исчезнет из суры «Аль-Бакара».', confirmLabel: 'Удалить', destructive: true }))) return
```
Options: `title`, `description?`, `confirmLabel?`, `cancelLabel?`, `destructive?`,
`confirmText?` (type-to-confirm for very dangerous actions). As a component it also takes
`open`, `onConfirm` (may return a promise — spinner + inline error), `onClose`, `loading?`.
Destructive dialogs focus «Отмена» first.

### StatusChip
`status` presets: `published draft archived active inactive blocked pending invited premium free
locked sent scheduled failed passed notPassed`; or `label` + `tone: neutral | brand | gold | success | warning | error | info`;
`hideDot?`, `icon?`, `size?`. Add new statuses to the preset map, not ad hoc.

### StatCard / StatGroup
`StatCard label value icon? hint? to? loading? variant?: 'card' | 'plain'`. Group related
KPIs in `<StatGroup title columns?>` with `variant="plain"` cards instead of a grid of
separate cards.

### ArabicText / arabicInputProps
```tsx
<ArabicText size="lg">بِسْمِ ٱللَّٰهِ</ArabicText>
<TextField label="Слово на арабском" inputProps={arabicInputProps} />
```
Props: `size: sm 17 | md 22 | lg 28 | xl 36 | display 48`, `component?`, `weight?`, `muted?`,
`align?: start | center | end`, `aria-label?`.

### FileDropzone
Drag-and-drop/click upload with type checks and limits from `constants/uploadLimits.ts`
(image 1 МБ, audio 3 МБ, video 30 МБ — same as backend). Shows the limits line always.
Props: `accept: 'image' | 'audio' | 'video' | array`, `onFiles(files)`, `multiple?`, `disabled?`,
`uploading?`, `progress?`, `error?`, `label?`, `title?`, `compact?`.
`describeUploadLimits(kinds)` returns the limits sentence for custom pickers.

### KeyboardHint
`<KeyboardHint keys={['Mod', 'S']} />` — `Mod` = ⌘ on macOS, Ctrl elsewhere. `tone="dark"` in tooltips.

### Shell helpers
- `useShellBreadcrumbs(items | null)` — named breadcrumbs in the top bar.
- `<TopBarActions>` — portal into the top bar for 1–2 always-visible actions in long editors (e.g. «Сохранить»).
- `AuthLayout`, `BrandMark`, `GIRIH_PATTERN` — auth screens and brand surfaces only.
- `mergeSx`, `visuallyHidden` — utilities.

---

## 5. How phase-2 page agents should build a page

1. `PageHeader` (title = the noun the page manages; primary action last, `variant="contained"`).
2. Optional `Toolbar` (search + filters) directly under it.
3. Content: `DataTable` for lists; `SectionCard`s for detail/edit; `FormSection`s inside forms.
4. Every async area has three states: `LoadingState` (skeleton shaped like the result),
   `ErrorState` with `onRetry`, `EmptyState` with the next action.
5. Mutations: disable the button and show a spinner in it while saving; toast
   `toast.success('Слово сохранено')` (verb matches the button), errors via
   `toast.error(getErrorMessage(e, 'Не удалось сохранить слово'))`.
6. Deletions/deactivations go through `useConfirm({ destructive: true })`.
7. Dialogs: `useNarrowDialogProps()` (full-screen below md), title = action («Новое слово»),
   actions right-aligned: outlined «Отмена», contained verb.
8. Remove page-level hard-coded colours, radii, gradients and `fontWeight: 800` titles;
   remove `pageTitleH3Sx` usage when the page adopts `PageHeader`.

Page skeleton:
```tsx
export default function WordsDictionaryPage() {
  const [q, setQ] = useState('')
  const { data, isLoading, error, refetch } = useQuery(…)
  return (
    <>
      <PageHeader title="Словарь" subtitle="Слова, которые используются в уроках и карточках"
        actions={<Button variant="contained" startIcon={<Add />} onClick={openCreate}>Добавить слово</Button>} />
      <Toolbar hasActiveFilters={!!q} onReset={() => setQ('')} summary={data && `Найдено ${data.total}`}>
        <SearchField value={q} onChange={setQ} enableSlashShortcut />
      </Toolbar>
      <DataTable aria-label="Словарь" rows={data?.items} getRowId={(w) => w.id} loading={isLoading}
        error={error} onRetry={refetch} onRowClick={openEdit} pagination columns={columns}
        emptyState={q
          ? <EmptyState size="sm" title="Ничего не найдено" description="Измените запрос." action={<Button onClick={() => setQ('')}>Сбросить поиск</Button>} />
          : <EmptyState size="sm" title="В словаре пока нет слов" action={<Button variant="contained" onClick={openCreate}>Добавить слово</Button>} />} />
    </>
  )
}
```

### Do / Don't

| Do | Don't |
|---|---|
| One contained (primary) button per view; others outlined/text | Several filled buttons side by side |
| Name buttons with the verb: «Сохранить урок», «Отправить push» | «OK», «Submit», «Да» |
| Status = dot + text (`StatusChip`) | Colour alone, emoji as status/icons |
| Group fields with `FormSection` | One long undivided form |
| Borders to separate surfaces | Shadows/gradients on cards, hover lift (`translateY`) |
| Visible labels on every field | Placeholder as the only label |
| Errors next to the field (`helperText`) + summary Alert for submit errors | Errors only in a toast |
| `ArabicText` / `arabicInputProps` | `fontFamily: 'serif'`, Arabic without `dir="rtl"` |
| Sentence case | ALL CAPS headers, tracked eyebrows |

---

## 6. Arabic and RTL

- The page is LTR (Russian); Arabic is always an **isolated RTL island**: `dir="rtl" lang="ar"`
  plus `unicode-bidi: isolate` (done by `ArabicText`). This keeps punctuation and mixed
  Cyrillic/Arabic lines in the right order and tells screen readers the language.
- Size Arabic ~1.3× the surrounding Cyrillic (`sm` 17px next to 14px body). Use
  `line-height ≥ 1.8` (1.6 for `xl`/`display`) so harakat are never clipped; don't put
  Arabic in fixed-height containers.
- Inputs: `inputProps={arabicInputProps}` (RTL, Noto Sans Arabic, 22px). For mixed fields
  (Arabic + transliteration) use two fields, not one.
- In tables, Arabic columns are start-aligned in their own direction (right edge of the cell);
  keep them as the first column so the eye anchors on them.
- Don't apply `letter-spacing`, `text-transform` or faux-bold to Arabic; use weights 400–600.
- Quranic text: never truncate with ellipsis; wrap.

## 7. Accessibility rules

- Contrast: text ≥ 4.5:1 (all text tokens comply; never use `bronze[500]` or gold as text on
  light backgrounds), UI boundaries and focus ≥ 3:1.
- Focus: every interactive element shows a 2px bronze outline (`:focus-visible`, theme-wide).
  Never remove it; custom clickable `Box`es need `role`, `tabIndex={0}` and Enter/Space handling
  (see `FileDropzone`, `DataTable` rows) — prefer `ButtonBase`/`Button`.
- Icon-only buttons need `aria-label` (and a `Tooltip` with the same text).
- Keyboard: dialogs trap focus (MUI), Escape closes; shortcuts are shown with `KeyboardHint`
  and never fire while typing in inputs or the rich-text editor. Existing shortcuts: `[` sidebar,
  `/` focus search (when `enableSlashShortcut`).
- Status and validation never rely on colour alone (dot + text, icon + message).
- Touch targets ≥ 36px on desktop controls, 44px for primary mobile actions (`size="large"`).
- Live regions: loading states use `role="status"`, errors `role="alert"`; toolbar summaries are `aria-live="polite"`.
- Respect `prefers-reduced-motion` (handled globally).

## 8. Dark mode

Not provided. Many legacy pages hard-code light colours, so a dark palette would not be
fully working; revisit after all pages are migrated to theme paths.
