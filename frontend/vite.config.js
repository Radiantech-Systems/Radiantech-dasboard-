import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Server-hosted dashboard (never runs on the Jetson). Configure the
// backend location via VITE_API_URL / VITE_WS_URL at build/run time.
export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        port: 5173,
    },
});
