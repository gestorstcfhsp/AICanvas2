'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Server, Construction } from 'lucide-react';

export default function LocalControlPanel() {
  return (
    <div className="flex h-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Server />
            Controles de Generación Local
          </CardTitle>
          <CardDescription>
            Utiliza tus propios modelos de IA para generar imágenes directamente en tu máquina.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-12 text-center text-muted-foreground">
            <Construction className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold">En Construcción</h3>
            <p className="mt-2 max-w-sm">
              Esta funcionalidad para generar imágenes con modelos locales se está desarrollando activamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
