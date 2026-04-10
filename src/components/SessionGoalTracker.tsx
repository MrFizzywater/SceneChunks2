import { useState, useEffect, useRef } from 'react';
import { Target, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SessionGoalTrackerProps {
  scriptContent: string;
}

export function SessionGoalTracker({ scriptContent }: SessionGoalTrackerProps) {
  const [goalPages, setGoalPages] = useState<number>(5);
  const [initialLength, setInitialLength] = useState<number | null>(null);
  const [currentLength, setCurrentLength] = useState<number>(0);
  const [celebrated, setCelebrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize the baseline length when the component mounts or script first loads
  useEffect(() => {
    if (initialLength === null && scriptContent.length > 0) {
      setInitialLength(scriptContent.length);
    }
    setCurrentLength(scriptContent.length);
  }, [scriptContent, initialLength]);

  // Calculate progress
  // Roughly 1000 characters per page in standard screenplay format
  const charsWritten = Math.max(0, currentLength - (initialLength || 0));
  const pagesWritten = charsWritten / 1000;
  const progressPercentage = Math.min(100, (pagesWritten / goalPages) * 100);
  const isGoalMet = progressPercentage >= 100;

  useEffect(() => {
    if (isGoalMet && !celebrated && goalPages > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#818cf8', '#c7d2fe']
      });
      setCelebrated(true);
    } else if (!isGoalMet) {
      setCelebrated(false);
    }
  }, [isGoalMet, celebrated, goalPages]);

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 h-9 px-3 ${isGoalMet ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}
      >
        {isGoalMet ? <Trophy size={14} /> : <Target size={14} />}
        <span className="hidden sm:inline">
          {pagesWritten.toFixed(1)} / {goalPages} pages
        </span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-md bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black ring-opacity-5 border border-slate-200 dark:border-slate-800 focus:outline-none z-50 p-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-1 text-slate-900 dark:text-slate-50">Session Goal</h4>
              <p className="text-xs text-slate-500">Set a goal for how many pages you want to write in this session.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="1" 
                max="100" 
                value={goalPages} 
                onChange={(e) => setGoalPages(Number(e.target.value) || 1)}
                className="flex h-8 w-20 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-500">pages</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Progress</span>
                <span className="font-medium text-slate-900 dark:text-slate-50">{pagesWritten.toFixed(1)} / {goalPages}</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300 ease-in-out" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {isGoalMet && (
              <div className="bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 p-2 rounded-md text-xs text-center font-medium">
                Goal reached! Great job! 🎉
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
