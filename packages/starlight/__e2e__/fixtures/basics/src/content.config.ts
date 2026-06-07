import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@okzyrox/moonlight/loaders';
import { docsSchema } from '@okzyrox/moonlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	// A collection not handled by Starlight.
	reviews: defineCollection({
		loader: glob({ base: './src/content/reviews', pattern: `**/[^_]*.{md,mdx}` }),
		schema: z.object({ title: z.string() }),
	}),
	// A collection opted in to Starlight’s Markdown processing.
	comments: defineCollection({
		loader: glob({ base: './src/content/comments', pattern: `**/[^_]*.{md,mdx}` }),
		schema: z.object({ title: z.string() }),
	}),
};
