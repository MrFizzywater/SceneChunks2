import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, FileText, ClipboardPaste, Key, AlertTriangle } from 'lucide-react';
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
  
  // Bring Your Own Key State
  const [apiKey, setApiKey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_custom_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem('gemini_custom_key', val);
  };

  // The "Fix It In Post" brute-force parser for when the AI is dead
  const fallbackManualParse = (text: string) => {
    // Split by standard scene headings (INT. / EXT. / I/E.)
    // Adding a newline to the start ensures we catch a heading on line 1
    const normalizedText = '\n' + text; 
    const rawScenes = normalizedText.split(/\n(?=INT\.|EXT\.|INT\/EXT|I\/E\.)/i);
    
    const parsedScenes = [];
    
    for (const rawScene of rawScenes) {
      if (!rawScene.trim()) continue;
      
      const lines = rawScene.trim().split('\n');
      const title = lines[0].trim() || 'Untitled Scene';
      const content = lines.slice(1).join('\n').trim();

      parsedScenes.push({
        title: title.length > 60 ? title.substring(0, 60) + '...' : title,
        description: 'Imported via manual fallback. Formatting required.',
        scriptBlocks: [
          { id: crypto.randomUUID(), type: 'scene_heading', text: title },
          // Dump the rest of the scene into an action block to be sorted out manually later
          { id: crypto.randomUUID(), type: 'action', text: content }
        ]
      });
    }

    return { scenes: parsedScenes, characters: [], productionElements: [] };
  };

  const handleImport = async (forceFallback = false) => {
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
      let data;

      if (forceFallback) {
        // Bypass AI completely and use our dirty regex parser
        data = fallbackManualParse(textToImport);
      } else {
        // Attempt AI Parsing
        const response = await fetch('/api/import-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            scriptContent: textToImport,
            customApiKey: apiKey // Send their BYOK to the server
          }),
        });

        data = await response.json();

        if (!response.ok) {
          // If we hit a 429 quota error or any API error, throw it so the catch block handles it
          throw new Error(data.error || 'Failed to parse script with AI');
        }
      }

      // Save characters (if AI provided them)
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
      console.error(err);
      let errorMsg = err.message || "An unknown error occurred.";
      if (errorMsg.includes('429') || errorMsg.includes('Quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = "The built-in AI quota is temporarily exhausted. Please enter your own Gemini API key above, or use the Basic Import fallback.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-w-md w-full flex flex-col max-h-[90vh]">
        
        <div className="flex flex-col space-y-1.5 p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
            <Upload className="text-indigo-500" size={20} />
            Import Script
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Upload a .txt file or paste your script. Our AI will parse it into scenes, characters, and script blocks.
          </p>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/30">
              <Loader2 size={40} className="mb-4 animate-spin text-indigo-500" />
              <p className="font-medium">Parsing Script...</p>
              <p className="text-xs text-slate-500 mt-2 text-center px-4">
                This may take a minute. If using the basic fallback, this will be incredibly fast (but a bit messy).
              </p>
            </div>
          ) : (
            <div className="w-full space-y-6">
              {/* BYOK Settings Area */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <label className="text-sm font-medium flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-300">
                  <Key size={14} className="text-slate-400" />
                  Your Gemini API Key (Optional)
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder="AI_zaSy..."
                  className="flex h-9 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-2">
                  If the built-in AI quota is exceeded, add your own free Gemini key here. It is saved locally in your browser.
                </p>
              </div>

              <div>
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
            </div>
          )}
        </div>

        {error && (
          <div className="mx-6 mb-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-3 rounded-md text-sm border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 gap-3">
          <button 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 h-10 px-4 py-2 w-full sm:w-auto order-3 sm:order-1"
            onClick={() => onOpenChange(false)} 
            disabled={loading}
          >
            Cancel
          </button>
          
          <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button 
              onClick={() => handleImport(true)} 
              disabled={loading || (importMode === 'upload' ? !selectedFile : !pastedText.trim())}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 disabled:opacity-50 h-10 px-4 py-2 w-full sm:w-auto"
              title="Bypass AI and use basic text splitting"
            >
              Basic Import
            </button>
            <button 
              onClick={() => handleImport(false)} 
              disabled={loading || (importMode === 'upload' ? !selectedFile : !pastedText.trim())}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 h-10 px-4 py-2 w-full sm:w-auto"
            >
              {loading ? 'Working...' : 'AI Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
