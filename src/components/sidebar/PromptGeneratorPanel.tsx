
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generatePromptsFromDocument } from '@/ai/flows/prompts-from-doc';
import { Upload, FileText, Copy, Loader2, Check, Sparkles, ClipboardCopy, ClipboardPaste, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';

interface PromptGeneratorPanelProps {
  generatedPrompts: string[];
  setGeneratedPrompts: (prompts: string[]) => void;
}

export default function PromptGeneratorPanel({ generatedPrompts, setGeneratedPrompts }: PromptGeneratorPanelProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('file');
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isTxt = selectedFile.name.toLowerCase().endsWith('.txt');
      const isMd = selectedFile.name.toLowerCase().endsWith('.md');
      
      if (isTxt || isMd) {
        setFile(selectedFile);
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Clear the other input to avoid confusion
    if (tab === 'file') {
      setPastedText('');
    } else {
      setFile(null);
    }
    setGeneratedPrompts([]);
  };

  const handleGenerate = async () => {
    let documentContent = '';

    if (activeTab === 'paste') {
        documentContent = pastedText;
        if (!documentContent.trim()) {
            toast({
                title: 'No hay texto para procesar',
                description: 'Por favor, pega algún contenido en el área de texto.',
                variant: 'destructive',
            });
            return;
        }
    } else {
        if (!file) {
            toast({
                title: 'No se ha seleccionado ningún archivo',
                description: 'Por favor, sube un documento para generar prompts.',
                variant: 'destructive',
            });
            return;
        }
        documentContent = await file.text();
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

  const canGenerate = (activeTab === 'file' && !!file) || (activeTab === 'paste' && !!pastedText.trim());

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
          <Tabs defaultValue="file" onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" disabled={isLoading}><Upload className="mr-2"/>Subir Archivo</TabsTrigger>
              <TabsTrigger value="paste" disabled={isLoading}><ClipboardPaste className="mr-2"/>Pegar Texto</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="space-y-4 pt-4">
              <Label htmlFor="file-upload">Subir Documento (.txt, .md)</Label>
               <Input id="file-upload" type="file" accept=".txt,.md" onChange={handleFileChange} disabled={isLoading}/>
            </TabsContent>
            <TabsContent value="paste" className="space-y-4 pt-4">
               <Label htmlFor="paste-area">Contenido del Documento</Label>
               <Textarea
                    id="paste-area"
                    placeholder="Pega aquí el contenido de tu documento..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={8}
                    disabled={isLoading}
                />
            </TabsContent>
          </Tabs>

          <Button onClick={handleGenerate} disabled={!canGenerate || isLoading} className="w-full !mt-6">
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
