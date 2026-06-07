// @ts-check
import starlight from '@okzyrox/moonlight';
import { defineConfig } from 'astro/config';
import { preventNodeBuiltinDependencyPlugin } from './src/noNodeModule';

export default defineConfig({
	integrations: [
		starlight({
			title: 'Basics',
			pagefind: false,
			markdown: { processedDirs: ['./src/content/comments/'] },
		}),
	],
	vite: {
		plugins: [preventNodeBuiltinDependencyPlugin()],
	},
});
