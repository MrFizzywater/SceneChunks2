import { useState } from 'react';
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-w-3xl w-full flex flex-col max-h-[90vh]">
        
        <div className="flex flex-col space-y-1.5 p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
            <Sparkles className="text-indigo-500" size={20} />
            AI Script Analysis
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Get constructive feedback on pacing, structure, and character arcs from an expert AI reader.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!feedback && !loading && !error && (
            <div className="text-center py-12 text-slate-500">
              <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
              <p>Ready to analyze your script.</p>
              <p className="text-sm mt-2">This will send your current script content to the AI.</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center">
              <Loader2 size={48} className="mx-auto mb-4 animate-spin text-indigo-500" />
              <p>Analyzing your script...</p>
              <p className="text-sm mt-2">This might take a minute depending on the length of your script.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md">
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

        <div className="flex items-center justify-end p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 gap-2">
          <button 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 h-10 px-4 py-2"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 h-10 px-4 py-2"
          >
            {loading ? 'Analyzing...' : feedback ? 'Re-analyze' : 'Start Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}
