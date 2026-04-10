import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, Printer } from 'lucide-react';
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading production elements...</div>;

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
          <p className="text-slate-500">Manage elements for your script breakdown.</p>
        </div>
        <button 
          onClick={handleGenerateBreakdown} 
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 h-10 px-4 py-2"
        >
          <Printer size={16} />
          Generate Breakdown Report
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="grid w-full grid-cols-3 md:grid-cols-6 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg shrink-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all ${
                activeCategory === cat.id 
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
            {elements.filter(e => e.category === activeCategory).map(el => (
              <ElementCard 
                key={el.id} 
                element={el} 
                onUpdate={handleUpdate} 
                onDelete={handleDelete} 
              />
            ))}
            
            <button 
              className="inline-flex items-center justify-center rounded-md transition-colors h-48 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-indigo-500/50 bg-slate-50 dark:bg-slate-900/50"
              onClick={() => handleAddElement(activeCategory)}
            >
              <Plus size={24} />
              <span>Add {categories.find(c => c.id === activeCategory)?.label}</span>
            </button>
          </div>
        </div>
      </div>
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
    <div className="flex flex-col group relative overflow-hidden h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-8 w-8 text-red-500 bg-white/80 dark:bg-slate-900/80 hover:bg-red-500 hover:text-white backdrop-blur-sm" 
          onClick={() => onDelete(element.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="p-3 pb-2 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
        <input 
          value={name} 
          onChange={(e) => { setName(e.target.value); debouncedUpdate(element.id, { name: e.target.value }); }}
          className="font-bold text-base border-transparent px-1 h-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent rounded w-full"
          placeholder="Name / Title"
        />
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <textarea 
          value={description}
          onChange={(e) => { setDescription(e.target.value); debouncedUpdate(element.id, { description: e.target.value }); }}
          placeholder="Notes, details, or specific scene requirements..."
          className="resize-none flex-1 text-sm border-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent p-1 rounded w-full"
        />
      </div>
    </div>
  );
}
