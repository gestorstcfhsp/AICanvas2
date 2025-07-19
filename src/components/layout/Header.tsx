'use client';

import React, { useRef } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { downloadJson, blobToDataUrl, dataUrlToBlob } from '@/lib/utils';

export default function Header() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const allImages = await db.images.toArray();
      if (allImages.length === 0) {
        toast({ title: 'Nada que exportar', description: 'Tu historial de imágenes está vacío.' });
        return;
      }

      const exportableImages = await Promise.all(
        allImages.map(async (img) => ({
          ...img,
          dataUrl: await blobToDataUrl(img.blob),
          blob: undefined, // Don't export the blob object itself
        }))
      );
      downloadJson(exportableImages, `ai-canvas-export-${Date.now()}.json`);
      toast({
        title: 'Historial Exportado',
        description: 'Tu historial de imágenes ha sido descargado exitosamente.',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Error al Exportar',
        description: 'No se pudo exportar tu historial de imágenes.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('Invalid file format');
        const importedData = JSON.parse(text);

        if (!Array.isArray(importedData)) throw new Error('JSON must be an array');
        
        const imagesToImport = await Promise.all(importedData.map(async (item: any) => {
          const blob = await dataUrlToBlob(item.dataUrl);
          return {
            ...item,
            blob,
            createdAt: new Date(item.createdAt),
            dataUrl: undefined,
          };
        }));
        
        await db.images.bulkAdd(imagesToImport);
        toast({
          title: 'Historial Importado',
          description: 'El historial de imágenes se importó correctamente.',
        });
      } catch (error) {
        console.error('Import failed:', error);
        toast({
          title: 'Error al Importar',
          description: 'El archivo seleccionado no es una exportación de historial válida.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="md:hidden" />
      <h1 className="font-headline text-xl font-semibold">Lienzo IA</h1>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={triggerFileSelect}>
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".json"
          className="hidden"
        />
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>
    </header>
  );
}
