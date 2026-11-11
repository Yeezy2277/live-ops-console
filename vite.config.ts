/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", sourcemap: true },
  test: {
    // Sim tests are pure; component tests opt into jsdom with a file pragma.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
