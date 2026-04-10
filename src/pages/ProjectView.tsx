import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, Plus, Download, Sparkles, Upload, PanelRightClose, PanelRightOpen, Maximize2, Minimize2, Wand2, FileText, LayoutGrid, List, Users, Film } from 'lucide-react';
import { SceneCard } from '../components/SceneCard';
import { SceneOutlineItem } from '../components/SceneOutlineItem';
import { ScriptEditor, ScriptBlock } from '../components/ScriptEditor';
import { CharactersTab } from '../components/CharactersTab';
import { ProductionTab } from '../components/ProductionTab';
import { AIAnalysisDialog } from '../components/AIAnalysisDialog';
import { SessionGoalTracker } from '../components/SessionGoalTracker';
import { ImportDialog } from '../components/ImportDialog';
import { ExtractElementsDialog } from '../components/ExtractElementsDialog';

interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
}

interface Scene {
  id: string;
  projectId: string;
  title: string;
  description: string;
  content: string;
  scriptBlocks?: ScriptBlock[];
  order: number;
  status: string;
}

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('script');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [writerMode, setWriterMode] = useState(false);
  const [visibleSceneCards, setVisibleSceneCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !projectId) return;

    const fetchProject = async () => {
      try {
        const docRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() } as Project);
        } else {
          navigate('/');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
      }
    };

    fetchProject();

    const scenesRef = collection(db, 'projects', projectId, 'scenes');
    const q = query(scenesRef, orderBy('order'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedScenes: Scene[] = [];
      snapshot.forEach((doc) => {
        fetchedScenes.push({ id: doc.id, ...doc.data() } as Scene);
      });
      setScenes(fetchedScenes);
      loading && setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/scenes`);
    });

    return unsubscribe;
  }, [user, projectId, navigate, loading]);

  const handleAddScene = async () => {
    if (!projectId) return;
    
    try {
      const newOrder = scenes.length > 0 ? Math.max(...scenes.map(s => s.order)) + 1 : 0;
      
      const newDocRef = doc(collection(db, 'projects', projectId, 'scenes'));
      await setDoc(newDocRef, {
        id: newDocRef.id,
        projectId,
        title: 'New Scene',
        description: '',
        content: '',
        scriptBlocks: [],
        order: newOrder,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/scenes`);
    }
  };

  const handleUpdateScene = async (sceneId: string, updates: Partial<Scene>) => {
    if (!projectId) return;
    
    try {
      const sceneRef = doc(db, 'projects', projectId, 'scenes', sceneId);
      await updateDoc(sceneRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/scenes/${sceneId}`);
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!projectId) return;
    
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'scenes', sceneId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/scenes/${sceneId}`);
    }
  };

  const getFullScriptContent = () => {
    let content = '';
    scenes.forEach(scene => {
      content += `\n\n${scene.title.toUpperCase()}\n\n`;
      scene.scriptBlocks?.forEach(block => {
         if (block.type === 'character') content += `\n          ${block.text}\n`;
         else if (block.type === 'dialogue') content += `      ${block.text}\n`;
         else if (block.type === 'parenthetical') content += `        ${block.text}\n`;
         else if (block.type === 'scene_heading') content += `\n${block.text}\n`;
         else if (block.type === 'transition') content += `\n                                      ${block.text}\n`;
         else content += `\n${block.text}\n`;
      });
    });
    return content;
  };

  const handleExport = () => {
    if (!project) return;
    const content = getFullScriptContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_Script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSceneCard = (sceneId: string) => {
    const newSet = new Set(visibleSceneCards);
    if (newSet.has(sceneId)) {
      newSet.delete(sceneId);
    } else {
      newSet.add(sceneId);
    }
    setVisibleSceneCards(newSet);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#0a080d] text-purple-500">Loading project...</div>;
  }

  if (!project) {
    return <div className="flex h-screen items-center justify-center bg-[#0a080d] text-purple-500">Project not found</div>;
  }

  // Define our tabs with icons
  const tabNavigation = [
    { id: 'script', label: 'Script', icon: FileText },
    { id: 'cards', label: 'Cards', icon: LayoutGrid },
    { id: 'outline', label: 'Outline', icon: List },
    { id: 'characters', label: 'Characters', icon: Users },
    { id: 'production', label: 'Production', icon: Film },
  ];

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-500 ${writerMode ? 'bg-[#e5e5e5]' : 'bg-[#0a080d] text-slate-200'}`}>
      <AIAnalysisDialog 
        open={showAnalysis} 
        onOpenChange={setShowAnalysis} 
        scriptContent={getFullScriptContent()} 
      />
      {projectId && (
        <>
          <ImportDialog 
            open={showImport} 
            onOpenChange={setShowImport} 
            projectId={projectId} 
            onSuccess={() => {}} 
          />
          <ExtractElementsDialog
            open={showExtract}
            onOpenChange={setShowExtract}
            projectId={projectId}
            scriptContent={getFullScriptContent()}
            scenes={scenes}
          />
        </>
      )}
      
      {!writerMode && (
        <header className="border-b border-purple-900/30 bg-[#130f1a]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-lg shadow-black/40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="inline-flex items-center justify-center rounded-md h-10 w-10 transition-colors hover:bg-purple-900/30 text-purple-500 hover:text-emerald-400 active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none font-serif text-slate-100">{project.title}</h1>
              <p className="text-xs text-purple-400 mt-1 font-medium">{scenes.length} scenes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="hidden sm:block">
              <SessionGoalTracker scriptContent={getFullScriptContent()} />
            </div>
            
            <button 
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all bg-gradient-to-b from-[#1e1826] to-[#130f1a] border border-purple-900/50 shadow-md shadow-black/40 hover:shadow-purple-900/20 hover:border-purple-700 hover:text-emerald-400 text-purple-300 h-9 px-3 active:translate-y-[1px] shrink-0"
              onClick={() => setShowImport(true)}
            >
              <Upload size={14} /> <span className="hidden md:inline">Import</span>
            </button>
            
            <button 
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all bg-gradient-to-b from-[#1e1826] to-[#130f1a] border border-purple-900/50 shadow-md shadow-black/40 hover:shadow-purple-900/20 hover:border-purple-700 hover:text-emerald-400 text-purple-300 h-9 px-3 active:translate-y-[1px] shrink-0"
              onClick={handleExport}
            >
              <Download size={14} /> <span className="hidden md:inline">Export</span>
            </button>
            
            <button 
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all bg-gradient-to-b from-[#0f1f1a] to-[#0a1410] border border-emerald-900/50 shadow-md shadow-black/40 hover:shadow-emerald-900/20 hover:border-emerald-700 text-emerald-400 h-9 px-3 active:translate-y-[1px] shrink-0"
              onClick={() => setShowExtract(true)}
            >
              <Wand2 size={14} /> <span className="hidden lg:inline">Extract Elements</span>
            </button>
            
            <button 
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all bg-gradient-to-b from-[#0f1f1a] to-[#0a1410] border border-emerald-900/50 shadow-md shadow-black/40 hover:shadow-emerald-900/20 hover:border-emerald-700 text-emerald-400 h-9 px-3 active:translate-y-[1px] shrink-0"
              onClick={() => setShowAnalysis(true)}
            >
              <Sparkles size={14} /> <span className="hidden lg:inline">AI Analysis</span>
            </button>
            
            <button 
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-bold transition-all bg-gradient-to-b from-emerald-500 to-emerald-700 border border-emerald-400 hover:from-emerald-400 hover:to-emerald-600 text-[#0a080d] h-9 px-4 shadow-lg shadow-emerald-900/20 active:translate-y-[1px] shrink-0"
              onClick={() => {
                setActiveTab('script');
                setWriterMode(true);
              }}
            >
              <Maximize2 size={14} /> <span className="hidden sm:inline">Writer's Mode</span>
            </button>
          </div>
        </header>
      )}

      {writerMode && (
        <div className="fixed top-4 right-4 z-50">
          <button 
            className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors border border-slate-300 shadow-lg shadow-black/10 bg-white/90 backdrop-blur-sm hover:bg-slate-100 text-slate-700 hover:text-black h-9 px-4 active:scale-95"
            onClick={() => setWriterMode(false)}
          >
            <Minimize2 size={14} /> Exit Writer's Mode
          </button>
        </div>
      )}

      <main className={`flex-1 flex flex-col overflow-hidden ${writerMode ? 'p-0 h-screen' : 'p-4 sm:p-6 h-[calc(100vh-65px)]'}`}>
        <div className="flex-1 flex flex-col h-full max-w-7xl mx-auto w-full">
          
          {!writerMode && (
            <div className="grid w-full grid-cols-5 mb-6 shrink-0 bg-[#0a080d] border border-purple-900/40 p-1.5 rounded-xl shadow-inner">
              {tabNavigation.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 text-sm font-bold transition-all ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-[#0a080d] shadow-md shadow-emerald-900/20' 
                        : 'text-purple-400 hover:text-emerald-400 hover:bg-purple-900/20'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          
          <div className={`flex-1 overflow-y-auto pb-10 ${writerMode ? 'px-0 sm:px-4 pt-16' : 'pr-1 sm:pr-2'}`}>
            
            {activeTab === 'cards' && (
              <div className="h-full m-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {scenes.map((scene) => (
                    <SceneCard 
                      key={scene.id} 
                      scene={scene} 
                      onUpdate={handleUpdateScene} 
                      onDelete={handleDeleteScene} 
                    />
                  ))}
                  
                  <button 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all h-[22rem] border-2 border-dashed border-purple-900/50 flex flex-col gap-2 text-purple-500 hover:text-emerald-400 hover:border-emerald-500 hover:bg-[#130f1a]/80 bg-[#130f1a]/30 shadow-inner"
                    onClick={handleAddScene}
                  >
                    <Plus size={24} />
                    <span>Add Scene Card</span>
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'outline' && (
              <div className="h-full m-0">
                <div className="max-w-4xl mx-auto space-y-2">
                  {scenes.map((scene, index) => (
                    <SceneOutlineItem 
                      key={scene.id} 
                      scene={scene} 
                      index={index} 
                      onUpdate={handleUpdateScene} 
                      onDelete={handleDeleteScene} 
                    />
                  ))}
                  <button 
                    className="inline-flex items-center rounded-lg text-sm font-bold transition-all hover:bg-emerald-900/20 text-purple-400 hover:text-emerald-400 w-full justify-start mt-4 h-12 px-4 py-2 border border-dashed border-purple-900/30 hover:border-emerald-500/50" 
                    onClick={handleAddScene}
                  >
                    <Plus size={16} className="mr-2" />
                    Add Scene Beat
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'characters' && (
              <div className="h-full m-0">
                {projectId && <CharactersTab projectId={projectId} />}
              </div>
            )}

            {activeTab === 'production' && (
              <div className="h-full m-0">
                {projectId && <ProductionTab projectId={projectId} />}
              </div>
            )}
            
            {activeTab === 'script' && (
              <div className="h-full m-0 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className={`mx-auto transition-all duration-500 ${writerMode ? 'max-w-4xl' : 'max-w-6xl'}`}>
                    {scenes.map((scene) => (
                      <div key={scene.id} className={`flex gap-6 relative group mb-8 sm:mb-12 ${writerMode ? 'justify-center' : ''}`}>
                        <div className="flex-1">
                          <ScriptEditor 
                            sceneTitle={scene.title}
                            blocks={scene.scriptBlocks || []}
                            onChange={(blocks) => handleUpdateScene(scene.id, { scriptBlocks: blocks })}
                            writerMode={writerMode}
                          />
                        </div>
                        
                        {/* Attached Scene Card - Hidden in Writer's Mode */}
                        {!writerMode && visibleSceneCards.has(scene.id) ? (
                          <div className="w-72 shrink-0 sticky top-4 self-start hidden lg:block">
                            <div className="relative">
                              <SceneCard 
                                scene={scene} 
                                onUpdate={handleUpdateScene} 
                                onDelete={handleDeleteScene} 
                              />
                              <button 
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-[#0a080d]/80 backdrop-blur-sm text-emerald-400 hover:bg-emerald-500 hover:text-[#0a080d] absolute -top-3 -right-3 h-8 w-8 shadow-lg shadow-black/50 z-20 border border-purple-900/50"
                                onClick={() => toggleSceneCard(scene.id)}
                              >
                                <PanelRightClose size={14} />
                              </button>
                            </div>
                          </div>
                        ) : !writerMode ? (
                          <div className="absolute -right-12 top-12 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
                            <button 
                              className="inline-flex items-center justify-center rounded-md transition-colors h-8 w-8 shadow-sm bg-[#130f1a] border border-purple-900/30 hover:bg-emerald-900/30 hover:border-emerald-500/50 text-purple-400 hover:text-emerald-400"
                              onClick={() => toggleSceneCard(scene.id)}
                              title="Show Scene Card"
                            >
                              <PanelRightOpen size={14} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <button 
                      className="inline-flex items-center rounded-lg text-sm font-bold transition-colors hover:bg-purple-900/20 text-purple-400 hover:text-emerald-400 w-full justify-center mt-4 mb-12 h-12 px-4 py-2 border border-dashed border-purple-900/50 hover:border-emerald-500" 
                      onClick={handleAddScene}
                    >
                      <Plus size={16} className="mr-2" />
                      Add New Scene
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
