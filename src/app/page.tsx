
'use client';

import React, { useState, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from '@/components/ui/sidebar';
import Header from '@/components/layout/Header';
import ControlPanel from '@/components/sidebar/ControlPanel';
import PromptGeneratorPanel from '@/components/sidebar/PromptGeneratorPanel';
import ImageHistory from '@/components/gallery/ImageHistory';
import ImageInspector from '@/components/gallery/ImageInspector';
import type { AIImage } from '@/lib/db';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppContext } from '@/context/AppContext';
import { Sparkles, History, FileText } from 'lucide-react';

type View = 'gemini' | 'prompt-generator' | 'history';

const PROMPTS_STORAGE_KEY = 'generatedPrompts';

function AppSidebar({ activeView, setActiveView, imageCount }: { activeView: View, setActiveView: (view: View) => void, imageCount?: number }) {
  return (
    <SidebarContent className="p-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton 
            isActive={activeView === 'gemini'} 
            onClick={() => setActiveView('gemini')}
            tooltip="Generación con IA"
          >
            <Sparkles />
            <span>Generación</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
         <SidebarMenuItem>
          <SidebarMenuButton 
            isActive={activeView === 'prompt-generator'} 
            onClick={() => setActiveView('prompt-generator')}
            tooltip="Generar desde Documento"
          >
            <FileText />
            <span>Desde Doc.</span>
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
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedPrompts = localStorage.getItem(PROMPTS_STORAGE_KEY);
      if (storedPrompts) {
        setGeneratedPrompts(JSON.parse(storedPrompts));
      }
    } catch (error) {
      console.error("Failed to load prompts from localStorage", error);
    }
  }, []);

  const inspectedImage = useLiveQuery(() => {
    if (inspectedImageId === null) return undefined;
    return db.images.get(inspectedImageId);
  }, [inspectedImageId]);
  
  const imageCount = useLiveQuery(() => db.images.count());


  const setInspectedImage = (image: AIImage | null) => {
    setInspectedImageId(image?.id ?? null);
  };
  
  const handleSetGeneratedPrompts = (prompts: string[]) => {
      setGeneratedPrompts(prompts);
      try {
        if (prompts.length > 0) {
            localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
        } else {
            localStorage.removeItem(PROMPTS_STORAGE_KEY);
        }
      } catch (error) {
        console.error("Failed to save prompts to localStorage", error);
      }
  }

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
              {activeView === 'gemini' && <ControlPanel />}
              {activeView === 'prompt-generator' && <PromptGeneratorPanel generatedPrompts={generatedPrompts} setGeneratedPrompts={handleSetGeneratedPrompts} />}
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
