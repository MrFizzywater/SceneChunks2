import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, FileText, ClipboardPaste, Key, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

// --- LEGACY PARSER ENGINE ---
function isAllCaps(text: string) {
  if (!text) return false;
  const upper = text.toUpperCase();
  return text === upper && text.toLowerCase() !== upper;
}

function isLikelyScene(line: string) {
  const t = line.trim().toUpperCase();
  return ["INT.", "EXT.", "INT/EXT.", "I/E.", "EST.", "INT/EXT"].some(s => t.startsWith(s));
}

function isLikelyTransition(line: string) {
  const t = line.trim().toUpperCase();
  if (!isAllCaps(t)) return false;
  if (t.endsWith("TO:")) return true;
  const known = ["FADE IN", "FADE OUT", "BLACK OUT", "DISSOLVE", "SMASH CUT"];
  return known.some(k => t.includes(k));
}

function isLikelyCharacter(line: string) {
  const t = line.trim();
  if (!t || !isAllCaps(t) || t.length > 50 || isLikelyScene(t) || isLikelyTransition(t)) return false;
  return true;
}

function isLikelyParenthetical(line: string) {
  const t = line.trim();
  return t.startsWith("(") && t.endsWith(")");
}

export function ImportDialog({ open, onOpenChange, projectId, onSuccess }: ImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [importMode, setImportMode] = useState<'upload' | 'paste'>('upload');
  
  const [apiKey, setApiKey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_custom_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem('gemini_custom_key', val);
  };

  // Advanced Regex-Free Fallback Parser
  const fallbackManualParse = (text: string) => {
    const lines = text.split("\n");
    const scenes: any[] = [];
    let currentScene: any = null;
    let currentDialogue: any = null;
    let actionBuffer: string[] = [];
    const knownCharacters = new Set<string>();

    let scriptStarted = false;
    let learnedCharIndent: number | null = null;

    const getIndent = (lineStr: string) => {
      let count = 0;
      for (let i = 0; i < lineStr.length; i++) {
        const c = lineStr[i];
        if (c === " ") count++;
        else if (c === "\t") count += 4;
        else break;
      }
      return count;
    };

    const finishActionBuffer = () => {
      if (!currentScene || actionBuffer.length === 0) return;
      currentScene.scriptBlocks.push({ type: "action", text: actionBuffer.join("\n\n").trim() });
      actionBuffer = [];
    };

    const finishDialogue = () => {
      if (!currentScene || !currentDialogue) return;
      currentScene.scriptBlocks.push({
        type: "dialogueBlock",
        character: currentDialogue.character,
        parenthetical: currentDialogue.parenthetical,
        dialogue: currentDialogue.dialogue.trimEnd()
      });
      // Extract clean name without parentheticals or dual tags
      const cleanName = currentDialogue.character.split("(")[0].trim();
      if (cleanName) knownCharacters.add(cleanName);
      currentDialogue = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      let trimmed = rawLine.trim();
      
      // Strip out source markers if present
      if (trimmed.includes("");
        if (endIdx > -1) trimmed = trimmed.substring(endIdx + 1).trim();
      }

      const cleanRaw = rawLine.includes("") > -1 
        ? rawLine.substring(rawLine.indexOf("]") + 1) 
        : rawLine;
      const indentWidth = getIndent(cleanRaw);

      // FRONT MATTER SKIPPING
      if (!scriptStarted) {
        if (isLikelyScene(trimmed) || trimmed === "FADE IN:") {
          scriptStarted = true;
        } else {
          continue;
        }
      }

      // BLANK LINE
      if (trimmed === "") {
        finishDialogue();
        finishActionBuffer();
        continue;
      }

      // SCENE HEADING
      if (isLikelyScene(trimmed)) {
        finishDialogue();
        finishActionBuffer();
        currentScene = { title: trimmed.toUpperCase(), description: "", scriptBlocks: [{ type: "scene_heading", text: trimmed.toUpperCase() }] };
        scenes.push(currentScene);
        continue;
      }

      if (!currentScene) {
        currentScene = { title: "START", description: "Orphaned text before first scene", scriptBlocks: [] };
        scenes.push(currentScene);
      }

      // TRANSITION
      if (isLikelyTransition(trimmed)) {
        finishDialogue();
        finishActionBuffer();
        currentScene.scriptBlocks.push({ type: "transition", text: trimmed.toUpperCase() });
        continue;
      }

      // CHARACTER
      if (isLikelyCharacter(trimmed)) {
        let isCharacter = false;
        if (learnedCharIndent == null) {
          isCharacter = true;
          learnedCharIndent = indentWidth;
        } else {
          const diff = Math.abs(indentWidth - learnedCharIndent);
          if (diff <= 8) isCharacter = true;
        }

        if (isCharacter) {
          finishDialogue();
          finishActionBuffer();
          currentDialogue = { character: trimmed, parenthetical: "", dialogue: "" };
          continue;
        }
      }

      // PARENTHETICAL
      if (isLikelyParenthetical(trimmed) && currentDialogue && !currentDialogue.parenthetical) {
        currentDialogue.parenthetical = trimmed.substring(1, trimmed.length - 1).trim();
        continue;
      }

      // DIALOGUE
      if (currentDialogue) {
        currentDialogue.dialogue += (currentDialogue.dialogue ? " " : "") + trimmed;
        continue;
      }

      // ACTION
      actionBuffer.push(trimmed);
    }

    finishDialogue();
    finishActionBuffer();

    const characters = Array.from(knownCharacters).map(name => ({ name, role: '', description: '' }));
    return { scenes, characters, productionElements: [] };
  };

  const handleImport = async (forceFallback = false) => {
    let textToImport = importMode === 'upload' ? await selectedFile?.text() : pastedText;
    if (!textToImport?.trim()) {
      setError("Please provide script text to import.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data;
      if (forceFallback) {
        data = fallbackManualParse(textToImport);
      } else {
        const response = await fetch('/api/import-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptContent: textToImport, customApiKey: apiKey }),
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to parse script with AI');
      }

      // Save characters
      if (data.characters) {
        for (const char of data.characters) {
          const newDocRef = doc(collection(db, 'projects', projectId, 'characters'));
          // Strip undefined values instantly using JSON parsing
          const payload = JSON.parse(JSON.stringify({
            id: newDocRef.id, projectId, name: char.name || 'Unknown', role: char.role || '',
            description: char.description || '', traits: '', imageUrl: '',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          }));
          await setDoc(newDocRef, payload);
        }
      }

      // Pre-generate Scene Docs
      const generatedScenes: { id: string; title: string }[] = [];
      if (data.scenes) {
        let order = 0;
        for (const scene of data.scenes) {
          const newDocRef = doc(collection(db, 'projects', projectId, 'scenes'));
          generatedScenes.push({ id: newDocRef.id, title: scene.title || 'Untitled Scene' });
          
          const blocksWithIds = (scene.scriptBlocks || []).map((b: any) => {
            const block: any = { id: crypto.randomUUID(), type: b.type };
            if (b.text) block.text = b.text;
            if (b.character) block.character = b.character;
            if (b.parenthetical) block.parenthetical = b.parenthetical;
            if (b.dialogue) block.dialogue = b.dialogue;
            return block;
          });

          // FIRM FIX: Firestore hates "undefined". JSON parse/stringify aggressively strips all undefined fields.
          const scenePayload = JSON.parse(JSON.stringify({
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
          }));

          await setDoc(newDocRef, scenePayload);
        }
      }

      // Save Production Elements (AI Only)
      if (data.productionElements) {
        for (const el of data.productionElements) {
          let matchedSceneId = '';
          if (el.sceneHeading) {
            const matched = generatedScenes.find(s => 
              s.title.toLowerCase().includes(el.sceneHeading.toLowerCase()) || 
              el.sceneHeading.toLowerCase().includes(s.title.toLowerCase())
            );
            if (matched) matchedSceneId = matched.id;
          }

          const newDocRef = doc(collection(db, 'projects', projectId, 'productionElements'));
          const prodPayload = JSON.parse(JSON.stringify({
            id: newDocRef.id, projectId, category: el.category || 'prop',
            name: el.name || 'Unknown', description: el.description || '',
            sceneId: matchedSceneId, tags: '',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          }));
          await setDoc(newDocRef, prodPayload);
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || "An unknown error occurred.";
      if (errorMsg.includes('429') || errorMsg.includes('Quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = "The built-in AI quota is temporarily exhausted. Please enter your own Gemini API key above, or use the Basic Import fallback.";
      } else {
        errorMsg += ". You can try providing your own API key, or use the Basic Import fallback.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#130f1a] border border-purple-900/50 rounded-xl shadow-lg max-w-md w-full flex flex-col max-h-[90vh]">
        <div className="flex flex-col space-y-1.5 p-6 border-b border-purple-900/30 shrink-0">
          <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2 text-emerald-400">
            <Upload size={20} /> Import Script
          </h2>
          <p className="text-sm text-purple-200/60 mt-2">
            Upload a .txt file or paste your script. Our AI will parse it into scenes, characters, and production elements.
          </p>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-purple-900/50 rounded-lg bg-[#130f1a]/50">
              <Loader2 size={40} className="mb-4 animate-spin text-emerald-500" />
              <p className="font-medium text-emerald-400">Parsing Script...</p>
              <p className="text-xs text-purple-300/50 mt-2 text-center px-4">
                This may take a minute. If using the basic fallback, this will be incredibly fast.
              </p>
            </div>
          ) : (
            <div className="w-full space-y-6">
              <div className="bg-purple-950/20 p-4 rounded-lg border border-purple-900/30">
                <label className="text-sm font-medium flex items-center gap-2 mb-2 text-purple-200">
                  <Key size={14} className="text-emerald-500" /> Your Gemini API Key (Optional)
                </label>
                <input 
                  type="text" autoComplete="off" spellCheck="false" style={{ WebkitTextSecurity: 'disc' }}
                  value={apiKey} onChange={(e) => handleKeyChange(e.target.value)} placeholder="AI_zaSy..."
                  className="flex h-9 w-full rounded-md border border-purple-800/50 bg-[#0a080d] px-3 py-1 text-sm text-slate-200 shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-purple-300/50 mt-2">
                  If the built-in AI quota is exceeded, add your own free Gemini key here. It is saved locally in your browser.
                </p>
              </div>

              <div>
                <div className="grid w-full grid-cols-2 mb-4 bg-[#0a080d] border border-purple-900/30 p-1 rounded-lg">
                  <button 
                    onClick={() => setImportMode('upload')}
                    className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold transition-all ${importMode === 'upload' ? 'bg-emerald-600 text-[#0a080d]' : 'text-purple-500 hover:text-emerald-400'}`}
                  >
                    <FileText size={14} /> Upload File
                  </button>
                  <button 
                    onClick={() => setImportMode('paste')}
                    className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold transition-all ${importMode === 'paste' ? 'bg-emerald-600 text-[#0a080d]' : 'text-purple-500 hover:text-emerald-400'}`}
                  >
                    <ClipboardPaste size={14} /> Paste Text
                  </button>
                </div>
                
                {importMode === 'upload' && (
                  <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-purple-900/50 rounded-lg bg-[#130f1a]/30 hover:border-emerald-500/50 transition-colors">
                    <input type="file" accept=".txt" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <div className="text-center cursor-pointer p-4 w-full" onClick={() => fileInputRef.current?.click()}>
                      <FileText size={40} className="mx-auto mb-4 text-purple-500" />
                      {selectedFile ? (
                        <p className="font-medium text-emerald-400 break-all px-4">{selectedFile.name}</p>
                      ) : (
                        <><p className="font-bold text-slate-200">Click to select a .txt file</p><p className="text-xs text-purple-400/60 mt-1">Standard screenplay format works best</p></>
                      )}
                    </div>
                  </div>
                )}
                
                {importMode === 'paste' && (
                  <textarea 
                    value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="Paste your script text here..."
                    className="flex min-h-[200px] w-full rounded-md border border-purple-900/30 bg-[#0a080d] text-emerald-400 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 font-mono resize-none placeholder:text-purple-900/50"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-6 mb-4 bg-amber-950/30 text-amber-400 p-3 rounded-md text-sm border border-amber-900/50">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-t border-purple-900/30 shrink-0 gap-3">
          <button 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-purple-800/50 bg-transparent hover:bg-purple-900/30 text-slate-200 h-10 px-4 py-2 w-full sm:w-auto order-3 sm:order-1"
            onClick={() => onOpenChange(false)} disabled={loading}
          >
            Cancel
          </button>
          
          <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button 
              onClick={() => handleImport(true)} disabled={loading || (importMode === 'upload' ? !selectedFile : !pastedText.trim())}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-[#1e1826] hover:bg-purple-900/50 text-emerald-400 border border-purple-800/50 disabled:opacity-50 h-10 px-4 py-2 w-full sm:w-auto"
              title="Use the offline, regex-free custom parser"
            >
              Basic Import
            </button>
            <button 
              onClick={() => handleImport(false)} disabled={loading || (importMode === 'upload' ? !selectedFile : !pastedText.trim())}
              className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors bg-emerald-600 hover:bg-emerald-500 text-[#0a080d] disabled:opacity-50 h-10 px-4 py-2 w-full sm:w-auto shadow-lg shadow-emerald-900/20"
            >
              {loading ? 'Working...' : 'AI Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
