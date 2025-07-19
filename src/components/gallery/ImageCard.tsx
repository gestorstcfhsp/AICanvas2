'use client';

import React, { useState, useEffect, useContext } from 'react';
import NextImage from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Tag, Trash2, Expand } from 'lucide-react';
import { db, type AIImage } from '@/lib/db';
import { cn } from '@/lib/utils';
import { AppContext } from '@/context/AppContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TagEditor from './TagEditor';


export default function ImageCard({ image }: { image: AIImage }) {
  const [imageUrl, setImageUrl] = useState('');
  const { setInspectedImage } = useContext(AppContext);

  useEffect(() => {
    if (image.blob) {
      const url = URL.createObjectURL(image.blob);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image.blob]);

  const toggleFavorite = async () => {
    await db.images.update(image.id!, { isFavorite: image.isFavorite ? 0 : 1 });
  };

  const handleDelete = async () => {
    if(image.id) {
        await db.images.delete(image.id);
    }
  };

  if (!imageUrl) return null;

  return (
    <Card className="group relative aspect-square overflow-hidden rounded-lg shadow-md transition-all hover:shadow-xl">
      <NextImage src={imageUrl} alt={image.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw" className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint="abstract painting" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      
      <div className="absolute top-1 right-1 flex flex-col gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20 hover:text-white" onClick={toggleFavorite} aria-label="Favorito">
            <Heart className={cn("h-4 w-4", image.isFavorite && "fill-red-500 text-red-500")} />
          </Button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <p className="truncate text-sm font-semibold">{image.name}</p>
        <div className="mt-1 flex flex-wrap gap-1 h-5 overflow-hidden">
            {image.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-white/20 rounded-full px-1.5 py-0.5">{tag}</span>
            ))}
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex items-center gap-2">
            <Button size="icon" variant="secondary" onClick={() => setInspectedImage(image)} aria-label="Inspeccionar">
                <Expand className="h-5 w-5" />
            </Button>
            <TagEditor image={image}>
              <Button size="icon" variant="secondary" aria-label="Editar Etiquetas">
                  <Tag className="h-5 w-5" />
              </Button>
            </TagEditor>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="icon" variant="destructive" aria-label="Eliminar">
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la imagen de tu historial.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
    </Card>
  );
}
