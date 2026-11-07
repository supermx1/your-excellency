// @ts-nocheck
// Builds the export page (page.js + page.css) for one run's data.json. export.mjs passes the paths.
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

/** @param {{ dataFile: string, outDir: string }} opts */
export const exportConfig = ({ dataFile, outDir }) => ({
	configFile: false,
	root: here('./page'),
	logLevel: 'warn',
	plugins: [tailwindcss(), svelte({ compilerOptions: { runes: true } })],
	resolve: { alias: { $lib: here('../../src/lib'), 'export-data': dataFile } },
	build: {
		outDir,
		emptyOutDir: false,
		assetsDir: '.',
		cssCodeSplit: false,
		modulePreload: false,
		lib: { entry: here('./page/main.svelte.js'), formats: ['es'], fileName: () => 'page.js', cssFileName: 'page' }
	}
});
