# React Integration with fitness-dsl

This document describes the React integration and fitness-dsl rule engine integration in the Obsidian Fitness plugin.

## Overview

The plugin has been enhanced with:
1. **React UI** - Modern React-based interface using React 18's createRoot API
2. **fitness-dsl integration** - Domain-specific language parser for fitness programs
3. **Event-driven architecture** - Clean separation between UI and domain logic

## Architecture

```
┌─────────────────────────────────────┐
│         Program Definition          │
│         (Markdown in Vault)         │
└─────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│      FitnessDomainAdapter           │
│  - Parse program markdown           │
│  - Manage session state             │
│  - Handle UI events                 │
│  - Evaluate progression rules       │
└─────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│           React UI                  │
│  - HomeScreen                       │
│  - SessionScreen                    │
│  - ExerciseScreen (TODO)            │
│  - Context providers                │
└─────────────────────────────────────┘
```

## Key Files

### Domain Layer
- `src/domain/fitness-domain-adapter.ts` - Adapter that wraps fitness-dsl parser and provides clean API for UI

### React UI Layer
- `src/ui/react/contexts.tsx` - React context providers (App, Plugin, Domain)
- `src/ui/react/App.tsx` - Main React app component with navigation
- `src/ui/react/screens/HomeScreen.tsx` - Home screen showing program overview
- `src/ui/react/screens/SessionScreen.tsx` - Active workout session screen
- `src/views/fit-view-react.ts` - Obsidian view that mounts React app

### Updated Files
- `src/main.ts` - Registers both legacy and React views
- `tsconfig.json` - Added JSX/TSX support
- `package.json` - Added React dependencies

## Usage

### Commands
- **Open workout tracker (React)** - Opens the new React-based UI (default)
- **Open workout tracker (Legacy)** - Opens the original vanilla TypeScript UI

### API

The domain adapter provides an event-driven API:

```typescript
import { FitnessDomainAdapter } from './domain/fitness-domain-adapter';

// Create adapter
const adapter = new FitnessDomainAdapter(app);

// Load program from vault
const program = await adapter.loadProgram('Fitness/Programs/my-program.md');

// Handle UI events
adapter.dispatch({ type: 'start_workout', workoutName: 'Push Day' });
adapter.dispatch({ type: 'complete_set', exercise: 'Bench Press', reps: 10, weight: '80kg', rpe: 8 });
adapter.dispatch({ type: 'finish_session' });

// Get current state
const session = adapter.getSessionState();
```

### React Context

Components can access app resources via hooks:

```typescript
import { useApp, usePlugin, useDomain } from '../contexts';

function MyComponent() {
  const app = useApp();           // Obsidian App instance
  const plugin = usePlugin();     // Plugin instance
  const { program, session, dispatch } = useDomain();  // Domain state & events

  return <div>...</div>;
}
```

## fitness-dsl Integration

The fitness-dsl is a Domain-Specific Language for describing fitness programs in Markdown.

### Program Format

Programs are written in markdown with special syntax:

```markdown
# My Program

# Schedule

## Weekly Pattern
- Monday 18:00: Push Day
- Wednesday 18:00: Pull Day
- Friday 18:00: Leg Day

# Progression

## Global Defaults
- if reps >= max: +2.5kg
- if 3 fails: -10%

# Workouts

## Push Day

- Bench Press: 4x6-8 @ 80kg RPE 8, rest 180s | +2.5kg when 4x8 complete
- Overhead Press: 3x8-10 @ 50kg RPE 7, rest 120s
```

### Parser Output

The parser outputs structured JSON:

```json
{
  "program": {
    "name": "My Program",
    "description": "..."
  },
  "schedule": {
    "weeklyPattern": [...],
    "cyclePattern": [...]
  },
  "progression": {
    "globalRules": [...],
    "periodization": [...]
  },
  "workouts": [...],
  "nextSession": {...},
  "sessionHistory": [...]
}
```

## Development Status

### ✅ Completed
- React setup and configuration
- fitness-dsl integration (basic)
- Domain adapter foundation
- Context providers
- HomeScreen component
- SessionScreen component
- Main App component with navigation
- FitViewReact with createRoot
- Build pipeline working

### 🚧 TODO
- Integrate actual fitness-dsl parser (currently using mock data)
- Implement remaining screens (ExerciseScreen, WorkoutPicker, History, etc.)
- Connect session data persistence to markdown files
- Add progression rule evaluation
- Implement exercise library
- Add proper styling
- Mobile optimizations
- Migrate more features from legacy UI
- Unit tests for domain adapter
- Integration tests for React components

## Dependencies

New dependencies added:
- `react` - React library
- `react-dom` - React DOM renderer
- `@types/react` - React TypeScript types
- `@types/react-dom` - React DOM TypeScript types
- `antlr4ng` - ANTLR4 runtime for parser
- `fitness-dsl` - Local dependency (../fitness-dsl)

## Next Steps

1. **Implement real parser integration**: Replace mock data in `FitnessDomainAdapter.parseProgram()` with actual fitness-dsl parser
2. **Session persistence**: Save completed sessions as markdown files in vault
3. **Progression evaluation**: Implement rule evaluation based on session history
4. **Complete UI migration**: Port remaining screens from legacy UI to React
5. **Testing**: Add comprehensive tests for domain logic and React components
6. **Documentation**: Update user-facing documentation

## References

- [Obsidian Plugin React Guide](https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin)
- [fitness-dsl Architecture](../fitness-dsl/docs/ARCHITECTURE.md)
- [fitness-dsl HOWTO](../fitness-dsl/docs/HOWTO.md)
