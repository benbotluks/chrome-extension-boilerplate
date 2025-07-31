export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
    // Add cssnano for production builds to further optimize CSS
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {}),
  },
}