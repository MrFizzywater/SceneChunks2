import { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, User, Image as ImageIcon } from 'lucide-react';
import { useDebouncedCallback } from '../hooks/useDebounce';

interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string;
  description: string;
  traits: string;
  imageUrl?: string;
}

interface CharactersTabProps {
  projectId: string;
}

export function CharactersTab({ projectId }: CharactersTabProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    const charsRef = collection(db, 'projects', projectId, 'characters');
    const unsubscribe = onSnapshot(query(charsRef), (snapshot) => {
      const fetched: Character[] = [];
      snapshot.forEach((doc) => fetched.push({ id: doc.id, ...doc.data() } as Character));
      setCharacters(fetched);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/characters`));
    return unsubscribe;
  }, [projectId]);

  const handleAddCharacter = async () => {
    try {
      const newDocRef = doc(collection(db, 'projects', projectId, 'characters'));
      await setDoc(newDocRef, {
        id: newDocRef.id, projectId, name: 'New Character', role: '',
        description: '', traits: '', imageUrl: '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/characters`);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Character>) => {
    try {
      await updateDoc(doc(db, 'projects', projectId, 'characters', id), { ...updates, updatedAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/characters/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDoc(doc(db, 'projects', projectId, 'characters', id)); } 
    catch (error) { handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/characters/${id}`); }
  };

  if (loading) return <div className="p-8 text-center text-purple-500">Loading characters...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Characters</h2>
          <p className="text-purple-400">Design and manage the characters in your story.</p>
        </div>
        <button 
          onClick={handleAddCharacter} 
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-bold transition-colors bg-emerald-600 text-[#0a080d] hover:bg-emerald-500 h-10 px-4 py-2 shadow-lg shadow-emerald-900/20"
        >
          <Plus size={16} /> Add Character
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map(char => (
          <CharacterCard key={char.id} character={char} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

function CharacterCard({ character, onUpdate, onDelete }: { character: Character, onUpdate: any, onDelete: any }) {
  const [name, setName] = useState(character.name);
  const [role, setRole] = useState(character.role);
  const [description, setDescription] = useState(character.description);
  const [traits, setTraits] = useState(character.traits);
  const [imageUrl, setImageUrl] = useState(character.imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setName(character.name); }, [character.name]);
  useEffect(() => { setRole(character.role); }, [character.role]);
  useEffect(() => { setDescription(character.description); }, [character.description]);
  useEffect(() => { setTraits(character.traits); }, [character.traits]);
  useEffect(() => { setImageUrl(character.imageUrl || ''); }, [character.imageUrl]);

  const debouncedUpdate = useDebouncedCallback((id, updates) => onUpdate(id, updates), 500);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 400;
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
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImageUrl(compressedDataUrl);
        debouncedUpdate(character.id, { imageUrl: compressedDataUrl });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col group relative overflow-hidden rounded-xl border border-purple-900/30 bg-[#130f1a] shadow-lg shadow-black/20">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
        <button 
          className="inline-flex items-center justify-center rounded-md h-7 w-7 text-emerald-400 bg-[#0a080d]/80 hover:bg-emerald-500 hover:text-[#0a080d] backdrop-blur-sm" 
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={14} />
        </button>
        <button 
          className="inline-flex items-center justify-center rounded-md h-7 w-7 text-red-400 bg-[#0a080d]/80 hover:bg-red-500 hover:text-white backdrop-blur-sm" 
          onClick={() => onDelete(character.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="flex flex-row items-center p-4 pb-3 bg-[#1a1523] border-b border-purple-900/30 gap-4">
        <div 
          className="w-16 h-16 shrink-0 rounded-full border-2 border-purple-800/50 overflow-hidden bg-[#0a080d] flex items-center justify-center relative cursor-pointer group/avatar"
          onClick={() => fileInputRef.current?.click()}
        >
           {imageUrl ? (
             <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover/avatar:opacity-50 transition-opacity" />
           ) : (
             <User size={24} className="text-purple-600 group-hover/avatar:text-emerald-400 transition-colors" />
           )}
        </div>

        <div className="flex-1 flex flex-col">
          <input 
            value={name} 
            onChange={(e) => { setName(e.target.value); debouncedUpdate(character.id, { name: e.target.value }); }}
            className="font-bold text-lg border-transparent px-1 h-8 focus:outline-none text-slate-100 bg-transparent placeholder:text-purple-700 w-full"
            placeholder="Character Name"
          />
          <input 
            value={role} 
            onChange={(e) => { setRole(e.target.value); debouncedUpdate(character.id, { role: e.target.value }); }}
            className="text-sm text-emerald-400/80 border-transparent px-1 h-7 focus:outline-none bg-transparent placeholder:text-purple-800 w-full"
            placeholder="Role / Archetype"
          />
        </div>
      </div>

      <div className="p-4 pt-4 space-y-4 flex-1">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-bold text-purple-500 px-1">Backstory</label>
          <textarea 
            value={description}
            onChange={(e) => { setDescription(e.target.value); debouncedUpdate(character.id, { description: e.target.value }); }}
            placeholder="Who are they?"
            className="flex min-h-[80px] w-full rounded-md border border-purple-900/20 bg-[#0a080d]/50 px-3 py-2 text-sm text-purple-100 focus:outline-none focus:border-emerald-500/50 resize-none placeholder:text-purple-800/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-bold text-purple-500 px-1">Traits</label>
          <textarea 
            value={traits}
            onChange={(e) => { setTraits(e.target.value); debouncedUpdate(character.id, { traits: e.target.value }); }}
            placeholder="Strengths, flaws..."
            className="flex min-h-[60px] w-full rounded-md border border-purple-900/20 bg-[#0a080d]/50 px-3 py-2 text-sm text-purple-100 focus:outline-none focus:border-emerald-500/50 resize-none placeholder:text-purple-800/50"
          />
        </div>
      </div>
    </div>
  );
}
