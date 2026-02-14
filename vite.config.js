import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import final_manifest_json from './manifest.config.js';

export default defineConfig({
    root: './',
    plugins: [
        crx({ manifest: final_manifest_json }),
    ],
    server: {
        watch: {
            ignored: ['**/manifest.json'] // Prevent restarts from manifest edits
        }
    },
    build: {
        rollupOptions: {
            output: {
                // assetFileNames: "assets/[name][extname]"
            },
        },
    },
});