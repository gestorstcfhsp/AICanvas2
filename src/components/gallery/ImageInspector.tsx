'use client';

import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type AIImage } from '@/lib/db';
import { formatBytes } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface ImageInspectorProps {
  image: AIImage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImageInspector({ image, open, onOpenChange }: ImageInspectorProps) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (image?.blob) {
      const url = URL.createObjectURL(image.blob);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  if (!image) return null;

  const isTranslating = !image.translation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col p-0 md:flex-row">
        <div className="flex h-1/2 w-full items-center justify-center overflow-hidden bg-muted md:h-full md:w-2/3">
          {imageUrl && (
            <a href={imageUrl} target="_blank" rel="noopener noreferrer" title="Abrir en una nueva pestaña">
                <NextImage
                src={imageUrl}
                alt={image.name}
                width={image.resolution.width}
                height={image.resolution.height}
                className="max-h-full max-w-full object-contain"
                />
            </a>
          )}
        </div>
        <ScrollArea className="h-1/2 w-full md:h-full md:w-1/3">
            <div className="p-6">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">{image.name}</DialogTitle>
                    <DialogDescription>
                        Creado el {new Date(image.createdAt).toLocaleString()}
                    </DialogDescription>
                </DialogHeader>
                <Separator className="my-4"/>
                <div className="space-y-6 text-sm">
                    <div>
                        <h4 className="font-headline text-base font-medium mb-2">Prompt</h4>
                        <p className="rounded-md bg-muted/50 p-3 text-muted-foreground">{image.prompt}</p>
                    </div>
                     <div>
                        <h4 className="font-headline text-base font-medium mb-2">Descripción</h4>
                        {isTranslating ? (
                            <div className="space-y-2 rounded-md bg-muted/50 p-3">
                                <p className="text-muted-foreground italic text-xs">Traduciendo descripción...</p>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        ) : (
                            <p className="rounded-md bg-muted/50 p-3 text-muted-foreground">{image.translation}</p>
                        )}
                    </div>
                    <div>
                        <h4 className="font-headline text-base font-medium mb-2">Metadatos</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <span className="text-muted-foreground">Modelo</span><span className="font-mono text-right">{image.model}</span>
                            <span className="text-muted-foreground">Resolución</span><span className="font-mono text-right">{image.resolution.width}x{image.resolution.height}</span>
                            <span className="text-muted-foreground">Tamaño</span><span className="font-mono text-right">{formatBytes(image.size)}</span>
                        </div>
                    </div>
                     <div>
                        <h4 className="font-headline text-base font-medium mb-2">Etiquetas</h4>
                        <div className="flex flex-wrap gap-2">
                            {image.tags.length > 0 ? image.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>) : <p className="text-muted-foreground">Sin etiquetas.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}