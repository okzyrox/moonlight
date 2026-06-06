import { defineCollection } from 'astro:content';
import { luauDocsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		// Generates automatic API docs from Luau source code files
        // Put into a Starlight page
		loader: luauDocsLoader({
			// Paths to directories with Luau source files.
			code: ['./lua'],
		}),
		schema: docsSchema(),
	}),
};
