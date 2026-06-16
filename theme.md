# Analyse du Thème — Pablo Corp (RinaCorp)

## Aperçu

Site multi-pages HTML/CSS/JS vanilla. **Aucun build tool, bundler, préprocesseur, CSS-in-JS ou framework UI**. Le thème est entièrement défini dans `src/css/style.css` via des propriétés CSS personnalisées. Tailwind présent uniquement dans `Test/test.html` (page expérimentale, hors site actif).

---

## Design Tokens (CSS Custom Properties dans `:root`)

```css
:root {
  /* COULEURS */
  --black: black;
  --black-card: #0d0b07;
  --black-border: #1e1a12;
  --gold: #c9a227;
  --gold-dim: #8b6610;
  --gold-light: #e8c860;
  --gold-glow: rgba(201, 162, 39, 0.18);
  --amber-dark: #1a0e02;
  --cream: #f0e6c8;
  --cream-dim: #c8b88a;
  --muted: #7a6e56;

  /* FONTS */
  --font-display: "Playfair Display", Georgia, serif;
  --font-body: "DM Sans", system-ui, sans-serif;

  /* BORDER-RADIUS */
  --r-sm: 8px;
  --r-md: 14px;
  --r-lg: 20px;
  --r-xl: 30px;
}
```

---

## Palette de Couleurs

| Token | Hex | Usage |
|-------|-----|-------|
| `--black` | `#000000` | Fond body |
| `--black-card` | `#0d0b07` | Cartes, footer, donation |
| `--black-border` | `#1e1a12` | Bordures, séparateurs, ombre navbar |
| `--gold` | `#c9a227` | Accent principal : badges, actif, prix, hover links, btn-gold, stats, titres footer |
| `--gold-dim` | `#8b6610` | Secondaire : gradient btn, bordure hover carte, focus input, btn-outline border |
| `--gold-light` | `#e8c860` | Highlight : gradient btn, rhum badges |
| `--gold-glow` | `rgba(201,162,39,0.18)` | Effets glow subtils |
| `--amber-dark` | `#1a0e02` | Fond d'accent mineur |
| `--cream` | `#f0e6c8` | Texte sur fond sombre : titres, hero, inputs modaux |
| `--cream-dim` | `#c8b88a` | Texte secondaire : btn-outline, skill chips, method badges |
| `--muted` | `#7a6e56` | Texte body, descriptions, nav links, tab inactif, stat labels |

### Couleurs dures supplémentaires

- Succès : `#22c55e` / `#4ade80`
- Erreur : `#ef4444` / `#e74c3c` / `#ff6b6b`
- Blanc overlay : `rgba(255,255,255,0.06)` etc.
- Fond navbar scrolled : `rgba(3,3,2,0.95)`
- Overlay modal : `rgba(0,0,0,0.85)`
- Fond modal : `linear-gradient(145deg, #0d0b07, #15120c)`

### Gradients par variante de Rhum

- **Passion** : `linear-gradient(145deg, #2a0a2e, #1a0520, #0d0010)` — violet profond
- **Tropical** : `linear-gradient(145deg, #0a2a0e, #061a08, #020d04)` — vert profond
- **Agrumes** : `linear-gradient(145deg, #2a1a02, #1a1002, #0d0802)` — ambré
- **Fruits Rouges** : `linear-gradient(145deg, #2a0a0a, #1a0505, #0d0202)` — rouge profond
- **Ananas** : `linear-gradient(145deg, #0a1e2a, #051218, #02090e)` — teal profond
- **Coco** : `linear-gradient(145deg, #0a0a1e, #050514, #02020c)` — bleu profond

---

## Typographie

### Font Families

- **`--font-display`** : `"Playfair Display", Georgia, serif` — titres, stats, prix, rhum names
- **`--font-body`** : `"DM Sans", system-ui, sans-serif` — tout le reste

Google Fonts : Playfair Display (400, 600, 700, 900 + italic 400) + DM Sans (300, 400, 500, 600, 700).

### Échelle typographique

| Classe | Font | Taille (clamp) | Weight | Line Height | Couleur |
|--------|------|----------------|--------|-------------|---------|
| `.display-xl` | display | `clamp(44px,7vw,96px)` | 900 | 1.05 | --cream |
| `.display-lg` | display | `clamp(32px,5vw,64px)` | 700 | 1.1 | --cream |
| `.display-md` | display | `clamp(24px,3vw,40px)` | 600 | 1.2 | --cream |
| `.heading` | display | `clamp(20px,2.5vw,28px)` | 600 | 1.3 | --cream |
| `.eyebrow` | body | `11px` | 700 | — | --gold |
| `.body-lg` | body | `18px` | normal | 1.7 | --muted |
| `.body-md` | body | `16px` | normal | 1.65 | --muted |
| `.body-sm` | body | `14px` | normal | 1.5 | --muted |

### Tailles supplémentaires notables

- Nav links : 14px weight 500
- Nav mobile : 22px
- Hero badge : 12px weight 700, letter-spacing 2px, uppercase
- Boutons : 15px weight 600 (btn-gold: 700)
- Module number : 48px weight 900
- Rhum name : 28px weight 700
- Prix rhum : 20px weight 700, --gold
- Titres footer : 12px weight 700, letter-spacing 2px, uppercase, --gold

---

## Système d'Espacement

- **Container** : max-width 1200px, padding 0 30px (mobile : 0 16px)
- **Section padding** : 110px 0 (mobile : 70px)
- **Cartes** : padding 28px
- **Boutons** : padding 14px 28px, gap 10px
- **Nav links gap** : 32px
- **Hero padding** : 160px 0 100px (mobile : 140px 0 80px)
- **Section header margin-bottom** : 60px
- **Footer** : padding 60px 0 30px, footer-grid gap 40px
- **Breakpoints** : 1024px (tablet), 768px (mobile)

---

## Breakpoints / Responsive

### 1024px — Tablet
- Hero pillars : 4 → 2 colonnes
- Modules grid : 3 → 2 colonnes
- ASA layout : 2 → 1 colonne
- Rhum hero : 2 → 1 colonne (image cachée)
- Rhum grid : 3 → 2 colonnes
- Footer grid : 4 → 2 colonnes

### 768px — Mobile
- Container padding : 30 → 16px
- Section padding : 110 → 70px
- Hero padding : 160/100 → 140/80px
- Nav links cachés, hamburger visible
- Modules grid : 2 → 1 colonne
- ASA skills : 2 → 1 colonne
- ASA stats : 3 → 1 colonne
- Rhum grid : 2 → 1 colonne
- Footer : 2 → 1 colonne

---

## Composants

### Boutons

| Variante | Fond | Texte | Bordure | Hover |
|----------|------|-------|---------|-------|
| `.btn-gold` | `linear-gradient(135deg, gold-dim, gold, gold-light)` | `#0a0700` | none | translateY(-2px), shadow+ |
| `.btn-outline` | transparent | cream-dim | `1px solid gold-dim` | border → gold, color → gold |
| `.btn-ghost` | `rgba(201,162,39,0.08)` | gold | `1px solid rgba(201,162,39,0.2)` | bg → 0.15 |
| `.btn-telegram` | gold gradient | — | none | circulaire 66px |

### Cartes

- Fond `--black-card`, bordure `1px solid --black-border`, radius `--r-md`, padding 28px
- `.card-hover` : hover → border gold-dim, translateY(-4px), ombre gold

### Navbar

- Fixe, z-index 200, transition background & shadow
- `.scrolled` : `rgba(3,3,2,0.95)` + `backdrop-filter: blur(12px)`
- Liens : 14px weight 500 --muted, hover → --gold

### Hero

- Full viewport, flex column centré, background gradient + `bg.png`
- Particules animées (JS, 60 particules dorées)
- Badge or avec point pulsant

### Modal (Vérification Instagram)

- Plein écran, z-index 9999, overlay dark avec blur
- Carte avec bordure or, animation d'entrée
- Input avec préfixe `@`, validation (vert = valide, rouge = erreur)
- Spinner de chargement

### Toast Notification

- Fixe en bas centré, bordure gold-dim
- Animation slide-up, auto-dismiss 3200ms

### Sticky CTA (Telegram)

- Fixe bottom-right, visible après 600px scroll
- Bouton circulaire or avec icône Telegram

---

## Mode Sombre / Clair

**Exclusivement dark mode.** Aucun light mode, aucune bascule, aucune media query `prefers-color-scheme`.

---

## Fichiers du Thème

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/css/style.css` | 1420 | **Toutes les définitions du thème** |
| `src/css/video.css` | 47 | Styles overlay vidéo |
| `src/scripts/main.js` | 228 | Comportements JS (pas de styles) |
| `index.html` | 1453 | Styles inline (~35 lignes pour cart/rhum) |
| `trading.html` | 311 | Styles inline (~16 lignes) |
| `asaenligne.html` | 267 | Styles inline (~16 lignes) |
| `rhum.html` | 292 | Styles inline (~16 lignes) |

---

## Points d'Amélioration

1. **Ajouter un mode clair** via `prefers-color-scheme`
2. **Centraliser les styles inline** dispersés dans les 4 HTML
3. **SCSS/Less** pour nesting et mixins
4. **Build step** pour minification et autoprefixing
5. **Design tokens pour le spacing** (padding/margin en dur partout)
6. **Cohérence** : `.amount-btn` utilise `--font-display`, les autres boutons utilisent `--font-body`
7. **Couleurs dures** dans `video.css`, gradients rhum, états succès/erreur
