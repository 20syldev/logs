<div align="center">
  <a href="https://logs.sylvain.sh"><img src="https://logs.sylvain.sh/favicon.ico" alt="Logo" width="25%" height="auto"/></a>

# Logs - API Request Viewer

[![Version](https://custom-icon-badges.demolab.com/badge/Version%20:-v2.0.0-6479ee?logo=logs.sylvain.sh&labelColor=23272A)](https://github.com/20syldev/logs/releases/latest)

</div>

---

## À propos

Instance standalone de **[Flowers](https://github.com/20syldev/flowers)** pour visualiser en temps réel les logs de l'API [api.sylvain.sh](https://api.sylvain.sh).

## Stack

- **[Next.js](https://nextjs.org)** — App Router, static export
- **[Tailwind CSS](https://tailwindcss.com)** v4
- **[TypeScript](https://www.typescriptlang.org)**
- **[Radix UI](https://www.radix-ui.com)** — Composants accessibles
- **[Lucide](https://lucide.dev)** — Icônes

## Développement

```bash
npm install
npm run dev
```

## Configuration

Le fichier `endpoints.json` à la racine définit l'instance :

```json
{
    "title": "Logs",
    "endpoints": [{ "name": "API Logs", "url": "https://api.sylvain.sh/logs" }]
}
```

> _Basé sur [Flowers](https://flowers.sylvain.sh) — un viewer temps réel pour toute API JSON._