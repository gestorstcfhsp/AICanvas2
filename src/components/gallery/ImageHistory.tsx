'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Info } from 'lucide-react';
import ImageCard from './ImageCard';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Skeleton } from '../ui/skeleton';

export default function ImageHistory() {
  const [searchTerm, setSearchTerm] = useState('');

  const images = useLiveQuery(
    async () => {
      const lowerCaseSearch = searchTerm.toLowerCase();
      if (lowerCaseSearch.trim() === '') {
        return db.images.orderBy('createdAt').reverse().toArray();
      }
      
      // A simple search: checks if name contains search term or if any tag is an exact match.
      return db.images.filter(img => 
        img.name.toLowerCase().includes(lowerCaseSearch) || 
        img.tags.some(tag => tag.toLowerCase() === lowerCaseSearch)
      ).sortBy('createdAt').then(res => res.reverse());
    },
    [searchTerm],
  );

  return (
    <div className="flex h-full flex-col gap-6 p-4 md:p-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o etiqueta..."
          className="w-full max-w-md pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {!images ? (
         <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
        </div>
      ) : images.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
