import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scriptContent: string;
}

export function AIAnalysisDialog({ open, onOpenChange, scriptContent }: AIAnalysisDialogProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!scriptContent.trim()) {
      setError("Your script is empty. Add some scenes and text before analyzing.");
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch('/api/analyze-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze script');
      }

      setFeedback(data.feedback);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-indigo-500" size={20} />
            AI Script Analysis
          </DialogTitle>
          <DialogDescription>
            Get constructive feedback on pacing, structure, and character arcs from an expert AI reader.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {!feedback && !loading && !error && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
              <p>Ready to analyze your script.</p>
              <p className="text-sm mt-2">This will send your current script content to the AI.</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Loader2 size={48} className="mx-auto mb-4 animate-spin text-indigo-500" />
              <p>Analyzing your script...</p>
              <p className="text-sm mt-2">This might take a minute depending on the length of your script.</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {feedback && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{feedback}</ReactMarkdown>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button 
            onClick={handleAnalyze} 
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? 'Analyzing...' : feedback ? 'Re-analyze' : 'Start Analysis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
