'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wand2, Image as ImageIcon, Loader2, Bot, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { refinePrompt } from '@/ai/flows/refine-prompt';
import { generateImage } from '@/ai/flows/generate-image';
import { db } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"

export default function GeminiControlPanel() {
  const { toast } = useToast();
  const [promptText, setPromptText] = useState('');
  const [batchPrompts, setBatchPrompts] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [refineBatch, setRefineBatch] = useState(true);
  const [progress, setProgress] = useState(0);

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

  const handleGenerateImage = async (currentPrompt: string, refinedPromptText: string | null = null) => {
    if (!currentPrompt.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para generar una imagen.', variant: 'destructive' });
      return;
    }
    
    let finalPrompt = currentPrompt;
    if (refinedPromptText) {
      finalPrompt = refinedPromptText;
    }

    // This function will be called by both single and batch generation
    const result = await generateImage({ prompt: finalPrompt });
    const blob = await dataUrlToBlob(result.imageUrl);
    const metadata = await getImageMetadata(result.imageUrl);

    const newImage = {
      name: currentPrompt.substring(0, 50) + '...',
      prompt: currentPrompt,
      refinedPrompt: refinedPromptText || '',
      model: 'Gemini Flash' as const,
      resolution: { width: metadata.width, height: metadata.height },
      size: blob.size,
      isFavorite: 0 as const,
      tags: [],
      blob,
      createdAt: new Date(),
    };
    
    await db.images.add(newImage);
    return newImage;
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
  
  const handleBatchGenerate = async () => {
    const prompts = batchPrompts.split('\n').filter(p => p.trim() !== '');
    if (prompts.length === 0) {
      toast({ title: 'No hay prompts', description: 'Por favor, introduce al menos un prompt en el área de texto.', variant: 'destructive' });
      return;
    }
    
    setIsBatchGenerating(true);
    setProgress(0);
    
    let generatedCount = 0;

    for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i];
        let refinedPromptText: string | null = null;
        try {
            toast({ title: `Procesando ${i + 1}/${prompts.length}`, description: `Generando imagen para: "${currentPrompt.substring(0, 30)}..."` });

            if (refineBatch) {
                const refinedResult = await refinePrompt({ promptText: currentPrompt, model: 'googleai/gemini-2.0-flash' });
                refinedPromptText = refinedResult.refinedPrompt;
            }
            
            await handleGenerateImage(currentPrompt, refinedPromptText);
            generatedCount++;

        } catch (error) {
            console.error(`Failed to generate for prompt "${currentPrompt}":`, error);
            toast({ title: `Error en prompt ${i + 1}`, description: `No se pudo generar la imagen para: "${currentPrompt.substring(0,30)}..."`, variant: 'destructive' });
        } finally {
            setProgress(((i + 1) / prompts.length) * 100);
        }
    }
    
    toast({ title: 'Proceso por Lotes Terminado', description: `Se generaron ${generatedCount} de ${prompts.length} imágenes.` });
    setIsBatchGenerating(false);
  };
  
  const isLoading = isGenerating || isRefining || isBatchGenerating;

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
              <TabsTrigger value="single"><Bot className="mr-2"/>Prompt Único</TabsTrigger>
              <TabsTrigger value="batch"><Layers className="mr-2"/>Múltiples Prompts</TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="space-y-4 pt-4">
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
              <Button onClick={handleSingleGenerate} disabled={isLoading || !promptText.trim()} className="w-full !mt-6">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generando...' : 'Generar Imagen'}
              </Button>
            </TabsContent>
            <TabsContent value="batch" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="batch-prompts">Prompts (uno por línea)</Label>
                <Textarea
                  id="batch-prompts"
                  placeholder="Un gato astronauta en la luna&#10;Un bosque encantado con setas brillantes&#10;Una ciudad submarina..."
                  value={batchPrompts}
                  onChange={(e) => setBatchPrompts(e.target.value)}
                  rows={8}
                  disabled={isLoading}
                />
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
              <Button onClick={handleBatchGenerate} disabled={isLoading || !batchPrompts.trim()} className="w-full !mt-6">
                {isBatchGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
                {isBatchGenerating ? `Generando... (${Math.round(progress)}%)` : `Generar ${batchPrompts.split('\n').filter(p => p.trim() !== '').length || 0} Imágenes`}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
