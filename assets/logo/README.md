# Logo /ATE — Angular Tiptap Editor

Le « / » des slash commands, croqué : **/ate**. *Ate* veut dire « mangé » en anglais, et ATE est le sigle d'Angular Tiptap Editor.

## Fichiers

| Fichier | Usage |
|---|---|
| `svg/logo-keys(-dark).svg` | Logo principal : slash croqué + touches A·T·E (README, site, docs) |
| `svg/logo-ate(-dark).svg` | Logo compact : tuile + « ate » |
| `svg/icon(-dark).svg` | Icône sur tuile (favicon, avatar npm/GitHub) |
| `svg/mark(-dark).svg` | Slash croqué seul, sans fond |
| `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` | Favicons |
| `png/icon-*.png` | Icône de 16 à 1024 px (512 : avatar npm/GitHub) |
| `png/social-preview.png` | 1280×640, à mettre dans GitHub → Settings → Social preview |

Couleurs : bleu `#2563eb` (clair) / `#3b82f6` (sombre), relief des touches `#153ca9` / `#1e3a8a`. Ce sont les couleurs `--ate-primary` de la lib.

## README (clair/sombre auto)

```html
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/svg/logo-keys-dark.svg">
    <img src="assets/logo/svg/logo-keys.svg" alt="/ATE — Angular Tiptap Editor" height="72">
  </picture>
</p>
```

## Démo Angular (`src/index.html`)

```html
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta property="og:image" content="https://flogeez.github.io/angular-tiptap-editor/social-preview.png">
```
