# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Obsidian Fit** is a mobile-first workout tracking plugin for Obsidian. It provides zero-typing set logging, program templates powered by a custom DSL, rest timers, and workout history tracking. The plugin runs inside Obsidian's Electron-based environment.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Build with watch mode (development)
npm run build        # Production build (includes type checking)
npm run lint         # Run ESLint
npm run test         # Run Vitest tests
npm run test:watch   # Run tests in watch mode
npm run storybook    # Start Storybook dev server (port 6006)
npm version patch    # Bump version (also updates manifest.json and versions.json)
```

## Architecture

### Entry Points
- `src/main.ts` → compiled to `main.js` (plugin lifecycle, view registration)
- `src/views/fit-view.ts` - Legacy vanilla JS view
- `src/views/fit-view-react.ts` - React-based view (default)

### Key Layers

```
src/
├── main.ts                    # Plugin entry, lifecycle
├── settings.ts                # Settings interface and tab
├── domain/                    # Domain logic (framework-agnostic)
│   ├── fitness-domain-adapter.ts  # Bridges fitness-dsl with plugin
│   ├── metrics/               # Session/exercise/set metrics
│   ├── session/               # Session lifecycle and completion
│   ├── feedback/              # Coach feedback normalization
│   └── reference/             # Wikilinks, exercise sources
├── data/                      # Data access layer
│   ├── program-repository.ts  # Program file operations
│   ├── session-repository.ts  # Session file operations
│   ├── exercise-repository.ts # Exercise library
│   └── *-body.ts              # Markdown body generation
├── state/                     # State management
│   ├── session-state.ts       # Active session state
│   ├── rest-timer-manager.ts  # Rest timer logic
│   └── persistence-manager.ts # State persistence
├── viewmodel/                 # ViewModel layer
│   └── fit-viewmodel.ts       # Computed state for UI
├── ui/
│   ├── react/                 # React UI (primary)
│   │   ├── App.tsx            # Root React app
│   │   ├── contexts.tsx       # React contexts (App, Plugin, Domain)
│   │   ├── screens/           # Screen components
│   │   └── components/        # Reusable components
│   ├── screens/               # Legacy vanilla JS screens
│   ├── components/            # Legacy vanilla JS components
│   └── modals/                # Obsidian modals
├── storybook/                 # Storybook infrastructure
│   ├── mocks/                 # Mock implementations
│   │   ├── domain-mock.ts     # Mock FitnessDomainAdapter
│   │   └── obsidian-storybook-mock.ts  # Mock Obsidian APIs
│   └── decorators/            # Story decorators (providers.tsx)
└── test/                      # Test utilities
```

### External Dependencies
- **fitness-dsl** (local): ANTLR4-based DSL for program definitions (linked via `file:../fitness-dsl`)
- **React 19**: UI framework for modern screens
- **Obsidian API**: Plugin framework
- **Vitest**: Test runner
- **Storybook 8**: Component development environment

## Key Patterns

### Domain Adapter
`FitnessDomainAdapter` bridges the fitness-dsl rule engine with the plugin:
- Parses program markdown using ANTLR4
- Manages session state and set completion
- Evaluates progression rules
- Returns typed JSON for React UI consumption

### React Contexts
The React UI uses three main contexts (`src/ui/react/contexts.tsx`):
- `AppProvider` - Obsidian App instance
- `PluginProvider` - Plugin instance with settings
- `DomainProvider` - FitnessDomainAdapter for program/session state

### Storybook Development
Stories are located alongside components (`*.stories.tsx`). Key decorators:
- `withProviders` - Full context setup with default program
- `withLoadedProgram(markdown)` - Custom program for story
- `withActiveSession(workout, markdown)` - Active workout session

### fitness-dsl Syntax
Programs are written in markdown with specific DSL syntax:
```markdown
# Program Name

Description text.

---

# Progression

## Training Maxes

- Squat TM: 100kg
- Bench Press TM: 80kg

---

# Schedule

## Weekly Pattern

- Monday: Upper Body
- Wednesday: Lower Body

---

# Workouts

## Upper Body

Workout description.

- Bench Press: 3x8-10 @ 85% TM RPE 8, rest 180s "Keep shoulders retracted"
- Face Pulls (optional): 3x15-20 @ 15kg RPE 7, rest 60s
```

**Important DSL rules:**
- Percentage TM syntax: `@ 85% TM` (no exercise name after TM)
- Optional exercises: suffix like `Face Pulls (optional):`
- Notes in quotes: `"note text"`
- Schedule uses plain text days, not markdown bold (`- Monday:` not `- **Monday**:`)

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Tests use Vitest with jsdom. Test files are co-located with source (`*.test.ts`).

## Storybook

```bash
npm run storybook     # Start on http://localhost:6006
```

Storybook uses:
- `.storybook/obsidian-app.css` - Obsidian base styles
- `.storybook/obsidian-theme.css` - Theme variables
- `styles.css` - Plugin styles

Mock implementations in `src/storybook/mocks/` simulate Obsidian APIs and domain adapter.

## Release Artifacts

- `main.js` - Bundled plugin code
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styling

## Code Organization Guidelines

- Keep `main.ts` minimal: lifecycle only (onload, onunload, command/view registration)
- Domain logic in `src/domain/` should be framework-agnostic (no Obsidian imports)
- React screens in `src/ui/react/screens/`, components in `src/ui/react/components/`
- Every React screen should have a corresponding `*.stories.tsx` file
- Split files exceeding ~200-300 lines into focused modules
- Never commit `node_modules/` or `main.js`

## Visual Design

This plugin follows the **Duolingo Design System** for a playful, motivating fitness tracking experience.

**See `STYLE_GUIDE.md` for the complete design reference.**

### Quick Reference

**Colors:**
- Primary Green: `#58CC02` (success, completed)
- Active Yellow: `#FFC800` (current set, "next")
- Inactive Gray: `#E5E5E5` (pending)
- Warning Orange: `#FF9600` (negative adjustments)
- Text: `#4B4B4B` (primary), `#777777` (secondary)

**3D Button Effect:**
```css
background: #58CC02;
box-shadow: 0 4px 0 #46A302;
border-radius: 12px;
```

**Typography:**
- Always lowercase (except abbreviations like AMRAP, RPE)
- Bold weights for headings and values
- Minimum 14px font size

**Key Principles:**
- Chunky rounded corners (12-16px radius)
- 3D shadow effects on interactive elements
- Vibrant, saturated colors
- Clear visual feedback on all interactions

## Instructions

- **Before implementing fitness-dsl integration work**, read the fitness-dsl documentation at `../fitness-dsl/docs/` (especially `ENGINE.md`, `ENGINE-OUTPUT.md`, and `DSL-IR-ENGINE-ARCHITECTURE.md`) and `../fitness-dsl/CLAUDE.md` to understand the DSL architecture, event system, and type definitions.
- Never work around the linter or add linter ignore comments. Fix the root cause in the code.
- When writing Storybook stories, use the correct fitness-dsl syntax (see above).
- Prefer React components over legacy vanilla JS for new features.
- Follow the Duolingo-inspired style guide in `STYLE_GUIDE.md` for all UI work.
- Use 3D button/card effects with `box-shadow: 0 4px 0` for interactive elements.
- Keep text lowercase in UI (capitals only for abbreviations like AMRAP, RPE, TM).
