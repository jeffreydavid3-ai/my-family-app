# 🏆 Rise of the Johnsons — Family Tracker

A gamified family goal-tracking app with login, streaks, trophy road progression, and leaderboards.

## Project Structure

```
johnson-tracker/
├── index.html      — App shell & all page markup
├── styles.css      — All styling, variables, animations
├── app.js          — All JavaScript: data, login, rendering, logic
├── assets/         — (folder for future images/icons)
└── README.md       — This file
```

## How to Run

Just open `index.html` in any browser — no build step, no server required.

```bash
open index.html
# or drag index.html into Chrome/Safari/Firefox
```

## Family PINs

| Member  | PIN  |
|---------|------|
| Dad     | 1234 |
| Mom     | 2345 |
| Zach    | 3456 |
| Berrett | 4567 |
| Jaxon   | 5678 |

## Trophy Road Levels

| Level | Name              | Streak Required |
|-------|-------------------|-----------------|
| 1     | Master I          | 1–6 days        |
| 2     | Master II         | 7–13 days       |
| 3     | Master III        | 14–20 days      |
| 4     | Champion          | 21–27 days      |
| 5     | Grand Champion    | 28–34 days      |
| 6     | Royal Champion    | 35–41 days      |
| 7     | Ultimate Champion | 42–48 days      |
| 8     | Legend ⚡         | 49+ days        |

## Features

- **Family login** with per-member PIN
- **Family Dashboard** — streak box, leaderboard with trophy badges, recent badges, motto
- **Personal Dashboard** — per-member stats, streaks, category breakdown, goals
- **My Plan** — view your own goals, browse other members' plans (read-only)
- **Add Goal** — assign to yourself or All
- **History** — calendar heatmap + activity log
- **Profile** — trophy road progress, reminders, notifications
