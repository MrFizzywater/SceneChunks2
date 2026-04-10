import { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

interface ExtractElementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  scriptContent: string;
}

export function ExtractElementsDialog({ open, onOpenChange, projectId, scriptContent }: ExtractElementsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExtract = async () => {
    if (!scriptContent.trim()) {
      setError("Your script is empty. Add some content first.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/extract-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract elements');
      }

      // Save characters
      if (data.characters && Array.isArray(data.characters)) {
        for (const char of data.characters) {
          const newDocRef = doc(collection(db, 'projects', projectId, 'characters'));
          await setDoc(newDocRef, {
            id: newDocRef.id,
            projectId,
            name: char.name || 'Unknown',
            role: char.role || '',
            description: char.description || '',
            traits: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Save production elements
      if (data.productionElements && Array.isArray(data.productionElements)) {
        for (const el of data.productionElements) {
          const newDocRef = doc(collection(db, 'projects', projectId, 'productionElements'));
          await setDoc(newDocRef, {
            id: newDocRef.id,
            projectId,
            category: el.category || 'prop',
            name: el.name || 'Unknown',
            description: el.description || '',
            sceneId: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-w-md w-full flex flex-col">
        
        <div className="flex flex-col space-y-1.5 p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
            <Wand2 className="text-indigo-500" size={20} />
            Auto-Extract Elements
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Our AI will read your current script and automatically populate your Characters and Production tabs.
          </p>
        </div>

        <div className="p-6 py-8 flex flex-col items-center justify-center min-h-[200px]">
          {loading ? (
            <div className="text-center flex flex-col items-center">
              <Loader2 size={40} className="mb-4 animate-spin text-indigo-500" />
              <p className="font-medium">Analyzing Script...</p>
              <p className="text-xs text-slate-500 mt-2">Extracting characters, props, locations, and more.</p>
            </div>
          ) : success ? (
            <div className="text-center text-green-600 dark:text-green-400">
              <Wand2 size={40} className="mx-auto mb-4" />
              <p className="font-medium">Extraction Complete!</p>
              <p className="text-xs mt-2">Check your Characters and Production tabs.</p>
            </div>
          ) : (
            <div className="text-center text-slate-500">
              <Wand2 size={48} className="mx-auto mb-4 opacity-20" />
              <p>Ready to scan your script.</p>
              <p className="text-sm mt-2">This will add new entries without deleting existing ones.</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-6 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 gap-2">
          <button 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 h-10 px-4 py-2"
            onClick={() => onOpenChange(false)} 
            disabled={loading}
          >
            Close
          </button>
          <button 
            onClick={handleExtract} 
            disabled={loading || success}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 h-10 px-4 py-2"
          >
            {loading ? 'Extracting...' : 'Start Extraction'}
          </button>
        </div>
      </div>
    </div>
  );
}
