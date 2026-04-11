import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/card';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Button } from '@/components/button';
import { GripVertical, Trash2 } from 'lucide-react';
import { useDebouncedCallback } from '../hooks/useDebounce';

interface SceneCardProps {
  scene: any;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
}

export function SceneCard({ scene, onUpdate, onDelete }: SceneCardProps) {
  const [title, setTitle] = useState(scene.title);
  const [description, setDescription] = useState(scene.description);

  useEffect(() => {
    setTitle(scene.title);
  }, [scene.title]);

  useEffect(() => {
    setDescription(scene.description);
  }, [scene.description]);

  const debouncedUpdate = useDebouncedCallback((id, updates) => {
    onUpdate(id, updates);
  }, 500);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    debouncedUpdate(scene.id, { title: e.target.value });
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    debouncedUpdate(scene.id, { description: e.target.value });
  };

  return (
    <Card className="flex flex-col h-64 group relative">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive bg-background/80 hover:bg-destructive hover:text-destructive-foreground" onClick={() => onDelete(scene.id)}>
          <Trash2 size={12} />
        </Button>
      </div>
      <CardHeader className="p-4 pb-2 shrink-0 flex flex-row items-start gap-2">
        <div className="mt-1 cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical size={14} />
        </div>
        <div className="flex-1">
          <Input 
            value={title} 
            onChange={handleTitleChange}
            className="font-bold border-transparent px-1 h-7 text-base focus-visible:ring-1 bg-transparent"
            placeholder="Scene Title"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col">
        <Textarea 
          value={description}
          onChange={handleDescChange}
          placeholder="Scene description / action..."
          className="flex-1 resize-none border-transparent focus-visible:ring-1 bg-transparent p-1 text-sm"
        />
      </CardContent>
    </Card>
  );
}
