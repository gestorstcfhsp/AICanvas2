import { createContext } from 'react';
import type { AIImage } from '@/lib/db';

export const AppContext = createContext<{
  inspectedImage: AIImage | null;
  setInspectedImage: (image: AIImage | null) => void;
}>({
  inspectedImage: null,
  setInspectedImage: () => {},
});
