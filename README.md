# Nordhouse – web

Statický prototyp webu nordhouse.cz (tiny house na podvozku a sauny).

**Živá verze:** https://growupmediacz.github.io/nordhouse-web/

## Struktura

- `index.html` – celý web v jednom souboru (CSS, JS, hash routování `#/...`)
- `img/` – obrázky (`.webp`), načítají se přes helper `IMG('nazev')` → `img/nazev.webp`
- `vid/` – videa (`.mp4`)
- `.nojekyll` – GitHub Pages servíruje soubory tak, jak jsou

## Lokální spuštění

```bash
python3 -m http.server 8000
```

Pak otevři http://localhost:8000.

## Nasazení

GitHub Pages z větve `main`, kořen repozitáře. Každý push do `main` se do minuty projeví na živé URL.

## Poznámky

- Všechny obrázky a videa jsou vizualizace.
- Formuláře se v prototypu nikam neodesílají.
