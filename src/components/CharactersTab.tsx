import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, User } from 'lucide-react';
import { useDebouncedCallback } from '../hooks/useDebounce';

interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string;
  description: string;
  traits: string;
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
    const q = query(charsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Character[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Character);
      });
      setCharacters(fetched);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/characters`);
    });

    return unsubscribe;
  }, [projectId]);

  const handleAddCharacter = async () => {
    try {
      const newDocRef = doc(collection(db, 'projects', projectId, 'characters'));
      await setDoc(newDocRef, {
        id: newDocRef.id,
        projectId,
        name: 'New Character',
        role: '',
        description: '',
        traits: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/characters`);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Character>) => {
    try {
      const ref = doc(db, 'projects', projectId, 'characters', id);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/characters/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'characters', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/characters/${id}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading characters...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Characters</h2>
          <p className="text-slate-500">Design and manage the characters in your story.</p>
        </div>
        <button 
          onClick={handleAddCharacter} 
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 h-10 px-4 py-2"
        >
          <Plus size={16} />
          Add Character
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map(char => (
          <CharacterCard 
            key={char.id} 
            character={char} 
            onUpdate={handleUpdate} 
            onDelete={handleDelete} 
          />
        ))}
        {characters.length === 0 && (
          <div className="col-span-full text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-500">
            <User size={48} className="mx-auto mb-4 opacity-20" />
            <p>No characters yet.</p>
            <button 
              className="text-indigo-600 hover:underline mt-2 font-medium" 
              onClick={handleAddCharacter}
            >
              Create your first character
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterCard({ character, onUpdate, onDelete }: { character: Character, onUpdate: any, onDelete: any }) {
  const [name, setName] = useState(character.name);
  const [role, setRole] = useState(character.role);
  const [description, setDescription] = useState(character.description);
  const [traits, setTraits] = useState(character.traits);

  useEffect(() => { setName(character.name); }, [character.name]);
  useEffect(() => { setRole(character.role); }, [character.role]);
  useEffect(() => { setDescription(character.description); }, [character.description]);
  useEffect(() => { setTraits(character.traits); }, [character.traits]);

  const debouncedUpdate = useDebouncedCallback((id, updates) => {
    onUpdate(id, updates);
  }, 500);

  return (
    <div className="flex flex-col group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-8 w-8 text-red-500 bg-white/80 dark:bg-slate-900/80 hover:bg-red-500 hover:text-white backdrop-blur-sm" 
          onClick={() => onDelete(character.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="flex flex-col p-4 pb-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
        <input 
          value={name} 
          onChange={(e) => { setName(e.target.value); debouncedUpdate(character.id, { name: e.target.value }); }}
          className="font-bold text-lg border-transparent px-1 h-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent rounded"
          placeholder="Character Name"
        />
        <input 
          value={role} 
          onChange={(e) => { setRole(e.target.value); debouncedUpdate(character.id, { role: e.target.value }); }}
          className="text-sm text-slate-500 border-transparent px-1 h-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent rounded mt-1"
          placeholder="Role (e.g., Protagonist, Antagonist)"
        />
      </div>

      <div className="p-4 pt-4 space-y-4 flex-1">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 px-1">Description & Backstory</label>
          <textarea 
            value={description}
            onChange={(e) => { setDescription(e.target.value); debouncedUpdate(character.id, { description: e.target.value }); }}
            placeholder="Who are they? Where do they come from?"
            className="flex min-h-[100px] w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 px-1">Personality & Traits</label>
          <textarea 
            value={traits}
            onChange={(e) => { setTraits(e.target.value); debouncedUpdate(character.id, { traits: e.target.value }); }}
            placeholder="Strengths, weaknesses, quirks..."
            className="flex min-h-[80px] w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
