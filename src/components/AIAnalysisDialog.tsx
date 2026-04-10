import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Key, AlertTriangle } from 'lucide-react';
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
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_custom_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem('gemini_custom_key', val);
  };

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
        body: JSON.stringify({ scriptContent, customApiKey: apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze script');
      }

      setFeedback(data.feedback);
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* BYOK Settings Area */}
          {!feedback && !loading && (
            <div className="bg-purple-950/20 p-4 rounded-lg border border-purple-900/30">
              <label className="text-sm font-medium flex items-center gap-2 mb-2 text-purple-200">
                <Key size={14} className="text-emerald-500" />
                Your Gemini API Key (Optional)
              </label>
              <input 
                type="text" 
                autoComplete="off"
                spellCheck="false"
                style={{ WebkitTextSecurity: 'disc' }}
                value={apiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="AI_zaSy..."
                className="flex h-9 w-full rounded-md border border-purple-800/50 bg-[#0a080d] px-3 py-1 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-purple-300/50 mt-2">
                If the built-in AI quota is exceeded, add your own free Gemini key here. It is saved locally in your browser.
              </p>
            </div>
          )}

          {!feedback && !loading && !error && (
            <div className="text-center py-12 text-purple-400/40">
              <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
              <p>Ready to analyze your script.</p>
              <p className="text-sm mt-2">This will send your current script content to the AI.</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 text-emerald-400 flex flex-col items-center">
              <Loader2 size={48} className="mx-auto mb-4 animate-spin text-emerald-500" />
              <p>Analyzing your script...</p>
              <p className="text-sm text-emerald-400/60 mt-2">This might take a minute depending on the length of your script.</p>
            </div>
          )}

          {error && (
            <div className="mx-0 mb-4 bg-red-950/30 text-red-400 p-4 rounded-md text-sm border border-red-900/50">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {feedback && (
            <div className="prose prose-sm max-w-none text-slate-300 prose-headings:text-emerald-400 prose-strong:text-purple-300 prose-a:text-emerald-500 prose-li:text-slate-300">
              <ReactMarkdown>{feedback}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end p-6 border-t border-purple-900/30 shrink-0 gap-2 bg-[#130f1a]">
          <button 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-purple-800/50 bg-transparent hover:bg-purple-900/30 h-10 px-4 py-2 text-slate-200"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors bg-emerald-600 hover:bg-emerald-500 text-[#0a080d] disabled:opacity-50 h-10 px-4 py-2"
          >
            {loading ? 'Analyzing...' : feedback ? 'Re-analyze' : 'Start Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}
