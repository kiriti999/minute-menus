import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { vercelApiDevPlugin } from "./vite-api-dev-plugin";

export default defineConfig(({ mode }) => {
	// Env is available to the Vite API plugin / server — never inject secrets into the client bundle.
	loadEnv(mode, ".", "");
	return {
		server: {
			port: 3000,
			host: "0.0.0.0",
		},
		plugins: [react(), vercelApiDevPlugin()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "."),
			},
			dedupe: ["react", "react-dom"],
		},
	};
});
