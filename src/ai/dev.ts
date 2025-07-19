import { config } from 'dotenv';
config();

import '@/ai/flows/refine-prompt.ts';
import '@/ai/flows/generate-image.ts';
import '@/ai/flows/translate-text.ts';
