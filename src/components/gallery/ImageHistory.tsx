'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Info, X } from 'lucide-react';
import ImageCard from './ImageCard';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Skeleton } from '../ui/skeleton';
import { Button } from '@/components/ui/button';

export default function ImageHistory() {
  const [searchTerm, setSearchTerm] = useState('');

  const images = useLiveQuery(
    async () => {
      const lowerCaseSearch = searchTerm.toLowerCase();
      if (lowerCaseSearch.trim() === '') {
        return db.images.orderBy('createdAt').reverse().toArray();
      }
      
      return db.images.filter(img => 
        img.name.toLowerCase().includes(lowerCaseSearch) || 
        img.tags.some(tag => tag.toLowerCase() === lowerCaseSearch)
      ).sortBy('createdAt').then(res => res.reverse());
    },
    [searchTerm],
  );
  
  const getTitle = () => {
    if (!images) {
        return 'Cargando Imágenes...';
    }
    const count = images.length;
    if (searchTerm.trim() && count > 0) {
        return `${count} Imágenes Encontradas`;
    }
    if (count === 1) {
        return '1 Imagen Guardada';
    }
    return `${count} Imágenes Guardadas`;
  };

  return (
    <div className="flex h-full flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="font-headline text-2xl font-semibold">{getTitle()}</h2>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o etiqueta..."
            className="w-full pl-10 pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Limpiar búsqueda</span>
            </Button>
          )}
        </div>
      </div>
      
      {!images ? (
         <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
        </div>
      ) : images.length > 0 ? (
        <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {images.map((image) => (
            <ImageCard key={image.id} image={image} />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg bg-muted/50 p-8 text-center text-muted-foreground">
            <Info className="mb-4 h-16 w-16" />
            <h3 className="text-xl font-semibold">No se encontraron imágenes</h3>
            <p className="mt-2 max-w-sm">
                {searchTerm ? `No hay imágenes que coincidan con tu búsqueda de "${searchTerm}".` : "Usa el panel de control para generar tu primera imagen con IA. Aparecerá aquí."}
            </p>
        </div>
      )}
    </div>
  );
}
