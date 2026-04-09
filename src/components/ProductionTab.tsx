import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, FileText, Printer } from 'lucide-react';
import { useDebouncedCallback } from '../hooks/useDebounce';

interface ProductionElement {
  id: string;
  projectId: string;
  category: 'crew' | 'prop' | 'location' | 'music' | 'sfx' | 'vfx';
  name: string;
  description: string;
  sceneId: string;
}

interface ProductionTabProps {
  projectId: string;
}

export function ProductionTab({ projectId }: ProductionTabProps) {
  const [elements, setElements] = useState<ProductionElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('crew');

  useEffect(() => {
    if (!projectId) return;

    const ref = collection(db, 'projects', projectId, 'productionElements');
    const q = query(ref);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: ProductionElement[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as ProductionElement);
      });
      setElements(fetched);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/productionElements`);
    });

    return unsubscribe;
  }, [projectId]);

  const handleAddElement = async (category: string) => {
    try {
      const newDocRef = doc(collection(db, 'projects', projectId, 'productionElements'));
      await setDoc(newDocRef, {
        id: newDocRef.id,
        projectId,
        category,
        name: 'New Item',
        description: '',
        sceneId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/productionElements`);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<ProductionElement>) => {
    try {
      const ref = doc(db, 'projects', projectId, 'productionElements', id);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/productionElements/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'productionElements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/productionElements/${id}`);
    }
  };

  const handleGenerateBreakdown = () => {
    let report = `PRODUCTION BREAKDOWN REPORT\n===========================\n\n`;
    
    const categories = ['crew', 'location', 'prop', 'music', 'sfx', 'vfx'];
    const categoryNames: Record<string, string> = {
      crew: 'CREW', location: 'LOCATIONS', prop: 'PROPS', music: 'MUSIC', sfx: 'SOUND EFFECTS', vfx: 'VISUAL EFFECTS'
    };

    categories.forEach(cat => {
      const items = elements.filter(e => e.category === cat);
      if (items.length > 0) {
        report += `${categoryNames[cat]}\n---------------------------\n`;
        items.forEach(item => {
          report += `- ${item.name.toUpperCase()}\n`;
          if (item.description) report += `  Notes: ${item.description}\n`;
        });
        report += `\n`;
      }
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Production_Breakdown.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading production elements...</div>;

  const categories = [
    { id: 'crew', label: 'Crew' },
    { id: 'location', label: 'Locations' },
    { id: 'prop', label: 'Props' },
    { id: 'music', label: 'Music' },
    { id: 'sfx', label: 'Sound F/X' },
    { id: 'vfx', label: 'Visual F/X' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Production</h2>
          <p className="text-muted-foreground">Manage elements for your script breakdown.</p>
        </div>
        <Button onClick={handleGenerateBreakdown} className="gap-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900">
          <Printer size={16} />
          Generate Breakdown Report
        </Button>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-4 shrink-0 h-auto">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="py-2">{cat.label}</TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="flex-1 overflow-y-auto m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
              {elements.filter(e => e.category === cat.id).map(el => (
                <ElementCard 
                  key={el.id} 
                  element={el} 
                  onUpdate={handleUpdate} 
                  onDelete={handleDelete} 
                />
              ))}
              
              <Button 
                variant="outline" 
                className="h-48 border-dashed flex flex-col gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50"
                onClick={() => handleAddElement(cat.id)}
              >
                <Plus size={24} />
                <span>Add {cat.label}</span>
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ElementCard({ element, onUpdate, onDelete }: { element: ProductionElement, onUpdate: any, onDelete: any }) {
  const [name, setName] = useState(element.name);
  const [description, setDescription] = useState(element.description);

  useEffect(() => { setName(element.name); }, [element.name]);
  useEffect(() => { setDescription(element.description); }, [element.description]);

  const debouncedUpdate = useDebouncedCallback((id, updates) => {
    onUpdate(id, updates);
  }, 500);

  return (
    <Card className="flex flex-col group relative overflow-hidden h-48">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive bg-background/80 hover:bg-destructive hover:text-destructive-foreground" onClick={() => onDelete(element.id)}>
          <Trash2 size={14} />
        </Button>
      </div>
      <CardHeader className="pb-2 bg-muted/30 p-3">
        <Input 
          value={name} 
          onChange={(e) => { setName(e.target.value); debouncedUpdate(element.id, { name: e.target.value }); }}
          className="font-bold text-base border-transparent px-1 h-8 focus-visible:ring-1 bg-transparent"
          placeholder="Name / Title"
        />
      </CardHeader>
      <CardContent className="p-3 flex-1 flex flex-col">
        <Textarea 
          value={description}
          onChange={(e) => { setDescription(e.target.value); debouncedUpdate(element.id, { description: e.target.value }); }}
          placeholder="Notes, details, or specific scene requirements..."
          className="resize-none flex-1 text-sm border-transparent focus-visible:ring-1 bg-transparent p-1"
        />
      </CardContent>
    </Card>
  );
}
