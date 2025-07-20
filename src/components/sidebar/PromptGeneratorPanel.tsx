
'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generatePromptsFromDocument } from '@/ai/flows/prompts-from-doc';
import { Upload, FileText, Copy, Loader2, Check, Sparkles, ClipboardCopy, Trash2, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

interface PromptGeneratorPanelProps {
  generatedPrompts: string[];
  setGeneratedPrompts: (prompts: string[]) => void;
}

export default function PromptGeneratorPanel({ generatedPrompts, setGeneratedPrompts }: PromptGeneratorPanelProps) {
  const { toast } = useToast();
  const [documentContent, setDocumentContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isTxt = selectedFile.name.toLowerCase().endsWith('.txt');
      const isMd = selectedFile.name.toLowerCase().endsWith('.md');
      
      if (isTxt || isMd) {
        try {
          const text = await selectedFile.text();
          setDocumentContent(text);
          setGeneratedPrompts([]);
        } catch (error) {
           toast({
            title: 'Error al leer el archivo',
            description: 'No se pudo leer el contenido del archivo seleccionado.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Formato de archivo no soportado',
          description: 'Por favor, sube un archivo .txt o .md.',
          variant: 'destructive',
        });
      }
      // Reset file input to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!documentContent.trim()) {
        toast({
            title: 'No hay texto para procesar',
            description: 'Por favor, pega o sube un documento.',
            variant: 'destructive',
        });
        return;
    }
    
    setIsLoading(true);
    setGeneratedPrompts([]);

    try {
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
  };
  
  const handleClearPrompts = () => {
    setGeneratedPrompts([]);
    toast({
        title: 'Lista de Prompts Limpiada',
        description: 'Puedes generar una nueva lista cuando quieras.',
    });
  }

  const handleClearContent = () => {
    setDocumentContent('');
    setGeneratedPrompts([]);
  };

  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <FileText />
            Generador de Prompts desde Documento
          </CardTitle>
          <CardDescription>Extrae la esencia de un documento para crear prompts de imágenes con la ayuda de la IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="paste-area">Contenido del Documento</Label>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Archivo (.txt, .md)
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileChange} className="hidden" />
                </div>
               <div className="relative">
                    <Textarea
                        id="paste-area"
                        placeholder="Pega aquí el contenido de tu documento o súbelo usando el botón..."
                        value={documentContent}
                        onChange={(e) => setDocumentContent(e.target.value)}
                        rows={8}
                        disabled={isLoading}
                        className="pr-10"
                    />
                    {documentContent && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1.5 h-7 w-7 text-muted-foreground"
                            onClick={handleClearContent}
                            disabled={isLoading}
                        >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Limpiar contenido</span>
                        </Button>
                    )}
               </div>
            </div>

          <Button onClick={handleGenerate} disabled={!documentContent.trim() || isLoading} className="w-full !mt-6">
            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
            {isLoading ? 'Generando...' : 'Generar Prompts'}
          </Button>
          
          {generatedPrompts.length > 0 && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-headline text-lg">Prompts Sugeridos ({generatedPrompts.length})</h3>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyAllPrompts}>
                            <ClipboardCopy className="mr-2 h-4 w-4" />
                            Copiar Todos
                        </Button>
                         <Button variant="destructive" size="sm" onClick={handleClearPrompts}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Limpiar
                        </Button>
                    </div>
                </div>
                <ScrollArea className="h-60 w-full rounded-md border p-2">
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
