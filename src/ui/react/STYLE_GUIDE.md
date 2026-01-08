# Fitness App Style Guide

This document outlines the design system for the React UI components. Follow these guidelines to maintain visual consistency across all screens.

## Design Principles

1. **Mobile-first** - Design for small viewports first, all touch targets minimum 44px
2. **Clean & minimal** - White backgrounds, subtle shadows, generous whitespace
3. **Clear hierarchy** - Bold headings, muted labels, prominent primary actions
4. **Instant feedback** - Scale transforms on touch, clear active states

---

## Color Palette

### CSS Variables (defined in `.fit-app`)

```css
/* Primary colors (green - confirmations, success, active states) */
--fit-primary: #22C55E;
--fit-primary-dark: #16A34A;
--fit-primary-light: #DCFCE7;

/* Accent colors (yellow/orange - primary actions, CTAs) */
--fit-accent: #F59E0B;
--fit-accent-light: #FEF3C7;

/* Danger colors (red - destructive actions, errors) */
--fit-danger: #EF4444;
--fit-danger-light: #FEE2E2;

/* Neutral colors */
--fit-text-primary: #111827;      /* Near black - headings, primary text */
--fit-text-secondary: #6B7280;    /* Medium gray - body text, descriptions */
--fit-text-muted: #9CA3AF;        /* Light gray - labels, hints */
--fit-border: #E5E7EB;            /* Subtle borders */
--fit-bg: #F9FAFB;                /* Page background */
--fit-bg-card: #FFFFFF;           /* Card background */

/* Card tints */
--fit-card-green: #F0FDF4;        /* Success, timer */
--fit-card-orange: #FFFBEB;       /* Warning, badges */
--fit-card-blue: #EFF6FF;         /* Info, progress */
```

### Color System Philosophy

The color system follows a clear semantic hierarchy:

| Color | Purpose | Use For |
|-------|---------|---------|
| **Accent** (orange/yellow) | Call to action | Primary buttons, important actions |
| **Primary** (green) | Success/confirmation | Completion, confirmations, active nav |
| **Danger** (red) | Destructive | Cancel workout, delete actions |
| **Neutral** (grays) | Content | Text, borders, backgrounds |

### Usage

| Element | Color |
|---------|-------|
| Headings (h1, h2) | `--fit-text-primary` |
| Body text | `--fit-text-secondary` |
| Labels, hints | `--fit-text-muted` |
| Primary action buttons | `--fit-accent` background, white text |
| Success/confirm buttons | `--fit-primary` background, white text |
| Active nav tab | `--fit-primary` |
| Links | `--fit-primary` |
| Card backgrounds | `--fit-bg-card` or tinted (`--fit-card-*`) |
| Page background | `--fit-bg` |
| Borders | `--fit-border` |
| Exercise count badges | `--fit-accent-light` bg, `--fit-accent` text |

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Scale

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Screen title | 17px | 600 | Centered in header |
| Section heading | 18-20px | 700 | Bold, dark |
| Card title (h2) | 20px | 700 | |
| Card subtitle (h3) | 16px | 600 | |
| Body text | 14-16px | 400-500 | |
| Labels | 12px | 600 | Uppercase, letter-spacing: 0.5px |
| Large numbers (stats) | 32-40px | 700 | `font-variant-numeric: tabular-nums` |

---

## Spacing

### Base Unit
```css
--fit-spacing: 16px;
```

### Common Values

| Use case | Value |
|----------|-------|
| Page padding | 16px |
| Card padding | 20px |
| Card margin-bottom | 16px |
| Gap between elements | 12px |
| Section gap | 24px |
| Large padding (finish screen) | 40-48px |

---

## Border Radius

```css
--fit-border-radius: 16px;      /* Cards, buttons, large elements */
--fit-border-radius-sm: 12px;   /* Inputs, small cards */
```

| Element | Radius |
|---------|--------|
| Cards | 16px |
| Buttons | 16px |
| Inputs | 12px |
| Tags/pills | 20px (fully rounded) |
| Progress bar | 4px |

---

## Shadows & Borders

### Shadow Variables
```css
--fit-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
--fit-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
```

### Card Visual Separation

The design uses **borders instead of shadows** for most cards to achieve a cleaner, flatter look:

```css
/* Standard card - border, no shadow */
.fit-card {
  background: var(--fit-bg-card);
  border: 1px solid var(--fit-border);
  border-radius: var(--fit-border-radius);
}

/* Use shadow only for elevated elements */
.fit-elevated {
  box-shadow: var(--fit-shadow);
}
```

**Use borders on:**
- Standard cards
- Workout cards
- Session cards
- Input containers

**Use shadows sparingly on:**
- Floating action buttons
- Dropdowns/popovers
- Modal overlays

---

## Components

### Screen Layout

```tsx
<div className="fit-{screen-name}-screen">
  <header className="fit-screen-header">
    <button onClick={goBack}>← Back</button>
    <h1>Screen Title</h1>
  </header>

  <div className="fit-content">
    {/* Screen content */}
  </div>
</div>
```

### Action Footer (Fixed Primary Action)

When a screen has a primary action button (e.g., "Start Workout", "Finish", "Save"), place it in a fixed footer **outside** the scrollable `.fit-content` div. This ensures the button is always visible and accessible, regardless of scroll position.

```tsx
<div className="fit-{screen-name}-screen">
  <header className="fit-screen-header">...</header>

  <div className="fit-content">
    {/* Scrollable content */}
  </div>

  {/* Action footer - OUTSIDE fit-content, fixed above bottom nav */}
  <div className="fit-action-footer">
    <button className="fit-button-primary fit-button-large">
      Start Workout
    </button>
  </div>
</div>
```

**Important:** Never place the action footer inside `.fit-content`. Sticky positioning inside a scrollable container causes the button to float within the content instead of staying fixed at the bottom.

**Use action footers for:**
- "Start Workout" button on workout preview
- "Finish & Save" button on session complete
- Any primary call-to-action that should always be visible

### Triple-Button Action Footer

For screens with a primary action plus secondary actions (like exercise execution), use a three-column grid layout:

```tsx
<div className="fit-action-footer fit-action-footer-triple">
  <button className="fit-action-secondary" onClick={handleCancel}>
    Cancel
  </button>
  <button className="fit-button-primary fit-button-large" onClick={handleDone}>
    DONE
  </button>
  <button className="fit-action-secondary" onClick={handleSkip}>
    Skip
  </button>
</div>
```

**Layout:** `[Cancel] [DONE] [Skip]` - secondary actions on sides, primary action in center.

**Use triple-button footer for:**
- Exercise execution screen (Cancel Workout | DONE | Skip Exercise)
- Any screen with one primary and two secondary actions

**CSS:**
```css
.fit-action-footer {
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  background: var(--fit-bg-card);
  border-top: 1px solid var(--fit-border);
}

.fit-action-footer-triple {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 12px;
  align-items: center;
}

.fit-action-secondary {
  background: transparent;
  border: none;
  color: var(--fit-text-muted);
  font-size: 14px;
}

.fit-button-large {
  padding: 16px 24px;
  font-size: 18px;
  font-weight: 600;
}
```

### Cards

**Standard card (white with shadow):**
```tsx
<section className="fit-card">
  <h2>Card Title</h2>
  {/* Card content */}
</section>
```

**Tinted card (no shadow):**
```tsx
<div className="fit-progress">  {/* Uses --fit-card-blue */}
  {/* Content */}
</div>

<section className="fit-timer-card">  {/* Uses --fit-card-green */}
  {/* Content */}
</section>
```

### Buttons

**Primary (main call-to-action):**
```tsx
<button className="fit-button-primary">
  Start Workout
</button>
```
- Full width, 14px 24px padding
- **Orange/yellow** (`--fit-accent`) background, white text
- Use for: Start workout, Log set, main CTAs

**Success (confirmation action):**
```tsx
<button className="fit-button-success">
  Finish & Save
</button>
```
- Full width, 14px 24px padding
- **Green** (`--fit-primary`) background, white text
- Use for: Complete workout, confirm actions, positive outcomes

**Secondary (alternative action):**
```tsx
<button className="fit-button-secondary">
  View History
</button>
```
- Full width, 14px 24px padding
- Gray background (#F3F4F6)
- Use for: Navigation, secondary options

**Ghost (tertiary):**
```tsx
<button className="fit-button-ghost">
  Start empty workout
</button>
```
- Transparent with dashed border (`--fit-border`)
- Use for: Optional actions, less prominent choices

**Button Color Decision Guide:**

| Scenario | Button Type |
|----------|-------------|
| Starting something (workout, set) | Primary (orange) |
| Confirming/completing something | Success (green) |
| Navigation, "View X" | Secondary (gray) |
| Optional/skippable action | Ghost (transparent) |
| Destructive action | Use `--fit-danger` |

### Badges

Small labels for counts, status, or metadata:

```tsx
<span className="fit-badge fit-badge-orange">7 exercises</span>
<span className="fit-badge fit-badge-green">Completed</span>
```

**Variants:**
- `.fit-badge-orange` - Orange background (`--fit-accent-light`), orange text
- `.fit-badge-green` - Green background (`--fit-primary-light`), green text

**Usage:**
- Exercise counts on workout cards
- Status indicators
- Small metadata tags

### Inputs

```tsx
<div className="fit-input-group">
  <label>Reps</label>
  <input type="number" placeholder="8-12" />
</div>
```

- Labels: 12px, uppercase, muted color
- Inputs: 18px, centered text, 14px padding
- Focus: Green border, white background

### Lists

**Clickable list item:**
```tsx
<div className="fit-session-card">
  <div className="fit-session-card-date">Mon, Jan 5</div>
  <div className="fit-session-card-workout">Push Day</div>
</div>
```

**Workout card (with preview):**
```tsx
<div className="fit-workout-card">
  <div className="fit-workout-card-header">
    <h3>Push Day</h3>
    <span className="fit-workout-exercise-count">7 exercises</span>
  </div>
  <p className="fit-workout-description">Focus on chest...</p>
  <div className="fit-workout-exercises-preview">
    <span className="fit-exercise-tag">Bench Press</span>
    <span className="fit-exercise-more">+4 more</span>
  </div>
</div>
```

### Stats Display

```tsx
<div className="fit-stat">
  <span className="fit-stat-value">45</span>
  <span className="fit-stat-label">minutes</span>
</div>
```

### Tables

```tsx
<table className="fit-sets-table">
  <thead>
    <tr>
      <th>#</th>
      <th>Reps</th>
      <th>Weight</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>10</td>
      <td>80kg</td>
    </tr>
  </tbody>
</table>
```

### Empty States

```tsx
<div className="fit-empty-state">
  <p>No workout history yet.</p>
  <p>Complete your first workout to see it here!</p>
</div>
```

### Section Titles

```tsx
<h2 className="fit-section-title">This Week</h2>
```

---

## Touch Interactions

### Active States (mobile feedback)

All interactive elements should have active state feedback:

```css
.fit-button-primary:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.fit-workout-card:active {
  transform: scale(0.98);
}
```

### Minimum Touch Targets

All clickable elements must be at least **44x44px**:

```css
min-width: 44px;
min-height: 44px;
```

---

## Consistent Screen Layout

**All screens MUST follow this consistent layout structure:**

```
┌─────────────────────────────────┐
│  TOP BAR (Header) - FIXED       │
│  - Screen title (left-aligned)  │
│  - Optional action button       │
│  - Stays visible when scrolling │
├─────────────────────────────────┤
│                                 │
│  MAIN CONTENT                   │
│  - Scrollable                   │
│  - Full remaining height        │
│                                 │
├─────────────────────────────────┤
│  BOTTOM NAV (4 tabs) - FIXED    │
│  Home | Workout | History | More│
└─────────────────────────────────┘
```

**Important:** Both the top bar and bottom nav are fixed/sticky. Only the main content area scrolls.

### Standard Screen Template

```tsx
// For tab screens (Home, Workout, History, More)
<div className="fit-{name}-screen">
  <header className="fit-screen-header">
    <h1>Screen Title</h1>
    {/* Optional action button on right */}
  </header>

  <div className="fit-content">
    {/* Scrollable content */}
  </div>
</div>
// Bottom nav rendered by App.tsx
```

### Layout Rules

| Rule | All Screens |
|------|-------------|
| Top bar | Fixed (sticky), always visible |
| Title in top bar | Yes, centered |
| Bottom nav | Fixed, always visible |
| Header border | Bottom border visible |
| Content | Scrollable in main area |

**Consistency is key:** All screens use the same layout structure to provide a visual anchor for users. This includes the active workout (session) screen.

### Header Structure

**Tab screens (no back button needed):**
```tsx
<header className="fit-screen-header">
  <h1>Home</h1>
</header>
```

**Sub-screens (accessed via navigation):**
```tsx
<header className="fit-screen-header">
  <button onClick={goBack}>← Back</button>
  <h1>Screen Title</h1>
  <div style={{ width: 44 }} /> {/* Spacer for centering */}
</header>
```

**Session screen (with Cancel button):**
```tsx
<header className="fit-screen-header">
  <h1>Workout Name</h1>
  <button className="fit-header-btn-cancel" onClick={handleCancel}>
    Cancel
  </button>
</header>
```

**Session sub-steps (Back + Cancel):**
```tsx
<header className="fit-screen-header">
  <button className="fit-header-btn-back" onClick={handleBack}>← Back</button>
  <h1>Reps</h1>
  <button className="fit-header-btn-cancel" onClick={handleCancel}>Cancel</button>
</header>
```

### Header Button Classes

| Class | Style | Use For |
|-------|-------|---------|
| `.fit-header-btn-cancel` | Red/coral pill button | Cancel workout action |
| `.fit-header-btn-back` | Green text link | Navigate back one step |
| `.fit-header-btn-primary` | Green pill button | Primary header actions |

---

## Screen Patterns

### Tab Screens (with bottom nav)

**Home Screen:**
- Header with "Home" title
- Cards for program overview, next workout
- Quick action buttons
- Progress summary

**Workout Picker Screen:**
- Header with "Workout" title
- List of available workouts from program
- Workout cards with exercise count badges

**History Screen:**
- Header with "History" title
- Sessions grouped by time period (This week, Last week, etc.)
- Session cards with date and workout name

**More Screen:**
- Header with "More" title
- Menu items for Exercise Library, Settings, About

### Session Screen (Active Workout)

Uses same layout as all other screens (header + content + bottom nav):

- Header shows workout name + Cancel button
- Multi-step flow: Workout → Reps → RPE → Weight
- Sub-steps show Back button + title + Cancel button
- Large touch targets for easy tapping during exercise
- Timer visible on main workout step
- Bottom nav visible (provides visual anchor)

**Finish Screen (Workout Complete):**
- Header with "Complete" title
- Celebration/summary view
- Workout statistics
- Return to home button
- Bottom nav visible

---

## CSS Class Naming

Follow this pattern:
```
.fit-{component}
.fit-{component}-{element}
.fit-{component}-{modifier}
```

Examples:
- `.fit-card`
- `.fit-card-header`
- `.fit-button-primary`
- `.fit-timer-ready`

---

## Small Viewport Optimization

The app is designed for mobile-first usage, typically in Obsidian's sidebar or on mobile devices. Follow these practices to ensure optimal display on small screens.

### Viewport Assumptions

| Context | Typical Width |
|---------|---------------|
| Obsidian sidebar | 280-350px |
| Mobile portrait | 320-414px |
| Mobile landscape | 568-896px |
| Tablet | 768px+ |

**Design for 320px minimum width.**

### Layout Principles

#### 1. Single Column Layout
Never use multi-column layouts for main content. Stack everything vertically.

```css
/* Good */
.fit-content {
  display: flex;
  flex-direction: column;
}

/* Avoid */
.fit-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

#### 2. Full-Width Elements
Cards, buttons, and inputs should span the full width.

```css
.fit-card {
  width: 100%;
  box-sizing: border-box;
}

.fit-button-primary {
  width: 100%;
}
```

#### 3. Flexible Grids (Only for Small Elements)
Use grids only for compact elements like input groups or stats:

```css
/* OK for 3 small inputs */
.fit-set-logger {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

/* Stats can wrap */
.fit-finish-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
}
```

### Text & Typography

#### 1. Prevent Text Overflow
```css
.fit-workout-card h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Or allow wrapping */
.fit-workout-description {
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

#### 2. Minimum Readable Font Sizes
| Element | Minimum Size |
|---------|--------------|
| Body text | 14px |
| Labels | 12px |
| Buttons | 16px |

Never go below 12px - it's unreadable on mobile.

#### 3. Line Length
Keep text lines short. On narrow screens this happens naturally, but add max-width for wider contexts:

```css
.fit-workout-description {
  max-width: 300px;
}
```

### Touch Targets

#### Minimum Sizes
All interactive elements: **44x44px minimum**

```css
.fit-screen-header button {
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
}

.fit-button-primary {
  min-height: 52px;  /* Slightly larger for primary actions */
}
```

#### Spacing Between Targets
Maintain at least 8px between clickable elements to prevent mis-taps:

```css
.fit-quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;  /* Safe spacing */
}
```

### Scrolling & Overflow

#### 1. Fixed Header and Bottom Nav
The header and bottom nav are fixed; only content scrolls:

```css
.fit-screen-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--fit-bg-card);
  border-bottom: 1px solid var(--fit-border);
}

.fit-bottom-nav {
  position: sticky;
  bottom: 0;
}
```

#### 2. Scrollable Content Area
The content area should scroll, not the entire app:

```css
.fit-app {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fit-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;  /* Smooth iOS scrolling */
}
```

#### 3. Bottom Padding for Thumb Reach
Add padding at the bottom so users can scroll content into comfortable reach:

```css
.fit-content {
  padding-bottom: 100px;
}
```

### Input Optimization

#### 1. Appropriate Input Types
Use correct input types for mobile keyboards:

```tsx
<input type="number" />      // Numeric keypad
<input type="tel" />         // Phone keypad (no decimals)
<input type="text" inputMode="decimal" />  // Decimal keypad
```

#### 2. Disable Auto-Zoom on iOS
Prevent zoom when focusing inputs (minimum 16px font):

```css
.fit-input-group input {
  font-size: 16px;  /* Prevents iOS zoom */
}
```

#### 3. Large Touch Targets for Inputs
```css
.fit-input-group input {
  padding: 14px 12px;
  min-height: 48px;
}
```

### Images & Icons

#### 1. Flexible Images
```css
img {
  max-width: 100%;
  height: auto;
}
```

#### 2. Icon Sizing
Use consistent icon sizes that work on small screens:

| Context | Size |
|---------|------|
| In buttons | 20-24px |
| Standalone | 24-32px |
| Feature icons | 40-48px |
| Hero icons | 64-80px |

### Tables on Small Screens

Tables can be problematic on narrow viewports. Solutions:

#### Option 1: Horizontal Scroll
```css
.fit-table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

#### Option 2: Compact Columns
Reduce padding and font size:
```css
.fit-sets-table th,
.fit-sets-table td {
  padding: 8px 4px;
  font-size: 13px;
}
```

#### Option 3: Stack on Mobile (Cards)
Convert table rows to stacked cards for very narrow screens.

### Performance Considerations

#### 1. Limit DOM Depth
Deep nesting hurts mobile rendering:
```tsx
/* Avoid */
<div><div><div><div>Content</div></div></div></div>

/* Better */
<div className="fit-card">Content</div>
```

#### 2. Use CSS Transforms for Animations
GPU-accelerated, smoother on mobile:
```css
/* Good */
.fit-button:active {
  transform: scale(0.98);
}

/* Avoid */
.fit-button:active {
  width: 98%;
}
```

#### 3. Debounce Scroll Events
If you need scroll handlers, debounce them to avoid jank.

### Testing Checklist

Before shipping a new screen, verify:

- [ ] Works at 320px width
- [ ] Works at 280px width (Obsidian sidebar)
- [ ] All text readable (no truncation hiding important info)
- [ ] All buttons/links tappable (44px+)
- [ ] No horizontal scroll on main content
- [ ] Input focus doesn't cause zoom (iOS)
- [ ] Scrolling is smooth
- [ ] Header stays visible
- [ ] Bottom content reachable

### Obsidian-Specific Considerations

#### Sidebar Mode
The plugin view often runs in Obsidian's sidebar:
- Sidebar can be resized by user
- Minimum practical width: ~250px
- Don't assume fixed width

#### Safe Areas
On mobile Obsidian, account for system UI:
```css
.fit-content {
  padding-bottom: max(100px, env(safe-area-inset-bottom));
}
```

#### Theme Compatibility
While we use a light theme, test that colors don't clash badly with Obsidian's dark mode (the plugin view may have its own background).

---

## Bottom Navigation

The app uses a mobile-style bottom navigation bar for primary navigation between main sections.

### Structure

```tsx
<nav className="fit-bottom-nav">
  <button className="fit-bottom-nav-item active">
    <span className="fit-bottom-nav-icon">
      <svg>...</svg>
    </span>
    <span className="fit-bottom-nav-label">Home</span>
  </button>
  <button className="fit-bottom-nav-item">
    <span className="fit-bottom-nav-icon">
      <svg>...</svg>
    </span>
    <span className="fit-bottom-nav-label">Workout</span>
  </button>
  <!-- more tabs... -->
</nav>
```

### Tabs

| Tab | Icon | Description |
|-----|------|-------------|
| Home | House outline | Program overview, next workout |
| Workout | Dumbbell | Browse and start workouts |
| History | Clock with arrow | Past workout sessions |
| More | Three vertical dots | Settings, exercise library |

### Behavior

1. **Always visible** on all screens (consistent visual anchor)
2. **Active state** - Highlighted with **green** (`--fit-primary`) color
3. **Touch targets** - Minimum 60px height, 64px width
4. **Safe area** - Accounts for iOS home indicator with `env(safe-area-inset-bottom)`

### Icons

Use SVG line icons (stroke-based, not filled):

```tsx
const NavIcons = {
  home: <svg>...</svg>,      // House outline
  workout: <svg>...</svg>,   // Dumbbell/barbell
  history: <svg>...</svg>,   // Clock with arrow
  more: <svg>...</svg>       // Three dots vertical
};
```

**Icon styling:**
- Size: 24x24px
- Stroke width: 1.5px
- Color inherited from parent (gray inactive, green active)

### CSS Classes

```css
.fit-bottom-nav              /* Container - white bg, top border */
.fit-bottom-nav-item         /* Tab button - flex column */
.fit-bottom-nav-item.active  /* Active tab - green color */
.fit-bottom-nav-icon         /* Icon container 24x24 */
.fit-bottom-nav-icon svg     /* SVG styling */
.fit-bottom-nav-label        /* Text label 10px */
```

### Tab Screen Headers

When a screen is accessed via bottom nav tab, it should:
- **Not show** a back button (user can tap another tab)
- **Center** the title

When accessed via navigation (not tab):
- **Show** back button on the left
- Add spacer on the right to center title

```tsx
<header className="fit-screen-header">
  {!isTab && <button onClick={goBack}>← Back</button>}
  <h1>Screen Title</h1>
  {!isTab && <div style={{ width: 44 }} />}
</header>
```

---

## Session Step Flow

The workout session uses a multi-step flow within the standard layout (header + content + bottom nav).

### Flow Diagram

```
Workout → Reps → RPE → Weight → (back to Workout)
```

### Step Screens

| Step | Purpose | Header | Content |
|------|---------|--------|---------|
| Workout | Show exercise, timer | Workout name + Cancel | Exercise info, timer, "Log Set" button |
| Reps | Select rep count | Back + "Reps" + Cancel | Grid of 1-20 numbers |
| RPE | Select exertion level | Back + "RPE" + Cancel | Grid of 1-10 numbers |
| Weight | Set/confirm weight | Back + "Weight" + Cancel | Large display with +/- buttons |

### CSS Classes

```css
.fit-session-screen    /* Uses standard layout */
.fit-screen-header     /* Standard header with Cancel button */
.fit-content           /* Standard scrollable content area */
.fit-workout-step      /* Main workout view content */
.fit-number-step       /* Number selection view (reps/rpe) */
.fit-weight-step       /* Weight adjustment view */
```

### Number Grid

```tsx
<div className="fit-number-grid fit-number-grid-reps">
  {[1,2,3...20].map(num => (
    <button className={`fit-number-button ${inRange ? 'in-range' : ''}`}>
      {num}
    </button>
  ))}
</div>
```

- **Reps**: 4 columns × 5 rows (`fit-number-grid-reps`)
- **RPE**: 5 columns × 2 rows (`fit-number-grid-rpe`)
- Target range highlighted with `in-range` class

### Weight Selector

```tsx
<div className="fit-weight-display">
  <div className="fit-weight-value">80</div>
  <div className="fit-weight-unit">kg</div>
</div>
<div className="fit-weight-buttons">
  <button className="fit-weight-adjust">-5</button>
  <button className="fit-weight-adjust">-1</button>
  <button className="fit-weight-adjust">+1</button>
  <button className="fit-weight-adjust">+5</button>
</div>
```

### Design Principles

1. **No scrolling** - Everything fits in viewport
2. **Large touch targets** - Number buttons 56px+ height
3. **Clear progression** - Back button on each step
4. **Pre-filled values** - Weight from last set
5. **Visual feedback** - Target reps highlighted

---

## Dark Mode Considerations

The current design uses light theme only. For future dark mode support, use CSS variables for all colors instead of hardcoded hex values where possible.

---

## Do's and Don'ts

### Do
- Use generous whitespace
- Make touch targets large (44px+)
- Use bold weights for headings
- Add active state feedback
- Keep layouts single-column

### Don't
- Use hover states (mobile-first)
- Make text smaller than 12px
- Use dark backgrounds for cards
- Add unnecessary borders
- Nest cards inside cards
