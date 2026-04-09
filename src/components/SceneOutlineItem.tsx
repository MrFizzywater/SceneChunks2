import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useDebouncedCallback } from '../hooks/useDebounce';

interface SceneOutlineItemProps {
  scene: any;
  index: number;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
}

export function SceneOutlineItem({ scene, index, onUpdate, onDelete }: SceneOutlineItemProps) {
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

  const handleDescChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
    debouncedUpdate(scene.id, { description: e.target.value });
  };

  return (
    <div className="flex gap-4 items-start p-3 hover:bg-muted/50 rounded-lg group">
      <div className="text-muted-foreground font-mono text-sm pt-2 w-6 text-right shrink-0">
        {index + 1}.
      </div>
      <div className="flex-1 space-y-1">
        <Input 
          value={title} 
          onChange={handleTitleChange}
          className="font-bold border-transparent px-2 h-8 focus-visible:ring-1 bg-transparent"
          placeholder="Scene Title"
        />
        <Input 
          value={description} 
          onChange={handleDescChange}
          placeholder="One line description..."
          className="text-sm text-muted-foreground border-transparent px-2 h-7 focus-visible:ring-1 bg-transparent"
        />
      </div>
      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive shrink-0" onClick={() => onDelete(scene.id)}>
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
