# UI Discussion: Workout Session Architecture

*Brainstorming session - January 2026*

## Context

How to display sets, exercises, supersets, and exercise blocks in the workout session UI.

---

## Key Concepts

### 1. Superset

- **Definition**: Multiple exercises marked with a1, b1, a2, b2 prefixes in DSL
- **Execution**: Sequential (all sets of A, then all sets of B)
- **User mental model**: Track superset as a whole, not individual exercises
- **Rest timing**: Last exercise in superset determines rest period

### 2. Exercise Block

- **Definition**: Same exercise with different set configurations
- **Examples**:
  - Pyramids: 12@60kg → 10@70kg → 8@80kg
  - Drop sets: 3x5 heavy, then 1x12 lighter
  - Different TM percentages for same exercise
- **Grouping logic**: "Same squat rack" principle - physically related work stays together
- **Note**: May need DSL enhancement to support this explicitly

---

## Display Decisions

### Supersets: Round-based, Side-by-Side

```
┌─────────────────────────────────────────────┐
│ SUPERSET: Bench Press + Barbell Row         │
├─────────────────────────────────────────────┤
│ Round 1:  [Bench 80kg]  [Row 70kg]          │
│ Round 2:  [Bench 80kg]  [Row 70kg]          │
│ Round 3:  [Bench 80kg]  [Row 70kg]          │
└─────────────────────────────────────────────┘
```

- Interleaved by round, side-by-side cards
- Shared header/container with superset name
- Completion = all sets of all exercises

### Exercise Blocks: Vertical Progression

```
┌─────────────────────────────────────────────┐
│ Squat (Pyramid)                        [i]  │
├─────────────────────────────────────────────┤
│ [Squat 60kg 12 reps] ← warmup               │
│ [Squat 80kg 10 reps]                        │
│ [Squat 100kg 8 reps]                        │
└─────────────────────────────────────────────┘
```

- Single column vertical stack
- Each card can have different weight/reps
- Shows progression pattern clearly

---

## SetCard Redesign

### Current

- Small card: weight, reps, RPE
- No exercise name
- ~88px wide

### Proposed

- **Add exercise name** as header at top of card
- **Make cards wider** (room available due to vertical stacking)
- Allows mixing cards from different exercises (for supersets)

```
┌────────────────┐
│ Bench Press    │  ← NEW: exercise name header
│ 80KG           │
│ 8-10           │
│ RPE 8          │
└────────────────┘
```

---

## Thumbnail/Media Changes

### Remove from Main View

- Experienced users don't need thumbnails
- Clutters the interface

### New Info Button Pattern

- Small [i] info icon next to exercise name
- Tap opens overlay modal with:
  - Exercise thumbnail/image
  - YouTube link button
  - Exercise notes/cues
- Discoverable for beginners, non-intrusive for regulars

---

## Terminology

| Term | Definition |
|------|------------|
| **Superset** | 2+ exercises marked with a1/b1 prefixes, done as a unit |
| **Exercise Block** | Same exercise with varying set configs (pyramid, drops) |
| **Round** | One set of each exercise in a superset |
| **Workout Unit** | Generic term for any groupable set of work |

---

## Open Questions / Future Work

1. **DSL enhancement needed** for exercise blocks - how to mark sets as belonging to same block?
2. **Max grouping size** - user said up to 25 exercises in a group (circuits?)
3. **Navigation between units** - auto-advance or manual?
4. **Progress indicator** - how to show "X/Y rounds complete" for supersets?

---

## Implementation Plan

### Phase 1: SetCard Redesign (Priority)

**Goal**: Add optional exercise name header to SetCard, make width flexible.

#### Changes to `SetCard.tsx`

```typescript
interface SetCardProps {
  // Existing props...
  weight: number;
  reps: number | string;
  rpe: number;
  variant: 'done' | 'next' | 'pending';
  isSelected?: boolean;
  isAnimating?: boolean;
  onClick?: () => void;

  // NEW props
  exerciseName?: string;        // Optional exercise name header
  showExerciseName?: boolean;   // Control visibility (default: false for backwards compat)
}
```

#### New SetCard Layout

```
┌─────────────────────┐
│ Bench Press         │  ← Optional header (when showExerciseName=true)
├─────────────────────┤
│ 80KG                │
│ 8-10                │
│ RPE 8               │
└─────────────────────┘
```

#### CSS Changes (`styles.css`)

- Remove fixed `width: 88px` from `.fit-set-card`
- Add `min-width: 88px` for minimum size
- Add `.fit-set-card-name` for exercise name header styling
- Use `width: auto` or `fit-content` for flexible sizing

#### New Stories to Add

1. `WithExerciseName` - Card showing exercise name header
2. `WithLongExerciseName` - Test truncation/wrapping
3. `MixedExerciseRow` - Multiple cards with different exercise names (superset preview)

### Phase 2: Info Button Pattern

**Goal**: Replace inline thumbnails with info button next to exercise name.

#### Changes to `SessionScreen.tsx`

1. Remove `<img>` thumbnail from exercise row
2. Remove YouTube badge from thumbnail
3. Add `[i]` info button next to exercise name in row header
4. Info button opens modal overlay with:
   - Exercise thumbnail/image
   - YouTube link button
   - Exercise notes/coaching cues

#### New Component: `ExerciseInfoModal.tsx`

```typescript
interface ExerciseInfoModalProps {
  exerciseName: string;
  imageUrl?: string;
  youtubeUrl?: string;
  note?: string;
  onClose: () => void;
}
```

#### UI Changes

**Before (current):**
```
┌─────────────────────────────────────────────┐
│ Bench Press              3/3   [thumbnail]  │
│ [set] [set] [set]              [YT badge]   │
│                         "Keep shoulders..." │
└─────────────────────────────────────────────┘
```

**After (new):**
```
┌─────────────────────────────────────────────┐
│ Bench Press [i]                        3/3  │
│ [set] [set] [set]                           │
└─────────────────────────────────────────────┘
```

### Phase 3: Superset Round Layout (Future)

**Goal**: Display supersets as interleaved rounds with side-by-side cards.

**Prerequisites**:
- DSL must support superset markers (a1, b1, etc.)
- SetCard must support exercise name display
- Domain adapter must expose superset grouping

**Deferred** - implement after Phase 1 and 2 are complete.

---

## Current State (Screenshots Reference)

### SetCard Component
- Fixed 88px width
- Shows: weight, reps, RPE
- No exercise name
- States: done (green), next (yellow), pending (gray)

### SessionScreen Layout
- Per-exercise rows (Bench Press row, Barbell Row row)
- Vertical set stack on left
- Thumbnail + YouTube badge on right
- Speech bubbles for coaching notes and adjustments
- Footer with action buttons

---

## Files to Modify

### Phase 1
1. `src/ui/react/components/SetCard.tsx` - Add exerciseName prop
2. `src/ui/react/components/SetCard.stories.tsx` - Add new stories
3. `styles.css` - Flexible width, name header styling

### Phase 2
1. `src/ui/react/screens/SessionScreen.tsx` - Remove thumbnail, add info button
2. `src/ui/react/components/ExerciseInfoModal.tsx` - New component
3. `src/ui/react/components/ExerciseInfoModal.stories.tsx` - Stories
4. `styles.css` - Info button and modal styling

---

## Design Decisions Log

### Superset Execution
- **Decision**: Sequential (complete all of A, then all of B)
- **Rationale**: User tracks superset as whole, not individual exercises

### Set Layout in Supersets
- **Decision**: Interleaved by round, side-by-side cards
- **Rationale**: Shows the pairing relationship between exercises

### Completion Criteria
- **Decision**: All sets of all exercises must be done
- **Rationale**: Superset is one unit of work

### DSL Mapping
- **Decision**: Show rounds explicitly (Round 1, Round 2, etc.)
- **Rationale**: Matches DSL structure, clear progress indication

### Exercise Name on Cards
- **Decision**: Add header at top, make cards wider
- **Rationale**: Enables mixing cards from different exercises in superset view

### Thumbnails
- **Decision**: Remove from main view, add info button instead
- **Rationale**: Clean UI for experienced users, discoverable help for beginners

### Rest Timer in Supersets
- **Decision**: Last exercise determines rest period
- **Rationale**: No rest between exercises in the pair, only after completing both

### Implementation Priority
- **Decision**: SetCard redesign first, then info button, then superset layout
- **Rationale**: SetCard is foundation for everything else

### Exercise Name Visibility on SetCard
- **Decision**: Configurable via `showExerciseName` prop (default: false)
- **Rationale**: Backwards compatible, parent component decides based on context

### Current Layout Structure
- **Decision**: Keep per-exercise rows for now
- **Rationale**: Don't break existing layout, add superset rounds as separate display mode later

### Info Button Placement
- **Decision**: Next to exercise name in row header ("Bench Press [i]")
- **Rationale**: Discoverable but not intrusive, consistent location

### SetCard Width
- **Decision**: Flexible/auto width with min-width
- **Rationale**: Cards adjust to content (exercise name length), consistent minimum size

### Development Approach
- **Decision**: Update component + stories in parallel
- **Rationale**: Iterate quickly, see changes in Storybook immediately

---

## Feedback Banner (Duolingo-style)

Exercise completion feedback displayed as a bottom banner, inspired by Duolingo's "Correct!" feedback pattern.

### Design Pattern

```
┌─────────────────────────────────────────────┐
│ ✓  +2.5kg next session                      │
│    Great performance! RPE was below target. │
│                                             │
│    ┌─────────────────────────────────────┐  │
│    │           CONTINUE                  │  │
│    └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Three Variants

| Variant | Use Case | Background | Text/Icon | Button |
|---------|----------|------------|-----------|--------|
| **Up** | Weight increased | `#d7ffb8` (light green) | `#58a700` (dark green) | `#58cc02` (green) |
| **Down** | Weight decreased | `#ffecd0` (light peach) | `#cd7900` (dark orange) | `#ff9600` (orange) |
| **Neutral** | No adjustment | `#ddf4ff` (light blue) | `#1899d6` (dark blue) | `#1cb0f6` (blue) |

### Color Palette

```css
/* Green (Up Adjustment) */
--feedback-up-bg: #d7ffb8;        /* Light pastel green */
--feedback-up-text: #58a700;      /* Dark green */
--feedback-up-button: #58cc02;    /* Bright green */
--feedback-up-shadow: #58a700;    /* Button shadow */

/* Orange (Down Adjustment) */
--feedback-down-bg: #ffecd0;      /* Light pastel peach */
--feedback-down-text: #cd7900;    /* Dark orange */
--feedback-down-button: #ff9600;  /* Bright orange */
--feedback-down-shadow: #cd7900;  /* Button shadow */

/* Blue (Neutral/No Adjustment) */
--feedback-neutral-bg: #ddf4ff;   /* Light pastel blue */
--feedback-neutral-text: #1899d6; /* Dark blue */
--feedback-neutral-button: #1cb0f6; /* Bright blue */
--feedback-neutral-shadow: #1899d6; /* Button shadow */
```

### Component Structure

```tsx
<div className="fit-feedback-banner feedback-up|feedback-down|feedback-neutral">
  <div className="fit-feedback-header">
    <div className="fit-feedback-icon">
      <svg><!-- checkmark --></svg>
    </div>
    <div className="fit-feedback-content">
      <div className="fit-feedback-title">+2.5kg next session</div>
      <div className="fit-feedback-subtitle">Great performance!</div>
    </div>
  </div>
  <button className="fit-feedback-button">Continue</button>
</div>
```

### Key Design Elements

1. **Light pastel backgrounds** with dark text (not saturated colors with white text)
2. **Colored checkmark icon** in a circle on the left
3. **Left-aligned header** with title and subtitle
4. **Solid colored button** with shadow effect (Duolingo's signature 3D button style)
5. **Colored top border** accent (2px)
6. **Slide-up animation** on appearance

### Content Guidelines

| Variant | Title Example | Subtitle Example |
|---------|---------------|------------------|
| Up | "+2.5kg next session" | "Great performance! RPE was below target across all sets." |
| Down | "-5kg next session" | "RPE was too high. Reducing weight to stay in the target range." |
| Neutral | "Exercise Complete!" | "Next: 3×8-10 @ 80kg" |

### CSS Classes

- `.fit-feedback-banner` - Main container
- `.fit-feedback-banner.feedback-up` - Green variant
- `.fit-feedback-banner.feedback-down` - Orange variant
- `.fit-feedback-banner.feedback-neutral` - Blue variant
- `.fit-feedback-header` - Icon + content row
- `.fit-feedback-icon` - Circular checkmark container
- `.fit-feedback-content` - Title and subtitle wrapper
- `.fit-feedback-title` - Main message (22px, bold)
- `.fit-feedback-subtitle` - Supporting text (14px)
- `.fit-feedback-button` - Continue button
