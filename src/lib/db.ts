import Dexie, { type Table } from 'dexie';

export interface AIImage {
  id?: number;
  name: string;
  prompt: string;
  refinedPrompt: string;
  translation?: string; // Add optional translation field
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
    this.version(2).stores({ // Bump version for schema change
      images: '++id, name, isFavorite, *tags, createdAt'
    }).upgrade(tx => {
        // Migration logic for existing data can be added here if needed
        // For now, we just allow the new field to be added.
    });
    // Fallback for original version
    this.version(1).stores({
        images: '++id, name, isFavorite, *tags, createdAt'
    });
  }
}

export const db = new AiCanvasDB();