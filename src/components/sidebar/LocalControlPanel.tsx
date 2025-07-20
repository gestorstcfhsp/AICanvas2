
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Server, Image as ImageIcon } from 'lucide-react';

export default function LocalControlPanel() {
  const [apiEndpoint, setApiEndpoint] = useState('http://127.0.0.1:7860/sdapi/v1/txt2img');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [steps, setSteps] = useState([25]);
  const [cfgScale, setCfgScale] = useState([7]);

  const handleGenerate = () => {
    // Logic to call the local API will be added here in the future
    console.log({
      apiEndpoint,
      prompt,
      negativePrompt,
      steps: steps[0],
      cfgScale: cfgScale[0],
    });
  };

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Server />
            Controles de Generación Local
          </CardTitle>
          <CardDescription>
            Utiliza tus propios modelos de IA (ej. Stable Diffusion) para generar imágenes directamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="api-endpoint">Endpoint de la API Local</Label>
            <Input
              id="api-endpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="http://127.0.0.1:7860/sdapi/v1/txt2img"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="prompt-local">Prompt</Label>
                <Textarea
                id="prompt-local"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Un castillo en las nubes, arte digital detallado..."
                rows={5}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="negative-prompt-local">Prompt Negativo</Label>
                <Textarea
                id="negative-prompt-local"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Mala calidad, borroso, texto, marca de agua..."
                rows={5}
                />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Pasos de Muestreo: <span className="text-primary font-mono">{steps}</span></Label>
              <Slider
                min={1}
                max={100}
                step={1}
                value={steps}
                onValueChange={setSteps}
              />
            </div>
             <div className="space-y-3">
              <Label>Escala de CFG: <span className="text-primary font-mono">{cfgScale}</span></Label>
              <Slider
                min={1}
                max={20}
                step={0.5}
                value={cfgScale}
                onValueChange={setCfgScale}
              />
            </div>
          </div>
          
          <Button onClick={handleGenerate} className="w-full">
            <ImageIcon className="mr-2" />
            Generar Imagen
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
