'use server';
/**
 * @fileOverview A flow for generating image prompts from a document.
 *
 * - generatePromptsFromDocument - A function that handles the prompt generation.
 * - GeneratePromptsInput - The input type for the function.
 * - GeneratePromptsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePromptsInputSchema = z.object({
  documentContent: z.string().describe('The full text content of the document.'),
});
export type GeneratePromptsInput = z.infer<typeof GeneratePromptsInputSchema>;

const GeneratePromptsOutputSchema = z.object({
  prompts: z.array(z.string()).describe('A list of generated image prompts.'),
});
export type GeneratePromptsOutput = z.infer<typeof GeneratePromptsOutputSchema>;

export async function generatePromptsFromDocument(
  input: GeneratePromptsInput
): Promise<GeneratePromptsOutput> {
  return promptsFromDocFlow(input);
}

const prompt = ai.definePrompt({
  name: 'promptsFromDocPrompt',
  input: {schema: GeneratePromptsInputSchema},
  output: {schema: GeneratePromptsOutputSchema},
  prompt: `You are an expert in visual conceptualization and an AI assistant specialized in creating image generation prompts.

Your task is to analyze the following document content and generate a list of 5 to 10 descriptive, specific, and creative image prompts that capture the key themes, scenes, characters, and emotions of the text. Each prompt should be a single, detailed sentence suitable for a text-to-image AI model.

Focus on creating prompts that are visually rich and evocative.

Document Content:
---
{{{documentContent}}}
---
`,
});

const promptsFromDocFlow = ai.defineFlow(
  {
    name: 'promptsFromDocFlow',
    inputSchema: GeneratePromptsInputSchema,
    outputSchema: GeneratePromptsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
