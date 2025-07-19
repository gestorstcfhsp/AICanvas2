'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Wand2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { refinePrompt } from '@/ai/flows/refine-prompt';
import { generateImage } from '@/ai/flows/generate-image';
import { db } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  
  const isLoading = isGenerating || isRefining;

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
       <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Controles de Generación</CardTitle>
            <CardDescription>Define los parámetros para crear tu próxima obra de arte con IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Un paisaje urbano futurista al atardecer, estilo synthwave..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={6}
              className="mt-1"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Refinamiento de Prompt</Label>
            <div className="flex items-center gap-2">
              <Select value={refineModel} onValueChange={(v) => setRefineModel(v as any)} disabled={isLoading}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gemini Flash">Gemini Flash</SelectItem>
                  <SelectItem value="Ollama" disabled>Ollama (local)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleRefinePrompt} disabled={isLoading || !promptText.trim()} className="shrink-0">
                {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                 <span className="sr-only">Refinar Prompt</span>
              </Button>
            </div>
          </div>

          <Separator />
          
          <div className="space-y-2">
            <Label>Modelo de Generación de Imágenes</Label>
             <Select value={imageModel} onValueChange={(v) => setImageModel(v as any)} disabled={true}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gemini Flash">Gemini Flash</SelectItem>
                <SelectItem value="Stable Diffusion" disabled>Stable Diffusion (local)</SelectItem>
              </SelectContent>
            </Select>
          </div>

           <Button onClick={handleGenerateImage} disabled={isLoading || !promptText.trim()} className="w-full">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generando...' : 'Generar Imagen'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
