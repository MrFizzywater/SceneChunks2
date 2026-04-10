import { useState, useEffect } from 'react';
import { Wand2, Loader2, Key, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, query } from 'firebase/firestore';

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
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_custom_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem('gemini_custom_key', val);
  };

  const handleExtract = async () => {
    if (!scriptContent.trim()) {
      setError("Your script is empty. Add some content first.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. FETCH EXISTING DATA FIRST (To prevent clones)
      const charsRef = collection(db, 'projects', projectId, 'characters');
      const prodRef = collection(db, 'projects', projectId, 'productionElements');
      
      const [existingCharsSnap, existingProdSnap] = await Promise.all([
        getDocs(query(charsRef)),
        getDocs(query(prodRef))
      ]);

      const existingChars = existingCharsSnap.docs.map(d => d.data().name?.toLowerCase().trim());
      const existingProd = existingProdSnap.docs.map(d => d.data().name?.toLowerCase().trim());

      // 2. RUN AI EXTRACTION
      const response = await fetch('/api/extract-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptContent, customApiKey: apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract elements');
      }

      // 3. SMART MERGE (Only add if it doesn't exist)
      let addedCount = 0;

      if (data.characters && Array.isArray(data.characters)) {
        for (const char of data.characters) {
          const normalizedName = (char.name || '').toLowerCase().trim();
          if (!existingChars.includes(normalizedName) && normalizedName !== '') {
            const newDocRef = doc(collection(db, 'projects', projectId, 'characters'));
            await setDoc(newDocRef, {
              id: newDocRef.id,
              projectId,
              name: char.name || 'Unknown',
              role: char.role || '',
              description: char.description || '',
              traits: '',
              imageUrl: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            addedCount++;
          }
        }
      }

      if (data.productionElements && Array.isArray(data.productionElements)) {
        for (const el of data.productionElements) {
          const normalizedName = (el.name || '').toLowerCase().trim();
          if (!existingProd.includes(normalizedName) && normalizedName !== '') {
            const newDocRef = doc(collection(db, 'projects', projectId, 'productionElements'));
            await setDoc(newDocRef, {
              id: newDocRef.id,
              projectId,
              category: el.category || 'prop',
              name: el.name || 'Unknown',
              description: el.description || '',
              sceneId: '', // Ready to be linked later
              tags: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            addedCount++;
          }
        }
      }

      setSuccess(true);
      setError(addedCount === 0 ? "No new elements found. Everything is up to date!" : null);
      
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      let errorMsg = err.message || "An unknown error occurred.";
      if (errorMsg.includes('429') || errorMsg.includes('Quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = "The built-in AI quota is temporarily exhausted. Please enter your own Gemini API key above to continue.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#130f1a] border border-purple-900/50 rounded-xl shadow-2xl shadow-purple-900/20 max-w-md w-full flex flex-col text-slate-200">
        
        <div className="flex flex-col space-y-1.5 p-6 border-b border-purple-900/30 shrink-0">
          <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2 text-emerald-400">
            <Wand2 size={20} />
            Smart Extraction
          </h2>
          <p className="text-sm text-purple-200/60 mt-2">
            Our AI will scan your script and add any <strong>new</strong> characters and elements without duplicating or deleting your existing work.
          </p>
        </div>

        <div className="p-6 py-4 flex flex-col space-y-6">
          {!success && !loading && (
            <div className="bg-purple-950/20 p-4 rounded-lg border border-purple-900/30">
              <label className="text-sm font-medium flex items-center gap-2 mb-2 text-purple-200">
                <Key size={14} className="text-emerald-500" />
                Your Gemini API Key (Optional)
              </label>
              <input 
                type="text" 
                autoComplete="off"
                spellCheck="false"
                value={apiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="AI_zaSy..."
                className="flex h-9 w-full rounded-md border border-purple-800/50 bg-[#0a080d] px-3 py-1 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {loading ? (
            <div className="text-center flex flex-col items-center py-6">
              <Loader2 size={40} className="mb-4 animate-spin text-emerald-500" />
              <p className="font-medium text-emerald-400">Analyzing Script...</p>
              <p className="text-xs text-purple-300/50 mt-2">Extracting and merging elements...</p>
            </div>
          ) : success ? (
            <div className="text-center text-emerald-400 py-6">
              <Wand2 size={40} className="mx-auto mb-4" />
              <p className="font-medium">Extraction Complete!</p>
              <p className="text-xs text-emerald-400/60 mt-2">{error || 'Check your Characters and Production tabs.'}</p>
            </div>
          ) : (
            <div className="text-center text-purple-400/40 py-2">
              <Wand2 size={48} className="mx-auto mb-4 opacity-20" />
              <p>Ready to scan your script.</p>
            </div>
          )}
        </div>

        {error && !success && (
          <div className="mx-6 mb-4 bg-red-950/30 text-red-400 p-3 rounded-md text-sm border border-red-900/50">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end p-6 border-t border-purple-900/30 shrink-0 gap-2">
          <button 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-purple-800/50 bg-transparent hover:bg-purple-900/30 h-10 px-4 py-2"
            onClick={() => onOpenChange(false)} 
            disabled={loading}
          >
            Close
          </button>
          <button 
            onClick={handleExtract} 
            disabled={loading || success}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-emerald-600 hover:bg-emerald-500 text-[#0a080d] disabled:opacity-50 h-10 px-4 py-2 font-bold"
          >
            {loading ? 'Extracting...' : 'Start Extraction'}
          </button>
        </div>
      </div>
    </div>
  );
}
