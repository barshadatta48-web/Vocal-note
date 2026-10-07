/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, Check, X, Palette, MessageCircle, Send, Sparkles, Loader2, Image as ImageIcon, Camera, MoreVertical, CheckCircle2, Mic, MicOff, Pencil, Eraser, ArrowLeft, Wand2, Bold, Type, Minus, Underline, Hand, Maximize, StickyNote, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

import { Stage, Layer, Line as KonvaLine } from 'react-konva';
import { postProcessSpeechTranscript, aiPostProcessSpeech } from './speechPostProcessor';

interface DrawingLine {
  tool: string;
  points: number[];
  color: string;
  strokeWidth: number;
}

interface Note {
  id: string;
  content: string; // HTML content
  color: string;
  pattern?: string;
  rotation: number;
  x: number;
  y: number;
  image?: string;
  completed?: boolean;
  drawingLines?: DrawingLine[];
  fontSize?: number;
}

interface Template {
  id: string;
  name: string;
  content: string;
  color: string;
  pattern?: string;
  drawingLines?: DrawingLine[];
  image?: string;
  fontSize?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

const COLORS = [
  'bg-note-red',
  'bg-note-orange',
  'bg-note-yellow',
  'bg-note-green',
  'bg-note-blue',
  'bg-note-indigo',
  'bg-note-purple',
  'bg-note-gray',
  'bg-note-mint',
  'bg-note-rose',
];

const MAX_CHARS = 10000;

const PATTERNS = [
  'pattern-dots',
  'pattern-lines',
  'pattern-grid',
  'none'
];

const DASHBOARD_COLORS = [
  { name: 'Paper', value: '#fcfaf7' },
  { name: 'Linen', value: '#f9f9f9' },
  { name: 'Fog', value: '#eceff1' },
  { name: 'Sage', value: '#f1f4f1' },
  { name: 'Sky', value: '#f0f7ff' },
  { name: 'Blush', value: '#fff5f5' },
  { name: 'Midnight', value: '#1a1c1e' },
];

// Helper functions for underline formatting where spaces are never underlined
function splitNodeByWhitespace(node: Node): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue || '';
    if (!/\s/.test(text)) {
      return [node];
    }
    const parts = text.split(/(\s+)/);
    const result: Node[] = [];
    for (const part of parts) {
      if (part) {
        result.push(document.createTextNode(part));
      }
    }
    return result;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (el.tagName === 'BR' || el.tagName === 'IMG') {
      return [el];
    }

    const childNodes = Array.from(el.childNodes);
    const newChildren: Node[] = [];
    for (const child of childNodes) {
      newChildren.push(...splitNodeByWhitespace(child));
    }

    const hasWhitespace = newChildren.some(
      n => n.nodeType === Node.TEXT_NODE && /^\s+$/.test(n.nodeValue || '')
    );
    if (!hasWhitespace) {
      return [el];
    }

    const result: Node[] = [];
    let currentGroup: Node[] = [];

    const flushGroup = () => {
      if (currentGroup.length > 0) {
        const clone = el.cloneNode(false) as HTMLElement;
        for (const c of currentGroup) {
          clone.appendChild(c);
        }
        result.push(clone);
        currentGroup = [];
      }
    };

    for (const child of newChildren) {
      if (child.nodeType === Node.TEXT_NODE && /^\s+$/.test(child.nodeValue || '')) {
        flushGroup();
        result.push(child);
      } else {
        currentGroup.push(child);
      }
    }
    flushGroup();
    return result;
  }

  return [node];
}

function normalizeEditorUnderlines(editor: HTMLElement): boolean {
  const allElements = editor.querySelectorAll('u, [style*="underline"]');
  const underlineElements: HTMLElement[] = [];

  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.tagName === 'U') {
      underlineElements.push(htmlEl);
    } else if (
      htmlEl.style &&
      (htmlEl.style.textDecoration?.includes('underline') ||
        htmlEl.style.textDecorationLine?.includes('underline'))
    ) {
      underlineElements.push(htmlEl);
    }
  });

  const topUnderlines = underlineElements.filter(el => {
    let p = el.parentElement;
    while (p && p !== editor) {
      if (underlineElements.includes(p)) return false;
      p = p.parentElement;
    }
    return true;
  });

  let modified = false;

  for (const uEl of topUnderlines) {
    const text = uEl.textContent || '';
    if (!/\s/.test(text)) {
      continue;
    }

    const parent = uEl.parentNode;
    if (!parent) continue;

    if (!/\S/.test(text)) {
      while (uEl.firstChild) {
        parent.insertBefore(uEl.firstChild, uEl);
      }
      parent.removeChild(uEl);
      modified = true;
      continue;
    }

    const children = Array.from(uEl.childNodes);
    const processedChildren: Node[] = [];
    for (const child of children) {
      processedChildren.push(...splitNodeByWhitespace(child));
    }

    const frag = document.createDocumentFragment();
    let currentGroup: Node[] = [];

    const flushGroup = () => {
      if (currentGroup.length > 0) {
        const clone = uEl.cloneNode(false) as HTMLElement;
        for (const n of currentGroup) {
          clone.appendChild(n);
        }
        frag.appendChild(clone);
        currentGroup = [];
      }
    };

    for (const node of processedChildren) {
      if (node.nodeType === Node.TEXT_NODE && /^\s+$/.test(node.nodeValue || '')) {
        flushGroup();
        frag.appendChild(node);
      } else {
        currentGroup.push(node);
      }
    }
    flushGroup();

    parent.replaceChild(frag, uEl);
    modified = true;
  }

  return modified;
}

function getSelectionOffsets(element: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);

  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
    return null;
  }

  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;

  const endRange = range.cloneRange();
  endRange.selectNodeContents(element);
  endRange.setEnd(range.endContainer, range.endOffset);
  const end = endRange.toString().length;

  return { start, end };
}

function setSelectionOffsets(element: HTMLElement, start: number, end: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();

  let currentOffset = 0;
  let startNode: Node | null = null;
  let startNodeOffset = 0;
  let endNode: Node | null = null;
  let endNodeOffset = 0;

  function traverse(node: Node) {
    if (startNode && endNode) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length;
      if (!startNode && currentOffset + len >= start) {
        startNode = node;
        startNodeOffset = Math.min(start - currentOffset, len);
      }
      if (!endNode && currentOffset + len >= end) {
        endNode = node;
        endNodeOffset = Math.min(end - currentOffset, len);
      }
      currentOffset += len;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  }

  traverse(element);

  if (!startNode) {
    startNode = element;
    startNodeOffset = 0;
  }
  if (!endNode) {
    endNode = element;
    endNodeOffset = element.childNodes.length;
  }

  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);
  sel.removeAllRanges();
  sel.addRange(range);
}

function getUnderlineAncestor(node: Node | null, editor: HTMLElement | null): HTMLElement | null {
  let curr = node;
  while (curr && curr !== editor) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      const el = curr as HTMLElement;
      if (el.tagName === 'U') return el;
      if (
        el.style &&
        (el.style.textDecoration?.includes('underline') ||
          el.style.textDecorationLine?.includes('underline'))
      ) {
        return el;
      }
    }
    curr = curr.parentNode;
  }
  return null;
}

function isCaretAtEndOfNode(container: Node, offset: number, rootNode: Node): boolean {
  if (container === rootNode) {
    return offset >= rootNode.childNodes.length;
  }
  if (container.nodeType === Node.TEXT_NODE) {
    if (offset < (container.textContent || '').length) {
      return false;
    }
    let curr: Node | null = container;
    while (curr && curr !== rootNode) {
      let sib = curr.nextSibling;
      while (sib) {
        if (sib.textContent && sib.textContent.length > 0) return false;
        sib = sib.nextSibling;
      }
      curr = curr.parentNode;
    }
    return true;
  }
  return false;
}

function isCaretAtStartOfNode(container: Node, offset: number, rootNode: Node): boolean {
  if (container === rootNode) {
    return offset === 0;
  }
  if (container.nodeType === Node.TEXT_NODE) {
    if (offset > 0) return false;
    let curr: Node | null = container;
    while (curr && curr !== rootNode) {
      let sib = curr.previousSibling;
      while (sib) {
        if (sib.textContent && sib.textContent.length > 0) return false;
        sib = sib.previousSibling;
      }
      curr = curr.parentNode;
    }
    return true;
  }
  return false;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'board'>('grid');
  const [dashboardColor, setDashboardColor] = useState('#fcfaf7');
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editFontSize, setEditFontSize] = useState(48);
  const [isBold, setIsBold] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const keepUnderlineActiveRef = useRef(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'text' | 'draw'>('text');
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser' | 'pan'>('pen');
  const [drawColor, setDrawColor] = useState('#000000');
  
  const [isEditorMenuOpen, setIsEditorMenuOpen] = useState(false);
  
  // Pan and Zoom state
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [panState, setPanState] = useState<{ lastX: number, lastY: number, isPanning: boolean } | null>(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingId = isDrawing ? activeNoteId : null;
  const editingId = !isDrawing ? activeNoteId : null;

  // Ref for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastUploadTargetId, setLastUploadTargetId] = useState<string | null>(null);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm your Vocal assistant. I can help you organize your notes or brainstorm new ideas. What's on your mind?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [micPermissionStatus, setMicPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Load notes and templates from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('stickie-notes-rainbow');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Failed to parse notes from local storage', e);
      }
    }
    const savedTemplates = localStorage.getItem('stickie-templates-rainbow');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Failed to parse templates', e);
      }
    }

    // Auto-popup AI assistant for new users
    const hasVisited = localStorage.getItem('vocal-note-visited');
    if (!hasVisited) {
      setTimeout(() => {
        const welcomeId = Date.now().toString();
        const welcomeNote: Note = {
          id: welcomeId,
          content: `
            <h1 style="font-size: 1.5em; font-weight: 900; margin-bottom: 0.5em;">Welcome to Vocal Note! 🎤</h1>
            <p>Your premium space for voice-captured thoughts. Try these features:</p>
            <ul style="margin-top: 1em; list-style-type: disc; padding-left: 1.5em;">
              <li><b>Voice Dictation:</b> Hit the mic and start talking.</li>
              <li><b>AI Assistant:</b> Brainstorm ideas right in the chat.</li>
              <li><b>Sketch Mode:</b> Draw your visions with the pencil tool.</li>
            </ul>
            <p style="margin-top: 1em; font-style: italic; opacity: 0.7;">Feel free to delete this note or make it your own!</p>
          `,
          color: 'bg-note-indigo',
          rotation: -1 + Math.random() * 2,
          x: 100,
          y: 100,
        };
        setNotes(prev => [welcomeNote, ...prev]);
        setActiveNoteId(welcomeId);
        setEditContent(welcomeNote.content);
        setEditFontSize(48);
        setIsChatOpen(true);
        localStorage.setItem('vocal-note-visited', 'true');
      }, 1000); // Small delay to let the UI settle
    }

    // Check microphone permission status initially
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any }).then(result => {
        setMicPermissionStatus(result.state);
        result.onchange = () => {
          setMicPermissionStatus(result.state);
        };
      }).catch(err => {
        console.warn("Permissions API not fully supported for microphone query:", err);
      });
    } else {
      // Fallback for browsers that don't support permissions.query
      setMicPermissionStatus('prompt');
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('stickie-notes-rainbow', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('stickie-templates-rainbow', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('rainbow-notepad-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('rainbow-notepad-dashboard-color', dashboardColor);
  }, [dashboardColor]);

  useEffect(() => {
    const savedViewMode = localStorage.getItem('rainbow-notepad-view-mode');
    if (savedViewMode === 'grid' || savedViewMode === 'board') {
      setViewMode(savedViewMode);
    }
    const savedColor = localStorage.getItem('rainbow-notepad-dashboard-color');
    if (savedColor) {
      setDashboardColor(savedColor);
    }
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (editorRef.current && activeNoteId) {
      editorRef.current.innerHTML = editContent;
      normalizeEditorUnderlines(editorRef.current);
    }
  }, [activeNoteId]);

  // Handle outside clicks to close menus
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setIsHeaderMenuOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const addNote = (content = '', image?: string, drawingLines?: DrawingLine[], color?: string, pattern?: string) => {
    const notePatterns = PATTERNS.filter(p => p !== 'none');
    const newNote: Note = {
      id: crypto.randomUUID(),
      content,
      image,
      drawingLines,
      completed: false,
      color: color || COLORS[notes.length % COLORS.length], // Cyclic rainbow colors
      pattern: pattern || notePatterns[notes.length % notePatterns.length],
      rotation: Math.random() * 6 - 3, // Random rotation between -3 and 3 degrees
      x: 50 + (notes.length * 40) % 600,
      y: 50 + (notes.length * 40) % 400,
      fontSize: 48,
    };
    setNotes([newNote, ...notes]);
    if (!content && !image && !drawingLines) {
      setActiveNoteId(newNote.id);
      setIsDrawing(false);
      setEditContent('');
    }
  };

  const updateNotePosition = (id: string, x: number, y: number) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  };

  const saveAsTemplate = (note: Note) => {
    const name = prompt("Enter a name for this template:");
    if (!name) return;

    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name,
      content: note.content,
      color: note.color,
      pattern: note.pattern,
      drawingLines: note.drawingLines,
      image: note.image,
      fontSize: note.fontSize,
    };
    setTemplates([...templates, newTemplate]);
    setOpenMenuId(null);
    setIsEditorMenuOpen(false);
  };

  const applyTemplate = (template: Template) => {
    addNote(template.content, template.image, template.drawingLines, template.color, template.pattern);
    // Explicitly set font styling after adding if available
    setNotes(prev => prev.map((n, i) => i === 0 ? { ...n, fontSize: template.fontSize || 48 } : n));
    setIsTemplatesModalOpen(false);
    setIsHeaderMenuOpen(false);
  };

  const deleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplates(templates.filter(t => t.id !== id));
  };

  const deleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(notes.filter((n) => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    setOpenMenuId(null);
  };

  const exportData = () => {
    const data = JSON.stringify({ notes, templates });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rainbow-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const data = JSON.parse(re.target?.result as string);
          if (data.notes) setNotes(data.notes);
          if (data.templates) setTemplates(data.templates);
          alert("Storage restored successfully!");
        } catch (err) {
          alert("Invalid backup file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const startEditing = (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveNoteId(note.id);
    setIsDrawing(false);
    setEditContent(note.content);
    setEditFontSize(note.fontSize || 48);
    setOpenMenuId(null);
    setIsEditorMenuOpen(false);
    
    // Reset canvas view
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  const startDrawing = (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveNoteId(note.id);
    setIsDrawing(true);
    setEditContent(note.content);
    setEditFontSize(note.fontSize || 48);
    setOpenMenuId(null);
    setIsEditorMenuOpen(false);
    
    // Reset canvas view
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  const saveNote = () => {
    if (activeNoteId) {
      setNotes(
        notes.map((n) =>
          n.id === activeNoteId ? { ...n, content: editContent, fontSize: editFontSize } : n
        )
      );
      setActiveNoteId(null);
      setIsEditorMenuOpen(false);
    }
  };

  const toggleComplete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(notes.map(n => n.id === id ? { ...n, completed: !n.completed } : n));
    setOpenMenuId(null);
  };

  const changeColor = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(
      notes.map((n) => {
        if (n.id === id) {
          const currentIndex = COLORS.indexOf(n.color);
          const nextIndex = (currentIndex + 1) % COLORS.length;
          
          const currentPatternIndex = n.pattern ? PATTERNS.indexOf(n.pattern) : -1;
          const nextPatternIndex = (currentPatternIndex + 1) % PATTERNS.length;
          
          return { ...n, color: COLORS[nextIndex], pattern: PATTERNS[nextPatternIndex] };
        }
        return n;
      })
    );
  };

  const checkSelection = () => {
    setIsBold(document.queryCommandState('bold'));

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) {
      return;
    }

    if (!sel.isCollapsed) {
      setIsUnderline(document.queryCommandState('underline'));
      keepUnderlineActiveRef.current = false;
      return;
    }

    const uAncestor = getUnderlineAncestor(sel.anchorNode, editorRef.current);
    if (uAncestor) {
      setIsUnderline(true);
      keepUnderlineActiveRef.current = false;
    } else if (keepUnderlineActiveRef.current) {
      setIsUnderline(true);
    } else {
      setIsUnderline(document.queryCommandState('underline'));
    }
  };

  const toggleUnderline = () => {
    if (!editorRef.current) return;
    const sel = window.getSelection();

    if (!sel || sel.rangeCount === 0) {
      setIsUnderline(prev => !prev);
      return;
    }

    // If selection is collapsed: user is toggling underline mode for upcoming typing
    if (sel.isCollapsed) {
      const nextState = !isUnderline;
      setIsUnderline(nextState);
      keepUnderlineActiveRef.current = nextState;

      // If turning OFF and caret is inside an underline element, move caret outside
      if (!nextState) {
        const uAncestor = getUnderlineAncestor(sel.anchorNode, editorRef.current);
        if (uAncestor && uAncestor.parentNode) {
          const range = document.createRange();
          range.setStartAfter(uAncestor);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      editorRef.current.focus();
      return;
    }

    // Selection is NOT collapsed (user selected a phrase or words)
    const isAlreadyUnderlined = document.queryCommandState('underline');

    if (isAlreadyUnderlined) {
      document.execCommand('underline', false);
      setIsUnderline(false);
      keepUnderlineActiveRef.current = false;
    } else {
      document.execCommand('underline', false);
      setIsUnderline(true);
      keepUnderlineActiveRef.current = true;
    }

    // Immediately normalize all underlines in the editor so whitespace is never underlined
    const selOffsets = getSelectionOffsets(editorRef.current);
    normalizeEditorUnderlines(editorRef.current);
    if (selOffsets) {
      setSelectionOffsets(editorRef.current, selOffsets.start, selOffsets.end);
    }

    setEditContent(editorRef.current.innerHTML);
    editorRef.current.focus();
  };

  const applyFormat = (command: string) => {
    if (command === 'underline') {
      toggleUnderline();
      return;
    }

    document.execCommand(command, false);
    if (editorRef.current) {
      setEditContent(editorRef.current.innerHTML);
    }
    // Update state immediately after toggle
    setIsBold(document.queryCommandState('bold'));
    setIsUnderline(document.queryCommandState('underline'));

    // Maintain focus in the editor so typing can continue
    editorRef.current?.focus();
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 1. Keyboard shortcuts: Ctrl+U / Cmd+U, Ctrl+B / Cmd+B
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      toggleUnderline();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      applyFormat('bold');
      return;
    }

    // Navigation keys: caret moved, reset keepUnderlineActiveRef
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Escape'].includes(e.key)) {
      keepUnderlineActiveRef.current = false;
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;

    // 2. Space key:
    if (e.key === ' ' || e.code === 'Space') {
      const uAncestor = getUnderlineAncestor(sel.anchorNode, editorRef.current);

      if (isUnderline || uAncestor) {
        e.preventDefault();

        const range = sel.getRangeAt(0);
        if (!range.collapsed) {
          range.deleteContents();
        }

        const currentU = getUnderlineAncestor(range.startContainer, editorRef.current);
        if (currentU && currentU.parentNode) {
          const isAtEnd = isCaretAtEndOfNode(range.startContainer, range.startOffset, currentU);
          const isAtStart = isCaretAtStartOfNode(range.startContainer, range.startOffset, currentU);

          if (isAtEnd) {
            // Insert space text node after currentU
            const spaceNode = document.createTextNode(' ');
            currentU.parentNode.insertBefore(spaceNode, currentU.nextSibling);

            const newRange = document.createRange();
            newRange.setStartAfter(spaceNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          } else if (isAtStart) {
            // Insert space text node before currentU
            const spaceNode = document.createTextNode(' ');
            currentU.parentNode.insertBefore(spaceNode, currentU);

            const newRange = document.createRange();
            newRange.setStartAfter(spaceNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          } else {
            // In the middle of currentU: split currentU at caret
            const endRange = document.createRange();
            endRange.setStart(range.startContainer, range.startOffset);
            endRange.setEndAfter(currentU.lastChild || currentU);
            const rightFrag = endRange.extractContents();

            const spaceNode = document.createTextNode(' ');
            currentU.parentNode.insertBefore(spaceNode, currentU.nextSibling);

            const cloneU = currentU.cloneNode(false) as HTMLElement;
            cloneU.appendChild(rightFrag);
            currentU.parentNode.insertBefore(cloneU, spaceNode.nextSibling);

            const newRange = document.createRange();
            newRange.setStartAfter(spaceNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          }
        } else {
          // Not inside currentU, but isUnderline is active: insert un-underlined space at caret
          const spaceNode = document.createTextNode(' ');
          range.insertNode(spaceNode);
          const newRange = document.createRange();
          newRange.setStartAfter(spaceNode);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }

        keepUnderlineActiveRef.current = isUnderline;
        setEditContent(editorRef.current.innerHTML);
        return;
      }
    }

    // 3. Normal printable character typing when isUnderline is TRUE:
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
      keepUnderlineActiveRef.current = false;

      if (isUnderline) {
        const range = sel.getRangeAt(0);
        const uAncestor = getUnderlineAncestor(range.startContainer, editorRef.current);

        // If caret is NOT inside an underline element (e.g. right after a space):
        if (!uAncestor) {
          e.preventDefault();
          if (!range.collapsed) {
            range.deleteContents();
          }

          const u = document.createElement('u');
          const textNode = document.createTextNode(e.key);

          if (isBold) {
            const b = document.createElement('b');
            b.appendChild(textNode);
            u.appendChild(b);
          } else {
            u.appendChild(textNode);
          }

          range.insertNode(u);

          const newRange = document.createRange();
          newRange.setStart(textNode, textNode.length);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);

          setEditContent(editorRef.current.innerHTML);
          return;
        }
      }
    }

    // 4. Backspace / Delete:
    if (e.key === 'Backspace' || e.key === 'Delete') {
      keepUnderlineActiveRef.current = false;
    }
  };

  const generateAIContent = async (type: 'note' | 'template' = 'note') => {
    setIsLoading(true);
    try {
      const prompt = type === 'template' 
        ? "Generate a creative and structured note template. Return HTML content."
        : `Continue or enhance this note content: "${editContent || 'Ideas for the week'}"`;

      let aiText = '';
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        if (res.ok) {
          const data = await res.json();
          aiText = data.text || '';
        } else {
          throw new Error('Server proxy unavailable');
        }
      } catch {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        aiText = response.text || '';
      }

      if (aiText) {
        if (type === 'template') {
          addNote(aiText.trim());
          setIsTemplatesModalOpen(false);
        } else {
          const newContent = editContent + (editContent.length > 0 ? '<br><br>' : '') + aiText.trim();
          setEditContent(newContent);
          if (editorRef.current) editorRef.current.innerHTML = newContent;
        }
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (lastUploadTargetId) {
        // Update existing note
        setNotes(prev => prev.map(n => n.id === lastUploadTargetId ? { ...n, image: base64 } : n));
        setLastUploadTargetId(null);
      } else {
        // Create new note with image
        addNote('', base64);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input
    event.target.value = '';
    setOpenMenuId(null);
  };

  const removeImage = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, image: undefined } : n));
  };

  const triggerGallery = (noteId: string | null = null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLastUploadTargetId(noteId);
    fileInputRef.current?.click();
    setOpenMenuId(null);
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const startVoiceRecording = async (target: 'chat' | 'note' = 'chat', e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // 1. Check for basic support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    // 2. Preliminary Permission Check & Request
    if (micPermissionStatus !== 'granted') {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Browser doesn't support media devices API");
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setMicPermissionStatus('granted');
        setMicErrorMessage(null);
      } catch (err: any) {
        console.error("Microphone permission denied or error:", err);
        const errName = err.name || '';
        const errMsg = err.message || '';
        
        setMicPermissionStatus('denied');
        setMicErrorMessage(errMsg || errName || 'Permission denied');
        
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.toLowerCase().includes('denied')) {
          alert("Microphone access is blocked. \n\nIMPORTANT: \n1. Click the Lock icon 🔒 in the address bar.\n2. Set 'Microphone' to ALLOW.\n3. Refresh the page.\n\nIF YOU ARE IN AN IFRAME: Use the 'Open in New Tab' button in the toolbar to grant permission properly.");
        } else {
          alert(`Microphone error: ${errMsg || errName || 'Unknown error'}.\n\nPlease ensure a microphone is connected and try opening in a new tab.`);
        }
        return;
      }
    }

    // 3. Initialize and start Speech Recognition
    // We try to start it immediately to satisfy gesture requirements
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      if (target === 'chat') {
        setIsChatOpen(true);
        setIsHeaderMenuOpen(false);
      }
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      const isHtml = target === 'note';
      const cleanTranscript = postProcessSpeechTranscript(transcript.trim(), isHtml);
      
      if (cleanTranscript.length === 0) return;
      
      if (target === 'chat') {
        setChatInput(prev => {
          if (prev.endsWith(cleanTranscript)) return prev;
          const needsSpace = prev.length > 0 && 
            !prev.endsWith('\n') && 
            !prev.endsWith(' ') && 
            !cleanTranscript.startsWith('\n') &&
            !/^[.,!?:;]/.test(cleanTranscript);
          const spacer = needsSpace ? ' ' : '';
          const combined = prev + spacer + cleanTranscript;
          return combined.slice(0, MAX_CHARS);
        });
      } else {
        setEditContent(prev => {
          if (prev.endsWith(cleanTranscript)) return prev;
          const needsSpace = prev.length > 0 && 
            !prev.endsWith('<br>') && 
            !prev.endsWith(' ') && 
            !cleanTranscript.startsWith('<br>') &&
            !/^[.,!?:;]/.test(cleanTranscript);
          const spacer = needsSpace ? ' ' : '';
          const combined = prev + spacer + cleanTranscript;
          return combined.slice(0, MAX_CHARS);
        });
        if (editorRef.current) {
          const content = editorRef.current.innerHTML;
          if (!content.endsWith(cleanTranscript)) {
            const needsSpace = content.length > 0 && 
              !content.endsWith('<br>') && 
              !content.endsWith(' ') && 
              !cleanTranscript.startsWith('<br>') &&
              !/^[.,!?:;]/.test(cleanTranscript);
            const spacer = needsSpace ? ' ' : '';
            editorRef.current.innerHTML = content + spacer + cleanTranscript;
            normalizeEditorUnderlines(editorRef.current);
          }
        }
      }
    };

    recognition.onend = async () => {
      setIsRecording(false);
      // Asynchronous AI polish for complex spoken sentences
      if (target === 'note' && editorRef.current && activeNoteId) {
        const currentHtml = editorRef.current.innerHTML;
        if (/\b(?:period|comma|question\s+mark|exclamation\s+(?:mark|point)|new\s+line|next\s+line|colon|semicolon|full\s+stop)\b/i.test(currentHtml)) {
          const polished = await aiPostProcessSpeech(currentHtml, true);
          if (polished && polished !== currentHtml && editorRef.current) {
            editorRef.current.innerHTML = polished;
            setEditContent(polished);
            setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: polished } : n));
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error handle:", event.error);
      setIsRecording(false);
      
      if (event.error === 'not-allowed') {
        setMicPermissionStatus('denied');
        alert("Voice recognition blocked. Please check site permissions in your browser settings.");
      } else if (event.error === 'no-speech') {
        // Silent end
      } else {
        alert(`Voice recognition error: ${event.error}.`);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (err) {
      console.error("Error starting recognition:", err);
      setIsRecording(false);
    }
  };

  const toggleDrawing = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeNoteId === id && isDrawing) {
      setIsDrawing(false);
    } else {
      setActiveNoteId(id);
      setIsDrawing(true);
      setOpenMenuId(null);
    }
  };

  // Resize observer for drawing canvas
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width, height });
    });
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, [activeNoteId, isDrawing]);

   const handleMouseDown = (e: any) => {
    if (!activeNoteId || drawTool === 'pan') return;
    
    // Only draw if we are not multi-touching
    if (e.evt && e.evt.touches && e.evt.touches.length > 1) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (pos) {
      // Calculate position relative to stage transforms
      const transform = stage.getAbsoluteTransform().copy().invert();
      const relativePos = transform.point(pos);
      
      const note = notes.find(n => n.id === activeNoteId);
      const newLines = [...(note?.drawingLines || []), { 
        tool: drawTool, 
        points: [relativePos.x, relativePos.y], 
        color: drawColor,
        strokeWidth: drawTool === 'eraser' ? 40 / stageScale : 4 / stageScale
      }];
      updateDrawing(activeNoteId, newLines);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!activeNoteId || drawTool === 'pan') return;
    
    // Check if we are drawing (left click)
    if (e.evt.buttons === 1) {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      const note = notes.find(n => n.id === activeNoteId);
      
      if (pos && note?.drawingLines) {
        const transform = stage.getAbsoluteTransform().copy().invert();
        const relativePos = transform.point(pos);
        
        const lastLine = { ...note.drawingLines[note.drawingLines.length - 1] };
        lastLine.points = lastLine.points.concat([relativePos.x, relativePos.y]);
        const newLines = note.drawingLines.slice(0, -1).concat([lastLine]);
        updateDrawing(activeNoteId, newLines);
      }
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 0.05;
    const newScale = e.evt.deltaY > 0 ? oldScale * (1 - speed) : oldScale * (1 + speed);

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const getDistance = (p1: any, p2: any) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getCenter = (p1: any, p2: any) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  let lastDist = 0;
  let lastCenter: any = null;

  const handleTouchMove = (e: any) => {
    e.evt.preventDefault();
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
      const stage = e.target.getStage();
      if (stage.isDragging()) {
        stage.stopDrag();
      }

      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };

      if (!lastCenter) {
        lastCenter = getCenter(p1, p2);
        return;
      }

      const newCenter = getCenter(p1, p2);
      const dist = getDistance(p1, p2);

      if (!lastDist) {
        lastDist = dist;
      }

      // Local variables for current transformation to calculate new ones
      const currScale = stage.scaleX();
      const currPos = { x: stage.x(), y: stage.y() };

      const pointTo = {
        x: (newCenter.x - currPos.x) / currScale,
        y: (newCenter.y - currPos.y) / currScale,
      };

      const newScale = currScale * (dist / lastDist);

      setStageScale(newScale);
      setStagePos({
        x: newCenter.x - pointTo.x * newScale,
        y: newCenter.y - pointTo.y * newScale,
      });

      lastDist = dist;
      lastCenter = newCenter;
    }
  };

  const handleTouchEnd = () => {
    lastDist = 0;
    lastCenter = null;
  };

  const handleMouseUp = () => {
    // End of stroke
  };

  const updateDrawing = (id: string, lines: DrawingLine[]) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, drawingLines: lines } : n));
  };

  const clearDrawing = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, drawingLines: [] } : n));
    setOpenMenuId(null);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const activeNote = notes.find(n => n.id === activeNoteId);
      const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
      };
      const context = activeNote ? `Current Note Content: ${stripHtml(activeNote.content)}` : "";
      
      const prompt = `System: You are Vocal Note, a creative AI voice-enabled notepad assistant. ${context}\nUser: ${userMessage}`;
      let aiResponse = '';
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        if (res.ok) {
          const data = await res.json();
          aiResponse = data.text || '';
        } else {
          throw new Error('Server proxy unavailable');
        }
      } catch {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        aiResponse = response.text || "I'm sorry, I couldn't process that.";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Oops! Something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const insertChatSuggestion = (suggestion: string) => {
    if (!activeNoteId) return;
    
    // Use the current drawing color as the "selected font color"
    const coloredText = `<span style="color: ${drawColor}">${suggestion}</span>`;
    
    const newContent = editContent + (editContent.length > 0 && !editContent.endsWith('<br>') ? '<br><br>' : '') + coloredText;
    setEditContent(newContent);
    
    if (editorRef.current) {
      editorRef.current.innerHTML = newContent;
      // Scroll to bottom of editor to show new content
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.scrollTop = editorRef.current.scrollHeight;
        }
      }, 100);
    }
    
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: newContent, updatedAt: new Date() } : n));
  };

  return (
    <div 
      className="min-h-screen bg-minimal-bg font-sans text-[#1a1a1a] selection:bg-indigo-100 overflow-x-hidden animate-rainbow-slow"
      style={{ '--color-minimal-bg': dashboardColor } as React.CSSProperties}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-[50px] py-4 md:py-[20px] flex items-center justify-between bg-premium-header shadow-sm overflow-hidden min-h-[72px] md:min-h-0">
        {/* Subtle Rainbow Detail */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />
        
        <div className="flex items-center gap-3 md:gap-5 group cursor-default shrink-0">
          <div className="relative flex items-center justify-center">
            {/* 3D-ish Note Frame Shadow/Glow */}
            <div className="absolute -inset-2 bg-teal-500/10 rounded-full blur-xl group-hover:bg-teal-500/20 transition-all duration-700" />
            
            {/* Note Shape with Folded Corner */}
            <div className="relative w-10 h-10 md:w-14 md:h-14 bg-white border-2 border-teal-500/20 rounded-xl md:rounded-2xl shadow-sm flex items-center justify-center overflow-hidden">
              {/* Folded Corner Mimic */}
              <div className="absolute top-0 right-0 w-3 h-3 md:w-5 md:h-5 bg-gradient-to-br from-orange-100 to-orange-400 rounded-bl-lg md:rounded-bl-xl shadow-inner border-l border-b border-orange-500/20" />
              
              {/* Microphone inside Note */}
              <Mic className="text-teal-600 mt-1" size={window.innerWidth < 768 ? 24 : 32} />
              
              {/* Bottom Gloss */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-teal-50/50 to-transparent" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <h1 className="text-lg md:text-2xl font-black tracking-tighter flex items-center leading-[0.9]">
              <span className="text-teal-700">Vocal</span>
              <span className="text-slate-700">Note</span>
            </h1>
            <div className="hidden md:flex items-center gap-2 mt-1.5">
              <div className="h-px w-3 bg-teal-500/30" />
              <p className={`text-[9px] font-black uppercase tracking-[0.15em] leading-none transition-colors duration-500 ${dashboardColor === '#1a1c1e' ? 'text-teal-400/60' : 'text-teal-600/80'}`}>
                Voice Dictation & Smart Notes
              </p>
            </div>
          </div>
          
          {micPermissionStatus === 'denied' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-2 md:ml-6 flex items-center gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-600 text-[10px] md:text-xs font-bold shadow-sm cursor-help group relative"
            >
              <MicOff size={12} />
              <span className="hidden xs:inline">Mic Error</span>
              
              <div className="absolute top-full left-0 mt-2 w-64 md:w-72 p-4 md:p-5 bg-white border border-black/10 rounded-2xl shadow-2xl text-slate-600 font-medium leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1001]">
                <p className="mb-2 uppercase text-[10px] font-black text-red-500 tracking-wider">Troubleshooting Required</p>
                <div className="text-xs md:text-sm font-bold text-slate-800 mb-2">Error: {micErrorMessage || 'Access Denied'}</div>
                <p className="mb-3 text-[12px] md:text-[13px]">To enable voice features:</p>
                <ol className="list-decimal list-inside space-y-2 text-[12px] md:text-[13px]">
                  <li>Click <strong>Lock 🔒</strong> in address bar</li>
                  <li>Set <strong>Microphone</strong> to <strong>Allow</strong></li>
                  <li><strong>Refresh</strong> the AI Studio page</li>
                </ol>
              </div>
            </motion.div>
          )}
        </div>
        
        <div className="flex items-center gap-1 md:gap-[15px]">
          {/* View Mode Toggle - Icon only on mobile */}
          <div className="flex items-center bg-black/5 rounded-xl md:rounded-2xl p-0.5 md:p-1 border border-black/5">
             <button
              onClick={() => setViewMode('grid')}
              className={`p-2 md:px-4 md:py-2 rounded-lg md:rounded-xl leading-none transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Grid</span>
              <Maximize size={16} className="md:hidden" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 md:px-4 md:py-2 rounded-lg md:rounded-xl leading-none transition-all ${viewMode === 'board' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              title="Board View"
            >
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Board</span>
              <Hand size={16} className="md:hidden" />
            </button>
          </div>

          <div className="hidden xs:block h-4 w-px bg-black/10 mx-1" />

          {/* Theme cycle icon only on mobile */}
          <button
            onClick={() => {
              const currentIndex = DASHBOARD_COLORS.findIndex(c => c.value === dashboardColor);
              const nextIndex = (currentIndex + 1) % DASHBOARD_COLORS.length;
              setDashboardColor(DASHBOARD_COLORS[nextIndex].value);
            }}
            className="p-3 md:px-4 md:py-2.5 bg-black/5 rounded-xl md:rounded-2xl border border-black/5 hover:bg-black/10 transition-all group/palette flex items-center gap-2"
            title="Cycle Dashboard Theme"
          >
            <div 
              className="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white shadow-sm transition-transform group-hover/palette:rotate-180 duration-500"
              style={{ backgroundColor: dashboardColor }}
            />
            <div className="hidden md:flex flex-col items-start leading-none text-left">
              <span className={`text-[9px] font-black uppercase tracking-widest ${dashboardColor === '#1a1c1e' ? 'text-white/40' : 'text-slate-400'}`}>Theme</span>
              <span className={`text-[11px] font-bold ${dashboardColor === '#1a1c1e' ? 'text-white' : 'text-slate-700'}`}>
                {DASHBOARD_COLORS.find(c => c.value === dashboardColor)?.name || 'Custom'}
              </span>
            </div>
            <Palette size={16} className={`hidden md:block ${dashboardColor === '#1a1c1e' ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </button>

          <div className="hidden md:block h-4 w-px bg-black/10 mx-1" />

          {/* Storage Buttons - Hide on very small screens or group */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={importData}
              className="p-2 md:p-3 rounded-xl md:rounded-2xl transition-all hover:bg-black/5 text-slate-400 hover:text-slate-600"
              title="Restore Storage"
            >
              <Upload size={18} />
            </button>
            <button
              onClick={exportData}
              className="p-2 md:p-3 rounded-xl md:rounded-2xl transition-all hover:bg-black/5 text-slate-400 hover:text-slate-600"
              title="Backup Storage"
            >
              <Download size={18} />
            </button>
          </div>
          
          <button
            onClick={() => setIsTemplatesModalOpen(true)}
            className="p-2 md:p-3 rounded-xl md:rounded-2xl transition-all hover:bg-black/5 text-slate-400 hover:text-slate-600"
            title="Note Templates"
          >
            <Type size={20} />
          </button>
          
          <button
            onClick={() => addNote()}
            className="group/btn px-3 md:px-8 py-2 md:py-3 bg-indigo-600 text-white rounded-xl md:rounded-[20px] text-xs md:text-sm font-black flex items-center gap-2 transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95 shadow-lg relative overflow-hidden shrink-0"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            <Plus size={18} />
            <span className="hidden md:inline">NEW NOTE</span>
            <span className="md:hidden">ADD</span>
          </button>
        </div>
      </header>


      <main className={`mx-auto pt-[100px] md:pt-[140px] pb-12 relative z-10 ${viewMode === 'grid' ? 'max-w-[1600px] px-4 md:px-8' : 'w-full min-h-[2000px]'}`}>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 md:py-32 text-slate-400">
            <div className="p-6 md:p-8 rounded-full bg-white shadow-inner mb-6 border border-black/5">
               <Plus className="opacity-20 md:w-12 md:h-12" size={32} />
            </div>
            <p className="text-lg md:text-xl font-semibold opacity-30 italic text-center px-4">Start your vocal collection...</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-12" : "relative w-full h-full"}>
            <AnimatePresence mode="popLayout">
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  layout={viewMode === 'grid'}
                  drag={viewMode === 'board'}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    if (viewMode === 'board') {
                      updateNotePosition(note.id, note.x + info.offset.x, note.y + info.offset.y);
                    }
                  }}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: viewMode === 'board' ? note.x : 0,
                    y: viewMode === 'board' ? note.y : 0,
                    rotate: note.rotation 
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.02, zIndex: 10, y: viewMode === 'grid' ? -8 : (note.y - 8), transition: { duration: 0.2 } }}
                  whileDrag={{ scale: 1.1, zIndex: 100, boxShadow: "0 40px 80px rgba(0,0,0,0.2)" }}
                  onClick={() => startEditing(note)}
                  style={viewMode === 'board' ? { position: 'absolute', top: 0, left: 0 } : {}}
                  className={`
                    relative min-h-[300px] md:min-h-[380px] p-6 md:p-[30px] flex flex-col items-start
                    note-shadow hover:note-shadow-hover paper-texture
                    border border-black/5
                    transition-all duration-500 note-corner-fold group
                    ${viewMode === 'board' ? 'w-[280px] md:w-[320px] cursor-grab active:cursor-grabbing' : 'w-full cursor-pointer'}
                    ${note.color}
                    ${note.pattern && note.pattern !== 'none' ? note.pattern : ''}
                    ${note.completed ? 'opacity-80' : ''}
                  `}
                >
                  {/* Washi Tape Effect - Multi-colored */}
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-white/20 backdrop-blur-3xl border border-white/10 rotate-[-2deg] shadow-lg z-20 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${
                    note.color === 'bg-note-red' ? 'from-red-400/30 to-red-600/30' :
                    note.color === 'bg-note-orange' ? 'from-orange-400/30 to-orange-600/30' :
                    note.color === 'bg-note-yellow' ? 'from-yellow-400/30 to-yellow-600/30' :
                    note.color === 'bg-note-green' ? 'from-green-400/30 to-green-600/30' :
                    note.color === 'bg-note-blue' ? 'from-blue-400/30 to-blue-600/30' :
                    note.color === 'bg-note-indigo' ? 'from-indigo-400/30 to-indigo-600/30' :
                    'from-purple-400/30 to-purple-600/30'
                  }`} />
                  
                  <div className="note-header w-full flex justify-between items-center text-[11px] uppercase tracking-[2.5px] font-black opacity-30 mb-[25px] pointer-events-none">
                    <div className="flex items-center gap-1">
                       <div className="w-2 h-2 rounded-full bg-white/50" />
                       <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}</span>
                    </div>
                    {note.completed && <span className="bg-black/10 px-2 py-0.5 rounded italic lowercase tracking-normal">Done</span>}
                  </div>

                  {note.image && (
                    <div className="relative w-full mb-4 pointer-events-none">
                      <img 
                        src={note.image} 
                        alt="Attached photo" 
                        className="w-full aspect-video object-cover rounded-xl shadow-md border border-black/5" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="w-full h-full flex flex-col relative pointer-events-none">
                    {/* Drawing Layer Preview */}
                    {(note.drawingLines && note.drawingLines.length > 0) && (
                      <div className="absolute inset-0 z-0">
                        <Stage width={300} height={400} className="w-full h-full">
                          <Layer>
                            {note.drawingLines.map((line, i) => (
                              <KonvaLine
                                key={i}
                                points={line.points}
                                stroke={line.color}
                                strokeWidth={line.strokeWidth}
                                tension={0.5}
                                lineCap="round"
                                lineJoin="round"
                                globalCompositeOperation={
                                  line.tool === 'eraser' ? 'destination-out' : 'source-over'
                                }
                              />
                            ))}
                          </Layer>
                        </Stage>
                      </div>
                    )}

                    <div 
                      className={`flex-1 w-full overflow-hidden leading-[1.4] text-[#222] whitespace-pre-wrap relative z-10 note-content ${note.completed ? 'line-through opacity-40' : ''}`}
                      style={{ 
                        fontSize: `${Math.min(24, (note.fontSize || 48) / 2.5)}px`
                      }}
                      dangerouslySetInnerHTML={{ __html: note.content || (!note.image && !note.drawingLines?.length ? '<span class="opacity-20 italic">Empty note...</span>' : '') }}
                    />
                    
                    <div className="flex items-center justify-end gap-3 pt-4 opacity-40 group-hover:opacity-100 transition-all transform translate-y-0 relative pointer-events-auto">
                      <button
                        onClick={(e) => changeColor(note.id, e)}
                        className="p-2.5 rounded-xl bg-white/20 hover:bg-white text-purple-600 transition-colors border border-black/10"
                        title="Warp Spectrum"
                      >
                        <Palette size={18} />
                      </button>
                      <button
                        onClick={(e) => deleteNote(note.id, e)}
                        className="p-2.5 rounded-xl bg-white/20 hover:bg-red-500 hover:text-white text-red-500 transition-colors border border-black/10"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Full Screen Editor Overlay */}
      <AnimatePresence>
        {activeNoteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col"
          >
            {/* Editor Header */}
            <header className="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between border-b border-black/5 bg-white/50 backdrop-blur-xl">
              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={saveNote}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors text-slate-600"
                  title="Back"
                >
                  <ArrowLeft size={20} className="md:w-6 md:h-6" />
                </button>
                <div className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] ${notes.find(n => n.id === activeNoteId)?.color} bg-opacity-40 border border-black/5 shadow-sm`}>
                  <span className="hidden xs:inline">{isDrawing ? 'Sketching Mode' : 'Writing Mode'}</span>
                  <span className="xs:hidden">{isDrawing ? 'Sketch' : 'Write'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                {/* Single Pencil Mode Switcher */}
                <button
                  onClick={() => setIsDrawing(!isDrawing)}
                  className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all ${isDrawing ? 'bg-purple-600 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-black hover:bg-black/5'}`}
                  title={isDrawing ? "Writing Mode" : "Drawing Mode"}
                >
                  <Pencil size={20} className="md:w-[22px] md:h-[22px]" />
                </button>

                <AnimatePresence>
                  {isDrawing && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="fixed md:relative bottom-24 md:bottom-auto left-4 right-4 md:left-auto md:right-auto flex items-center justify-center gap-1 bg-white/80 md:bg-slate-50 backdrop-blur-md md:backdrop-blur-none p-2 rounded-[22px] border border-black/10 md:border-black/5 shadow-2xl md:shadow-none z-50 md:z-auto"
                    >
                      <button
                        onClick={() => setDrawTool('pen')}
                        className={`p-2.5 rounded-xl transition-all ${drawTool === 'pen' ? 'bg-black text-white' : 'hover:bg-black/5 text-slate-500'}`}
                        title="Pen"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => setDrawTool('eraser')}
                        className={`p-2.5 rounded-xl transition-all ${drawTool === 'eraser' ? 'bg-black text-white' : 'hover:bg-black/5 text-slate-500'}`}
                        title="Eraser"
                      >
                        <Eraser size={18} />
                      </button>
                      <button
                        onClick={() => setDrawTool('pan')}
                        className={`p-2.5 rounded-xl transition-all ${drawTool === 'pan' ? 'bg-black text-white' : 'hover:bg-black/5 text-slate-500'}`}
                        title="Pan Tool"
                      >
                        <Hand size={18} />
                      </button>
                      <button
                        onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }}
                        className="hidden md:block p-2.5 rounded-xl hover:bg-black/5 text-slate-400 transition-all"
                        title="Reset View"
                      >
                        <Maximize size={18} />
                      </button>
                      <div className="w-px h-6 bg-black/10 mx-1" />
                      <div className="flex items-center gap-1 md:gap-1.5 px-0.5 max-w-[120px] overflow-x-auto">
                        {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(c => (
                          <button
                            key={c}
                            onClick={() => { setDrawColor(c); setDrawTool('pen'); }}
                            className={`w-5 h-5 md:w-6 md:h-6 shrink-0 rounded-full border border-black/10 transition-all hover:scale-110 ${drawColor === c && drawTool === 'pen' ? 'ring-2 ring-black ring-offset-2' : ''}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="hidden md:block w-px h-8 bg-black/5 mx-1" />

                {/* Direct Action Tools */}
                <div className="hidden md:flex items-center gap-1">
                  <button
                    onClick={(e) => triggerGallery(activeNoteId, e)}
                    className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-blue-500 transition-all"
                    title="Gallery"
                  >
                    <ImageIcon size={22} />
                  </button>

                  <button
                    onClick={(e) => startVoiceRecording('note', e)}
                    className={`p-3 rounded-2xl transition-all ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : micPermissionStatus === 'denied'
                          ? 'hover:bg-red-50 text-red-300'
                          : 'hover:bg-slate-50 text-slate-400 hover:text-red-500'
                    }`}
                    title={micPermissionStatus === 'denied' ? "Mic Blocked" : "Voice to Note"}
                  >
                    {micPermissionStatus === 'denied' ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsChatOpen(!isChatOpen);
                  }}
                  className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all ${isChatOpen ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-50 text-slate-400 hover:text-blue-600'}`}
                  title="AI Sidebar Chat"
                >
                  <MessageCircle size={20} className="md:w-[22px] md:h-[22px]" />
                </button>

                {/* Overflow Menu for smaller screens */}
                <div className="md:hidden relative">
                   <button
                    onClick={() => setIsEditorMenuOpen(!isEditorMenuOpen)}
                    className="p-2 rounded-xl bg-black/5 hover:bg-black/10 transition-all"
                  >
                    <MoreVertical size={20} />
                  </button>
                  <AnimatePresence>
                    {isEditorMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-48 bg-white border border-black/10 rounded-2xl shadow-2xl z-[300] p-2 overflow-hidden flex flex-col gap-1"
                      >
                         <button
                          onClick={(e) => { triggerGallery(activeNoteId, e); setIsEditorMenuOpen(false); }}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 text-slate-600 font-bold text-xs"
                        >
                          <ImageIcon size={18} />
                          <span>Gallery</span>
                        </button>
                        <button
                          onClick={(e) => { startVoiceRecording('note', e); setIsEditorMenuOpen(false); }}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 text-slate-600 font-bold text-xs"
                        >
                          <Mic size={18} />
                          <span>Voice Input</span>
                        </button>
                         <button
                          onClick={(e) => { changeColor(activeNoteId!, e); setIsEditorMenuOpen(false); }}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 text-slate-600 font-bold text-xs"
                        >
                          <Palette size={18} />
                          <span>Theme Note</span>
                        </button>
                        <button
                          onClick={(e) => { deleteNote(activeNoteId!, e); setIsEditorMenuOpen(false); }}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 font-bold text-xs"
                        >
                          <Trash2 size={18} />
                          <span>Delete</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="hidden lg:flex items-center gap-1 bg-black/5 p-1 rounded-[22px] ml-1">
                  <button
                    onClick={() => setEditFontSize(prev => Math.max(12, prev - 4))}
                    className="p-2.5 rounded-xl hover:bg-white text-slate-500 hover:text-black transition-all"
                    title="Smaller"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="px-2 text-[10px] font-bold text-slate-400 w-8 text-center">{editFontSize}</div>
                  <button
                    onClick={() => setEditFontSize(prev => Math.min(120, prev + 4))}
                    className="p-2.5 rounded-xl hover:bg-white text-slate-500 hover:text-black transition-all"
                    title="Larger"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="hidden md:flex items-center gap-1">
                  <button
                    onClick={() => applyFormat('bold')}
                    className={`p-3 rounded-2xl transition-all ml-1 ${isBold ? 'bg-black text-white shadow-md' : 'hover:bg-slate-50 text-slate-400 hover:text-black'}`}
                    title="Bold"
                  >
                    <Bold size={22} />
                  </button>

                  <button
                    onClick={() => applyFormat('underline')}
                    className={`p-3 rounded-2xl transition-all ${isUnderline ? 'bg-black text-white shadow-md' : 'hover:bg-slate-50 text-slate-400 hover:text-black'}`}
                    title="Underline"
                  >
                    <Underline size={22} />
                  </button>
                </div>

                <div className="hidden md:block w-px h-8 bg-black/5 mx-1" />

                <button
                  onClick={saveNote}
                  className="p-2 md:p-3 bg-black text-white rounded-xl md:rounded-2xl hover:bg-slate-800 transition-all shadow-lg ml-1 md:ml-2"
                  title="Save & Close"
                >
                  <CheckCircle2 size={20} className="md:w-[22px] md:h-[22px]" />
                </button>
              </div>
            </header>


            {/* Hybrid Note Editor Body & Sidebar AI */}
            <div className="flex-1 flex overflow-hidden">
              <div className={`flex-1 relative overflow-hidden flex flex-col transition-all duration-500 ${notes.find(n => n.id === activeNoteId)?.color}`}>
                <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12 lg:p-24 relative flex flex-col">
                  
                  {/* Voice Dictation Active Banner */}
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 mx-auto px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white text-xs rounded-2xl shadow-xl flex flex-wrap items-center justify-center gap-2 border border-white/10 z-30"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                      <span className="font-bold tracking-wider uppercase text-[9px] text-red-400">Listening:</span>
                      <span className="text-slate-300 text-[11px]">
                        Say <span className="text-white font-semibold">"bold [words]"</span>, <span className="text-white font-semibold">"underline [words]"</span>, <span className="text-white font-semibold">"period"</span>, <span className="text-white font-semibold">"comma"</span>, <span className="text-white font-semibold">"question mark"</span>, <span className="text-white font-semibold">"new line"</span>
                      </span>
                    </motion.div>
                  )}
                  
                  {/* Photo Layer */}
                  {notes.find(n => n.id === activeNoteId)?.image && (
                    <div className="relative mb-8 group shrink-0 z-10 w-full max-w-2xl mx-auto">
                      <img 
                        src={notes.find(n => n.id === activeNoteId)?.image} 
                        className="w-full max-h-[30vh] object-contain rounded-2xl shadow-xl transition-all"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => removeImage(activeNoteId)}
                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}

                  {/* Text Layer (Rich Text) */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onKeyDown={handleEditorKeyDown}
                    onMouseDown={() => {
                      keepUnderlineActiveRef.current = false;
                    }}
                    onPaste={() => {
                      setTimeout(() => {
                        if (editorRef.current) {
                          const selOffsets = getSelectionOffsets(editorRef.current);
                          normalizeEditorUnderlines(editorRef.current);
                          if (selOffsets) {
                            setSelectionOffsets(editorRef.current, selOffsets.start, selOffsets.end);
                          }
                          setEditContent(editorRef.current.innerHTML);
                          checkSelection();
                        }
                      }, 0);
                    }}
                    onInput={(e) => {
                      const target = e.currentTarget;
                      const text = target.innerText;
                      if (text.length > MAX_CHARS) {
                        target.innerText = text.slice(0, MAX_CHARS);
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.selectNodeContents(target);
                        range.collapse(false);
                        sel?.removeAllRanges();
                        sel?.addRange(range);
                      }
                      const selOffsets = getSelectionOffsets(target);
                      const changed = normalizeEditorUnderlines(target);
                      if (changed && selOffsets) {
                        setSelectionOffsets(target, selOffsets.start, selOffsets.end);
                      }
                      const html = target.innerHTML;
                      setEditContent(html);
                      checkSelection();
                    }}
                    onSelect={checkSelection}
                    onKeyUp={checkSelection}
                    onMouseUp={checkSelection}
                    onFocus={checkSelection}
                    style={{ 
                      fontSize: `${editFontSize}px`,
                      fontWeight: 500
                    }}
                    className={`flex-1 w-full bg-transparent focus:outline-none leading-[1.3] text-[#333] note-content z-10 relative overflow-y-auto whitespace-pre-wrap ${isDrawing ? 'pointer-events-none' : 'pointer-events-auto'}`}
                  />
                  
                  {/* Character Count */}
                  <div className="absolute bottom-10 right-10 z-30 flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[9px] font-black tracking-[0.2em] shadow-xl pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                    <span>{editContent.replace(/<[^>]*>/g, '').length}</span>
                    <div className="w-px h-2 bg-white/20" />
                    <span>{MAX_CHARS}</span>
                  </div>
                  {(editContent === '' || editContent === '<br>') && (
                    <div className="absolute top-0 left-0 text-slate-300 pointer-events-none italic opacity-50" style={{ fontSize: `${editFontSize}px` }}>
                      Type your thoughts...
                    </div>
                  )}

                  {/* Drawing Layer Overlay */}
                  <div 
                    ref={canvasContainerRef} 
                    className={`absolute inset-0 z-20 ${isDrawing ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                  >
                    <Stage
                      width={canvasSize.width}
                      height={canvasSize.height}
                      scaleX={stageScale}
                      scaleY={stageScale}
                      x={stagePos.x}
                      y={stagePos.y}
                      draggable={!isDrawing || drawTool === 'pan'}
                      onDragEnd={(e) => {
                        setStagePos({ x: e.target.x(), y: e.target.y() });
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onTouchStart={handleMouseDown}
                      onTouchMove={(e) => {
                        if (e.evt.touches.length > 1) {
                          handleTouchMove(e);
                        } else {
                          handleMouseMove(e);
                        }
                      }}
                      onTouchEnd={() => {
                        handleTouchEnd();
                        handleMouseUp();
                      }}
                      onWheel={handleWheel}
                    >
                      <Layer>
                        {(notes.find(n => n.id === activeNoteId)?.drawingLines || []).map((line, i) => (
                          <KonvaLine
                            key={i}
                            points={line.points}
                            stroke={line.color}
                            strokeWidth={line.strokeWidth}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                            globalCompositeOperation={
                              line.tool === 'eraser' ? 'destination-out' : 'source-over'
                            }
                          />
                        ))}
                      </Layer>
                    </Stage>
                  </div>
                </div>
              </div>

              {/* Sidebar Chat Box */}
              <AnimatePresence>
                {isChatOpen && activeNoteId && (
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    className="fixed md:relative inset-0 md:inset-auto md:w-[400px] bg-slate-950 border-l border-white/5 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.4)] z-[201]"
                  >
                    <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
                          <Sparkles size={18} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold tracking-tight text-sm">Vocal AI</span>
                          <span className="text-[10px] text-white/40 uppercase tracking-widest font-black leading-none mt-0.5">Assistant Engine</span>
                        </div>
                      </div>
                      <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative bg-slate-950">
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[90%] md:max-w-[85%] px-4 md:px-5 py-3 md:py-3.5 rounded-2xl text-[14px] font-medium leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                              ? 'bg-indigo-600 text-white rounded-tr-none' 
                              : 'bg-white/5 text-slate-100 backdrop-blur-md border border-white/5 rounded-tl-none'
                          }`}>
                            <div>{msg.content}</div>
                            {msg.role === 'assistant' && i !== 0 && (
                              <button 
                                onClick={() => insertChatSuggestion(msg.content)}
                                className="mt-4 flex items-center gap-2 px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-300 transition-all active:scale-95 group/insert"
                              >
                                <Plus size={12} className="group-hover/insert:rotate-90 transition-transform" />
                                <span>Apply to Note</span>
                                <div className="w-2 h-2 rounded-full ml-1" style={{ backgroundColor: drawColor }} title={`Color: ${drawColor}`} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none shadow-sm">
                            <Loader2 className="animate-spin text-white/20" size={20} />
                          </div>
                        </div>
                      )}
                      
                      {/* Voice Recording HUD */}
                      {isRecording && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-x-4 md:inset-x-6 bottom-4 md:bottom-6 bg-slate-900/95 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-[24px] md:rounded-[32px] z-50 flex flex-col items-center justify-center text-white shadow-2xl"
                        >
                          <div className="bg-indigo-600 p-4 md:p-6 rounded-full mb-4 animate-pulse shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                            <Mic size={24} className="md:w-8 md:h-8 text-white" />
                          </div>
                          <span className="tracking-[0.3em] uppercase text-[9px] md:text-[10px] font-black text-white/40 mb-2">Engine Listening...</span>
                          <p className="text-[11px] text-indigo-300 font-medium mb-5 text-center max-w-xs">
                            Speak formatting & punctuation: <span className="text-white font-semibold">"bold [words]"</span>, <span className="text-white font-semibold">"underline [words]"</span>, <span className="text-white font-semibold">"period"</span>, <span className="text-white font-semibold">"comma"</span>, <span className="text-white font-semibold">"question mark"</span>, <span className="text-white font-semibold">"new line"</span>
                          </p>
                          <button 
                            onClick={() => recognitionRef.current?.stop()}
                            className="w-full px-8 py-3 bg-white text-slate-950 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-lg active:scale-95"
                          >
                            Stop Engine
                          </button>
                        </motion.div>
                      )}
                      
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-6 md:p-8 bg-slate-900 border-t border-white/5 flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value.slice(0, MAX_CHARS))}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder={isRecording ? "Listening..." : "Message Vocal..."}
                          disabled={isRecording}
                          className="flex-1 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[14px] md:text-[15px] text-white placeholder:text-white/20 focus:ring-2 focus:ring-indigo-500/50 outline-none disabled:opacity-50 transition-all font-medium"
                        />
                        <button
                          onClick={(e) => startVoiceRecording('chat', e)}
                          disabled={isLoading}
                          className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all transform active:scale-95 ${
                            isRecording 
                              ? 'bg-red-500 text-white animate-pulse' 
                              : micPermissionStatus === 'denied'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-white/5 text-white/20 hover:text-white hover:bg-white/10'
                          }`}
                          title={micPermissionStatus === 'denied' ? "Mic Blocked" : "Voice Input"}
                        >
                          {micPermissionStatus === 'denied' ? <MicOff size={20} className="md:w-[22px] md:h-[22px]" /> : <Mic size={20} className="md:w-[22px] md:h-[22px]" />}
                        </button>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !chatInput.trim() || isRecording}
                        className="w-full py-3 md:py-4 bg-white text-slate-950 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] disabled:opacity-10 disabled:cursor-not-allowed transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-2xl hover:bg-slate-50"
                      >
                        <Send size={14} />
                        <span>REPLY</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates Modal */}
      <AnimatePresence>
        {isTemplatesModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTemplatesModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-full md:max-h-[80vh]"
            >
              <div className="px-6 md:px-12 py-6 md:py-8 flex items-center justify-between border-b border-black/5 shrink-0">
                <div>
                  <h2 className="text-xl md:text-3xl font-black tracking-tight">Templates</h2>
                  <p className="hidden md:block text-slate-400 font-medium">Quick start your thoughts</p>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  <button
                    onClick={() => generateAIContent('template')}
                    className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-indigo-600 text-white rounded-xl md:rounded-2xl hover:bg-indigo-700 transition-all shadow-md font-bold text-xs md:text-sm"
                  >
                    <Wand2 size={18} className="md:w-5 md:h-5" />
                    <span>AI Generate</span>
                  </button>
                  <button 
                    onClick={() => setIsTemplatesModalOpen(false)}
                    className="p-2 md:p-3 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 md:p-12 overflow-y-auto">
                {templates.length === 0 ? (
                  <div className="py-20 text-center text-slate-300">
                    <Sparkles className="mx-auto mb-4 opacity-20" size={64} />
                    <p className="text-lg md:text-xl italic font-medium">No templates saved yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {templates.map(template => (
                      <div 
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className={`group relative p-8 rounded-3xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg border border-black/5 ${template.color}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-lg truncate pr-8">{template.name}</h3>
                          <button 
                            onClick={(e) => deleteTemplate(template.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-black/10 rounded-full transition-all"
                          >
                            <Trash2 size={16} className="text-black/60" />
                          </button>
                        </div>
                        <p className="text-sm opacity-60 line-clamp-3 leading-relaxed note-content" dangerouslySetInnerHTML={{ __html: template.content || "Visual Template" }} />
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-black/5 px-3 py-1 rounded-full w-fit">
                          {template.drawingLines?.length ? 'Sketch' : template.image ? 'Media' : 'Text'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Editor Overlay */}

      <style>{`
        .note-content b, .note-content strong { font-weight: 700; }
        .note-content u { text-decoration: underline; }
      `}</style>
    </div>
  );
}
