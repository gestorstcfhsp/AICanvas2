// src/components/sidebar/BatchResultItem.tsx
'use client';

import React from 'react';
import type { BatchResult } from './GeminiControlPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function BatchResultItem({ result }: { result: BatchResult }) {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-2 rounded-md bg-muted/50">
      <div className="flex items-start gap-3">
        <div className="mt-1">{getStatusIcon()}</div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-none truncate">{result.prompt}</p>
          {result.status === 'failed' && (
            <Alert variant="destructive" className="mt-2 p-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                    {result.error}
                </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
