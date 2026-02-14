// manifest.config.js
import { defineManifest } from '@crxjs/vite-plugin';
import packageJson from './package.json';
import manifest_static from './manifest.json.js';

const _manifest = defineManifest({
    ...manifest_static, // import from original static manifest.json
    // set|override||update|addon keys
    manifest_version: 3,
    name: packageJson.name,
    version: packageJson.version,
    action: { default_popup: undefined },
    // background: {
    //     service_worker: './src/background/background.js',
    //     type: 'module',
    // },
    // content_scripts: [
    //     {
    //         js: ['src/content/index.js'],
    //         matches: ['https://*/*', 'http://*/*'],
    //     },
    // ],
});

// DX check
if (_manifest.content_scripts) {
    for (const x of _manifest.content_scripts) {
        if (!x.css) continue;
        throw new Error(x.css.toString() + '\ncss files cannot be mapped to final `manifest.json` after the build; should import static css files via a js as module');
    }
}
export default defineManifest(_manifest);