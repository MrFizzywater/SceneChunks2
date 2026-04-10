import { useState, useEffect } from 'react';
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
    <div className="flex gap-4 items-start p-3 hover:bg-[#130f1a] rounded-lg group transition-colors border border-transparent hover:border-purple-900/30">
      <div className="text-purple-500 font-mono text-sm pt-2 w-6 text-right shrink-0">
        {index + 1}.
      </div>
      <div className="flex-1 space-y-1">
        <input 
          value={title} 
          onChange={handleTitleChange}
          className="font-bold border-transparent px-2 h-8 focus:outline-none text-slate-200 bg-transparent rounded w-full placeholder:text-purple-700"
          placeholder="Scene Title"
        />
        <input 
          value={description} 
          onChange={handleDescChange}
          placeholder="One line description..."
          className="text-sm text-purple-300/70 border-transparent px-2 h-7 focus:outline-none bg-transparent rounded w-full placeholder:text-purple-800/60"
        />
      </div>
      <button 
        className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-md transition-colors h-8 w-8 text-red-400 hover:bg-red-500/20 hover:text-red-400 shrink-0" 
        onClick={() => onDelete(scene.id)}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
