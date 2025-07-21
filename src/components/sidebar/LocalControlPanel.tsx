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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { getLocalConfig, generateImageLocal } from '@/lib/local-engine';

export default function LocalControlPanel() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingCheckpoint, setIsFetchingCheckpoint] = useState(false);

  // Default Stable Diffusion settings
  const [apiEndpoint, setApiEndpoint] = useState(
    'http://127.0.0.1:7860/sdapi/v1/txt2img'
  );
  const [checkpointModel, setCheckpointModel] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [steps, setSteps] = useState([25]);
  const [cfgScale, setCfgScale] = useState([7]);

  const handleFetchCheckpoint = async () => {
    setIsFetchingCheckpoint(true);
    try {
      const config = await getLocalConfig(apiEndpoint);

      if (!config.sd_model_checkpoint) {
        throw new Error(
          'No se pudo encontrar el checkpoint en la configuración de la API.'
        );
      }

      setCheckpointModel(config.sd_model_checkpoint);
      toast({
        title: 'Checkpoint Obtenido',
        description: `Modelo base actual: ${config.sd_model_checkpoint}`,
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

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'El prompt está vacío',
        description:
          'Por favor, introduce un prompt para generar una imagen.',
        variant: 'destructive',
      });
      return;
    }
    setIsGenerating(true);
    try {
      const imageUrl = await generateImageLocal({
        apiEndpoint,
        prompt,
        negativePrompt,
        steps: steps[0],
        cfgScale: cfgScale[0],
        checkpointModel,
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
        checkpointModel: checkpointModel,
      };

      await db.images.add(newImage as AIImage);
      toast({
        title: '¡Imagen Generada!',
        description: 'Tu nueva imagen ha sido guardada en el historial.',
      });
    } catch (error: any) {
      toast({
        title: 'Error al Generar',
        description: error.message,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = isGenerating || isFetchingCheckpoint;

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            Generación con Motor Local
          </CardTitle>
          <CardDescription>
            Configura y genera imágenes usando tu API local de Stable Diffusion.
          </CardDescription>
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
            <Label htmlFor="checkpoint-model">
              Modelo de Checkpoint (Opcional)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="checkpoint-model"
                value={checkpointModel}
                onChange={(e) => setCheckpointModel(e.target.value)}
                placeholder="Dejar en blanco o autocompletar desde la API"
                disabled={isLoading}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleFetchCheckpoint}
                disabled={isLoading}
              >
                {isFetchingCheckpoint ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DownloadCloud className="h-4 w-4" />
                )}
                <span className="sr-only">Obtener Checkpoint</span>
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>
                Pasos de Muestreo: <span className="text-primary font-mono">{steps[0]}</span>
              </Label>
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
              <Label>
                Escala de CFG: <span className="text-primary font-mono">{cfgScale[0]}</span>
              </Label>
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
            <Label htmlFor="single-prompt">Prompt</Label>
            <Textarea
              id="single-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Un astronauta en un caballo en Marte..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={handleGenerateImage}
            disabled={isLoading || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? 'Generando...' : 'Generar Imagen'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
