import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/dialog';
import { Button } from '@/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Textarea } from '@/components/textarea';
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
  const [importMode, setImportMode] = useState('upload');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="text-indigo-500" size={20} />
            Import Script
          </DialogTitle>
          <DialogDescription>
            Upload a .txt file or paste your script. Our AI will parse it into scenes, characters, and script blocks automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
              <Loader2 size={40} className="mb-4 animate-spin text-indigo-500" />
              <p className="font-medium">Parsing Script...</p>
              <p className="text-xs text-muted-foreground mt-2 text-center px-4">This may take a minute or two depending on length. The AI is breaking down your scenes and characters.</p>
            </div>
          ) : (
            <Tabs value={importMode} onValueChange={setImportMode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="upload" className="gap-2"><FileText size={14} /> Upload File</TabsTrigger>
                <TabsTrigger value="paste" className="gap-2"><ClipboardPaste size={14} /> Paste Text</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload">
                <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                  <input 
                    type="file" 
                    accept=".txt" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <div 
                    className="text-center cursor-pointer p-4 hover:bg-muted/50 rounded-md transition-colors w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText size={40} className="mx-auto mb-4 text-muted-foreground" />
                    {selectedFile ? (
                      <p className="font-medium text-indigo-600 dark:text-indigo-400 break-all px-4">{selectedFile.name}</p>
                    ) : (
                      <>
                        <p className="font-medium">Click to select a .txt file</p>
                        <p className="text-xs text-muted-foreground mt-1">Standard screenplay format works best</p>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="paste">
                <Textarea 
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your script text here..."
                  className="min-h-[200px] font-mono text-sm resize-none"
                />
              </TabsContent>
            </Tabs>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleImport} 
            disabled={loading || (importMode === 'upload' ? !selectedFile : !pastedText.trim())}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
