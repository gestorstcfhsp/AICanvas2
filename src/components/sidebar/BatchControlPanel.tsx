
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bot, Loader2, DownloadCloud, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, type AIImage } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import BatchResultItem from './BatchResultItem';

export interface BatchResult {
  id: number;
  prompt: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

export default function BatchControlPanel() {
  const { toast } = useToast();
  const [promptsText, setPromptsText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

  // Local state
  const [apiEndpoint, setApiEndpoint] = useState('http://127.0.0.1:7860/sdapi/v1/txt2img');
  const [checkpointModel, setCheckpointModel] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [steps, setSteps] = useState([25]);
  const [cfgScale, setCfgScale] = useState([7]);
  const [isFetchingCheckpoint, setIsFetchingCheckpoint] = useState(false);

  const handleFetchCheckpoint = async () => {
    setIsFetchingCheckpoint(true);
    let description = 'Ha ocurrido un error desconocido.';
    try {
        const optionsUrl = apiEndpoint.replace("txt2img", "options");
        const response = await fetch(optionsUrl);

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
        if (error instanceof TypeError && error.message.includes('fetch')) {
            description = 'No se pudo conectar con la API local. Causas comunes: (1) El servidor no está en ejecución. (2) La dirección es incorrecta. (3) Problema de CORS. (4) Error de contenido mixto (página HTTPS a servidor HTTP).';
        } else {
            description = error.message;
        }
        toast({
            title: 'Error al Obtener Checkpoint',
            description,
            variant: 'destructive',
            duration: 10000,
        });
    } finally {
        setIsFetchingCheckpoint(false);
    }
  };
  
  const generateSingleImage = async (prompt: string): Promise<string> => {
    const payload: any = {
      prompt,
      negative_prompt: negativePrompt,
      steps: steps[0],
      cfg_scale: cfgScale[0],
      width: 512,
      height: 512,
    };

    if (checkpointModel) {
      payload.override_settings = {
        sd_model_checkpoint: checkpointModel,
      };
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    return `data:image/png;base64,${result.images[0]}`;
  };


  const handleStartBatch = async () => {
    const prompts = promptsText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (prompts.length === 0) {
      toast({ title: 'No hay prompts', description: 'Por favor, introduce al menos un prompt para empezar.', variant: 'destructive' });
      return;
    }
    
    setIsGenerating(true);
    const initialResults = prompts.map((prompt, index) => ({ id: Date.now() + index, prompt, status: 'pending' as const }));
    setBatchResults(initialResults);

    for (let i = 0; i < prompts.length; i++) {
        const currentResultId = initialResults[i].id;
        try {
            const prompt = prompts[i];
            const imageUrl = await generateSingleImage(prompt);
            
            const blob = await dataUrlToBlob(imageUrl);
            const metadata = await getImageMetadata(imageUrl);

            const newImage: Omit<AIImage, 'id'> = {
                name: prompt.substring(0, 50) + '...',
                prompt,
                refinedPrompt: '',
                model: 'Stable Diffusion (Local)',
                resolution: { width: metadata.width, height: metadata.height },
                size: blob.size,
                isFavorite: 0 as const,
                tags: [],
                blob,
                createdAt: new Date(),
                checkpointModel,
            };

            await db.images.add(newImage as AIImage);
            
            setBatchResults(prev => prev.map(r => r.id === currentResultId ? { ...r, status: 'success' } : r));

        } catch (error: any) {
             let description = 'Error desconocido.';
             if (error instanceof TypeError && error.message.includes('fetch')) {
                description = 'Fallo de conexión. Revisa que la API esté activa, la dirección, CORS y el error de contenido mixto.';
            } else {
                description = error.message;
            }
            setBatchResults(prev => prev.map(r => r.id === currentResultId ? { ...r, status: 'failed', error: description } : r));
        }
    }

    toast({ title: 'Generación por Lotes Finalizada', description: 'Todas las tareas han sido procesadas.' });
    setIsGenerating(false);
  };
  
  const isLoading = isGenerating || isFetchingCheckpoint;

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
       <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Generación por Lotes (Local)</CardTitle>
            <CardDescription>Configura y ejecuta la generación de múltiples imágenes usando tu API local de Stable Diffusion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="api-endpoint">Endpoint de la API Local (txt2img)</Label>
                <Input
                  id="api-endpoint"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="http://127.0.0.1:7860/sdapi/v1/txt2img"
                  disabled={isLoading}
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
                    disabled={isLoading}
                    />
                    <Button variant="outline" size="icon" onClick={handleFetchCheckpoint} disabled={isLoading}>
                        {isFetchingCheckpoint ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                        <span className="sr-only">Obtener Checkpoint</span>
                    </Button>
                </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <Label>Pasos de Muestreo: <span className="text-primary font-mono">{steps}</span></Label>
                    <Slider
                    min={1} max={100} step={1} value={steps} onValueChange={setSteps} disabled={isLoading}
                    />
                </div>
                <div className="space-y-3">
                    <Label>Escala de CFG: <span className="text-primary font-mono">{cfgScale[0]}</span></Label>
                    <Slider
                    min={1} max={20} step={0.5} value={cfgScale} onValueChange={setCfgScale} disabled={isLoading}
                    />
                </div>
            </div>
            
             <div className="space-y-2">
                <Label htmlFor="negative-prompt-local">Prompt Negativo</Label>
                <Textarea
                id="negative-prompt-local"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Mala calidad, borroso, texto, marca de agua..."
                rows={2}
                disabled={isLoading}
                />
            </div>
            
            <Separator />

             <div className="space-y-2">
                <Label htmlFor="prompts-list">Lista de Prompts (uno por línea)</Label>
                <Textarea
                id="prompts-list"
                value={promptsText}
                onChange={(e) => setPromptsText(e.target.value)}
                placeholder="Un astronauta en un caballo en Marte&#10;Un gato con sombrero de copa leyendo un periódico"
                rows={5}
                disabled={isLoading}
                />
            </div>
           
           <Button onClick={handleStartBatch} disabled={isLoading || !promptsText.trim()} className="w-full">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generando...' : 'Iniciar Lote'}
            </Button>

            {batchResults.length > 0 && (
                <div className="space-y-3">
                    <Label>Progreso del Lote</Label>
                    <ScrollArea className="h-40 w-full rounded-md border p-2">
                        <div className="space-y-2 p-1">
                            {batchResults.map(result => <BatchResultItem key={result.id} result={result} />)}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
