'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wand2, Image as ImageIcon, Loader2, Bot, Layers, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { refinePrompt } from '@/ai/flows/refine-prompt';
import { generateImage } from '@/ai/flows/generate-image';
import { translateText } from '@/ai/flows/translate-text';
import { db, type AIImage } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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


export default function GeminiControlPanel() {
  const { toast } = useToast();
  const [promptText, setPromptText] = useState('');
  const [batchPrompts, setBatchPrompts] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [refineBatch, setRefineBatch] = useState(true);
  const [progress, setProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

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

  const handleGenerateImage = async (originalPrompt: string, refinedPromptText: string | null) => {
    if (!originalPrompt.trim()) {
      throw new Error('El prompt no puede estar vacío.');
    }
    
    const finalPrompt = refinedPromptText || originalPrompt;

    const result = await generateImage({ prompt: finalPrompt });
    const blob = await dataUrlToBlob(result.imageUrl);
    const metadata = await getImageMetadata(result.imageUrl);

    const newImage: Omit<AIImage, 'id'> = {
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
    
    const imageId = await db.images.add(newImage as AIImage);
    
    translateText({ text: finalPrompt, targetLanguage: 'Spanish' })
        .then(translationResult => {
            db.images.update(imageId, { translation: translationResult.translation });
        })
        .catch(err => console.error("Auto-translation failed:", err));

    return { ...newImage, id: imageId };
  };

  const handleSingleGenerate = async () => {
     setIsGenerating(true);
     try {
        await handleGenerateImage(promptText, null);
        toast({ title: '¡Imagen Generada!', description: 'Tu nueva imagen ha sido guardada en el historial.' });
     } catch (error) {
        console.error('Generation failed:', error);
        toast({ title: 'Error al Generar', description: 'No se pudo generar la imagen.', variant: 'destructive' });
     } finally {
        setIsGenerating(false);
     }
  };
  
  const handleBatchGenerate = async (promptsToProcess: string[]) => {
    if (promptsToProcess.length === 0) {
      toast({ title: 'No hay prompts', description: 'Por favor, introduce al menos un prompt.', variant: 'destructive' });
      return;
    }
    
    setIsBatchGenerating(true);
    setProgress(0);
    
    const initialResults: BatchResult[] = promptsToProcess.map(prompt => ({ prompt, status: 'pending' }));
    setBatchResults(initialResults);
    
    let generatedCount = 0;
    const newResults: BatchResult[] = [];

    for (let i = 0; i < promptsToProcess.length; i++) {
        const currentPrompt = promptsToProcess[i];
        let newResult: BatchResult;
        
        try {
            let refinedPromptText: string | null = null;
            if (refineBatch) {
                const refinedResult = await refinePrompt({ promptText: currentPrompt, model: 'googleai/gemini-2.0-flash' });
                refinedPromptText = refinedResult.refinedPrompt;
            }
            
            const newImage = await handleGenerateImage(currentPrompt, refinedPromptText);
            generatedCount++;
            newResult = { prompt: currentPrompt, status: 'success', newImage };
        } catch (error: any) {
            console.error(`Failed to generate for prompt "${currentPrompt}":`, error);
            newResult = { prompt: currentPrompt, status: 'failed', error: error.message || 'Error desconocido' };
        } finally {
            setProgress(((i + 1) / promptsToProcess.length) * 100);
            newResults.push(newResult!);
            setBatchResults([...newResults, ...initialResults.slice(newResults.length)]);
        }
    }
    
    toast({ title: 'Proceso por Lotes Terminado', description: `Se generaron ${generatedCount} de ${promptsToProcess.length} imágenes.` });
    setIsBatchGenerating(false);
  };
  
  const initialBatchRun = () => {
    const prompts = batchPrompts.split('\n').filter(p => p.trim() !== '');
    handleBatchGenerate(prompts);
  }

  const retryFailedPrompts = () => {
    const failedPrompts = batchResults.filter(r => r.status === 'failed').map(r => r.prompt);
    handleBatchGenerate(failedPrompts);
  }
  
  const isLoading = isGenerating || isRefining || isBatchGenerating;
  const failedPromptsCount = batchResults.filter(r => r.status === 'failed').length;

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Controles de Generación (Gemini)</CardTitle>
          <CardDescription>Define los parámetros para crear tu próxima obra de arte con los modelos de Google.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" disabled={isLoading}><Bot className="mr-2"/>Prompt Único</TabsTrigger>
              <TabsTrigger value="batch" disabled={isLoading}><Layers className="mr-2"/>Múltiples Prompts</TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                 <div className="relative">
                    <Textarea
                    id="prompt"
                    placeholder="Un paisaje urbano futurista al atardecer, estilo synthwave..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={6}
                    disabled={isLoading}
                    className="pr-10"
                    />
                    {promptText && (
                        <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1.5 h-7 w-7 text-muted-foreground"
                        onClick={() => setPromptText('')}
                        >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Limpiar prompt</span>
                        </Button>
                    )}
                </div>
                <Button variant="outline" onClick={handleRefinePrompt} disabled={isLoading || !promptText.trim()} className="w-full md:w-auto">
                  {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {isRefining ? 'Refinando...' : 'Refinar Prompt'}
                </Button>
              </div>
              <Button onClick={handleSingleGenerate} disabled={isLoading || !promptText.trim()} className="w-full !mt-6">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generando...' : 'Generar Imagen'}
              </Button>
            </TabsContent>
            <TabsContent value="batch" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="batch-prompts">Prompts (uno por línea)</Label>
                <div className="relative">
                    <Textarea
                    id="batch-prompts"
                    placeholder="Un gato astronauta en la luna&#10;Un bosque encantado con setas brillantes&#10;Una ciudad submarina..."
                    value={batchPrompts}
                    onChange={(e) => setBatchPrompts(e.target.value)}
                    rows={8}
                    disabled={isLoading}
                    className="pr-10"
                    />
                    {batchPrompts && (
                        <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1.5 h-7 w-7 text-muted-foreground"
                        onClick={() => setBatchPrompts('')}
                        >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Limpiar prompts</span>
                        </Button>
                    )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="refine-batch" checked={refineBatch} onCheckedChange={setRefineBatch} disabled={isLoading} />
                <Label htmlFor="refine-batch">Refinar prompts antes de generar</Label>
              </div>
              {isBatchGenerating && (
                <div className="space-y-2">
                    <Label>Progreso</Label>
                    <Progress value={progress} className="w-full" />
                </div>
              )}
              <Button onClick={initialBatchRun} disabled={isLoading || !batchPrompts.trim()} className="w-full !mt-6">
                {isBatchGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
                {isBatchGenerating ? `Generando... (${Math.round(progress)}%)` : `Generar ${batchPrompts.split('\n').filter(p => p.trim() !== '').length || 0} Imágenes`}
              </Button>

              {batchResults.length > 0 && !isBatchGenerating && (
                <div className="space-y-4 pt-4">
                  <Separator />
                  <div className="flex justify-between items-center">
                    <h3 className="font-headline text-lg">Resultados del Lote</h3>
                    {failedPromptsCount > 0 && (
                      <Button variant="outline" size="sm" onClick={retryFailedPrompts} disabled={isLoading}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reintentar {failedPromptsCount} Fallidos
                      </Button>
                    )}
                  </div>
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-2">
                    {batchResults.map((result, index) => (
                      <BatchResultItem key={`${result.prompt}-${index}`} result={result} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
