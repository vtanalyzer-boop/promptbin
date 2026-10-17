import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    seoTitle: z.string().max(60).optional(),          // <title>, max 60 characters
    metaDescription: z.string().max(160).optional(),  // meta description, max 160 characters
    answer: z.string().optional(),                    // direct answer shown under the heading
  }),
});

export const collections = { blog };
