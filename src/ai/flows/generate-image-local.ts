
'use server';
/**
 * @fileOverview A flow for generating images using a local Stable Diffusion instance.
 *
 * - generateImageLocal - A function that handles the local image generation process.
 * - GenerateImageLocalInput - The input type for the function.
 * - GenerateImageLocalOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateImageLocalInputSchema = z.object({
  apiEndpoint: z.string().url().describe('The URL of the local Stable Diffusion API endpoint.'),
  checkpointModel: z.string().optional().describe('The checkpoint model to use.'),
  prompt: z.string().describe('The prompt for the image.'),
  negativePrompt: z.string().describe('The negative prompt for the image.'),
  steps: z.number().describe('The number of sampling steps.'),
  cfgScale: z.number().describe('The CFG scale for the image.'),
});
export type GenerateImageLocalInput = z.infer<typeof GenerateImageLocalInputSchema>;

const GenerateImageLocalOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateImageLocalOutput = z.infer<typeof GenerateImageLocalOutputSchema>;

export async function generateImageLocal(input: GenerateImageLocalInput): Promise<GenerateImageLocalOutput> {
  return generateImageLocalFlow(input);
}

const generateImageLocalFlow = ai.defineFlow(
  {
    name: 'generateImageLocalFlow',
    inputSchema: GenerateImageLocalInputSchema,
    outputSchema: GenerateImageLocalOutputSchema,
  },
  async (input) => {
    const payload: any = {
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      steps: input.steps,
      cfg_scale: input.cfgScale,
      width: 512,
      height: 512,
    };

    if (input.checkpointModel) {
        payload.override_settings = {
            sd_model_checkpoint: input.checkpointModel
        };
    }

    const response = await fetch(input.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Local API request failed with status ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    
    if (!result.images || result.images.length === 0) {
      throw new Error('Local API did not return any images.');
    }

    const b64Image = result.images[0];
    const imageUrl = `data:image/png;base64,${b64Image}`;

    return { imageUrl };
  }
);
