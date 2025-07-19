'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import { Wand2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { refinePrompt } from '@/ai/flows/refine-prompt';
import { generateImage } from '@/ai/flows/generate-image';
import { db } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';

export default function ControlPanel() {
  const { toast } = useToast();
  const [promptText, setPromptText] = useState('');
  const [refineModel, setRefineModel] = useState<'Gemini Flash' | 'Ollama'>('Gemini Flash');
  const [imageModel, setImageModel] = useState<'Gemini Flash' | 'Stable Diffusion'>('Gemini Flash');
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRefinePrompt = async () => {
    if (!promptText.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para refinar.', variant: 'destructive' });
      return;
    }
    setIsRefining(true);
    try {
      const result = await refinePrompt({ promptText, modelName: refineModel });
      setPromptText(result.refinedPrompt);
      toast({ title: 'Prompt Refinado', description: 'Tu prompt ha sido mejorado.' });
    } catch (error) {
      console.error('Refine failed:', error);
      toast({ title: 'Error al Refinar', description: 'No se pudo refinar el prompt.', variant: 'destructive' });
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!promptText.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para generar una imagen.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateImage({ prompt: promptText });
      const blob = await dataUrlToBlob(result.imageUrl);
      const metadata = await getImageMetadata(result.imageUrl);

      const newImage = {
        name: promptText.substring(0, 50) + '...',
        prompt: promptText,
        refinedPrompt: '',
        model: imageModel,
        resolution: { width: metadata.width, height: metadata.height },
        size: blob.size,
        isFavorite: 0 as const,
        tags: [],
        blob,
        createdAt: new Date(),
      };
      
      await db.images.add(newImage);
      toast({ title: '¡Imagen Generada!', description: 'Tu nueva imagen ha sido guardada en el historial.' });
    } catch (error) {
      console.error('Generation failed:', error);
      toast({ title: 'Error al Generar', description: 'No se pudo generar la imagen.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <SidebarHeader>
        <h2 className="font-headline text-lg font-semibold">Controles</h2>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-4">
        <div className="space-y-6">
          <div>
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Un paisaje urbano futurista al atardecer, estilo synthwave..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={6}
              className="mt-1"
              disabled={isGenerating || isRefining}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Refinamiento de Prompt</Label>
            <div className="flex items-center gap-2">
              <Select value={refineModel} onValueChange={(v) => setRefineModel(v as any)} disabled={isGenerating || isRefining}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gemini Flash">Gemini Flash</SelectItem>
                  <SelectItem value="Ollama" disabled>Ollama (local)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleRefinePrompt} disabled={isRefining || isGenerating || !promptText.trim()} className="shrink-0">
                {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Separator />
          
          <div className="space-y-2">
            <Label>Modelo de Generación de Imágenes</Label>
             <Select value={imageModel} onValueChange={(v) => setImageModel(v as any)} disabled={isGenerating || isRefining}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gemini Flash">Gemini Flash</SelectItem>
                <SelectItem value="Stable Diffusion" disabled>Stable Diffusion (local)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button onClick={handleGenerateImage} disabled={isGenerating || isRefining || !promptText.trim()} className="w-full">
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
          {isGenerating ? 'Generando...' : 'Generar Imagen'}
        </Button>
      </SidebarFooter>
    </div>
  );
}
