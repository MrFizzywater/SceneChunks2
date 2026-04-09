import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="text-indigo-500" size={20} />
            Auto-Extract Elements
          </DialogTitle>
          <DialogDescription>
            Our AI will read your current script and automatically populate your Characters and Production tabs.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center">
          {loading ? (
            <div className="text-center flex flex-col items-center">
              <Loader2 size={40} className="mb-4 animate-spin text-indigo-500" />
              <p className="font-medium">Analyzing Script...</p>
              <p className="text-xs text-muted-foreground mt-2">Extracting characters, props, locations, and more.</p>
            </div>
          ) : success ? (
            <div className="text-center text-green-600 dark:text-green-400">
              <Wand2 size={40} className="mx-auto mb-4" />
              <p className="font-medium">Extraction Complete!</p>
              <p className="text-xs mt-2">Check your Characters and Production tabs.</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Wand2 size={48} className="mx-auto mb-4 opacity-20" />
              <p>Ready to scan your script.</p>
              <p className="text-sm mt-2">This will add new entries without deleting existing ones.</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Close</Button>
          <Button 
            onClick={handleExtract} 
            disabled={loading || success}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? 'Extracting...' : 'Start Extraction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
