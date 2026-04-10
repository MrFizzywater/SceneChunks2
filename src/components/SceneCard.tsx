import { useState, useEffect } from 'react';
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
    <div className="flex flex-col h-64 group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
        <button 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-6 w-6 text-red-500 bg-white/80 dark:bg-slate-900/80 hover:bg-red-500 hover:text-white backdrop-blur-sm" 
          onClick={() => onDelete(scene.id)}
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="p-4 pb-2 shrink-0 flex flex-row items-start gap-2 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
        <div className="mt-1.5 cursor-grab text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <GripVertical size={14} />
        </div>
        <div className="flex-1">
          <input 
            value={title} 
            onChange={handleTitleChange}
            className="font-bold border-transparent px-1 h-7 text-base focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent rounded w-full"
            placeholder="Scene Title"
          />
        </div>
      </div>
      <div className="p-4 pt-4 flex-1 flex flex-col">
        <textarea 
          value={description}
          onChange={handleDescChange}
          placeholder="Scene description / action..."
          className="flex-1 resize-none border-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent p-1 text-sm rounded w-full"
        />
      </div>
    </div>
  );
}
