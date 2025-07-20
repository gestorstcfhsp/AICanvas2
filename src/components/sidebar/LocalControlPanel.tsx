
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Server, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateImageLocal } from '@/ai/flows/generate-image-local';
import { db } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';


export default function LocalControlPanel() {
  const { toast } = useToast();
  const [apiEndpoint, setApiEndpoint] = useState('http://127.0.0.1:7860/sdapi/v1/txt2img');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [steps, setSteps] = useState([25]);
  const [cfgScale, setCfgScale] = useState([7]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para generar una imagen.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await generateImageLocal({
        apiEndpoint,
        prompt,
        negativePrompt,
        steps: steps[0],
        cfgScale: cfgScale[0],
      });
      
      const blob = await dataUrlToBlob(result.imageUrl);
      const metadata = await getImageMetadata(result.imageUrl);

      const newImage = {
        name: prompt.substring(0, 50) + '...',
        prompt: prompt,
        refinedPrompt: '', // Not applicable for local generation
        model: 'Stable Diffusion',
        resolution: { width: metadata.width, height: metadata.height },
        size: blob.size,
        isFavorite: 0 as const,
        tags: [],
        blob,
        createdAt: new Date(),
      };
      
      await db.images.add(newImage);
      toast({ title: '¡Imagen Local Generada!', description: 'Tu nueva imagen ha sido guardada en el historial.' });

    } catch (error: any) {
      console.error('Local generation failed:', error);
      let description = 'Ha ocurrido un error desconocido.';
      if (error.message?.includes('fetch failed')) {
          description = 'No se pudo conectar con la API local. Asegúrate de que tu servidor de IA (ej. Stable Diffusion) está en ejecución y que no hay un cortafuegos bloqueando la conexión.';
      } else {
          description = error.message;
      }
      toast({ title: 'Error en Generación Local', description, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const canGenerate = prompt.trim() !== '' && !isLoading;

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Server />
            Controles de Generación Local
          </CardTitle>
          <CardDescription>
            Utiliza tus propios modelos de IA (ej. Stable Diffusion) para generar imágenes directamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="api-endpoint">Endpoint de la API Local</Label>
            <Input
              id="api-endpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="http://127.0.0.1:7860/sdapi/v1/txt2img"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="prompt-local">Prompt</Label>
                <Textarea
                id="prompt-local"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Un castillo en las nubes, arte digital detallado..."
                rows={5}
                disabled={isLoading}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="negative-prompt-local">Prompt Negativo</Label>
                <Textarea
                id="negative-prompt-local"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Mala calidad, borroso, texto, marca de agua..."
                rows={5}
                disabled={isLoading}
                />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Pasos de Muestreo: <span className="text-primary font-mono">{steps}</span></Label>
              <Slider
                min={1}
                max={100}
                step={1}
                value={steps}
                onValueChange={setSteps}
                disabled={isLoading}
              />
            </div>
             <div className="space-y-3">
              <Label>Escala de CFG: <span className="text-primary font-mono">{cfgScale}</span></Label>
              <Slider
                min={1}
                max={20}
                step={0.5}
                value={cfgScale}
                onValueChange={setCfgScale}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
            {isLoading ? 'Generando...' : 'Generar Imagen'}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
