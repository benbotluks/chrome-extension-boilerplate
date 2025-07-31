import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "public/manifest.json",
          dest: ".",
        },
      ],
    }),
  ],
  css: {
    postcss: "./postcss.config.js",
    // Optimize CSS for production
    devSourcemap: false,
  },
  build: {
    outDir: "build",
    // Optimize for Chrome extension
    minify: "terser",
    cssMinify: true,
    rollupOptions: {
      input: {
        main: "./index.html",
      },
      output: {
        // Optimize chunk splitting for better caching
        manualChunks: undefined,
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});
