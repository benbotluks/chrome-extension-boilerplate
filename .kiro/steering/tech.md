# Technology Stack

## Core Technologies
- **React 18.3.1** - UI framework with hooks and modern patterns
- **TypeScript 5.2.2** - Type-safe JavaScript with strict mode enabled
- **Vite 5.3.1** - Build tool and development server
- **Chrome Extension Manifest V3** - Latest Chrome extension platform

## Build System
- **Vite** as the primary build tool and dev server
- **TypeScript compiler** for type checking (`tsc -b`)
- **ESLint** for code linting with React and TypeScript rules
- **vite-plugin-static-copy** for copying manifest.json to build output

## Development Dependencies
- `@vitejs/plugin-react` - React support for Vite
- `@typescript-eslint/*` - TypeScript ESLint integration
- `eslint-plugin-react-hooks` - React hooks linting rules
- `eslint-plugin-react-refresh` - React refresh linting

## Common Commands

### Development
```bash
npm run dev          # Start development server with HMR
npm run build        # Build for production (TypeScript + Vite)
npm run lint         # Run ESLint with TypeScript rules
npm run preview      # Preview production build
```

### Chrome Extension Loading
1. Run `npm run build` to create the `build/` directory
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `build/` directory

## Configuration Notes
- Build output goes to `build/` directory (not `dist/`)
- Manifest V3 requires specific permissions and structure
- Vite config includes static copy plugin for manifest.json
- TypeScript uses composite project structure with separate app/node configs