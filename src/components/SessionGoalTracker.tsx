import { useState, useEffect } from 'react';
import { Target, Trophy } from 'lucide-react';
import { Button } from '@/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { Input } from '@/components/input';
import { Progress } from '@/components/progress';
import { useAppStore } from '../store';
import confetti from 'canvas-confetti';

interface SessionGoalTrackerProps {
  scriptContent: string;
}

export function SessionGoalTracker({ scriptContent }: SessionGoalTrackerProps) {
  const [goalPages, setGoalPages] = useState<number>(5);
  const [initialLength, setInitialLength] = useState<number | null>(null);
  const [currentLength, setCurrentLength] = useState<number>(0);
  const [celebrated, setCelebrated] = useState(false);

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
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="sm" className={`gap-2 ${isGoalMet ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />}>
        {isGoalMet ? <Trophy size={14} /> : <Target size={14} />}
        <span className="hidden sm:inline">
          {pagesWritten.toFixed(1)} / {goalPages} pages
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Session Goal</h4>
            <p className="text-xs text-muted-foreground">Set a goal for how many pages you want to write in this session.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Input 
              type="number" 
              min="1" 
              max="100" 
              value={goalPages} 
              onChange={(e) => setGoalPages(Number(e.target.value) || 1)}
              className="w-20 h-8"
            />
            <span className="text-sm text-muted-foreground">pages</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span className="font-medium">{pagesWritten.toFixed(1)} / {goalPages}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {isGoalMet && (
            <div className="bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 p-2 rounded-md text-xs text-center font-medium">
              Goal reached! Great job! 🎉
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
