'use server';

/**
 * @fileOverview An AI agent that refines text prompts for image generation.
 *
 * - refinePrompt - A function that refines a text prompt using either Gemini Flash or a local Ollama model.
 * - RefinePromptInput - The input type for the refinePrompt function.
 * - RefinePromptOutput - The return type for the refinePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefinePromptInputSchema = z.object({
  promptText: z.string().describe('The original text prompt to refine.'),
  modelName: z.enum(['Gemini Flash', 'Ollama']).describe('The model to use for refining the prompt.'),
});
export type RefinePromptInput = z.infer<typeof RefinePromptInputSchema>;

const RefinePromptOutputSchema = z.object({
  refinedPrompt: z.string().describe('The refined text prompt.'),
});
export type RefinePromptOutput = z.infer<typeof RefinePromptOutputSchema>;

export async function refinePrompt(input: RefinePromptInput): Promise<RefinePromptOutput> {
  return refinePromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'refinePromptPrompt',
  input: {schema: RefinePromptInputSchema},
  output: {schema: RefinePromptOutputSchema},
  prompt: `You are an AI expert in refining prompts for image generation. Your goal is to take the user's prompt and make it more specific, descriptive, and creative, so that it can generate a better image.

Original Prompt: {{{promptText}}}

Refined Prompt:`, // Removed the conditional logic for model selection
});

const refinePromptFlow = ai.defineFlow(
  {
    name: 'refinePromptFlow',
    inputSchema: RefinePromptInputSchema,
    outputSchema: RefinePromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
