
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateImage } from '@/ai/flows/generate-image';
import { db } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Layers, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '../ui/separator';

type BatchResult = {
  prompt: string;
  status: 'success' | 'error';
  error?: string;
};

export default function BatchControlPanel() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleGenerateBatch = async () => {
    const promptList = prompts.split('\n').filter(p => p.trim() !== '');
    if (promptList.length === 0) {
      toast({
        title: 'No hay prompts para procesar',
        description: 'Por favor, introduce al menos un prompt.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setBatchResults([]);
    setCurrentIndex(0);

    for (let i = 0; i < promptList.length; i++) {
      const currentPrompt = promptList[i];
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
          tags: [],
          blob,
          createdAt: new Date(),
        };

        await db.images.add(newImage);

        setBatchResults(prev => [...prev, { prompt: currentPrompt, status: 'success' }]);
      } catch (error: any) {
        console.error(`Failed to generate image for prompt: "${currentPrompt}"`, error);
        let errorMessage = 'No se pudo generar la imagen.';
        if (error.message && error.message.includes('429')) {
          errorMessage = 'Límite de cuota alcanzado.';
        }
        setBatchResults(prev => [...prev, { prompt: currentPrompt, status: 'error', error: errorMessage }]);
      }
    }

    setIsGenerating(false);
    toast({
        title: 'Lote Completado',
        description: `Se procesaron ${promptList.length} prompts.`
    })
  };
  
  const handleClear = () => {
    setPrompts('');
    setBatchResults([]);
    setCurrentIndex(0);
  }

  const promptList = prompts.split('\n').filter(p => p.trim() !== '');

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Layers />
            Generación por Lotes
          </CardTitle>
          <CardDescription>Genera múltiples imágenes a partir de una lista de prompts. Cada imagen se guardará automáticamente en el historial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="batch-prompts">Lista de Prompts (uno por línea)</Label>
            <Textarea
              id="batch-prompts"
              placeholder="Un gato con sombrero de copa&#x0a;Un perro en un monopatín&#x0a;Un robot leyendo un libro..."
              value={prompts}
              onChange={(e) => setPrompts(e.target.value)}
              rows={8}
              disabled={isGenerating}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleGenerateBatch} disabled={isGenerating || !prompts.trim()} className="w-full">
              {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Layers className="mr-2" />}
              {isGenerating ? `Generando ${currentIndex} de ${promptList.length}...` : `Iniciar Lote (${promptList.length})`}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isGenerating}>
                <Trash2 className="mr-2 h-4 w-4"/>
                Limpiar
            </Button>
          </div>

          {(isGenerating || batchResults.length > 0) && (
            <div className="space-y-4">
                <Separator />
                <h3 className="font-headline text-lg">Resultados del Lote</h3>
                <ScrollArea className="h-60 w-full rounded-md border">
                    <div className="space-y-2 p-4">
                    {batchResults.map((result, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-3">
                            <p className="text-sm text-muted-foreground flex-1 truncate">{result.prompt}</p>
                            {result.status === 'success' ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                    Éxito
                                </Badge>
                            ) : (
                                <Badge variant="destructive">
                                     <XCircle className="mr-1 h-3.5 w-3.5" />
                                    Error: {result.error}
                                </Badge>
                            )}
                        </div>
                    ))}
                    {isGenerating && <p className="p-3 text-sm text-muted-foreground italic">Procesando siguiente prompt...</p>}
                    </div>
                </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
