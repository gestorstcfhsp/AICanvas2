import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {ollama} from 'ollama-genkit';

export const ai = genkit({
  plugins: [
    googleAI(),
    // ollama({
    //   models: [
    //     {
    //       name: 'gemma', // Make sure you have pulled this model.
    //       type: 'generate',
    //     },
    //   ],
    //   serverAddress: 'http://127.0.0.1:11434', // default address
    // }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
