'use client';

import React, { useState } from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from '@/components/ui/sidebar';
import Header from '@/components/layout/Header';
import GeminiControlPanel from '@/components/sidebar/GeminiControlPanel';
import LocalControlPanel from '@/components/sidebar/LocalControlPanel';
import ImageHistory from '@/components/gallery/ImageHistory';
import ImageInspector from '@/components/gallery/ImageInspector';
import type { AIImage } from '@/lib/db';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppContext } from '@/context/AppContext';
import { Sparkles, Server, History } from 'lucide-react';

type View = 'gemini' | 'local' | 'history';

function AppSidebar({ activeView, setActiveView, imageCount }: { activeView: View, setActiveView: (view: View) => void, imageCount?: number }) {
  return (
    <SidebarContent className="p-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton 
            isActive={activeView === 'gemini'} 
            onClick={() => setActiveView('gemini')}
            tooltip="Generación con Gemini"
          >
            <Sparkles />
            <span>Gemini</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton 
            isActive={activeView === 'local'} 
            onClick={() => setActiveView('local')}
            tooltip="Generación Local"
          >
            <Server />
            <span>Local</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton 
            isActive={activeView === 'history'} 
            onClick={() => setActiveView('history')}
            tooltip="Historial"
          >
            <History />
            <span>Historial</span>
            {imageCount !== undefined && imageCount > 0 && (
                <SidebarMenuBadge>{imageCount}</SidebarMenuBadge>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
  );
}


export default function Home() {
  const [inspectedImageId, setInspectedImageId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<View>('gemini');

  const inspectedImage = useLiveQuery(() => {
    if (inspectedImageId === null) return undefined;
    return db.images.get(inspectedImageId);
  }, [inspectedImageId]);
  
  const imageCount = useLiveQuery(() => db.images.count());


  const setInspectedImage = (image: AIImage | null) => {
    setInspectedImageId(image?.id ?? null);
  };

  return (
    <AppContext.Provider value={{ inspectedImage: inspectedImage || null, setInspectedImage }}>
      <SidebarProvider>
        <Sidebar>
          <AppSidebar activeView={activeView} setActiveView={setActiveView} imageCount={imageCount} />
        </Sidebar>
        <SidebarInset>
          <div className="flex flex-col h-screen bg-background">
            <Header />
            <main className="flex-1 overflow-y-auto">
              {activeView === 'gemini' && <GeminiControlPanel />}
              {activeView === 'local' && <LocalControlPanel />}
              {activeView === 'history' && <ImageHistory />}
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
