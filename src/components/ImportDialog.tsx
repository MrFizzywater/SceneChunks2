import { useState, useRef } from 'react';
import { Upload, Loader2, FileText, ClipboardPaste } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export function ImportDialog({ open, onOpenChange, projectId, onSuccess }: ImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [importMode, setImportMode] = useState<'upload' | 'paste'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleImport = async () => {
    let textToImport = '';
    
    if (importMode === 'upload') {
      if (!selectedFile) {
        setError("Please select a file to import.");
        return;
      }
      textToImport = await selectedFile.text();
    } else {
      if (!pastedText.trim()) {
        setError("Please paste some script text to import.");
        return;
      }
      textToImport = pastedText;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/import-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptContent: textToImport }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse script');
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

      // Save scenes
      if (data.scenes && Array.isArray(data.scenes)) {
        let order = 0;
        for (const scene of data.scenes) {
          const newDocRef = doc(collection(db, 'projects', projectId, 'scenes'));
          
          // Ensure script blocks have IDs
          const blocksWithIds = (scene.scriptBlocks || []).map((b: any) => ({
            id: crypto.randomUUID(),
            type: b.type,
            text: b.text
          }));

          await setDoc(newDocRef, {
            id: newDocRef.id,
            projectId,
            title: scene.title || 'Untitled Scene',
            description: scene.description || '',
            content: '',
            scriptBlocks: blocksWithIds,
            order: order++,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      onSuccess();
      onOpenChange(false);
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
            <Upload className="text-indigo-500" size={20} />
            Import Script
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Upload a .txt file or paste your script. Our AI will parse it into scenes, characters, and script blocks automatically.
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30">
              <Loader2 size={40} className="mb-4 animate-spin text-indigo-500" />
              <p className="font-medium">Parsing Script...</p>
              <p className="text-xs text-slate-500 mt-2 text-center px-4">
                This may take a minute or two depending on length. The AI is breaking down your scenes and characters.
              </p>
            </div>
          ) : (
            <div className="w-full">
              <div className="grid w-full grid-cols-2 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setImportMode('upload')}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${importMode === 'upload' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  <FileText size={14} /> Upload File
                </button>
                <button 
                  onClick={() => setImportMode('paste')}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${importMode === 'paste' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  <ClipboardPaste size={14} /> Paste Text
                </button>
              </div>
              
              {importMode === 'upload' && (
                <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                  <input 
                    type="file" 
                    accept=".txt" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <div 
                    className="text-center cursor-pointer p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText size={40} className="mx-auto mb-4 text-slate-400" />
                    {selectedFile ? (
                      <p className="font-medium text-indigo-600 dark:text-indigo-400 break-all px-4">{selectedFile.name}</p>
                    ) : (
                      <>
                        <p className="font-medium">Click to select a .txt file</p>
                        <p className="text-xs text-slate-500 mt-1">Standard screenplay format works best</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {importMode === 'paste' && (
                <textarea 
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your script text here..."
                  className="flex min-h-[200px] w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none"
                />
              )}
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
            Cancel
          </button>
          <button 
            onClick={handleImport} 
            disabled={loading || (importMode === 'upload' ? !selectedFile : !pastedText.trim())}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 h-10 px-4 py-2"
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
