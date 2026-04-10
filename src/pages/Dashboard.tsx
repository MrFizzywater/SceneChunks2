import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, FileText } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  updatedAt: string;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs: Project[] = [];
      snapshot.forEach((doc) => {
        projs.push({ id: doc.id, ...doc.data() } as Project);
      });
      setProjects(projs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return unsubscribe;
  }, [user]);

  const handleCreateProject = async () => {
    if (!user || !newProjectTitle.trim()) return;

    try {
      const newDocRef = doc(collection(db, 'projects'));
      await setDoc(newDocRef, {
        id: newDocRef.id,
        title: newProjectTitle,
        description: newProjectDesc,
        ownerId: user.uid,
        collaborators: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      setIsDialogOpen(false);
      setNewProjectTitle('');
      setNewProjectDesc('');
      navigate(`/project/${newDocRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-md">
            <FileText size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Scene Chunks</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</span>
          <button 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" 
            onClick={logout} 
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Your Projects</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your screenplays and outlines.</p>
          </div>
          
          <button 
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100/50 dark:bg-slate-900/50">
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Create your first project to get started.</p>
            <button 
              onClick={() => setIsDialogOpen(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-blue-500/50 transition-colors group"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="flex flex-col space-y-1.5 p-6">
                  <h3 className="font-semibold leading-none tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 h-10 mt-2">
                    {project.description || "No description provided."}
                  </p>
                </div>
                <div className="p-6 pt-0">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Manual Dialog/Modal overlay using standard Tailwind */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg max-w-lg w-full overflow-hidden">
            <div className="flex flex-col space-y-1.5 p-6 text-left">
              <h2 className="text-lg font-semibold leading-none tracking-tight">Create New Project</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Start a new screenplay or outline.
              </p>
            </div>
            
            <div className="p-6 pt-0 grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="title" className="text-sm font-medium leading-none">Title</label>
                <input 
                  id="title" 
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={newProjectTitle} 
                  onChange={(e) => setNewProjectTitle(e.target.value)} 
                  placeholder="e.g., The Great American Screenplay" 
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium leading-none">Logline / Description</label>
                <input 
                  id="description" 
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={newProjectDesc} 
                  onChange={(e) => setNewProjectDesc(e.target.value)} 
                  placeholder="Brief summary..." 
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end p-6 pt-0 gap-2">
              <button 
                onClick={() => setIsDialogOpen(false)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 h-10 px-4 py-2"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateProject} 
                disabled={!newProjectTitle.trim()}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}