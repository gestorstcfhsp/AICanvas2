'use client';

import React, { useState } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/layout/Header';
import ControlPanel from '@/components/sidebar/ControlPanel';
import ImageHistory from '@/components/gallery/ImageHistory';
import ImageInspector from '@/components/gallery/ImageInspector';
import type { AIImage } from '@/lib/db';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppContext } from '@/context/AppContext';

export default function Home() {
  const [inspectedImageId, setInspectedImageId] = useState<number | null>(null);

  const inspectedImage = useLiveQuery(() => {
    if (inspectedImageId === null) return undefined;
    return db.images.get(inspectedImageId);
  }, [inspectedImageId]);

  const setInspectedImage = (image: AIImage | null) => {
    setInspectedImageId(image?.id ?? null);
  };

  return (
    <AppContext.Provider value={{ inspectedImage: inspectedImage || null, setInspectedImage }}>
      <SidebarProvider>
        <Sidebar>
          <ControlPanel />
        </Sidebar>
        <SidebarInset>
          <div className="flex flex-col h-screen bg-background">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              <ImageHistory />
            </main>
          </div>
        </SidebarInset>
        {inspectedImage && (
          <ImageInspector
            image={inspectedImage}
            open={!!inspectedImage}
            onOpenChange={(isOpen) => !isOpen && setInspectedImage(null)}
          />
        )}
      </SidebarProvider>
    </AppContext.Provider>
  );
}
