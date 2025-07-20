
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Server, Image as ImageIcon, Loader2, DownloadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, type AIImage } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';


export default function LocalControlPanel() {
  const { toast } = useToast();
  const [apiEndpoint, setApiEndpoint] = useState('http://127.0.0.1:7860/sdapi/v1/txt2img');
  const [checkpointModel, setCheckpointModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [steps, setSteps] = useState([25]);
  const [cfgScale, setCfgScale] = useState([7]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCheckpoint, setIsFetchingCheckpoint] = useState(false);

  const handleFetchCheckpoint = async () => {
    setIsFetchingCheckpoint(true);
    try {
        const baseUrl = new URL(apiEndpoint);
        const optionsUrl = new URL('/sdapi/v1/options', baseUrl.origin);

        const response = await fetch(optionsUrl.toString(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Error de la API local (${response.status}): ${errorBody}`);
        }
        
        const config = await response.json();

        if (!config.sd_model_checkpoint) {
            throw new Error('No se pudo encontrar el checkpoint en la configuración de la API.');
        }
        
        setCheckpointModel(config.sd_model_checkpoint);
        toast({
            title: 'Checkpoint Obtenido',
            description: `Modelo base actual: ${config.sd_model_checkpoint}`
        });

    } catch (error: any) {
        console.error('Failed to fetch checkpoint:', error);
        let description = 'Ha ocurrido un error desconocido.';
        if (error.message?.includes('fetch failed')) {
          description = 'No se pudo conectar con la API local. Asegúrate de que el servidor esté en ejecución, que la dirección IP sea correcta y que la configuración de CORS sea la adecuada.';
        } else {
            description = error.message;
        }
        toast({
            title: 'Error al Obtener Checkpoint',
            description,
            variant: 'destructive',
        });
    } finally {
        setIsFetchingCheckpoint(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para generar una imagen.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    
    try {
        const payload: any = {
            prompt: prompt,
            negative_prompt: negativePrompt,
            steps: steps[0],
            cfg_scale: cfgScale[0],
            width: 512,
            height: 512,
        };

        if (checkpointModel) {
            payload.override_settings = {
                sd_model_checkpoint: checkpointModel
            };
        }

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Error de la API local (${response.status}): ${errorBody}`);
        }
        
        const result = await response.json();
        
        if (!result.images || result.images.length === 0) {
            throw new Error('La API local no devolvió ninguna imagen.');
        }

        const b64Image = result.images[0];
        const imageUrl = `data:image/png;base64,${b64Image}`;
      
        const blob = await dataUrlToBlob(imageUrl);
        const metadata = await getImageMetadata(imageUrl);

        const newImage: Omit<AIImage, 'id'> = {
            name: prompt.substring(0, 50) + '...',
            prompt: prompt,
            refinedPrompt: '',
            model: 'Stable Diffusion',
            resolution: { width: metadata.width, height: metadata.height },
            size: blob.size,
            isFavorite: 0 as const,
            tags: [],
            blob,
            createdAt: new Date(),
            checkpointModel,
        };
      
        await db.images.add(newImage as AIImage);
        toast({ title: '¡Imagen Local Generada!', description: 'Tu nueva imagen ha sido guardada en el historial.' });

    } catch (error: any) {
      console.error('Local generation failed:', error);
      let description = 'Ha ocurrido un error desconocido.';
      if (error.message?.includes('fetch failed')) {
          description = 'No se pudo conectar con la API local. Asegúrate de que el servidor esté en ejecución, que la dirección IP sea correcta y que la configuración de CORS sea la adecuada.';
      } else {
          description = error.message;
      }
      toast({ title: 'Error en Generación Local', description, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const canGenerate = prompt.trim() !== '' && !isLoading;
  const anyLoading = isLoading || isFetchingCheckpoint;

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Server />
            Controles de Generación Local
          </CardTitle>
          <CardDescription>
            Utiliza tus propios modelos de IA (ej. Stable Diffusion) para generar imágenes directamente desde tu red.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="api-endpoint">Endpoint de la API Local (txt2img)</Label>
            <Input
              id="api-endpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="http://127.0.0.1:7860/sdapi/v1/txt2img"
              disabled={anyLoading}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="checkpoint-model">Modelo de Checkpoint (Opcional)</Label>
            <div className="flex items-center gap-2">
                <Input
                id="checkpoint-model"
                value={checkpointModel}
                onChange={(e) => setCheckpointModel(e.target.value)}
                placeholder="Dejar en blanco para usar el modelo base o autocompletar..."
                disabled={anyLoading}
                />
                <Button variant="outline" size="icon" onClick={handleFetchCheckpoint} disabled={anyLoading}>
                    {isFetchingCheckpoint ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                    <span className="sr-only">Obtener Checkpoint</span>
                </Button>
            </div>
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
                disabled={anyLoading}
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
                disabled={anyLoading}
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
                disabled={anyLoading}
              />
            </div>
             <div className="space-y-3">
              <Label>Escala de CFG: <span className="text-primary font-mono">{cfgScale[0]}</span></Label>
              <Slider
                min={1}
                max={20}
                step={0.5}
                value={cfgScale}
                onValueChange={setCfgScale}
                disabled={anyLoading}
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
