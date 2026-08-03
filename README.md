# Budget-App

Eine private Budget-App für den täglichen Überblick über Einnahmen, Ausgaben, Fixkosten und
Sparziele — mit Sync über mehrere Geräte. Läuft im Browser, gebaut mit **React + Vite +
Tailwind**, Backend ist **Supabase**. Beträge in **CHF**.

**Live:** nach jedem Push auf `main` automatisch deployed auf GitHub Pages.

## Was die App kann

- **Dashboard** — Kontostand, Einnahmen/Ausgaben diesen Monat, verfügbarer Betrag, Wochenchart,
  Budget-Status, Spar-Fortschritt, Ausgaben-Berater mit Live-Hinweisen
- **Ausgaben & Einnahmen** erfassen, bearbeiten, löschen
- **Fixkosten** — wiederkehrende Kosten (Miete, Abos, …) mit automatischer Fälligkeit
- **Budgets** pro Kategorie mit Fortschrittsanzeige
- **Sparziele** — eigene Töpfe mit manuellen Einzahlungen
- **Berichte** — Monats-/Jahresvergleich, Kategorien-Aufteilung, Spar-Analyse, exportierbare
  Monats-Story als Bild
- Als **App aufs Handy installierbar** (PWA), inkl. Kurzbefehl fürs schnelle Erfassen von Belegen

## Was man braucht, um sie zu nutzen

- Einen Zugang (Login/Account) — Anmeldung erfolgt direkt in der App, keine Installation nötig
- Internetverbindung, da alle Daten in Supabase liegen und geräteübergreifend synchronisiert werden

## Lokale Entwicklung (nur für Anpassungen am Code)

Voraussetzung: ein eigenes Supabase-Projekt (Datenbank + Login), Zugangsdaten in `.env`
(Vorlage: `.env.example`).

```bash
npm install
npm run dev      # Dev-Server: http://localhost:5173/budget-app/
npm run build    # Produktions-Build
```

Details zu Aufbau, Architektur und Konventionen stehen in `CLAUDE.md`.

## Tech-Stack

React · Vite · Tailwind CSS · React Router · Recharts · Supabase (Postgres + Auth + Realtime)
