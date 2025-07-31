/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      width: {
        extension: "400px",
      },
      height: {
        extension: "600px",
        30: "120px", // For textarea max-height
      },
      minHeight: {
        5: "20px", // For textarea min-height
      },
      maxHeight: {
        30: "120px", // For textarea max-height
      },
      fontFamily: {
        system: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "Fira Sans",
          "Droid Sans",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      colors: {
        "bootstrap-primary": "#007bff",
        "bootstrap-primary-dark": "#0056b3",
        "bootstrap-gray-100": "#f8f9fa",
        "bootstrap-gray-200": "#e9ecef",
        "bootstrap-gray-300": "#dee2e6",
        "bootstrap-gray-400": "#ced4da",
        "bootstrap-gray-500": "#adb5bd",
        "bootstrap-gray-600": "#6c757d",
        "bootstrap-gray-700": "#495057",
        "bootstrap-gray-800": "#343a40",
        "bootstrap-gray-900": "#212529",
        "warning-bg": "#fff3cd",
        "warning-border": "#ffeaa7",
        "warning-text": "#856404",
        "danger-bg": "#f8d7da",
        "danger-border": "#f5c6cb",
        "danger-text": "#721c24",
      },
      animation: {
        spin: "spin 1s linear infinite",
        typing: "typing 1.4s infinite ease-in-out",
      },
      keyframes: {
        typing: {
          "0%, 80%, 100%": {
            transform: "scale(0.8)",
            opacity: "0.5",
          },
          "40%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
