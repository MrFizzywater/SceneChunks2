import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading characters...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Characters</h2>
          <p className="text-muted-foreground">Design and manage the characters in your story.</p>
        </div>
        <Button onClick={handleAddCharacter} className="gap-2">
          <Plus size={16} />
          Add Character
        </Button>
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
          <div className="col-span-full text-center p-12 border border-dashed rounded-lg text-muted-foreground">
            <User size={48} className="mx-auto mb-4 opacity-20" />
            <p>No characters yet.</p>
            <Button variant="link" onClick={handleAddCharacter}>Create your first character</Button>
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
    <Card className="flex flex-col group relative overflow-hidden">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive bg-background/80 hover:bg-destructive hover:text-destructive-foreground" onClick={() => onDelete(character.id)}>
          <Trash2 size={14} />
        </Button>
      </div>
      <CardHeader className="pb-3 bg-muted/30">
        <Input 
          value={name} 
          onChange={(e) => { setName(e.target.value); debouncedUpdate(character.id, { name: e.target.value }); }}
          className="font-bold text-lg border-transparent px-1 h-8 focus-visible:ring-1 bg-transparent"
          placeholder="Character Name"
        />
        <Input 
          value={role} 
          onChange={(e) => { setRole(e.target.value); debouncedUpdate(character.id, { role: e.target.value }); }}
          className="text-sm text-muted-foreground border-transparent px-1 h-7 focus-visible:ring-1 bg-transparent"
          placeholder="Role (e.g., Protagonist, Antagonist)"
        />
      </CardHeader>
      <CardContent className="pt-4 space-y-4 flex-1">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground px-1">Description & Backstory</label>
          <Textarea 
            value={description}
            onChange={(e) => { setDescription(e.target.value); debouncedUpdate(character.id, { description: e.target.value }); }}
            placeholder="Who are they? Where do they come from?"
            className="resize-none min-h-[100px] text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground px-1">Personality & Traits</label>
          <Textarea 
            value={traits}
            onChange={(e) => { setTraits(e.target.value); debouncedUpdate(character.id, { traits: e.target.value }); }}
            placeholder="Strengths, weaknesses, quirks..."
            className="resize-none min-h-[80px] text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
