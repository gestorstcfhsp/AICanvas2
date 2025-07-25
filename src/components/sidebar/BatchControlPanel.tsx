
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateImage } from '@/ai/flows/generate-image';
import { db } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Layers, Loader2, CheckCircle2, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '../ui/separator';

type BatchResult = {
  prompt: string;
  status: 'success' | 'error';
  error?: string;
};

const PROMPTS_STORAGE_KEY = 'batchPromptsList';
const RESULTS_STORAGE_KEY = 'batchResultsList';


export default function BatchControlPanel() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);

  useEffect(() => {
    try {
        const storedPrompts = localStorage.getItem(PROMPTS_STORAGE_KEY);
        const storedResults = localStorage.getItem(RESULTS_STORAGE_KEY);
        if (storedPrompts) {
            setPrompts(storedPrompts);
        }
        if (storedResults) {
            setBatchResults(JSON.parse(storedResults));
        }
    } catch (error) {
        console.error("Failed to load batch state from localStorage", error);
        toast({ title: "Error al cargar estado", description: "No se pudo recuperar el último lote.", variant: "destructive" });
    }
  }, [toast]);

  const saveStateToLocalStorage = (newPrompts: string, newResults: BatchResult[]) => {
      try {
        localStorage.setItem(PROMPTS_STORAGE_KEY, newPrompts);
        localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(newResults));
      } catch (error) {
        console.error("Failed to save batch state to localStorage", error);
      }
  }

  const handleGenerateBatch = async (promptsToProcess: string[]) => {
    if (promptsToProcess.length === 0) {
      toast({
        title: 'No hay prompts para procesar',
        description: 'Por favor, introduce al menos un prompt.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setTotalToProcess(promptsToProcess.length);
    
    // Filter out already successful prompts from results before starting
    const successfulPrompts = batchResults.filter(r => r.status === 'success').map(r => r.prompt);
    const newResults = batchResults.filter(r => !promptsToProcess.includes(r.prompt) || successfulPrompts.includes(r.prompt));

    for (let i = 0; i < promptsToProcess.length; i++) {
      const currentPrompt = promptsToProcess[i];
      setCurrentIndex(i + 1);

      try {
        const result = await generateImage({ prompt: currentPrompt });
        const blob = await dataUrlToBlob(result.imageUrl);
        const metadata = await getImageMetadata(result.imageUrl);

        const newImage = {
          name: currentPrompt.substring(0, 50) + '...',
          prompt: currentPrompt,
          refinedPrompt: '',
          model: 'Gemini Flash' as const,
          resolution: { width: metadata.width, height: metadata.height },
          size: blob.size,
          isFavorite: 0 as const,
          tags: ['batch'],
          blob,
          createdAt: new Date(),
        };

        await db.images.add(newImage);
        
        const resultToAdd = { prompt: currentPrompt, status: 'success' as const };
        newResults.push(resultToAdd);
        setBatchResults([...newResults]);

      } catch (error: any) {
        console.error(`Failed to generate image for prompt: "${currentPrompt}"`, error);
        let errorMessage = 'No se pudo generar la imagen.';
        if (error.message && error.message.includes('429')) {
          errorMessage = 'Límite de cuota alcanzado.';
        }
        
        const resultToAdd = { prompt: currentPrompt, status: 'error' as const, error: errorMessage };
        newResults.push(resultToAdd);
        setBatchResults([...newResults]);
      } finally {
        // Save state after each prompt
        saveStateToLocalStorage(prompts, newResults);
      }
    }

    setIsGenerating(false);
    toast({
        title: 'Lote Completado',
        description: `Se procesaron ${promptsToProcess.length} prompts.`
    })
  };

  const startNewBatch = () => {
    setBatchResults([]);
    const promptList = prompts.split('\n').filter(p => p.trim() !== '');
    handleGenerateBatch(promptList);
  }

  const retryFailed = () => {
    const failedPrompts = batchResults.filter(r => r.status === 'error').map(r => r.prompt);
    if (failedPrompts.length > 0) {
        handleGenerateBatch(failedPrompts);
    } else {
        toast({ title: "No hay fallos que reintentar", description: "Todos los prompts se generaron correctamente." });
    }
  };
  
  const handleClear = () => {
    setPrompts('');
    setBatchResults([]);
    setCurrentIndex(0);
    setTotalToProcess(0);
    try {
        localStorage.removeItem(PROMPTS_STORAGE_KEY);
        localStorage.removeItem(RESULTS_STORAGE_KEY);
    } catch (error) {
        console.error("Failed to clear localStorage", error);
    }
    toast({ title: "Lote Limpiado", description: "Puedes iniciar un nuevo lote cuando quieras." });
  }

  const promptList = prompts.split('\n').filter(p => p.trim() !== '');
  const failedCount = batchResults.filter(r => r.status === 'error').length;

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Layers />
            Generación por Lotes
          </CardTitle>
          <CardDescription>Genera múltiples imágenes desde una lista de prompts. El progreso se guardará si sales de la página.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="batch-prompts">Lista de Prompts (uno por línea)</Label>
            <Textarea
              id="batch-prompts"
              placeholder="Un gato con sombrero de copa&#x0a;Un perro en un monopatín&#x0a;Un robot leyendo un libro..."
              value={prompts}
              onChange={(e) => {
                  setPrompts(e.target.value);
                  if (batchResults.length > 0) {
                      setBatchResults([]);
                      saveStateToLocalStorage(e.target.value, []);
                  } else {
                      saveStateToLocalStorage(e.target.value, batchResults);
                  }
              }}
              rows={8}
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button onClick={startNewBatch} disabled={isGenerating || !prompts.trim()} className="sm:col-span-2 w-full">
              {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Layers className="mr-2" />}
              {isGenerating ? `Generando ${currentIndex} de ${totalToProcess}...` : `Iniciar Lote (${promptList.length})`}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isGenerating}>
                <Trash2 className="mr-2 h-4 w-4"/>
                Limpiar Todo
            </Button>
          </div>

          {(batchResults.length > 0) && (
            <div className="space-y-4">
                <Separator />
                <div className="flex justify-between items-center">
                    <h3 className="font-headline text-lg">Resultados del Lote</h3>
                    <Button variant="secondary" onClick={retryFailed} disabled={isGenerating || failedCount === 0}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reintentar Fallidos ({failedCount})
                    </Button>
                </div>
                <ScrollArea className="h-60 w-full rounded-md border">
                    <div className="space-y-2 p-4">
                    {batchResults.map((result, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-3">
                            <p className="text-sm text-muted-foreground flex-1 truncate" title={result.prompt}>{result.prompt}</p>
                            {result.status === 'success' ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                    Éxito
                                </Badge>
                            ) : (
                                <Badge variant="destructive" title={result.error}>
                                     <XCircle className="mr-1 h-3.5 w-3.5" />
                                    Error
                                </Badge>
                            )}
                        </div>
                    ))}
                    {isGenerating && <div className="p-3 text-sm text-muted-foreground italic flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Procesando siguiente prompt...</div>}
                    </div>
                </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
