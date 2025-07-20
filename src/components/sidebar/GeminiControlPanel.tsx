
'use client';

import React, { useState, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Wand2, Image as ImageIcon, Loader2, DownloadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { refinePrompt } from '@/ai/flows/refine-prompt';
import { generateImage as generateImageWithGemini } from '@/ai/flows/generate-image';
import { db, type AIImage } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';

const refinementModels = [
  { value: 'googleai/gemini-2.0-flash', label: 'Gemini Flash' },
];

type ImageModel = 'Gemini Flash' | 'Stable Diffusion (Local)';

export default function GeminiControlPanel() {
  const { toast } = useToast();
  const [promptText, setPromptText] = useState('');
  const [refinementModel, setRefinementModel] = useState(refinementModels[0].value);
  const [imageModel, setImageModel] = useState<ImageModel>('Gemini Flash');
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Local state
  const [apiEndpoint, setApiEndpoint] = useState('http://127.0.0.1:7860/sdapi/v1/txt2img');
  const [checkpointModel, setCheckpointModel] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [steps, setSteps] = useState([25]);
  const [cfgScale, setCfgScale] = useState([7]);
  const [isFetchingCheckpoint, setIsFetchingCheckpoint] = useState(false);

  const handleRefinePrompt = async () => {
    if (!promptText.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para refinar.', variant: 'destructive' });
      return;
    }
    setIsRefining(true);
    try {
      const result = await refinePrompt({ promptText, model: refinementModel });
      setPromptText(result.refinedPrompt);
      toast({ title: 'Prompt Refinado', description: 'Tu prompt ha sido mejorado.' });
    } catch (error) {
      console.error('Refine failed:', error);
      toast({ title: 'Error al Refinar', description: 'No se pudo refinar el prompt.', variant: 'destructive' });
    } finally {
      setIsRefining(false);
    }
  };

  const handleFetchCheckpoint = async () => {
    setIsFetchingCheckpoint(true);
    try {
        const baseUrl = new URL(apiEndpoint);
        const optionsUrl = new URL('/sdapi/v1/options', baseUrl.origin);

        const response = await fetch(optionsUrl.toString());

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
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            description = 'No se pudo conectar con la API local. Comprueba que el servidor esté en ejecución y que la dirección IP sea correcta. Si esta página se sirve por HTTPS, el navegador bloqueará las peticiones a un servidor HTTP local (error de contenido mixto).';
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

  const generateWithStableDiffusion = async () => {
    try {
      const payload: any = {
          prompt: promptText,
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

      return `data:image/png;base64,${result.images[0]}`;

    } catch (error: any) {
        console.error('Local generation failed:', error);
        let description = 'Ha ocurrido un error desconocido.';
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            description = 'No se pudo conectar con la API local. Comprueba que el servidor esté en ejecución, que la dirección IP sea correcta y que no haya un problema de contenido mixto (página HTTPS llamando a servidor HTTP). Asegúrate de que los CORS están bien configurados.';
        } else {
            description = error.message;
        }
        toast({ title: 'Error en Generación Local', description, variant: 'destructive' });
        return null;
    }
  };

  const handleGenerateImage = async () => {
    if (!promptText.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para generar una imagen.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      let imageUrl: string | null = null;
      let refinedPromptUsed = ''; // We can fill this if we refine the prompt before generation

      if (imageModel === 'Gemini Flash') {
        const result = await generateImageWithGemini({ prompt: promptText });
        imageUrl = result.imageUrl;
      } else {
        imageUrl = await generateWithStableDiffusion();
      }

      if (!imageUrl) {
        // Error toast is handled inside the specific generation function
        return;
      }

      const blob = await dataUrlToBlob(imageUrl);
      const metadata = await getImageMetadata(imageUrl);

      const newImage: Omit<AIImage, 'id'> = {
        name: promptText.substring(0, 50) + '...',
        prompt: promptText,
        refinedPrompt: refinedPromptUsed,
        model: imageModel,
        resolution: { width: metadata.width, height: metadata.height },
        size: blob.size,
        isFavorite: 0 as const,
        tags: [],
        blob,
        createdAt: new Date(),
        ...(imageModel === 'Stable Diffusion (Local)' && { checkpointModel }),
      };
      
      await db.images.add(newImage as AIImage);
      toast({ title: '¡Imagen Generada!', description: 'Tu nueva imagen ha sido guardada en el historial.' });
    } catch (error) {
      console.error('Generation failed:', error);
      toast({ title: 'Error al Generar', description: 'No se pudo generar la imagen.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const isLoading = isGenerating || isRefining || isFetchingCheckpoint;

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
       <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Controles de Generación</CardTitle>
            <CardDescription>Define los parámetros para crear tu próxima obra de arte.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Modelo de Generación de Imágenes</Label>
            <Select value={imageModel} onValueChange={(v: ImageModel) => setImageModel(v)} disabled={isLoading}>
            <SelectTrigger>
                <SelectValue placeholder="Seleccionar modelo" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Gemini Flash">Gemini Flash</SelectItem>
                <SelectItem value="Stable Diffusion (Local)">Stable Diffusion (Local)</SelectItem>
            </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Un paisaje urbano futurista al atardecer, estilo synthwave..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={6}
              className="mt-1"
              disabled={isLoading}
            />
          </div>
          
          <Separator />
          
          {imageModel === 'Gemini Flash' ? (
            <div className="space-y-2">
                <Label>Modelo de Refinamiento</Label>
                <div className="flex items-center gap-2">
                <Select value={refinementModel} onValueChange={setRefinementModel} disabled={isLoading}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar modelo" />
                    </SelectTrigger>
                    <SelectContent>
                        {refinementModels.map(model => (
                            <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleRefinePrompt} disabled={isLoading || !promptText.trim()} className="shrink-0">
                    {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    <span className="sr-only">Refinar Prompt</span>
                </Button>
                </div>
            </div>
          ) : (
            <Fragment>
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
              <div className="space-y-2">
                    <Label htmlFor="negative-prompt-local">Prompt Negativo</Label>
                    <Textarea
                    id="negative-prompt-local"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Mala calidad, borroso, texto, marca de agua..."
                    rows={3}
                    disabled={isLoading}
                    />
                </div>
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
                <Label>Escala de CFG: <span className="text-primary font-mono">{cfgScale[0]}</span></Label>
                <Slider
                  min={1}
                  max={20}
                  step={0.5}
                  value={cfgScale}
                  onValueChange={setCfgScale}
                  disabled={isLoading}
                />
              </div>
            </Fragment>
          )}

           <Button onClick={handleGenerateImage} disabled={isLoading || !promptText.trim()} className="w-full">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generando...' : 'Generar Imagen'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
