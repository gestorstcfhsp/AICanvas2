import Dexie, { type Table } from 'dexie';

export interface AIImage {
  id?: number;
  name: string;
  prompt: string;
  refinedPrompt: string;
  model: 'Gemini Flash' | 'Stable Diffusion' | string;
  resolution: { width: number; height: number };
  size: number; // in bytes
  isFavorite: 0 | 1; // Use number for index
  tags: string[];
  blob: Blob;
  createdAt: Date;
  dataUrl?: string; // For export, not stored
}

export class AiCanvasDB extends Dexie {
  images!: Table<AIImage>; 

  constructor() {
    super('AiCanvasDatabase');
    this.version(1).stores({
      images: '++id, name, isFavorite, *tags, createdAt'
    });
  }
}

export const db = new AiCanvasDB();
