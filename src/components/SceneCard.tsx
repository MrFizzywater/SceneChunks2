import { useState, useEffect, useRef } from 'react';
import { GripVertical, Trash2, Image as ImageIcon } from 'lucide-react';
import { useDebouncedCallback } from '../hooks/useDebounce';

interface SceneCardProps {
  scene: any;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
}

export function SceneCard({ scene, onUpdate, onDelete }: SceneCardProps) {
  const [title, setTitle] = useState(scene.title);
  const [description, setDescription] = useState(scene.description);
  const [imageUrl, setImageUrl] = useState(scene.imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitle(scene.title); }, [scene.title]);
  useEffect(() => { setDescription(scene.description); }, [scene.description]);
  useEffect(() => { setImageUrl(scene.imageUrl || ''); }, [scene.imageUrl]);

  const debouncedUpdate = useDebouncedCallback((id, updates) => {
    onUpdate(id, updates);
  }, 500);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 500;
        let { width, height } = img;

        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress and convert to Base64
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImageUrl(compressedDataUrl);
        debouncedUpdate(scene.id, { imageUrl: compressedDataUrl });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-[22rem] group relative overflow-hidden rounded-xl border border-purple-900/30 bg-[#130f1a] shadow-lg shadow-black/20 hover:border-emerald-500/50 transition-colors">
      
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
        <button 
          className="inline-flex items-center justify-center rounded-md h-7 w-7 text-emerald-400 bg-[#0a080d]/80 hover:bg-emerald-500 hover:text-[#0a080d] backdrop-blur-sm transition-colors" 
          onClick={() => fileInputRef.current?.click()}
          title="Upload Storyboard Image"
        >
          <ImageIcon size={14} />
        </button>
        <button 
          className="inline-flex items-center justify-center rounded-md h-7 w-7 text-red-400 bg-[#0a080d]/80 hover:bg-red-500 hover:text-white backdrop-blur-sm transition-colors" 
          onClick={() => onDelete(scene.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {(imageUrl || !imageUrl) && (
        <div className="w-full h-32 shrink-0 bg-[#0a080d] relative border-b border-purple-900/30 group/img">
          {imageUrl ? (
            <img src={imageUrl} alt="Storyboard" className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-purple-500/10 transition-colors group-hover/img:text-purple-500/30 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon size={32} />
            </div>
          )}
        </div>
      )}

      <div className="p-4 pb-2 shrink-0 flex flex-row items-start gap-2 bg-[#1a1523]">
        <div className="mt-1.5 cursor-grab text-purple-600 hover:text-emerald-400 transition-colors">
          <GripVertical size={14} />
        </div>
        <div className="flex-1">
          <input 
            value={title} 
            onChange={(e) => { setTitle(e.target.value); debouncedUpdate(scene.id, { title: e.target.value }); }}
            className="font-bold border-transparent px-1 h-7 text-base focus:outline-none text-slate-200 bg-transparent w-full placeholder:text-purple-700"
            placeholder="Scene Title"
          />
        </div>
      </div>
      <div className="p-4 pt-3 flex-1 flex flex-col">
        <textarea 
          value={description}
          onChange={(e) => { setDescription(e.target.value); debouncedUpdate(scene.id, { description: e.target.value }); }}
          placeholder="Scene action or beats..."
          className="flex-1 resize-none border-transparent focus:outline-none text-purple-200/70 bg-transparent p-1 text-sm w-full placeholder:text-purple-800/60"
        />
      </div>
    </div>
  );
}
