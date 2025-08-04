# React Chrome Extension Template

This is a template for creating a Chrome extension using React and [Vite](https://vitejs.dev/) with TypeScript.


## Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (version 18+ or 20+) installed on your machine.

### Setup

1. Clone or fork the repository :

    ```sh
    # To clone
    git clone https://github.com/5tigerjelly/chrome-extension-react-template
    cd chrome-extension-react-template
    ```

2. Install the dependencies:

    ```sh
    pnpm install
    ```

## 🏗️ Development

To start the development server:

```sh
pnpm dev
```

This will start the Vite development server and open your default browser.

## 📦 Build 

To create a production build:

```sh
pnpm build
```

This will generate the build files in the `build` directory.

## 📂 Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" using the toggle switch in the top right corner.
3. Click "Load unpacked" and select the `build` directory.

Your React app should now be loaded as a Chrome extension!

## 🔧 Troubleshooting

### Content Extraction Issues

If you're seeing the extension's internal URL (like `dmjbbhpfbckkihpmmfdgkhfhdokjeegl/index.html`) instead of the actual webpage URL:

1. **Make sure the extension is properly built and loaded**: Content extraction only works when the extension is built (`pnpm build`) and loaded as an unpacked extension in Chrome. It will not work in development mode (`pnpm dev`).

2. **Check browser console**: Open the browser's developer tools (F12) and check the console for any error messages related to content extraction.

3. **Verify permissions**: Ensure the extension has the necessary permissions in `manifest.json`:
   - `"activeTab"` - to access the current tab
   - `"scripting"` - to inject content scripts
   - `"host_permissions": ["http://*/*", "https://*/*"]` - to access web pages

4. **Test on a regular webpage**: Content extraction won't work on browser internal pages (like `chrome://` URLs). Test on a regular website like `https://example.com`.

### Development vs Production

- **Development mode** (`pnpm dev`): Content extraction is disabled and will show an appropriate error message
- **Production mode** (built extension): Full content extraction functionality is available

## 🗂️ Project Structure

- `public/`: Contains static files and the `manifest.json`.
- `src/`: Contains the React app source code.
- `vite.config.ts`: Vite configuration file.
- `tsconfig.json`: TypeScript configuration file.
- `package.json`: Contains the project dependencies and scripts.

## License

This project is licensed under the MIT License.