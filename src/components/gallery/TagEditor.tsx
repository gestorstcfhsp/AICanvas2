'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { db, type AIImage } from '@/lib/db';

interface TagEditorProps {
  image: AIImage;
  children: React.ReactNode;
}

export default function TagEditor({ image, children }: TagEditorProps) {
  const [newTag, setNewTag] = useState('');

  const handleAddTag = async () => {
    if (newTag.trim() && !image.tags.includes(newTag.trim())) {
      await db.images.update(image.id!, { tags: [...image.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    await db.images.update(image.id!, {
      tags: image.tags.filter((tag) => tag !== tagToRemove),
    });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Edit Tags</h4>
            <p className="text-sm text-muted-foreground">Add or remove tags for this image.</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="new-tag"
              className="flex-1"
            />
            <Button onClick={handleAddTag}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {image.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="pl-2 pr-1">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))}
            {image.tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
