# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **PC Parts Pricing System** (电脑配件报价系统) - a Next.js application for creating and managing computer
parts quotations. The app allows users to select components from 8 categories (CPU, Motherboard, RAM, GPU, Storage, PSU,
Case, Cooling), calculate total prices dynamically, and import/export product data via Excel.

Live deployment: https://computer-setting.vercel.app/

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Technology Stack

- **Framework**: Next.js 15.2.4 with App Router
- **UI**: React 19 + Tailwind CSS 4
- **Language**: TypeScript with strict mode enabled
- **Excel Processing**: SheetJS (xlsx) + FileSaver.js
- **Deployment**: Vercel

## Architecture

### App Structure

This is a Next.js App Router application with a simple single-page structure:

- `app/page.tsx` - Home page that renders the main component
- `app/layout.tsx` - Root layout with Geist fonts and global styles
- `app/_components/PCPartsTable/index.tsx` - Core component containing all business logic

### PCPartsTable Component Architecture

The `PCPartsTable` component is the heart of the application and handles:

1. **State Management**:
    - `parts` - Array of 8 `PartRow` objects (one per category)
    - `allProducts` - Product catalog organized by `PartCategory` enum
    - Each part row tracks: category, selected product, quantity, calculated price

2. **Data Model**:
    - `PartCategory` enum defines 8 component types
    - `categoryDisplayNames` maps enums to Chinese display names
    - `Product` interface: id, name, price
    - `PartRow` interface: tracks selected products and quantities per category
    - `AllProducts` type: Record mapping categories to product arrays

3. **Core Features**:
    - **Product Selection**: Dropdown per category updates `PartRow` with selected product details
    - **Dynamic Pricing**: Quantity changes trigger real-time price recalculation
    - **Excel Export**: Generates multi-sheet workbook with one sheet per category
    - **Excel Import**: Parses uploaded Excel, validates structure, replaces product catalog
    - **Form Reset**: Clears all selections back to initial state

4. **Excel Integration Flow**:
    - **Export**: Creates sheets named by `categoryDisplayNames`, columns "产品名称" and "产品价格"
    - **Import**: Expects same sheet structure, validates columns, regenerates product IDs, updates `allProducts` state,
      resets form

## Key Implementation Details

### Path Aliases

- `@/*` maps to project root (configured in `tsconfig.json`)
- Use `@/app/...` for imports

### Client-Side Component

- `PCPartsTable` uses `"use client"` directive (requires React hooks and browser APIs)
- All state and Excel operations happen client-side

### Styling

- Tailwind CSS with fixed table layout (`table-fixed`) to prevent content shifting
- Responsive design with `max-w-4xl` container and `overflow-x-auto` for mobile

### TypeScript Configuration

- Strict mode enabled
- Target: ES2017
- Module resolution: bundler (Next.js default)

## Common Development Patterns

### Adding a New Product Category

1. Add enum value to `PartCategory` (line 8-17)
2. Add display name to `categoryDisplayNames` (line 20-29)
3. Add product array to `initProducts` (line 52-93)
4. The component automatically handles the new category in UI and Excel operations

### Modifying Excel Template Structure

Both `downloadExcelTemplate()` (line 108-125) and `handleExcelUpload()` (line 128-189) must be updated in sync:

- Export creates sheets with Chinese headers "产品名称" and "产品价格"
- Import expects these exact header names
- Sheet names must match `categoryDisplayNames` values

### State Updates

All state updates use immutable patterns:

```typescript
setParts(parts.map(part =>
  part.id === targetId ? {...part, newValue} : part
))
```

## ESLint Configuration

Uses Next.js recommended config with TypeScript support. Some type assertions are disabled in the Excel upload handler (
lines 179-185) to handle file input reset.

## Code Organization Patterns

### Component Structure Guidelines

Follow these patterns when creating or modifying components:

1. **State Management**
    - Converge related state into custom hooks (prefix: `use + FunctionName`)
    - Keep component-only state within the component
    - Example: `useTableControl`, `usePackageSearch`

2. **Component Extraction**
    - Extract JSX blocks > 200 lines into separate components
    - Create dedicated files/folders for extracted components
    - Naming: FunctionDescription + Type (e.g., `SearchBox`, `PackageCard`, `InfoSection`)

3. **File Organization**
   ```
   ComponentName/
   ├── index.tsx              # Main component
   ├── components/            # Sub-components (if > 2 sub-components)
   │   ├── SubComponentA.tsx
   │   └── SubComponentB.tsx
   └── hooks/                 # Custom hooks (if > 1 hook)
       └── useComponentLogic.tsx
   ```

4. **Code Order in Files**
    - Main exported component
    - Sub-components
    - Custom hooks
    - Utility functions
    - API functions

5. **Optimization Philosophy**
    - Moderate optimization - avoid over-engineering
    - Do NOT wrap every function with `useCallback` unless performance issues exist
    - Do NOT use `useMemo` for simple calculations
    - Keep code readable and maintainable

### UI Library Integration

- **Primary**: Tailwind CSS for custom styling
- **Component Library**: Ant Design (antd) + ahooks for common components
    - Use antd for: Input, Button, Spin, Empty, Modal, etc.
    - Match existing UI gradient/rounded style when using antd
    - Maintain visual consistency with existing Tailwind components

### Example Component Pattern

```typescript
'use client';
import { ComponentFromAntd } from 'antd';
import { useRequest } from 'ahooks';

// Main Component
export function MainComponent() {
    const { data, handleAction } = useMainLogic();

    return (
        <div>
            <SubComponentA / >
        <SubComponentB data = { data }
    onAction = { handleAction }
    />
    < /div>
)
    ;
}

// Sub-components
function SubComponentA() { /* ... */
}

function SubComponentB() { /* ... */
}

// Custom Hooks
function useMainLogic() {
    const [state, setState] = useState();
    // Logic here
    return { data, handleAction };
}

// Utility functions
function helperFunction() { /* ... */
}
```
