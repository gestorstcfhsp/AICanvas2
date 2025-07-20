
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generatePromptsFromDocument } from '@/ai/flows/prompts-from-doc';
import { Upload, FileText, Copy, Loader2, Check, Sparkles, ClipboardCopy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PromptGeneratorPanelProps {
  generatedPrompts: string[];
  setGeneratedPrompts: (prompts: string[]) => void;
}

export default function PromptGeneratorPanel({ generatedPrompts, setGeneratedPrompts }: PromptGeneratorPanelProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isTxt = selectedFile.name.toLowerCase().endsWith('.txt');
      const isMd = selectedFile.name.toLowerCase().endsWith('.md');
      
      if (isTxt || isMd) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setGeneratedPrompts([]);
      } else {
        toast({
          title: 'Formato de archivo no soportado',
          description: 'Por favor, sube un archivo .txt o .md.',
          variant: 'destructive',
        });
        e.target.value = '';
      }
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      toast({
        title: 'No se ha seleccionado ningún archivo',
        description: 'Por favor, sube un documento para generar prompts.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedPrompts([]);

    try {
      const documentContent = await file.text();
      const result = await generatePromptsFromDocument({ documentContent });
      setGeneratedPrompts(result.prompts);
      toast({
        title: '¡Prompts Generados!',
        description: `Se han creado ${result.prompts.length} prompts a partir de tu documento.`,
      });
    } catch (error) {
      console.error('Failed to generate prompts:', error);
      toast({
        title: 'Error al Generar Prompts',
        description: 'No se pudieron generar los prompts desde el documento.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPrompt = (prompt: string, index: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPromptIndex(index);
    setTimeout(() => setCopiedPromptIndex(null), 2000);
    toast({
        title: 'Prompt Copiado',
        description: 'El prompt ha sido copiado a tu portapapeles.',
    });
  };
  
  const handleCopyAllPrompts = () => {
    const allPrompts = generatedPrompts.join('\n');
    navigator.clipboard.writeText(allPrompts);
    toast({
        title: '¡Todos los Prompts Copiados!',
        description: 'Ya puedes pegarlos en el panel de generación por lotes.',
    });
  }

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <FileText />
            Generador de Prompts desde Documento
          </CardTitle>
          <CardDescription>Sube un archivo .txt o .md para que la IA genere prompts para imágenes basados en su contenido.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Subir Documento</Label>
            <div className="flex items-center gap-2">
              <Input id="file-upload" type="file" accept=".txt,.md" onChange={handleFileChange} className="hidden" />
              <Label htmlFor="file-upload" className="flex-1">
                <Button asChild variant="outline" className="w-full cursor-pointer">
                  <div>
                    <Upload className="mr-2" />
                    <span>{fileName || 'Seleccionar archivo...'}</span>
                  </div>
                </Button>
              </Label>
              <Button onClick={handleGenerate} disabled={!file || isLoading}>
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                {isLoading ? 'Generando...' : 'Generar'}
              </Button>
            </div>
          </div>
          
          {generatedPrompts.length > 0 && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-headline text-lg">Prompts Sugeridos</h3>
                    <Button variant="outline" size="sm" onClick={handleCopyAllPrompts}>
                        <ClipboardCopy className="mr-2 h-4 w-4" />
                        Copiar Todos
                    </Button>
                </div>
                <ScrollArea className="h-72 w-full rounded-md border p-2">
                    <div className="space-y-2 p-2">
                    {generatedPrompts.map((prompt, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-3">
                        <p className="text-sm text-muted-foreground flex-1">{prompt}</p>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleCopyPrompt(prompt, index)}
                        >
                            {copiedPromptIndex === index ? <Check className="text-green-500" /> : <Copy />}
                            <span className="sr-only">Copiar prompt</span>
                        </Button>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            </div>
          )}

           { !isLoading && generatedPrompts.length === 0 && (
                 <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center text-muted-foreground">
                    <p className="mt-2 max-w-sm">
                        Los prompts generados por la IA aparecerán aquí.
                    </p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
