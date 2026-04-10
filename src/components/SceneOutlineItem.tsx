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
    <div className="flex gap-4 items-start p-3 bg-[#130f1a] hover:bg-[#1e1826] rounded-xl group transition-all border border-purple-900/20 hover:border-emerald-900/50 shadow-sm">
      <div className="text-purple-500 font-mono text-sm pt-2 w-6 text-right shrink-0 font-bold opacity-50">
        {index + 1}.
      </div>
      <div className="flex-1 space-y-1">
        <input 
          value={title} 
          onChange={handleTitleChange}
          className="font-bold border-transparent px-2 h-8 focus:outline-none text-slate-100 bg-transparent rounded w-full placeholder:text-purple-800"
          placeholder="Scene Title"
        />
        <input 
          value={description} 
          onChange={handleDescChange}
          placeholder="One line description..."
          className="text-sm text-emerald-100/60 border-transparent px-2 h-7 focus:outline-none bg-transparent rounded w-full placeholder:text-purple-900/60"
        />
      </div>
      <button 
        className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-md transition-colors h-8 w-8 text-red-500 hover:bg-red-500 hover:text-[#0a080d] shrink-0" 
        onClick={() => onDelete(scene.id)}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
