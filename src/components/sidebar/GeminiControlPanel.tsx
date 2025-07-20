
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wand2, Layers, RefreshCw, X, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { refinePrompt } from '@/ai/flows/refine-prompt';
import { generateImage } from '@/ai/flows/generate-image';
import { translateText } from '@/ai/flows/translate-text';
import { db, type AIImage } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Separator } from '@/components/ui/separator';
import BatchResultItem from './BatchResultItem';

export type BatchResult = {
  prompt: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  newImage?: AIImage;
};

const BATCH_RESULTS_STORAGE_KEY = 'batchGenerationResults';

function getFriendlyErrorMessage(error: any): string {
    const errorMessage = error.message || 'Error desconocido';
    if (errorMessage.includes('429')) {
        return 'La generación falló debido a la alta demanda (límite de frecuencia excedido). Por favor, espera un momento y vuelve a intentarlo.';
    }
    return errorMessage;
}

export default function GeminiControlPanel() {
  const { toast } = useToast();
  const [promptsText, setPromptsText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [refineBatch, setRefineBatch] = useState(true);
  const [progress, setProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

  useEffect(() => {
    try {
      const storedResults = localStorage.getItem(BATCH_RESULTS_STORAGE_KEY);
      if (storedResults) {
        const parsedResults: BatchResult[] = JSON.parse(storedResults);
        const restoredResults = parsedResults.map(r => 
            r.status === 'pending' ? { ...r, status: 'failed' as const, error: 'Proceso interrumpido' } : r
        );
        setBatchResults(restoredResults);
      }
    } catch (error) {
      console.error("Failed to load batch results from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      if (batchResults.length > 0) {
        const resultsToStore = batchResults.map(({ newImage, ...rest }) => rest);
        localStorage.setItem(BATCH_RESULTS_STORAGE_KEY, JSON.stringify(resultsToStore));
      } else {
        localStorage.removeItem(BATCH_RESULTS_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to save batch results to localStorage", error);
    }
  }, [batchResults]);


  const handleRefinePrompt = async () => {
    const prompts = promptsText.split('\n').filter(p => p.trim() !== '');
    if (prompts.length !== 1) {
      toast({ title: 'Refinamiento no disponible', description: 'Por favor, introduce un único prompt para refinar.', variant: 'destructive' });
      return;
    }
    
    setIsRefining(true);
    try {
      const result = await refinePrompt({ promptText: prompts[0], model: 'googleai/gemini-2.0-flash' });
      setPromptsText(result.refinedPrompt);
      toast({ title: 'Prompt Refinado', description: 'Tu prompt ha sido mejorado.' });
    } catch (error) {
      console.error('Refine failed:', error);
      toast({ title: 'Error al Refinar', description: 'No se pudo refinar el prompt.', variant: 'destructive' });
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateImage = async (originalPrompt: string, refinedPromptText: string | null) => {
    if (!originalPrompt.trim()) {
      throw new Error('El prompt no puede estar vacío.');
    }
    
    const finalPrompt = refinedPromptText || originalPrompt;

    const result = await generateImage({ prompt: finalPrompt });
    const blob = await dataUrlToBlob(result.imageUrl);
    const metadata = await getImageMetadata(result.imageUrl);

    const newImage: Omit<AIImage, 'id' | 'name'> = {
      prompt: originalPrompt,
      refinedPrompt: refinedPromptText || '',
      model: 'Gemini Flash' as const,
      resolution: { width: metadata.width, height: metadata.height },
      size: blob.size,
      isFavorite: 0 as const,
      tags: [],
      blob,
      createdAt: new Date(),
    };
    
    const imageId = await db.images.add({ ...newImage, name: finalPrompt.substring(0, 50) + '...' } as AIImage);
    
    translateText({ text: finalPrompt, targetLanguage: 'Spanish' })
        .then(translationResult => {
            db.images.update(imageId, { translation: translationResult.translation });
        })
        .catch(err => console.error("Auto-translation failed:", err));

    return { ...newImage, id: imageId, name: finalPrompt.substring(0, 50) + '...' };
  };
  
  const handleBatchGenerate = async (promptsToProcess: string[], shouldRefine: boolean) => {
    if (promptsToProcess.length === 0) {
      toast({ title: 'No hay prompts', description: 'Por favor, introduce al menos un prompt.', variant: 'destructive' });
      return;
    }
    
    setIsBatchGenerating(true);
    setProgress(0);
    
    const initialResults: BatchResult[] = promptsToProcess.map(prompt => ({ prompt, status: 'pending' }));
    setBatchResults(prevResults => {
        const newPrompts = promptsToProcess.filter(p => !prevResults.some(pr => pr.prompt === p));
        const updatedResults = prevResults.map(pr => promptsToProcess.includes(pr.prompt) ? { ...pr, status: 'pending' } : pr);
        return [...updatedResults, ...newPrompts.map(p => ({ prompt: p, status: 'pending' as const }))];
    });

    
    let generatedCount = 0;
    
    for (let i = 0; i < promptsToProcess.length; i++) {
        const currentPrompt = promptsToProcess[i];
        let newResult: BatchResult;
        
        try {
            let refinedPromptText: string | null = null;
            if (shouldRefine) {
                const refinedResult = await refinePrompt({ promptText: currentPrompt, model: 'googleai/gemini-2.0-flash' });
                refinedPromptText = refinedResult.refinedPrompt;
            }
            
            const newImage = await handleGenerateImage(currentPrompt, refinedPromptText);
            generatedCount++;
            newResult = { prompt: currentPrompt, status: 'success', newImage };
        } catch (error: any) {
            console.error(`Failed to generate for prompt "${currentPrompt}":`, error);
            newResult = { prompt: currentPrompt, status: 'failed', error: getFriendlyErrorMessage(error) };
        } 
        
        setProgress(((i + 1) / promptsToProcess.length) * 100);
        setBatchResults(prev => prev.map(r => r.prompt === currentPrompt ? newResult : r));
    }
    
    toast({ title: 'Proceso por Lotes Terminado', description: `Se generaron ${generatedCount} de ${promptsToProcess.length} imágenes.` });
    setIsBatchGenerating(false);
  };
  
  const initialBatchRun = () => {
    const prompts = promptsText.split('\n').filter(p => p.trim() !== '');
    setBatchResults([]);
    handleBatchGenerate(prompts, refineBatch);
  }

  const retryFailedPrompts = () => {
    const failedPrompts = batchResults.filter(r => r.status === 'failed').map(r => r.prompt);
    handleBatchGenerate(failedPrompts, true);
  }

  const handleClearBatchResults = () => {
    setBatchResults([]);
  }
  
  const isLoading = isRefining || isBatchGenerating;
  const failedPromptsCount = batchResults.filter(r => r.status === 'failed').length;
  const promptsCount = promptsText.split('\n').filter(p => p.trim() !== '').length;

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Controles de Generación (Gemini)</CardTitle>
          <CardDescription>Define los parámetros para crear tu próxima obra de arte con los modelos de Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="batch-prompts">Prompts (uno por línea)</Label>
                <div className="relative">
                    <Textarea
                    id="batch-prompts"
                    placeholder="Un gato astronauta en la luna..."
                    value={promptsText}
                    onChange={(e) => setPromptsText(e.target.value)}
                    rows={8}
                    disabled={isLoading}
                    className="pr-10"
                    />
                    {promptsText && (
                        <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1.5 h-7 w-7 text-muted-foreground"
                        onClick={() => setPromptsText('')}
                        disabled={isLoading}
                        >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Limpiar prompts</span>
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-2">
                  <Switch id="refine-batch" checked={refineBatch} onCheckedChange={setRefineBatch} disabled={isLoading} />
                  <Label htmlFor="refine-batch">Refinar prompts</Label>
              </div>
              <Button variant="outline" onClick={handleRefinePrompt} disabled={isLoading || promptsCount !== 1}>
                  {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {isRefining ? 'Refinando...' : 'Refinar Prompt Único'}
              </Button>
            </div>

            {isBatchGenerating && (
            <div className="space-y-2">
                <Label>Progreso</Label>
                <Progress value={progress} className="w-full" />
            </div>
            )}
            <Button onClick={initialBatchRun} disabled={isLoading || !promptsText.trim()} className="w-full">
            {isBatchGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
            {isBatchGenerating ? `Generando... (${Math.round(progress)}%)` : `Generar ${promptsCount > 0 ? promptsCount : ''} ${promptsCount === 1 ? 'Imagen' : 'Imágenes'}`}
            </Button>

            {batchResults.length > 0 && (
            <div className="space-y-4 pt-4">
                <Separator />
                <div className="flex justify-between items-center">
                <h3 className="font-headline text-lg">Resultados del Lote</h3>
                    <div className="flex items-center gap-2">
                    {failedPromptsCount > 0 && !isBatchGenerating && (
                    <Button variant="outline" size="sm" onClick={retryFailedPrompts} disabled={isLoading}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reintentar {failedPromptsCount}
                    </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={handleClearBatchResults} disabled={isLoading} className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Limpiar resultados del lote</span>
                    </Button>
                </div>
                </div>
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-2">
                {batchResults.map((result, index) => (
                    <BatchResultItem key={`${result.prompt}-${index}`} result={result} />
                ))}
                </div>
            </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

  