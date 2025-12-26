# Fitness

A mobile-first workout tracker for Obsidian. Log your sets with zero typing, follow training programs, and track your progress—all stored as plain markdown files in your vault.

## Features

- **Zero-typing set logging** - Tap to log weight and reps using smart incrementers
- **Rest timer** - Auto-starts between sets with customizable duration
- **Training programs** - Follow structured programs like Push/Pull/Legs, Bro Split, or create your own
- **Exercise library** - 800+ exercises with images, muscle groups, and instructions (importable)
- **Workout templates** - Create reusable workouts with target sets, reps, and rest times
- **Session history** - Review past workouts with volume stats
- **Plain markdown** - All data stored as readable `.md` files you own

## Installation

### From Obsidian Community Plugins
1. Open Settings → Community plugins
2. Search for "Fitness"
3. Click Install, then Enable

### Manual Installation
1. Download the latest release (`main.js`, `manifest.json`, `styles.css`)
2. Create folder: `<vault>/.obsidian/plugins/obsidian-fitness/`
3. Copy the files into the folder
4. Reload Obsidian and enable the plugin

## Quick Start

1. Click the dumbbell icon in the ribbon (or run command "Open workout tracker")
2. On first launch, starter content is created automatically:
   - Sample exercises (squat, bench, deadlift, etc.)
   - Two full-body workouts
   - A beginner program
3. Tap a workout to start a session
4. Log your sets and track your progress

## Importing the Exercise Database

The plugin includes 12 starter exercises. To import 800+ exercises with images:

1. Open Settings → Fitness → Exercise database
2. Click "Import"
3. Exercises are fetched from [free-exercise-db](https://github.com/yuhonas/free-exercise-db)

Or use the command palette: "Import exercise database (800+ exercises)"

## Data Structure

All data is stored as markdown in your configured folder (default: `Fitness/`):

```
Fitness/
├── Exercises/        # Exercise definitions
│   ├── bench-press.md
│   └── deadlift.md
├── Workouts/         # Workout templates
│   ├── push-day.md
│   └── pull-day.md
├── Programs/         # Training programs
│   └── push-pull-legs.md
└── Sessions/         # Logged workout sessions
    └── 2024-01-15-09-30-push-day.md
```

### Exercise File
```markdown
---
name: Bench Press
category: Strength
equipment: Barbell
muscleGroups: [Chest, Triceps, Shoulders]
image0: https://...
image1: https://...
---
Lie on a flat bench, grip the bar slightly wider than shoulder-width...
```

### Workout File
```markdown
---
name: Push Day
description: Chest, shoulders, and triceps
---

## Exercises

| Exercise | Sets | Reps | Rest |
| -------- | ---- | ---- | ---- |
| [[bench-press]] | 4 | 6-8 | 180s |
| [[overhead-press]] | 3 | 8-10 | 120s |
```

### Program File
```markdown
---
name: Push Pull Legs
description: 6-day split
---

## Workouts

- [[push-day]]
- [[pull-day]]
- [[leg-day]]
```

## Settings

| Setting | Description |
|---------|-------------|
| Data folder | Base folder for all fitness data (default: `Fitness`) |
| Weight unit | Kilograms or pounds |
| Break time | Default rest duration between sets |
| Auto-start timer | Automatically start rest timer after logging a set |
| Active program | Select a program to follow (shows next workout on home screen) |
| Weight increments | Customize the increment buttons for kg/lbs |

## Development

```bash
npm install          # Install dependencies
npm run dev          # Build with watch mode
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run tests
```

## License

MIT

## Credits

- Exercise data from [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db)
