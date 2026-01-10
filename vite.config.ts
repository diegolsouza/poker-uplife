import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages friendly (assets relative) + HashRouter in app.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
