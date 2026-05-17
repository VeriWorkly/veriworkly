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

- **Container**: Responsive page wrapper with standardized max-widths and padding.

## Usage

### 1. Installation

The library is managed via npm workspaces. Ensure it is listed in your `package.json`:

```json
{
  "dependencies": {
    "@veriworkly/ui": "*"
  }
}
```

### 2. Implementation

Import the desired components directly from the package:

```tsx
import { Button, Card, Tooltip, Container } from "@veriworkly/ui";

export default function MyPage() {
  return (
    <Container>
      <Card>
        <Tooltip content="Click to submit">
          <Button>Submit</Button>
        </Tooltip>
      </Card>
    </Container>
  );
}
```

## Styling

The library uses a global theme system defined in `src/styles/themes.css`. It supports both Light and Dark modes using CSS variables and Tailwind's `@theme` block.

```css
/* Example of using theme variables */
.custom-element {
  background-color: var(--fd-background);
  color: var(--fd-foreground);
}
```

## Development & Contribution

- **HMR**: Components support Hot Module Replacement within the workspace.
- **Utils**: Use the `cn` utility from `@veriworkly/ui/utils` for conditional class merging.
- **Mobile First**: Always test new components on small screens (320px+) to ensure "Perfection".
