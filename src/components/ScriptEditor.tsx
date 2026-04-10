import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { v4 as uuidv4 } from 'uuid';
import { useDebouncedCallback } from '../hooks/useDebounce';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export type BlockType = 'scene_heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition';

export interface ScriptBlock {
  id: string;
  type: BlockType;
  text: string;
}

interface ScriptEditorProps {
  blocks: ScriptBlock[];
  onChange: (blocks: ScriptBlock[]) => void;
  sceneTitle: string;
}

export function ScriptEditor({ blocks, onChange, sceneTitle }: ScriptEditorProps) {
  const initialBlocks = blocks && blocks.length > 0 
    ? blocks 
    : [{ id: uuidv4(), type: 'scene_heading' as BlockType, text: sceneTitle.toUpperCase() }];
    
  const [localBlocks, setLocalBlocks] = useState<ScriptBlock[]>(initialBlocks);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const block = localBlocks[index];
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      let nextType: BlockType = 'action';
      if (block.type === 'scene_heading') nextType = 'action';
      else if (block.type === 'character') nextType = 'dialogue';
      else if (block.type === 'dialogue') nextType = 'character';
      else if (block.type === 'parenthetical') nextType = 'dialogue';
      else if (block.type === 'action') nextType = 'action';
      else if (block.type === 'transition') nextType = 'scene_heading';

      if (block.type === 'dialogue' && block.text === '') {
        const newBlocks = [...localBlocks];
        newBlocks[index].type = 'action';
        updateBlocks(newBlocks);
        return;
      }
      
      if (block.type === 'character' && block.text === '') {
        const newBlocks = [...localBlocks];
        newBlocks[index].type = 'action';
        updateBlocks(newBlocks);
        return;
      }

      const newBlock: ScriptBlock = { id: uuidv4(), type: nextType, text: '' };
      const newBlocks = [
        ...localBlocks.slice(0, index + 1),
        newBlock,
        ...localBlocks.slice(index + 1)
      ];
      
      updateBlocks(newBlocks);
      setFocusedId(newBlock.id);
      setTimeout(() => inputRefs.current[newBlock.id]?.focus(), 0);
    } 
    else if (e.key === 'Tab') {
      e.preventDefault();
      const newBlocks = [...localBlocks];
      
      const cycle: Record<BlockType, BlockType> = {
        'action': 'character',
        'character': 'scene_heading',
        'scene_heading': 'transition',
        'transition': 'parenthetical',
        'parenthetical': 'action',
        'dialogue': 'action'
      };
      
      newBlocks[index].type = cycle[block.type];
      
      if (newBlocks[index].type === 'character' || newBlocks[index].type === 'scene_heading' || newBlocks[index].type === 'transition') {
        newBlocks[index].text = newBlocks[index].text.toUpperCase();
      }
      
      updateBlocks(newBlocks);
    }
    else if (e.key === 'Backspace' && block.text === '') {
      e.preventDefault();
      if (index > 0) {
        const newBlocks = localBlocks.filter((_, i) => i !== index);
        updateBlocks(newBlocks);
        const prevId = newBlocks[index - 1].id;
        setFocusedId(prevId);
        setTimeout(() => {
          const el = inputRefs.current[prevId];
          if (el) {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }
        }, 0);
      }
    }
    else if (e.key === 'ArrowUp') {
      if (index > 0) {
        e.preventDefault();
        const prevId = localBlocks[index - 1].id;
        setFocusedId(prevId);
        setTimeout(() => {
          const el = inputRefs.current[prevId];
          if (el) {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }
        }, 0);
      }
    }
    else if (e.key === 'ArrowDown') {
      if (index < localBlocks.length - 1) {
        e.preventDefault();
        const nextId = localBlocks[index + 1].id;
        setFocusedId(nextId);
        setTimeout(() => {
          const el = inputRefs.current[nextId];
          if (el) {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }
        }, 0);
      }
    }
  };

  const handleChange = (text: string, index: number) => {
    const newBlocks = [...localBlocks];
    const block = newBlocks[index];
    
    if (block.type === 'character' || block.type === 'scene_heading' || block.type === 'transition') {
      block.text = text.toUpperCase();
    } else {
      block.text = text;
    }
    
    if (block.type === 'character' && text.startsWith('(')) {
      block.type = 'parenthetical';
    }
    
    updateBlocks(newBlocks);
  };

  return (
    <div className="font-mono text-[12pt] leading-tight max-w-[850px] mx-auto bg-[#130f1a] text-slate-200 shadow-2xl shadow-black/60 border border-purple-900/30 rounded-sm py-16 px-12 sm:px-20 min-h-[600px] mb-8 transition-all duration-300">
      {localBlocks.map((block, index) => (
        <div key={block.id} className="relative group">
          <div className="absolute -left-12 top-1 opacity-0 group-hover:opacity-50 text-[10px] text-purple-600 uppercase select-none">
            {block.type.replace('_', ' ')}
          </div>
          <TextareaAutosize
            ref={(el) => inputRefs.current[block.id] = el}
            value={block.text}
            onChange={(e) => handleChange(e.target.value, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={() => setFocusedId(block.id)}
            placeholder={block.type === 'scene_heading' ? 'INT. LOCATION - DAY' : ''}
            className={cn(
              "w-full resize-none bg-transparent outline-none overflow-hidden placeholder:text-purple-900/50",
              block.type === 'scene_heading' && "uppercase font-bold mt-8 mb-4 text-emerald-400",
              block.type === 'action' && "mt-4 mb-4 text-slate-300",
              block.type === 'character' && "uppercase mt-6 mb-0 ml-[35%] w-[40%] text-purple-300 font-bold",
              block.type === 'dialogue' && "mt-0 mb-4 ml-[20%] w-[60%] text-slate-200",
              block.type === 'parenthetical' && "mt-0 mb-0 ml-[28%] w-[44%] text-purple-400/80 italic",
              block.type === 'transition' && "uppercase mt-6 mb-6 text-right text-purple-500 font-bold"
            )}
          />
        </div>
      ))}
    </div>
  );
}
