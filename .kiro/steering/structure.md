# Project Structure

## Root Directory
```
├── public/           # Static assets and Chrome extension manifest
├── src/             # React application source code
├── build/           # Production build output (generated)
├── node_modules/    # Dependencies (generated)
└── config files     # TypeScript, Vite, ESLint configurations
```

## Key Directories

### `/public/`
- `manifest.json` - Chrome extension manifest (Manifest V3)
- `vite.svg` - Vite logo asset
- Static files that get copied to build output

### `/src/`
- `main.tsx` - React application entry point with ReactDOM.createRoot
- `App.tsx` - Main React component
- `App.css` - Component-specific styles
- `index.css` - Global styles
- `vite-env.d.ts` - Vite type definitions
- `/assets/` - React component assets (logos, images)

## File Naming Conventions
- React components: PascalCase (e.g., `App.tsx`)
- Stylesheets: kebab-case matching component (e.g., `App.css`)
- Entry points: lowercase (e.g., `main.tsx`)
- Type definitions: `.d.ts` extension

## Configuration Files
- `vite.config.ts` - Vite build configuration with React plugin
- `tsconfig.json` - Root TypeScript config (references only)
- `tsconfig.app.json` - App-specific TypeScript settings
- `tsconfig.node.json` - Node/build tool TypeScript settings
- `.eslintrc.cjs` - ESLint configuration with React/TypeScript rules
- `package.json` - Dependencies and npm scripts

## Architecture Notes
- Single-page React app rendered in Chrome extension popup
- TypeScript strict mode enabled throughout
- CSS modules not configured - uses regular CSS imports
- No routing configured - single component app
- Extension popup triggered by browser action (icon click)