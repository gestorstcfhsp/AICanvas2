'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bot, Loader2, DownloadCloud, Play, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, type AIImage } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getLocalConfig, generateImageLocal } from '@/lib/local-engine';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export interface BatchResult {
  id: number;
  prompt: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

function BatchResultItem({ result }: { result: BatchResult }) {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-2 rounded-md bg-muted/50">
      <div className="flex items-start gap-3">
        <div className="mt-1">{getStatusIcon()}</div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-none truncate">{result.prompt}</p>
          {result.status === 'failed' && (
            <Alert variant="destructive" className="mt-2 p-2 text-xs">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-bold">Error</AlertTitle>
                <AlertDescription>
                    {result.error}
                </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}


export default function LocalControlPanel() {
  const { toast } = useToast();
  const [promptsText, setPromptsText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

  const [apiEndpoint, setApiEndpoint] = useState('http://127.0.0.1:7860/sdapi/v1/txt2img');
  const [checkpointModel, setCheckpointModel] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [steps, setSteps] = useState([25]);
  const [cfgScale, setCfgScale] = useState([7]);
  const [isFetchingCheckpoint, setIsFetchingCheckpoint] = useState(false);

  const handleFetchCheckpoint = async () => {
    setIsFetchingCheckpoint(true);
    try {
        const config = await getLocalConfig(apiEndpoint);
        
        if (!config.sd_model_checkpoint) {
            throw new Error('No se pudo encontrar el checkpoint en la configuración de la API.');
        }
        
        setCheckpointModel(config.sd_model_checkpoint);
        toast({
            title: 'Checkpoint Obtenido',
            description: `Modelo base actual: ${config.sd_model_checkpoint}`
        });

    } catch (error: any) {
        toast({
            title: 'Error al Obtener Checkpoint',
            description: error.message,
            variant: 'destructive',
            duration: 10000,
        });
    } finally {
        setIsFetchingCheckpoint(false);
    }
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
    
    const batchCheckpointModel = checkpointModel;

    for (let i = 0; i < prompts.length; i++) {
        const currentResultId = initialResults[i].id;
        const prompt = prompts[i];
        try {
            const imageUrl = await generateImageLocal({
                apiEndpoint,
                prompt,
                negativePrompt,
                steps: steps[0],
                cfgScale: cfgScale[0],
                checkpointModel: batchCheckpointModel,
            });
            
            const blob = await dataUrlToBlob(imageUrl);
            const metadata = await getImageMetadata(imageUrl);

            const newImage: Omit<AIImage, 'id'> = {
                name: prompt.substring(0, 50) + '...',
                prompt,
                refinedPrompt: '',
                model: 'Stable Diffusion',
                resolution: { width: metadata.width, height: metadata.height },
                size: blob.size,
                isFavorite: 0 as const,
                tags: [],
                blob,
                createdAt: new Date(),
                checkpointModel: batchCheckpointModel,
            };

            await db.images.add(newImage as AIImage);
            
            setBatchResults(prev => prev.map(r => r.id === currentResultId ? { ...r, status: 'success' } : r));

        } catch (error: any) {
            setBatchResults(prev => prev.map(r => r.id === currentResultId ? { ...r, status: 'failed', error: error.message } : r));
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
                    placeholder="Dejar en blanco o autocompletar desde la API"
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
                placeholder="Un astronauta en un caballo en Marte\nUn gato con sombrero de copa leyendo un periódico"
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
