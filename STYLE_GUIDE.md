# Obsidian Fit Style Guide

This style guide is based on the Duolingo Design System (design.duolingo.com) adapted for our fitness tracking plugin.

---

## Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Feather Green** | `#58CC02` | Primary actions, success states, completed items |
| **Mask Green** | `#89E219` | Secondary green, highlights, hover states |
| **Eel** | `#4B4B4B` | Primary text color |
| **Snow** | `#FFFFFF` | Backgrounds |

### Secondary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Macaw** | `#1CB0F6` | Info, links, secondary actions |
| **Cardinal** | `#FF4B4B` | Errors, warnings, destructive actions |
| **Bee** | `#FFC800` | Current/active state, "next" items |
| **Fox** | `#FF9600` | Negative adjustments, caution states |
| **Beetle** | `#CE82FF` | Accent, special states |
| **Humpback** | `#2B70C9` | Alternative primary, dark blue accent |

### Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| **Eel** | `#4B4B4B` | Primary text |
| **Wolf** | `#777777` | Secondary text |
| **Hare** | `#AFAFAF` | Tertiary text, placeholders |
| **Swan** | `#E5E5E5` | Borders, dividers, inactive backgrounds |
| **Polar** | `#F7F7F7` | Subtle backgrounds |
| **Snow** | `#FFFFFF` | Primary background |

### 3D Effect Shadow Colors

For the signature Duolingo 3D button effect, use these shadow colors:

| Base Color | Shadow Color |
|------------|--------------|
| Feather Green `#58CC02` | `#46A302` |
| Bee `#FFC800` | `#E6B400` |
| Swan `#E5E5E5` | `#C4C4C4` |
| Macaw `#1CB0F6` | `#1899D6` |
| Cardinal `#FF4B4B` | `#EA2B2B` |

---

## Typography

### Font Family

Since Duolingo's "Feather Bold" is proprietary, use system fonts with rounded characteristics:

```css
font-family: -apple-system, BlinkMacSystemFont, 'Nunito', 'DIN Next Rounded', 'Segoe UI', Roboto, sans-serif;
```

### Font Weights

| Weight | CSS Value | Usage |
|--------|-----------|-------|
| Bold | `700` | Headlines, buttons, important values |
| Medium | `500` | Subheadings, labels |
| Regular | `400` | Body text |

### Text Guidelines

- **Always lowercase** for UI text, never ALL CAPS
- Capitals allowed for names and abbreviations (e.g., "AMRAP", "RPE")
- **Left-aligned** preferred, centered for buttons/headers only
- **Never justify** text
- **Never hyphenate** words
- Minimum font size: **14px**
- Line height: **140%** (1.4)

### Font Sizes

| Element | Size | Weight |
|---------|------|--------|
| Large headline | 28px | Bold |
| Section header | 22px | Bold |
| Card title | 18px | Bold |
| Body text | 16px | Regular |
| Small text | 14px | Regular |
| Caption | 12px | Regular |

---

## UI Components

### 3D Buttons & Cards

The signature Duolingo style uses a 3D effect with `box-shadow`:

```css
.button-3d {
  background: #58CC02;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 0 #46A302;
  padding: 12px 24px;
  color: white;
  font-weight: 700;
  text-transform: lowercase;

  /* Press effect */
  transition: transform 0.1s, box-shadow 0.1s;
}

.button-3d:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 #46A302;
}
```

### Border Radius

| Element | Radius |
|---------|--------|
| Buttons | `12px` |
| Cards | `14px` - `16px` |
| Input fields | `12px` |
| Small elements | `8px` |
| Pills/tags | `20px` (full round) |

### Set Cards

Fixed-width cards for displaying workout sets:

```css
.set-card {
  width: 88px;
  min-width: 88px;
  max-width: 88px;
  padding: 8px 6px 12px;
  border-radius: 14px;
  text-align: center;
}

/* States */
.set-card.done {
  background: #58CC02;
  box-shadow: 0 4px 0 #46A302;
  color: white;
}

.set-card.next {
  background: #FFC800;
  box-shadow: 0 4px 0 #E6B400;
  color: #4B4B4B;
}

.set-card.pending {
  background: #E5E5E5;
  box-shadow: 0 4px 0 #C4C4C4;
  color: #4B4B4B;
}
```

### Coach Tip Panels

Feedback panels with gradient backgrounds:

```css
/* Positive adjustment (green) */
.coach-panel {
  background: linear-gradient(135deg, #d4f5d4 0%, #b8eab8 100%);
  border-top: 3px solid #58CC02;
  border-radius: 16px 16px 0 0;
  padding: 20px 16px;
}

/* Negative adjustment (orange) */
.coach-panel.warning {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-top-color: #FF9600;
}
```

---

## Spacing

Use consistent spacing based on a 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight spacing |
| `sm` | 8px | Between related items |
| `md` | 12px | Standard gap |
| `lg` | 16px | Section spacing |
| `xl` | 24px | Major sections |
| `xxl` | 32px | Page margins |

---

## Animations

### Completion Animation

Star burst effect for completed sets:

```css
@keyframes star-burst {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.star {
  animation: star-burst 0.6s ease-out forwards;
}
```

### Button Press

```css
.button:active {
  transform: translateY(4px);
  box-shadow: none;
  transition: all 0.05s;
}
```

### Transitions

- Button hover/press: `0.1s ease`
- Panel slide: `0.2s ease-out`
- Fade: `0.15s ease`

---

## Semantic Color Usage

### States

| State | Primary Color | Text Color |
|-------|---------------|------------|
| Success/Complete | Feather Green `#58CC02` | Snow `#FFFFFF` |
| Active/Current | Bee `#FFC800` | Eel `#4B4B4B` |
| Pending/Inactive | Swan `#E5E5E5` | Eel `#4B4B4B` |
| Error/Warning | Cardinal `#FF4B4B` | Snow `#FFFFFF` |
| Info | Macaw `#1CB0F6` | Snow `#FFFFFF` |
| Caution/Down | Fox `#FF9600` | Eel `#4B4B4B` |

### Adjustments

| Type | Background | Border | Icon |
|------|------------|--------|------|
| Positive (+kg) | Green gradient | Feather Green | Thumbs up |
| Negative (-kg) | Orange gradient | Fox | Arrow down |
| Neutral | Polar | Swan | Info |

---

## CSS Variables

Define these CSS variables for consistent theming:

```css
:root {
  /* Primary */
  --color-primary: #58CC02;
  --color-primary-dark: #46A302;
  --color-primary-light: #89E219;

  /* Secondary */
  --color-info: #1CB0F6;
  --color-error: #FF4B4B;
  --color-warning: #FFC800;
  --color-caution: #FF9600;

  /* Neutrals */
  --color-text-primary: #4B4B4B;
  --color-text-secondary: #777777;
  --color-text-tertiary: #AFAFAF;
  --color-border: #E5E5E5;
  --color-bg-subtle: #F7F7F7;
  --color-bg: #FFFFFF;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 14px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows (3D effect) */
  --shadow-green: 0 4px 0 #46A302;
  --shadow-yellow: 0 4px 0 #E6B400;
  --shadow-gray: 0 4px 0 #C4C4C4;
}
```

---

## Do's and Don'ts

### Do

- Use vibrant, saturated colors
- Apply 3D shadow effects to interactive elements
- Use generous border radius (12-16px)
- Keep text lowercase
- Use bold weights for important information
- Provide clear visual feedback on interactions

### Don't

- Use flat, muted colors
- Apply thin borders without depth
- Use sharp corners (< 8px radius)
- Use ALL CAPS for UI text
- Use thin font weights for headings
- Skip hover/active states on interactive elements

---

## Writing & Voice

### Voice Qualities

Our voice has four key qualities that work together:

| Quality | Description |
|---------|-------------|
| **Expressive** | Simple words and phrases to convey big feelings |
| **Playful** | Bring creativity to the conversation |
| **Embracing** | Whoever you are, we're your biggest cheerleader |
| **Worldly** | Interested, knowledgeable, broad worldview |

### Tone Guidelines

- **Read the room** - Adapt tone to the user's state of mind
- **Write with empathy** - Consider how the user may be feeling
- **Be clear, human, and relaxed** - Always approachable
- **Celebrate victories** - Use exclamation points and energy for achievements
- **Respect struggles** - Tone down exuberance for serious moments

### Style Rules

**Numerals:**
- Write numbers numerically: "You're on a 4 day streak!" (not "four")
- Spell out numbers starting sentences: "Three sets completed."
- Large numbers use commas: "Over 500,000 users"
- In-app metrics skip commas: "2567 XP" not "2,567 XP"

**Emoji:**
- Use sparingly - "a little emoji go a long way"
- Keep to one emoji per message (unless 2+ makes sense)
- Use ~half the time in notifications to maintain impact

**Capitalization:**
- **Capitalize**: Feature names (Stories, Leaderboards), Achievement names, Item names
- **Don't capitalize**: Earned items (gems, crowns), headers, subject lines
- Lowercase maintains approachability

### Writing Examples

| Do | Don't |
|----|-------|
| "great job! you crushed that workout" | "Great Job! You Crushed That Workout" |
| "3 sets done" | "three sets done" |
| "next up: bench press" | "NEXT UP: BENCH PRESS" |
| "you earned 50 xp" | "You earned 50 XP" |

---

## Imagery

### Illustration First

- Illustration is the primary visual style
- Characters and mascots are critical to the brand story
- Use photography only for authentic user stories

### Character Principles

- **Diversity** - Reflect the wonderful, quirky, multicultural world
- **Enthusiasm** - Characters are full of energy and expression
- **Expressive poses** - Clearly communicate mood or activity
- **Cropping** - Zoom into expressions and action when needed

### Photography Guidelines

- Authentic, real people with real stories
- Show sense of place (environments, activities)
- Include element of green in clothing/surroundings when possible
- Never use stock-looking or staged photos

---

## Illustration Guidelines

### Shape Language

All illustrations are built from **three basic shapes**:

```
┌─────────┐     ●          ▲
│         │   Circle    Rounded
│         │              Triangle
└─────────┘
Rounded Rectangle
```

**Rules:**
- Every shape must have **rounded edges**
- **Pointy shapes are off-brand**
- Use pathfinder to combine/cut shapes as needed
- Rounded rectangle is used most frequently

### Construction Principles

**Rhythm:**
- Vary shape sizes like musical notes in a melody
- Same-sized shapes = boring and predictable
- Variation gives the eye something interesting

**Simplicity:**
- Use the **fewest shapes possible**
- ~6 shapes = too abstract
- ~15 shapes = ideal
- ~30 shapes = too complex
- Every shape should matter

**Objects in Space:**
- Design on **flat perspective**
- Depth OK if on same line of sight
- No 3D rotations or perspective distortion

### Floating Accents

Some elements can float detached from the main object:
- Feet, leaves, accessories that flutter or bounce
- Helps with posing flexibility
- **Only float if it serves the illustration** - don't force it

**Don't float:** Essential body parts, hands holding objects

### Illustration Colors

Extended palette for illustrations:

| Category | Colors |
|----------|--------|
| **Pinks** | Squid `#EBE3E3`, Walking Fish `#FFDFE0`, Flamingo `#FFB2B2`, Pig `#F5A4A4` |
| **Reds** | Crab `#FF7878`, Cardinal `#FF4B4B`, Fire Ant `#EA2B2B` |
| **Yellows** | Canary `#FFF5D3`, Duck `#FBE56D`, Bee `#FFC800`, Lion `#FFB100` |
| **Oranges** | Fox `#FF9600`, Cheetah `#FFCE8E`, Monkey `#E5A259`, Camel `#E7A601` |
| **Browns** | Guinea Pig `#CD7900`, Grizzly `#A56644` |
| **Greens** | Sea Sponge `#D7FFB8`, Turtle `#A5ED6E`, Owl `#58CC02`, Tree Frog `#58A700` |
| **Blues** | Iguana `#DDF4FF`, Anchovy `#D2E4E8`, Beluga `#BBF2FF`, Moon Jelly `#7AF0F2` |

---

## Fitness Mascot: Coach

Our fitness app mascot adapts Duolingo principles:

### Personality

- **Motivating** - Your biggest cheerleader
- **Supportive** - Celebrates wins, encourages through struggles
- **Knowledgeable** - Gives smart, actionable tips
- **Persistent** - Gently nudges without being annoying
- **Expressive** - Shows emotion through poses

### Coach Expressions

| State | Expression | Usage |
|-------|------------|-------|
| Celebrating | Arms up, big smile | Set/workout complete |
| Encouraging | Thumbs up, confident | Starting workout |
| Thinking | Hand on chin | Showing tips/advice |
| Impressed | Wide eyes, excited | Personal records |
| Supportive | Calm, reassuring | After tough sets |

### SVG Illustration Template

Basic structure for fitness illustrations:

```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Use rounded shapes only -->
  <!-- Main body: rounded rectangle -->
  <rect x="30" y="20" width="40" height="50" rx="12" fill="#58CC02"/>

  <!-- Head: circle -->
  <circle cx="50" cy="15" r="12" fill="#58CC02"/>

  <!-- Eyes: small circles -->
  <circle cx="45" cy="13" r="3" fill="#FFFFFF"/>
  <circle cx="55" cy="13" r="3" fill="#FFFFFF"/>

  <!-- Pupils -->
  <circle cx="46" cy="13" r="1.5" fill="#4B4B4B"/>
  <circle cx="56" cy="13" r="1.5" fill="#4B4B4B"/>

  <!-- Arms: rounded rectangles, can float -->
  <rect x="15" y="30" width="12" height="6" rx="3" fill="#46A302"/>
  <rect x="73" y="30" width="12" height="6" rx="3" fill="#46A302"/>
</svg>
```

### Fitness Icons

Simple icons using the shape language:

**Dumbbell:**
```svg
<svg viewBox="0 0 40 20" xmlns="http://www.w3.org/2000/svg">
  <!-- Bar -->
  <rect x="8" y="8" width="24" height="4" rx="2" fill="#4B4B4B"/>
  <!-- Left weight -->
  <rect x="2" y="4" width="8" height="12" rx="3" fill="#58CC02"/>
  <!-- Right weight -->
  <rect x="30" y="4" width="8" height="12" rx="3" fill="#58CC02"/>
</svg>
```

**Checkmark (completed):**
```svg
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" fill="#58CC02"/>
  <path d="M7 12l3 3 7-7" stroke="#FFFFFF" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
```

**Timer:**
```svg
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="13" r="9" fill="#FFC800"/>
  <rect x="10" y="2" width="4" height="4" rx="1" fill="#E6B400"/>
  <circle cx="12" cy="13" r="1.5" fill="#4B4B4B"/>
  <rect x="11" y="7" width="2" height="6" rx="1" fill="#4B4B4B"/>
</svg>
```

---

## Reference

- Duolingo Brand Guidelines: https://design.duolingo.com
- Color section: https://design.duolingo.com/identity/color
- Typography section: https://design.duolingo.com/identity/typography
- Writing section: https://design.duolingo.com/writing
- Illustration section: https://design.duolingo.com/illustration
