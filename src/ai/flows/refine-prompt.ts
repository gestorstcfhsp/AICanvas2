'use server';

/**
 * @fileOverview An AI agent that refines text prompts for image generation.
 *
 * - refinePrompt - A function that refines a text prompt using a specified model.
 * - RefinePromptInput - The input type for the refinePrompt function.
 * - RefinePromptOutput - The return type for the refinePrompt function.
 */

import {ai} from '@/ai/genkit';
import {generate} from 'genkit/generate';
import {z} from 'genkit';

const RefinePromptInputSchema = z.object({
  promptText: z.string().describe('The original text prompt to refine.'),
});
export type RefinePromptInput = z.infer<typeof RefinePromptInputSchema>;

const RefinePromptOutputSchema = z.object({
  refinedPrompt: z.string().describe('The refined text prompt.'),
});
export type RefinePromptOutput = z.infer<typeof RefinePromptOutputSchema>;

export async function refinePrompt(input: RefinePromptInput): Promise<RefinePromptOutput> {
  return refinePromptFlow(input);
}

const refinePromptFlow = ai.defineFlow(
  {
    name: 'refinePromptFlow',
    inputSchema: RefinePromptInputSchema,
    outputSchema: RefinePromptOutputSchema,
  },
  async ({promptText}) => {
    const {output} = await generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: `You are an AI expert in refining prompts for image generation. Your goal is to take the user's prompt and make it more specific, descriptive, and creative, so that it can generate a better image.

Original Prompt: ${promptText}

Refined Prompt:`,
      output: {
        schema: RefinePromptOutputSchema,
      }
    });

    return output!;
  }
);
