import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, Printer, Tag } from 'lucide-react';
import { useDebouncedCallback } from '../hooks/useDebounce';

interface ProductionElement {
  id: string;
  projectId: string;
  category: 'crew' | 'prop' | 'location' | 'music' | 'sfx' | 'vfx';
  name: string;
  description: string;
  sceneId: string;
  tags?: string;
}

interface Scene {
  id: string;
  title: string;
}

interface ProductionTabProps {
  projectId: string;
}

export function ProductionTab({ projectId }: ProductionTabProps) {
  const [elements, setElements] = useState<ProductionElement[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('prop');

  useEffect(() => {
    if (!projectId) return;
    const elSub = onSnapshot(query(collection(db, 'projects', projectId, 'productionElements')), (snapshot) => {
      setElements(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProductionElement)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'productionElements'));

    const sceneSub = onSnapshot(query(collection(db, 'projects', projectId, 'scenes')), (snapshot) => {
      setScenes(snapshot.docs.map(d => ({ id: d.id, title: d.data().title } as Scene)));
    });

    return () => { elSub(); sceneSub(); };
  }, [projectId]);

  const handleAddElement = async (category: string) => {
    const newDocRef = doc(collection(db, 'projects', projectId, 'productionElements'));
    await setDoc(newDocRef, {
      id: newDocRef.id, projectId, category, name: 'New Item', description: '', sceneId: '', tags: '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
  };

  const handleUpdate = async (id: string, updates: Partial<ProductionElement>) => {
    await updateDoc(doc(db, 'projects', projectId, 'productionElements', id), { ...updates, updatedAt: new Date().toISOString() });
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'projects', projectId, 'productionElements', id));
  };

  const handleGenerateBreakdown = () => {
    let report = `PRODUCTION BREAKDOWN REPORT\n===========================\n\n`;
    const categories = ['crew', 'location', 'prop', 'music', 'sfx', 'vfx'];
    const categoryNames: Record<string, string> = { crew: 'CREW', location: 'LOCATIONS', prop: 'PROPS', music: 'MUSIC', sfx: 'SOUND EFFECTS', vfx: 'VISUAL EFFECTS' };

    categories.forEach(cat => {
      const items = elements.filter(e => e.category === cat);
      if (items.length > 0) {
        report += `${categoryNames[cat]}\n---------------------------\n`;
        items.forEach(item => {
          report += `- ${item.name.toUpperCase()}\n`;
          if (item.description) report += `  Notes: ${item.description}\n`;
          if (item.tags) report += `  Tags: ${item.tags}\n`;
        });
        report += `\n`;
      }
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Production_Breakdown.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-center text-purple-500">Loading production elements...</div>;

  const categories = [
    { id: 'location', label: 'Locations' },
    { id: 'prop', label: 'Props' },
    { id: 'crew', label: 'Crew' },
    { id: 'music', label: 'Music' },
    { id: 'sfx', label: 'Sound F/X' },
    { id: 'vfx', label: 'Visual F/X' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Production</h2>
          <p className="text-purple-400">Tag elements and link them to specific scenes.</p>
        </div>
        <button 
          onClick={handleGenerateBreakdown}
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-purple-900/30 text-purple-200 border border-purple-800 hover:bg-purple-800/50 hover:text-emerald-400 h-10 px-4 py-2 transition-colors"
        >
          <Printer size={16} /> Generate Breakdown
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="grid w-full grid-cols-3 md:grid-cols-6 mb-6 bg-[#0a080d] border border-purple-900/30 p-1 rounded-lg shrink-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition-all ${
                activeCategory === cat.id ? 'bg-emerald-600 text-[#0a080d] shadow-sm' : 'text-purple-400 hover:text-emerald-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
            {elements.filter(e => e.category === activeCategory).map(el => (
              <ElementCard key={el.id} element={el} scenes={scenes} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
            
            <button 
              className="inline-flex items-center justify-center rounded-xl transition-colors h-56 border-2 border-dashed border-purple-900/50 flex flex-col gap-2 text-purple-500 hover:text-emerald-400 hover:border-emerald-500/50 bg-[#130f1a]/50"
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

function ElementCard({ element, scenes, onUpdate, onDelete }: { element: ProductionElement, scenes: Scene[], onUpdate: any, onDelete: any }) {
  const [name, setName] = useState(element.name);
  const [description, setDescription] = useState(element.description);
  const [sceneId, setSceneId] = useState(element.sceneId || '');
  const [tags, setTags] = useState(element.tags || '');

  useEffect(() => { setName(element.name); }, [element.name]);
  useEffect(() => { setDescription(element.description); }, [element.description]);
  useEffect(() => { setSceneId(element.sceneId || ''); }, [element.sceneId]);
  useEffect(() => { setTags(element.tags || ''); }, [element.tags]);

  const debouncedUpdate = useDebouncedCallback((id, updates) => onUpdate(id, updates), 500);

  return (
    <div className="flex flex-col group relative overflow-hidden h-56 rounded-xl border border-purple-900/30 bg-[#130f1a] shadow-lg">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button className="inline-flex items-center justify-center rounded-md h-7 w-7 text-red-400 bg-[#0a080d]/80 hover:bg-red-500 hover:text-white backdrop-blur-sm" onClick={() => onDelete(element.id)}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="p-3 pb-2 bg-[#1a1523] border-b border-purple-900/30">
        <input 
          value={name} onChange={(e) => { setName(e.target.value); debouncedUpdate(element.id, { name: e.target.value }); }}
          className="font-bold text-base border-transparent px-1 h-8 focus:outline-none text-emerald-400 bg-transparent rounded w-full placeholder:text-purple-700" placeholder="Element Name"
        />
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <select
          value={sceneId} onChange={(e) => { setSceneId(e.target.value); debouncedUpdate(element.id, { sceneId: e.target.value }); }}
          className="text-xs bg-[#0a080d] text-purple-300 border border-purple-900/50 rounded p-1.5 focus:outline-none focus:border-emerald-500/50 w-full"
        >
          <option value="">-- Link to Scene --</option>
          {scenes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <textarea 
          value={description} onChange={(e) => { setDescription(e.target.value); debouncedUpdate(element.id, { description: e.target.value }); }}
          placeholder="Notes, details..." className="resize-none flex-1 text-sm border border-purple-900/20 bg-[#0a080d]/50 text-slate-200 focus:outline-none focus:border-emerald-500/50 p-2 rounded w-full placeholder:text-purple-800/50"
        />
      </div>
      <div className="px-3 py-2 bg-[#0a080d] border-t border-purple-900/30 flex items-center gap-2">
        <Tag size={12} className="text-purple-500 shrink-0" />
        <input 
          value={tags} onChange={(e) => { setTags(e.target.value); debouncedUpdate(element.id, { tags: e.target.value }); }}
          placeholder="Tags (e.g. vintage, bloody, rented)" className="text-xs bg-transparent text-emerald-400/80 focus:outline-none w-full placeholder:text-purple-800"
        />
      </div>
    </div>
  );
}
