# @veriworkly/ui

The shared Design System and UI library for VeriWorkly platforms.

## Overview

This package provides a comprehensive set of production-ready React components built with **Tailwind CSS**, **Lucide React**, and **Framer Motion** principles. It follows a modular architecture, ensuring consistent aesthetics and behavior across the main landing page, builder studio, documentation platform, and blog platform.

## Design Philosophy

- **Premium Aesthetics**: High-quality typography, smooth gradients, and refined shadows.
- **Accessibility First**: Semantic HTML and ARIA attributes for screen readers.
- **Mobile Perfection**: Fully responsive components optimized for touch and all screen sizes.
- **Performance**: Lightweight implementations with minimal dependencies.

## Component Library

### UI Components (`src/components/ui`)

| Component     | Description                                                   |
| :------------ | :------------------------------------------------------------ |
| **Accordion** | Collapsible content panels for organized information.         |
| **Badge**     | Small status indicators and tag labels.                       |
| **Button**    | Highly customizable interactive elements with loading states. |
| **Card**      | Content containers with refined borders and shadows.          |
| **Checkbox**  | Accessible selection controls.                                |
| **Input**     | Standardized text entry fields with validation support.       |
| **Menu**      | Contextual and dropdown navigation menus.                     |
| **Modal**     | Focused overlay dialogs with smooth transitions.              |
| **Select**    | Custom dropdown selection menus.                              |
| **Switch**    | Toggle controls for binary settings.                          |
| **TextArea**  | Multi-line text input fields.                                 |
| **Tooltip**   | Interactive contextual information overlays.                  |

### Layout Components (`src/components/layout`)

- **Container**: Responsive page layout wrapper with standardized max-widths and paddings.
- **MarketingNavbar**: Main header component featuring responsive navigation links, branding logo, and active action controls.
- **MarketingFooter**: Responsive product footer containing multi-column navigation links, copyright information, and integrated social platform links.
- **AppShell**: Standard sidebar, header, and workspace shell configuration tailored for builder studio tools.
- **ThemeToggle**: Interactive theme selector button supporting dark/light mode toggle with smooth transitions.
- **SocialIcons**: Standardized vector social brand icons (GitHub, LinkedIn, Twitter/X) for footer integrations.

---

## 📖 Usage & Setup

### 1. Installation

The library is managed via npm workspaces. Verify the dependency in your workspace application `package.json`:

```json
{
  "dependencies": {
    "@veriworkly/ui": "*"
  }
}
```

### 2. Basic Component Usage

Import UI and Layout components directly from the package root:

```tsx
import { Button, Card, Tooltip, Container } from "@veriworkly/ui";

export default function Page() {
  return (
    <Container>
      <Card className="p-8">
        <Tooltip content="Submit your details">
          <Button variant="primary">Submit</Button>
        </Tooltip>
      </Card>
    </Container>
  );
}
```

### 3. Font Integration

The package exports Google's **Geist** and **Geist Mono** configuration. Import the font variables helper in your Next.js root layout:

```tsx
import { globalFontVariables } from "@veriworkly/ui";
import "@veriworkly/ui/styles/globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={globalFontVariables}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

---

## 🎨 Theme & Styling System

The library utilizes a dual-theme variable design configured for light and dark modes in `src/styles/themes.css`.

### Key Custom Theme Variables:

- `--background` / `--color-fd-background`: Main application canvas color.
- `--foreground` / `--color-fd-foreground`: Primary typography and element color.
- `--card` / `--color-fd-card`: Card and modal background color.
- `--border` / `--color-fd-border`: Soft divider and border color.
- `--accent` / `--color-fd-primary`: Main brand color for action elements.

### CSS Usage Example:

```css
.custom-component {
  background-color: var(--background);
  border: 1px solid var(--border);
  color: var(--foreground);
}
```

---

## 🛠️ Development & Contribution

- **HMR**: Hot Module Replacement is supported across all workspaces during development.
- **Utilities**: Use the `cn` utility exported from `@veriworkly/ui/utils` for tailwind class merge conflict prevention.
- **Mobile First**: Design and test components on small screens (minimum 320px width) before pushing changes.
