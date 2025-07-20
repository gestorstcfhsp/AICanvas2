'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wand2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { refinePrompt } from '@/ai/flows/refine-prompt';
import { generateImage } from '@/ai/flows/generate-image';
import { db } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function GeminiControlPanel() {
  const { toast } = useToast();
  const [promptText, setPromptText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRefinePrompt = async () => {
    if (!promptText.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para refinar.', variant: 'destructive' });
      return;
    }
    setIsRefining(true);
    try {
      const result = await refinePrompt({ promptText, model: 'googleai/gemini-2.0-flash' });
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
        model: 'Gemini Flash' as const,
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
            <CardTitle className="font-headline text-2xl">Controles de Generación (Gemini)</CardTitle>
            <CardDescription>Define los parámetros para crear tu próxima obra de arte con los modelos de Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Un paisaje urbano futurista al atardecer, estilo synthwave..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={6}
              disabled={isLoading}
            />
             <Button variant="outline" onClick={handleRefinePrompt} disabled={isLoading || !promptText.trim()} className="w-full md:w-auto">
                {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {isRefining ? 'Refinando...' : 'Refinar Prompt'}
            </Button>
          </div>
          
           <Button onClick={handleGenerateImage} disabled={isLoading || !promptText.trim()} className="w-full !mt-6">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generando...' : 'Generar Imagen'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
