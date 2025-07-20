'use server';
/**
 * @fileOverview A flow for fetching the current configuration from a local Stable Diffusion API.
 *
 * - getLocalConfig - A function that handles fetching the configuration.
 * - GetLocalConfigInput - The input type for the function.
 * - GetLocalConfigOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetLocalConfigInputSchema = z.object({
  apiEndpoint: z.string().url().describe('The base URL of the local Stable Diffusion API (without /sdapi/v1/...).'),
});
export type GetLocalConfigInput = z.infer<typeof GetLocalConfigInputSchema>;

const GetLocalConfigOutputSchema = z.object({
  checkpointModel: z.string().describe('The name of the current SD checkpoint model.'),
});
export type GetLocalConfigOutput = z.infer<typeof GetLocalConfigOutputSchema>;

export async function getLocalConfig(input: GetLocalConfigInput): Promise<GetLocalConfigOutput> {
  return getLocalConfigFlow(input);
}

const getLocalConfigFlow = ai.defineFlow(
  {
    name: 'getLocalConfigFlow',
    inputSchema: GetLocalConfigInputSchema,
    outputSchema: GetLocalConfigOutputSchema,
  },
  async (input) => {
    // The options endpoint is usually at the root of the API path
    const optionsUrl = new URL(input.apiEndpoint);
    optionsUrl.pathname = '/sdapi/v1/options';
    
    const response = await fetch(optionsUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error de la API local (${response.status}): ${errorBody}`);
    }

    const config = await response.json();

    if (!config.sd_model_checkpoint) {
        throw new Error('No se pudo encontrar el checkpoint en la configuración de la API.');
    }

    return { checkpointModel: config.sd_model_checkpoint };
  }
);
