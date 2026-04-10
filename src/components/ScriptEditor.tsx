import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { v4 as uuidv4 } from 'uuid';
import { useDebouncedCallback } from '../hooks/useDebounce';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// Helpers adapted from your advanced logic
const isSceneHeading = (txt = "") => {
  const t = txt.trim().toUpperCase();
  return t.startsWith("INT.") || t.startsWith("EXT.") || t.startsWith("INT/EXT.") || t.startsWith("I/E.") || t.startsWith("EST.");
};

const isTransitionLine = (txt = "") => {
  const t = txt.trim().toUpperCase();
  return ["CUT TO:", "SMASH CUT:", "MATCH CUT:", "DISSOLVE TO:", "WIPE TO:", "FADE OUT.", "FADE OUT:", "FADE TO BLACK.", "FADE TO BLACK:", "FADE IN:", "FADE IN."].includes(t);
};

const looksLikeCharacter = (txt = "") => {
  const t = txt.trim();
  return !!t && t.length <= 25 && t === t.toUpperCase();
};

export type BlockType = 'scene_heading' | 'action' | 'dialogueBlock' | 'dualDialogue' | 'transition';

export interface ScriptBlock {
  id: string;
  type: BlockType;
  text?: string; // For action, scene_heading, transition
  character?: string; // For dialogueBlock
  parenthetical?: string; // For dialogueBlock
  dialogue?: string; // For dialogueBlock
  left?: { character: string; parenthetical: string; dialogue: string }; // For dualDialogue
  right?: { character: string; parenthetical: string; dialogue: string }; // For dualDialogue
}

interface ScriptEditorProps {
  blocks: ScriptBlock[];
  onChange: (blocks: ScriptBlock[]) => void;
  sceneTitle: string;
  isLightPage?: boolean;
  writerMode?: boolean;
}

export function ScriptEditor({ blocks, onChange, sceneTitle, isLightPage = true, writerMode = false }: ScriptEditorProps) {
  const initialBlocks = blocks && blocks.length > 0 
    ? blocks 
    : [{ id: uuidv4(), type: 'scene_heading' as BlockType, text: sceneTitle.toUpperCase() }];
    
  const [localBlocks, setLocalBlocks] = useState<ScriptBlock[]>(initialBlocks);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLTextAreaElement | HTMLInputElement | null }>({});

  useEffect(() => {
    if (blocks && blocks.length > 0 && localBlocks.length === 1 && localBlocks[0].text === sceneTitle.toUpperCase()) {
      setLocalBlocks(blocks);
    }
  }, [blocks, sceneTitle]);

  const debouncedOnChange = useDebouncedCallback((newBlocks: ScriptBlock[]) => {
    onChange(newBlocks);
  }, 1000);

  const updateBlocks = (newBlocks: ScriptBlock[]) => {
    setLocalBlocks(newBlocks);
    debouncedOnChange(newBlocks);
  };

  const registerRef = (blockId: string, part = "main") => (el: HTMLTextAreaElement | HTMLInputElement | null) => {
    inputRefs.current[`${blockId}:${part}`] = el;
  };

  const focusLine = (blockId: string, part = "main") => {
    const el = inputRefs.current[`${blockId}:${part}`];
    if (el) {
      el.focus();
      if ('setSelectionRange' in el && el.value !== undefined) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  };

  const makeEmpty = (type: BlockType = "action"): ScriptBlock => {
    const id = uuidv4();
    if (type === "dialogueBlock") return { id, type, character: "", parenthetical: "", dialogue: "" };
    if (type === "transition") return { id, type, text: "CUT TO:" };
    return { id, type, text: "" };
  };

  const handleActionChange = (block: ScriptBlock, index: number, value: string) => {
    const next = [...localBlocks];
    if (isTransitionLine(value)) {
      next[index] = { ...block, type: "transition", text: value.toUpperCase() };
    } else {
      next[index] = { ...block, type: "action", text: value };
    }
    updateBlocks(next);
  };

  const handleDialogueChange = (block: ScriptBlock, index: number, part: 'character' | 'parenthetical' | 'dialogue', value: string) => {
    const next = [...localBlocks];
    
    if (part === "dialogue" && value.startsWith("(") && !(block.parenthetical || "").length) {
      next[index] = { ...block, parenthetical: value, dialogue: "" };
      updateBlocks(next);
      setTimeout(() => focusLine(block.id, "parenthetical"), 0);
      return;
    }

    if (part === "parenthetical") {
      const cleaned = value.trim().replace(/^\(/, "").replace(/\)$/, "");
      next[index] = { ...block, parenthetical: cleaned };
      updateBlocks(next);
      return;
    }

    next[index] = { ...block, [part]: value };
    updateBlocks(next);
  };

  const handleLineKeyDown = (e: KeyboardEvent<HTMLElement>, block: ScriptBlock, index: number, part = "main") => {
    const isEmpty = block.type === "dialogueBlock" 
      ? !block.dialogue?.trim() && !block.character?.trim() && !block.parenthetical?.trim()
      : !(block.text || "").trim();

    // DELETE LINE
    if (e.key === "Backspace" && isEmpty && index > 0) {
      e.preventDefault();
      const next = localBlocks.filter((_, i) => i !== index);
      updateBlocks(next);
      setTimeout(() => focusLine(next[index - 1].id, "main"), 0);
      return;
    }

    // SHIFT+TAB -> Dialogue back to Action
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (block.type === "dialogueBlock") {
        const mergedText = (block.character ? block.character + ": " : "") + (block.dialogue || "");
        const next = [...localBlocks];
        next[index] = { id: block.id, type: "action", text: mergedText.trim() };
        updateBlocks(next);
        setTimeout(() => focusLine(block.id, "main"), 0);
      }
      return;
    }

    // TAB -> Action to Dialogue (Auto caps character)
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      if (block.type === "action") {
        const text = (block.text || "").trim();
        const next = [...localBlocks];
        if (looksLikeCharacter(text)) {
          next[index] = { id: block.id, type: "dialogueBlock", character: text.toUpperCase(), parenthetical: "", dialogue: "" };
          updateBlocks(next);
          setTimeout(() => focusLine(block.id, "character"), 0);
        } else {
          next[index] = { id: block.id, type: "dialogueBlock", character: "", parenthetical: "", dialogue: text };
          updateBlocks(next);
          setTimeout(() => focusLine(block.id, "character"), 0);
        }
      }
      return;
    }

    // SHIFT+ENTER -> Just normal newline
    if (e.key === "Enter" && e.shiftKey) return;

    // ENTER SMART BEHAVIOR
    if (e.key === "Enter") {
      e.preventDefault();

      if (block.type === "dialogueBlock") {
        if (part === "character" || part === "parenthetical") {
          setTimeout(() => focusLine(block.id, "dialogue"), 0);
          return;
        }
        if (part === "dialogue" && !block.dialogue?.trim()) {
          const next = [...localBlocks];
          next[index] = { id: block.id, type: "action", text: "" };
          updateBlocks(next);
          setTimeout(() => focusLine(block.id, "main"), 0);
          return;
        }
      }

      if (block.type === "action" && !block.text?.trim()) {
        return; // Don't endlessly spawn empty actions
      }

      const currentText = block.type === "dialogueBlock" ? block.dialogue || "" : block.text || "";
      
      // Spawn new action line below
      const next = [...localBlocks.slice(0, index + 1), makeEmpty("action"), ...localBlocks.slice(index + 1)];
      updateBlocks(next);
      setTimeout(() => focusLine(next[index + 1].id, "main"), 0);
    }
  };

  const getColors = () => {
    if (isLightPage) return { bg: "bg-transparent", text: "text-slate-900", placeholder: "placeholder:text-slate-300", accent: "text-slate-400" };
    return { bg: "bg-[#130f1a]", text: "text-slate-200", placeholder: "placeholder:text-purple-900/50", accent: "text-emerald-400" };
  };

  const c = getColors();
  const inputBase = cn("w-full resize-none outline-none overflow-hidden font-mono text-[12pt] leading-tight", c.bg, c.text, c.placeholder);

  return (
    <div className={cn(
      "font-mono text-[12pt] leading-tight max-w-[850px] mx-auto rounded-sm py-12 px-8 sm:py-16 sm:px-20 min-h-[600px] mb-8 transition-all duration-300 relative",
      isLightPage 
        ? "bg-[#fdfcfc] text-black shadow-xl shadow-black/10 border border-slate-300" 
        : "bg-[#130f1a] text-slate-200 shadow-2xl shadow-black/60 border border-purple-900/30"
    )}>
      {localBlocks.map((block, index) => (
        <div key={block.id} className="relative group mb-1.5 transition-colors rounded-sm hover:bg-black/5 dark:hover:bg-black/20 p-1 -ml-1">
          <div className={cn(
            "absolute -left-8 sm:-left-12 top-2 opacity-0 group-hover:opacity-50 text-[9px] sm:text-[10px] uppercase select-none transition-opacity",
            c.accent
          )}>
            {block.type.replace('Block', '').replace('_', ' ')}
          </div>

          {/* SCENE HEADING, ACTION, TRANSITION */}
          {(block.type === 'scene_heading' || block.type === 'action' || block.type === 'transition') && (
            <TextareaAutosize
              ref={registerRef(block.id, "main")}
              value={block.text || ""}
              onChange={(e) => handleActionChange(block, index, e.target.value)}
              onKeyDown={(e) => handleLineKeyDown(e, block, index, "main")}
              onFocus={() => setFocusedId(block.id)}
              className={cn(
                inputBase,
                block.type === 'scene_heading' && "uppercase font-bold mt-6 mb-2 text-emerald-600 dark:text-emerald-400",
                block.type === 'transition' && "uppercase mt-6 mb-6 text-right font-bold text-purple-600 dark:text-purple-400"
              )}
              placeholder={block.type === 'scene_heading' ? 'INT. LOCATION - DAY' : block.type === 'transition' ? 'CUT TO:' : 'Action / description'}
            />
          )}

          {/* GROUPED DIALOGUE BLOCK */}
          {block.type === 'dialogueBlock' && (
            <div className="flex flex-col">
              <input
                ref={registerRef(block.id, "character")}
                value={block.character || ""}
                onChange={(e) => handleDialogueChange(block, index, "character", e.target.value.toUpperCase())}
                onKeyDown={(e) => handleLineKeyDown(e, block, index, "character")}
                className={cn(inputBase, "uppercase mt-4 mb-0 ml-[25%] sm:ml-[35%] w-[60%] sm:w-[40%] font-bold", isLightPage ? "text-slate-900" : "text-purple-300")}
                placeholder="CHARACTER"
              />
              
              {!!(block.parenthetical || "").length && (
                <div className="relative w-[64%] sm:w-[44%] ml-[18%] sm:ml-[28%] -mb-1">
                  <span className={cn("absolute -left-2 top-0", c.text)}>(</span>
                  <TextareaAutosize
                    ref={registerRef(block.id, "parenthetical")}
                    value={block.parenthetical || ""}
                    onChange={(e) => handleDialogueChange(block, index, "parenthetical", e.target.value)}
                    onKeyDown={(e) => handleLineKeyDown(e, block, index, "parenthetical")}
                    className={cn(inputBase, "pl-0 pr-4 italic", isLightPage ? "text-slate-700" : "text-purple-400/80")}
                    placeholder="beat"
                  />
                  <span className={cn("absolute -right-1 top-0", c.text)}>)</span>
                </div>
              )}

              <TextareaAutosize
                ref={registerRef(block.id, "dialogue")}
                value={block.dialogue || ""}
                onChange={(e) => handleDialogueChange(block, index, "dialogue", e.target.value)}
                onKeyDown={(e) => handleLineKeyDown(e, block, index, "dialogue")}
                className={cn(inputBase, "mt-1 mb-2 ml-[10%] sm:ml-[20%] w-[80%] sm:w-[60%] white-space-pre-wrap")}
                placeholder="Dialogue..."
              />
            </div>
          )}

          {/* DUAL DIALOGUE BLOCK (Future-proofing for when you need it) */}
          {block.type === 'dualDialogue' && (
            <div className="flex gap-8 py-2 mb-3 bg-purple-900/5 rounded-md px-4">
              <div className="flex-1 flex flex-col">
                <input value={block.left?.character || ""} readOnly className={cn(inputBase, "uppercase font-bold mb-1 ml-[10%] w-[90%]")} placeholder="LEFT CHAR" />
                <TextareaAutosize value={block.left?.dialogue || ""} readOnly className={cn(inputBase, "ml-[10%] w-[90%]")} />
              </div>
              <div className="flex-1 flex flex-col">
                <input value={block.right?.character || ""} readOnly className={cn(inputBase, "uppercase font-bold mb-1 w-[90%]")} placeholder="RIGHT CHAR" />
                <TextareaAutosize value={block.right?.dialogue || ""} readOnly className={cn(inputBase, "w-[90%]")} />
              </div>
            </div>
          )}

        </div>
      ))}
    </div>
  );
}
