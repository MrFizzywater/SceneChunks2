import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { ArrowLeft, Plus, Settings, Download, Sparkles, Upload, PanelRightClose, PanelRightOpen, Maximize2, Minimize2, Wand2 } from 'lucide-react';
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
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/scenes`);
    });

    return unsubscribe;
  }, [user, projectId, navigate]);

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
    return <div className="flex h-screen items-center justify-center">Loading project...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className={`min-h-screen bg-background flex flex-col transition-all duration-500 ${writerMode ? 'bg-[#F9F7F1] dark:bg-[#1A1A1A]' : ''}`}>
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
            onSuccess={() => {
              // Optional: show a toast notification here
            }} 
          />
          <ExtractElementsDialog
            open={showExtract}
            onOpenChange={setShowExtract}
            projectId={projectId}
            scriptContent={getFullScriptContent()}
          />
        </>
      )}
      
      {!writerMode && (
        <header className="border-b bg-card/80 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="hover:bg-muted">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none font-serif">{project.title}</h1>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{scenes.length} scenes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SessionGoalTracker scriptContent={getFullScriptContent()} />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowImport(true)}>
              <Upload size={14} />
              Import
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download size={14} />
              Export
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              onClick={() => setShowExtract(true)}
            >
              <Wand2 size={14} />
              Extract Elements
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              onClick={() => setShowAnalysis(true)}
            >
              <Sparkles size={14} />
              AI Analysis
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
              onClick={() => {
                setActiveTab('script');
                setWriterMode(true);
              }}
            >
              <Maximize2 size={14} />
              Writer's Mode
            </Button>
          </div>
        </header>
      )}

      {writerMode && (
        <div className="fixed top-4 right-4 z-50">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 shadow-md bg-background/80 backdrop-blur-sm border-muted/50 hover:bg-background"
            onClick={() => setWriterMode(false)}
          >
            <Minimize2 size={14} />
            Exit Writer's Mode
          </Button>
        </div>
      )}

      <main className={`flex-1 flex flex-col overflow-hidden ${writerMode ? 'p-0 h-screen' : 'p-6 h-[calc(100vh-65px)]'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
          {!writerMode && (
            <TabsList className="grid w-full max-w-3xl grid-cols-5 mb-6 shrink-0 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="script" className="rounded-md data-[state=active]:shadow-sm">Script</TabsTrigger>
              <TabsTrigger value="cards" className="rounded-md data-[state=active]:shadow-sm">Cards</TabsTrigger>
              <TabsTrigger value="outline" className="rounded-md data-[state=active]:shadow-sm">Outline</TabsTrigger>
              <TabsTrigger value="characters" className="rounded-md data-[state=active]:shadow-sm">Characters</TabsTrigger>
              <TabsTrigger value="production" className="rounded-md data-[state=active]:shadow-sm">Production</TabsTrigger>
            </TabsList>
          )}
          
          <div className={`flex-1 overflow-y-auto pb-10 ${writerMode ? 'px-4 pt-16' : 'pr-2'}`}>
            <TabsContent value="cards" className="h-full m-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {scenes.map((scene) => (
                  <SceneCard 
                    key={scene.id} 
                    scene={scene} 
                    onUpdate={handleUpdateScene} 
                    onDelete={handleDeleteScene} 
                  />
                ))}
                
                <Button 
                  variant="outline" 
                  className="h-64 border-dashed flex flex-col gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 bg-muted/10"
                  onClick={handleAddScene}
                >
                  <Plus size={24} />
                  <span>Add Scene Card</span>
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="outline" className="h-full m-0">
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
                <Button variant="ghost" className="w-full justify-start text-muted-foreground mt-4 hover:bg-muted/50" onClick={handleAddScene}>
                  <Plus size={16} className="mr-2" />
                  Add Scene
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="characters" className="h-full m-0">
              {projectId && <CharactersTab projectId={projectId} />}
            </TabsContent>

            <TabsContent value="production" className="h-full m-0">
              {projectId && <ProductionTab projectId={projectId} />}
            </TabsContent>
            
            <TabsContent value="script" className="h-full m-0 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className={`mx-auto transition-all duration-500 ${writerMode ? 'max-w-4xl' : 'max-w-6xl'}`}>
                  {scenes.map((scene) => (
                    <div key={scene.id} className={`flex gap-6 relative group mb-12 ${writerMode ? 'justify-center' : ''}`}>
                      <div className="flex-1">
                        <ScriptEditor 
                          sceneTitle={scene.title}
                          blocks={scene.scriptBlocks || []}
                          onChange={(blocks) => handleUpdateScene(scene.id, { scriptBlocks: blocks })}
                        />
                      </div>
                      
                      {/* Attached Scene Card - Hidden in Writer's Mode */}
                      {!writerMode && visibleSceneCards.has(scene.id) ? (
                        <div className="w-72 shrink-0 sticky top-4 self-start">
                          <div className="relative">
                            <SceneCard 
                              scene={scene} 
                              onUpdate={handleUpdateScene} 
                              onDelete={handleDeleteScene} 
                            />
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-md z-20 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              onClick={() => toggleSceneCard(scene.id)}
                            >
                              <PanelRightClose size={14} />
                            </Button>
                          </div>
                        </div>
                      ) : !writerMode ? (
                        <div className="absolute -right-12 top-12 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-full shadow-sm bg-background hover:bg-muted"
                            onClick={() => toggleSceneCard(scene.id)}
                            title="Show Scene Card"
                          >
                            <PanelRightOpen size={14} className="text-muted-foreground" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <Button variant="ghost" className="w-full text-muted-foreground mt-8 hover:bg-muted/50" onClick={handleAddScene}>
                    <Plus size={16} className="mr-2" />
                    Add Scene
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
