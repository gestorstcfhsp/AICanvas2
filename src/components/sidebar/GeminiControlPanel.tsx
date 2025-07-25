'use client';

import React, { useState } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Wand2, Image as ImageIcon, Loader2, Save, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { refinePrompt } from '@/ai/flows/refine-prompt';
import { generateImage } from '@/ai/flows/generate-image';
import { db } from '@/lib/db';
import { dataUrlToBlob, getImageMetadata } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';


const refinementModels = [
  { value: 'googleai/gemini-2.0-flash', label: 'Gemini Flash' },
];

interface PreviewState {
    imageUrl: string;
    prompt: string;
    originalPrompt: string;
}

export default function GeminiControlPanel() {
  const { toast } = useToast();
  const [promptText, setPromptText] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [refinementModel, setRefinementModel] = useState(refinementModels[0].value);
  const [imageModel] = useState<'Gemini Flash' | 'Stable Diffusion'>('Gemini Flash');
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const handleRefinePrompt = async () => {
    if (!promptText.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para refinar.', variant: 'destructive' });
      return;
    }
    setIsRefining(true);
    setOriginalPrompt(promptText);
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

  const handleGenerateImage = async () => {
    if (!promptText.trim()) {
      toast({ title: 'El prompt está vacío', description: 'Por favor, introduce un prompt para generar una imagen.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateImage({ prompt: promptText });
      setPreview({
          imageUrl: result.imageUrl,
          prompt: promptText,
          originalPrompt: originalPrompt || promptText
      });
    } catch (error: any) {
      console.error('Generation failed:', error);
      let description = 'No se pudo generar la imagen.';
      if (error.message && error.message.includes('429')) {
        description = 'Has superado tu cuota de generación de imágenes. Por favor, inténtalo de nuevo más tarde o revisa tu plan de facturación de Google AI.';
      }
      toast({ 
        title: 'Error al Generar', 
        description,
        variant: 'destructive',
        duration: 9000
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveImage = async () => {
    if (!preview) return;

    try {
        const blob = await dataUrlToBlob(preview.imageUrl);
        const metadata = await getImageMetadata(preview.imageUrl);

        const newImage = {
            name: preview.prompt.substring(0, 50) + '...',
            prompt: preview.originalPrompt,
            refinedPrompt: preview.originalPrompt !== preview.prompt ? preview.prompt : '',
            model: imageModel,
            resolution: { width: metadata.width, height: metadata.height },
            size: blob.size,
            isFavorite: 0 as const,
            tags: [],
            blob,
            createdAt: new Date(),
        };
        
        await db.images.add(newImage);
        toast({ title: '¡Imagen Guardada!', description: 'Tu nueva imagen ha sido guardada en el historial.' });
        
        // Reset prompts only after successful save
        setOriginalPrompt('');
        if (!originalPrompt) {
            setPromptText('');
        }

    } catch(error) {
        console.error('Save failed:', error);
        toast({ title: 'Error al Guardar', description: 'No se pudo guardar la imagen en el historial.', variant: 'destructive' });
    } finally {
        setPreview(null);
    }
  };
  
  const isLoading = isGenerating || isRefining;

  return (
    <>
      <div className="flex h-full items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader>
              <CardTitle className="font-headline text-2xl">Controles de Generación (Gemini)</CardTitle>
              <CardDescription>Define los parámetros para crear tu próxima obra de arte con los modelos de Google.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                  <Label>Modelo de Generación de Imágenes</Label>
                  <Select value={imageModel} disabled={true}>
                  <SelectTrigger>
                      <SelectValue placeholder="Seleccionar modelo" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Gemini Flash">Gemini Flash</SelectItem>
                      <SelectItem value="Stable Diffusion" disabled>Stable Diffusion</SelectItem>
                  </SelectContent>
                  </Select>
              </div>
            </div>

            <Button onClick={handleGenerateImage} disabled={isLoading || !promptText.trim()} className="w-full">
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                  {isGenerating ? 'Generando...' : 'Generar Imagen'}
              </Button>
          </CardContent>
        </Card>
      </div>
      
      <AlertDialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Previsualización de Imagen</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Te gusta esta imagen? Puedes guardarla en tu historial o descartarla y probar con otro prompt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {preview?.imageUrl && (
            <div className="relative aspect-square w-full mt-4 rounded-md overflow-hidden">
                <NextImage
                    src={preview.imageUrl}
                    alt="Imagen generada por IA"
                    fill
                    className="object-contain"
                />
            </div>
          )}
          <AlertDialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPreview(null)}>
                <XCircle className="mr-2 h-4 w-4" />
                Descartar
            </Button>
            <Button onClick={handleSaveImage}>
                <Save className="mr-2 h-4 w-4" />
                Guardar en Historial
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
