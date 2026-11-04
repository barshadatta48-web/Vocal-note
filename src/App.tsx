/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit3, Check, X, Palette, MessageCircle, Send, Sparkles, Loader2, Image as ImageIcon, Camera, MoreVertical, CheckCircle2, Mic, MicOff, Pencil, Eraser, ArrowLeft, Wand2, Bold, Type, Minus, Underline, Hand, Maximize, StickyNote, Download, Upload, Bell, RotateCcw, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

import { Stage, Layer, Group, Line as KonvaLine } from 'react-konva';
import { postProcessSpeechTranscript, aiPostProcessSpeech, detectVoiceCommand, VoiceCommand } from './speechPostProcessor';
import { loadOfflineSnapshot, saveOfflineSnapshot } from './offlineStorage';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { useAuth } from './context/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { AuthScreen } from './components/auth/AuthScreen';
import { OnboardingFlow } from './components/auth/OnboardingFlow';
import { SubscriptionView } from './components/auth/SubscriptionView';
import { StudentVerificationModal } from './components/auth/StudentVerificationModal';
import { LogoutConfirmModal } from './components/auth/LogoutConfirmModal';
import { UserProfileDropdown } from './components/auth/UserProfileDropdown';

interface DrawingLine {
  tool: string;
  points: number[];
  color: string;
  strokeWidth: number;
}

interface DrawingSnapshot {
  lines: DrawingLine[];
  offset: { x: number; y: number };
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
  drawingOffset?: { x: number; y: number };
  fontSize?: number;
  updatedAt?: number | Date | string;
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
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    mozSpeechRecognition?: any;
    msSpeechRecognition?: any;
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

function executeLineBreak(editor: HTMLElement, isParagraph: boolean = false): string {
  editor.focus();
  const sel = window.getSelection();
  let executed = false;

  if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const range = sel.getRangeAt(0);
    range.deleteContents();

    const br = document.createElement('br');
    range.insertNode(br);

    if (isParagraph) {
      const br2 = document.createElement('br');
      br.parentNode?.insertBefore(br2, br.nextSibling);
    }

    const nextTarget = isParagraph ? (br.nextSibling || br) : br;
    const isAtEnd = isCaretAtEndOfNode(nextTarget, 0, editor);
    if (isAtEnd && nextTarget.parentNode) {
      const trailingBr = document.createElement('br');
      nextTarget.parentNode.appendChild(trailingBr);
    }

    const newRange = document.createRange();
    newRange.setStartAfter(nextTarget);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    executed = true;
  }

  if (!executed) {
    editor.appendChild(document.createElement('br'));
    if (isParagraph) {
      editor.appendChild(document.createElement('br'));
    }
    const trailingBr = document.createElement('br');
    editor.appendChild(trailingBr);

    const newRange = document.createRange();
    newRange.setStartBefore(trailingBr);
    newRange.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(newRange);
  }

  normalizeEditorUnderlines(editor);
  editor.scrollTop = editor.scrollHeight;
  return editor.innerHTML;
}

function insertHtmlAtCursor(editor: HTMLElement, htmlSnippet: string): string {
  editor.focus();
  const sel = window.getSelection();
  let inserted = false;

  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      const preRange = range.cloneRange();
      preRange.selectNodeContents(editor);
      preRange.setEnd(range.startContainer, range.startOffset);
      const preText = preRange.toString();
      const needsSpace = preText.length > 0 && 
        !/\s$/.test(preText) && 
        !htmlSnippet.startsWith('<br>') && 
        !/^[.,!?:;]/.test(htmlSnippet);
      const snippetWithSpace = (needsSpace ? ' ' : '') + htmlSnippet;

      range.deleteContents();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = snippetWithSpace;
      const frag = document.createDocumentFragment();
      let node: Node | null;
      let lastNode: Node | null = null;
      while ((node = tempDiv.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      inserted = true;
    }
  }

  if (!inserted) {
    const tempDiv = document.createElement('div');
    const curContent = editor.innerHTML;
    const needsSpace = curContent.length > 0 && 
      !curContent.endsWith('<br>') && 
      !curContent.endsWith(' ') && 
      !htmlSnippet.startsWith('<br>') && 
      !/^[.,!?:;]/.test(htmlSnippet);
    tempDiv.innerHTML = (needsSpace ? ' ' : '') + htmlSnippet;
    while (tempDiv.firstChild) {
      editor.appendChild(tempDiv.firstChild);
    }
    const newRange = document.createRange();
    newRange.selectNodeContents(editor);
    newRange.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(newRange);
  }

  normalizeEditorUnderlines(editor);
  editor.scrollTop = editor.scrollHeight;
  return editor.innerHTML;
}

function NotesApp() {
  const { user, triggerGatedFeature, openSubscriptionModal } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'board'>('grid');
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isBoardActive = viewMode === 'board' && !isMobile;
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
  
  // Unfinished Notes notification state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showStartupReminder, setShowStartupReminder] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Derived unfinished notes and count (single source of truth)
  const unfinishedNotes = notes.filter((n) => !n.completed);
  const unfinishedCount = unfinishedNotes.length;
  
  // Pan and Zoom state
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [panState, setPanState] = useState<{ lastX: number, lastY: number, isPanning: boolean } | null>(null);

  // In-app non-blocking Toast notification state (replaces window.alert for iframe compatibility)
  const [toast, setToast] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'error' | 'success' } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  }, []);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [liveInterimText, setLiveInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const shouldKeepRecordingRef = useRef(false);
  const restartTimerRef = useRef<any>(null);
  const currentTargetRef = useRef<'note' | 'chat'>('note');
  const committedChatPrefixRef = useRef('');
  const committedNoteHtmlRef = useRef('');
  const liveInterimRef = useRef('');
  const finalizedIndexSetRef = useRef<Set<number>>(new Set());
  const currentSessionIdRef = useRef<number>(0);
  const processedFinalTranscriptsRef = useRef<Set<string>>(new Set());
  const lastFinalUtteranceRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const lastDictatedSnapshotRef = useRef<{ text: string; htmlBefore: string } | null>(null);
  const lastDictatedPhraseRef = useRef<string>('');

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState<DrawingSnapshot[]>([]);
  const [drawingRedoStack, setDrawingRedoStack] = useState<DrawingSnapshot[]>([]);
  const drawingId = isDrawing ? activeNoteId : null;
  const editingId = !isDrawing ? activeNoteId : null;
  const isPointerDrawingRef = useRef(false);

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
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Safe localStorage helper so SSR/restricted iframe/incognito never throws
  const safeGetItem = (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('localStorage read error:', e);
    }
    return null;
  };

  const safeSetItem = (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('localStorage write error:', e);
    }
  };

  // Safely initialize Gemini client so missing keys or browser env never crash render
  const ai = useMemo(() => {
    try {
      const key = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';
      return key ? new GoogleGenAI({ apiKey: key }) : null;
    } catch (e) {
      console.warn('Gemini client could not be initialized:', e);
      return null;
    }
  }, []);

  // Load notes and templates from IndexedDB offline snapshot with localStorage fallback
  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        const snapshot = await loadOfflineSnapshot();
        if (snapshot && isMounted) {
          if (Array.isArray(snapshot.notes) && snapshot.notes.length > 0) {
            const cleaned = (snapshot.notes as Note[]).filter(n => !n.content?.includes('Welcome to Vocal Note!'));
            setNotes(cleaned);
          }
          if (Array.isArray(snapshot.templates) && snapshot.templates.length > 0) {
            setTemplates(snapshot.templates as Template[]);
          }
        } else if (isMounted) {
          const savedNotes = safeGetItem('stickie-notes-rainbow');
          if (savedNotes) {
            try {
              const parsed = JSON.parse(savedNotes);
              if (Array.isArray(parsed)) {
                const cleaned = parsed.filter(n => !n.content?.includes('Welcome to Vocal Note!'));
                setNotes(cleaned);
              }
            } catch (e) {
              console.error('Failed to parse notes from local storage', e);
            }
          }
          const savedTemplates = safeGetItem('stickie-templates-rainbow');
          if (savedTemplates) {
            try {
              const parsedT = JSON.parse(savedTemplates);
              if (Array.isArray(parsedT)) {
                setTemplates(parsedT);
              }
            } catch (e) {
              console.error('Failed to parse templates', e);
            }
          }
        }
      } catch (e) {
        console.warn('Hydration from offline snapshot error:', e);
      } finally {
        if (isMounted) {
          setIsStorageLoaded(true);
        }
      }
    }

    hydrate();

    const savedViewMode = safeGetItem('rainbow-notepad-view-mode');
    if (savedViewMode === 'grid' || savedViewMode === 'board') {
      setViewMode(savedViewMode);
    }
    const savedColor = safeGetItem('rainbow-notepad-dashboard-color');
    if (savedColor) {
      setDashboardColor(savedColor);
    }

    safeSetItem('vocal-note-visited', 'true');

    // Check microphone permission status initially
    try {
      if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' as any }).then(result => {
          if (isMounted) setMicPermissionStatus(result.state);
          result.onchange = () => {
            if (isMounted) setMicPermissionStatus(result.state);
          };
        }).catch(err => {
          console.warn("Permissions API not fully supported for microphone query:", err);
          if (isMounted) setMicPermissionStatus('prompt');
        });
      } else {
        if (isMounted) setMicPermissionStatus('prompt');
      }
    } catch {
      if (isMounted) setMicPermissionStatus('prompt');
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Persist one complete snapshot after hydration. A single effect prevents
  // separate note/template effects from scheduling competing partial snapshots.
  useEffect(() => {
    if (!isStorageLoaded) return;

    const notesJson = JSON.stringify(notes);
    const templatesJson = JSON.stringify(templates);
    safeSetItem('stickie-notes-rainbow', notesJson);
    safeSetItem('stickie-templates-rainbow', templatesJson);
    void saveOfflineSnapshot(notes, templates);
  }, [notes, templates, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    safeSetItem('rainbow-notepad-view-mode', viewMode);
  }, [viewMode, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    safeSetItem('rainbow-notepad-dashboard-color', dashboardColor);
  }, [dashboardColor, isStorageLoaded]);

  // Startup check for unfinished notes reminder
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedNotesStr = localStorage.getItem('stickie-notes-rainbow');
      if (savedNotesStr) {
        try {
          const parsed: Note[] = JSON.parse(savedNotesStr);
          if (parsed.some(n => !n.completed)) {
            setShowStartupReminder(true);
          }
        } catch (e) {
          // ignore
        }
      }
    }, 1200);
    return () => clearTimeout(timer);
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

  // Handle outside clicks to close menus & notifications
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
      setOpenMenuId(null);
      setIsHeaderMenuOpen(false);
      setIsEditorMenuOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Helper to extract clean title/summary for notification items
  const getNoteSummary = (note: Note) => {
    if (!note.content) {
      if (note.image) return 'Photo Note';
      if (note.drawingLines && note.drawingLines.length > 0) return 'Sketch Note';
      return 'Untitled Note';
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = note.content;
    const text = (tempDiv.textContent || tempDiv.innerText || '').trim();
    if (text) {
      const firstLine = text.split('\n')[0].trim();
      return firstLine.length > 36 ? firstLine.slice(0, 36) + '...' : firstLine;
    }
    if (note.image) return 'Photo Note';
    if (note.drawingLines && note.drawingLines.length > 0) return 'Sketch Note';
    return 'Untitled Note';
  };

  // Helper to format note timestamp nicely
  const formatNoteTime = (note: Note) => {
    const timeVal = note.updatedAt || (Number(note.id) > 1000000000 ? Number(note.id) : null);
    if (!timeVal) return 'Recently';
    const date = timeVal instanceof Date ? timeVal : new Date(timeVal);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
      return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === date.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const markComplete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, completed: true, updatedAt: Date.now() } : n));
  };

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
      updatedAt: Date.now(),
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
    const summary = getNoteSummary(note);
    const templateName = summary && summary !== 'Untitled Note'
      ? summary
      : `Template ${templates.length + 1}`;

    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: templateName,
      content: note.content,
      color: note.color,
      pattern: note.pattern,
      drawingLines: note.drawingLines,
      image: note.image,
      fontSize: note.fontSize,
    };
    setTemplates(prev => [...prev, newTemplate]);
    setOpenMenuId(null);
    setIsEditorMenuOpen(false);
    showToast(`Template "${templateName}" saved!`, 'success');
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

  // ==========================================
  // CROSS-PLATFORM REAL-TIME SPEECH ENGINE
  // ==========================================
  const getSpeechRecognitionClass = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || 
           (window as any).webkitSpeechRecognition || 
           (window as any).mozSpeechRecognition || 
           (window as any).msSpeechRecognition || 
           null;
  };

  const requestMicrophoneAccessFallback = async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermissionStatus('granted');
      setMicErrorMessage(null);
      return true;
    } catch (err: any) {
      console.warn("Microphone fallback permission request failed:", err);
      setMicPermissionStatus('denied');
      setMicErrorMessage(err?.message || err?.name || 'Microphone access denied');
      return false;
    }
  };

  const stopVoiceRecording = () => {
    shouldKeepRecordingRef.current = false;
    currentSessionIdRef.current += 1;
    finalizedIndexSetRef.current = new Set();
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        if (typeof recognitionRef.current.abort === 'function') {
          recognitionRef.current.abort();
        } else if (typeof recognitionRef.current.stop === 'function') {
          recognitionRef.current.stop();
        }
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setLiveInterimText('');
    liveInterimRef.current = '';

    // Auto-save cleanly upon completion
    if (editorRef.current && activeNoteId) {
      normalizeEditorUnderlines(editorRef.current);
      const finalHtml = editorRef.current.innerHTML;
      setEditContent(finalHtml);
      committedNoteHtmlRef.current = finalHtml;
      setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: finalHtml, updatedAt: Date.now() } : n));
    }
  };

  const startRecognitionSession = (target: 'chat' | 'note', sessionId: number) => {
    if (!shouldKeepRecordingRef.current || currentSessionIdRef.current !== sessionId) {
      return;
    }

    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      showToast("Voice recognition is not supported in this browser. Please try Chrome, Edge, or Safari.", "warning");
      shouldKeepRecordingRef.current = false;
      setIsRecording(false);
      return;
    }

    // Clean up previous instance cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (currentSessionIdRef.current !== sessionId) {
        try { recognition.abort(); } catch {}
        return;
      }
      setIsRecording(true);
      setMicPermissionStatus('granted');
      setMicErrorMessage(null);
      if (target === 'chat') {
        setIsChatOpen(true);
        setIsHeaderMenuOpen(false);
      }
    };

    const executeVoiceCommand = (command: VoiceCommand, targetMode: 'note' | 'chat'): boolean => {
      if (command === 'STOP_LISTENING') {
        stopVoiceRecording();
        showToast("Voice dictation stopped", "info");
        return true;
      }

      if (command === 'START_LISTENING') {
        if (!isRecording && !shouldKeepRecordingRef.current) {
          startVoiceRecording(targetMode);
        }
        return true;
      }

      if (targetMode === 'chat') {
        if (command === 'NEW_LINE') {
          setChatInput(prev => {
            const next = (committedChatPrefixRef.current || prev) + '\n';
            committedChatPrefixRef.current = next;
            return next.slice(0, MAX_CHARS);
          });
          return true;
        }
        if (command === 'NEW_PARAGRAPH') {
          setChatInput(prev => {
            const next = (committedChatPrefixRef.current || prev) + '\n\n';
            committedChatPrefixRef.current = next;
            return next.slice(0, MAX_CHARS);
          });
          return true;
        }
        if (command === 'DELETE_THAT') {
          if (lastDictatedPhraseRef.current) {
            setChatInput(prev => {
              const phrase = lastDictatedPhraseRef.current;
              let next = prev;
              if (next.endsWith(phrase)) {
                next = next.slice(0, -phrase.length).trimEnd();
              }
              committedChatPrefixRef.current = next;
              return next;
            });
            lastDictatedPhraseRef.current = '';
            showToast("Deleted last phrase", "info");
          }
          return true;
        }
        return false;
      }

      // targetMode === 'note'
      if (command === 'NEW_LINE') {
        if (editorRef.current) {
          const nextHtml = executeLineBreak(editorRef.current, false);
          setEditContent(nextHtml);
          committedNoteHtmlRef.current = nextHtml;
          if (activeNoteId) {
            setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: nextHtml, updatedAt: Date.now() } : n));
          }
        } else {
          setEditContent(prev => (prev + '<br>').slice(0, MAX_CHARS));
        }
        return true;
      }

      if (command === 'NEW_PARAGRAPH') {
        if (editorRef.current) {
          const nextHtml = executeLineBreak(editorRef.current, true);
          setEditContent(nextHtml);
          committedNoteHtmlRef.current = nextHtml;
          if (activeNoteId) {
            setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: nextHtml, updatedAt: Date.now() } : n));
          }
        } else {
          setEditContent(prev => (prev + '<br><br>').slice(0, MAX_CHARS));
        }
        return true;
      }

      if (command === 'DELETE_THAT') {
        if (lastDictatedSnapshotRef.current && editorRef.current) {
          const restored = lastDictatedSnapshotRef.current.htmlBefore;
          editorRef.current.innerHTML = restored;
          normalizeEditorUnderlines(editorRef.current);
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);

          setEditContent(restored);
          committedNoteHtmlRef.current = restored;
          if (activeNoteId) {
            setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: restored, updatedAt: Date.now() } : n));
          }
          lastDictatedSnapshotRef.current = null;
          showToast("Deleted last phrase", "info");
          return true;
        }
        return false;
      }

      return false;
    };

    const handleInsertFinalText = (rawText: string, targetMode: 'note' | 'chat') => {
      const trimmed = rawText.trim();
      if (!trimmed) return;

      if (targetMode === 'chat') {
        const cleanFinal = postProcessSpeechTranscript(trimmed, false);
        lastDictatedPhraseRef.current = cleanFinal;
        setChatInput(prev => {
          const base = committedChatPrefixRef.current || prev;
          const needsSpace = base.length > 0 && 
            !base.endsWith(' ') && 
            !base.endsWith('\n') && 
            !cleanFinal.startsWith('\n') && 
            !/^[.,!?:;]/.test(cleanFinal);
          const next = base + (needsSpace ? ' ' : '') + cleanFinal;
          committedChatPrefixRef.current = next;
          return next.slice(0, MAX_CHARS);
        });
      } else {
        const isHtml = true;
        const cleanFinal = postProcessSpeechTranscript(trimmed, isHtml);
        const formattedHtml = cleanFinal.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        if (editorRef.current) {
          lastDictatedSnapshotRef.current = {
            text: formattedHtml,
            htmlBefore: editorRef.current.innerHTML
          };
          const nextHtml = insertHtmlAtCursor(editorRef.current, formattedHtml);
          setEditContent(nextHtml);
          committedNoteHtmlRef.current = nextHtml;
          if (activeNoteId) {
            setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: nextHtml, updatedAt: Date.now() } : n));
          }
        } else {
          setEditContent(prev => {
            const needsSpace = prev.length > 0 && 
              !prev.endsWith('<br>') && 
              !prev.endsWith(' ') && 
              !cleanFinal.startsWith('<br>') && 
              !/^[.,!?:;]/.test(cleanFinal);
            const spacer = needsSpace ? ' ' : '';
            const next = (prev + spacer + formattedHtml).slice(0, MAX_CHARS);
            committedNoteHtmlRef.current = next;
            if (activeNoteId) {
              setNotes(notesPrev => notesPrev.map(n => n.id === activeNoteId ? { ...n, content: next, updatedAt: Date.now() } : n));
            }
            return next;
          });
        }
      }
    };

    recognition.onresult = (event: any) => {
      if (currentSessionIdRef.current !== sessionId || !shouldKeepRecordingRef.current) {
        return;
      }

      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        const transcript = (res[0]?.transcript || '').trim();
        if (!transcript) continue;

        if (res.isFinal) {
          const normalized = transcript.toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
          const fingerprint = `${sessionId}_${i}_${normalized}`;

          if (!processedFinalTranscriptsRef.current.has(fingerprint)) {
            processedFinalTranscriptsRef.current.add(fingerprint);

            const now = Date.now();
            const last = lastFinalUtteranceRef.current;
            const ageMs = now - last.time;
            const isRecentDuplicate =
              last.text === normalized && ageMs >= 0 && ageMs < 5000;
            const isStaleCumulativeRepeat =
              last.text.length > normalized.length &&
              last.text.startsWith(normalized) &&
              ageMs >= 0 &&
              ageMs < 5000;

            if (!isRecentDuplicate && !isStaleCumulativeRepeat) {
              // Mobile engines may resend earlier final words with a new suffix.
              // Reduce cumulative updates before checking commands, so neither
              // dictated text nor commands are replayed.
              let chunkToProcess = transcript;
              const isCumulativeUpdate =
                last.text.length > 0 &&
                normalized.startsWith(last.text + ' ') &&
                ageMs >= 0 &&
                ageMs < 5000;

              if (isCumulativeUpdate) {
                const previousWordCount = last.text.split(/\s+/).length;
                const allWords = transcript.trim().split(/\s+/);
                chunkToProcess = allWords.slice(previousWordCount).join(' ');
              }

              lastFinalUtteranceRef.current = { text: normalized, time: now };
              if (!chunkToProcess.trim()) {
                continue;
              }

              const cmdResult = detectVoiceCommand(chunkToProcess);
              if (cmdResult.isPureCommand && cmdResult.command) {
                // Commands are actions, never literal note/chat text.
                executeVoiceCommand(cmdResult.command, target);
                setLiveInterimText('');
                liveInterimRef.current = '';
                continue;
              }

              if (cmdResult.segments && cmdResult.segments.length > 0) {
                for (const seg of cmdResult.segments) {
                  if (seg.type === 'command' && seg.command) {
                    executeVoiceCommand(seg.command, target);
                  } else if (seg.type === 'text' && seg.content) {
                    handleInsertFinalText(seg.content, target);
                  }
                }
                setLiveInterimText('');
                liveInterimRef.current = '';
                continue;
              }

              handleInsertFinalText(chunkToProcess, target);
              setLiveInterimText('');
              liveInterimRef.current = '';
            }
          }
        } else {
          interimTranscript += (interimTranscript ? ' ' : '') + transcript;
        }
      }

      const cleanInterim = interimTranscript.trim();
      setLiveInterimText(cleanInterim);
      liveInterimRef.current = cleanInterim;

      if (target === 'chat' && cleanInterim) {
        const base = committedChatPrefixRef.current;
        const needsSpace = base.length > 0 && !base.endsWith(' ') && !base.endsWith('\n');
        const preview = base + (needsSpace ? ' ' : '') + cleanInterim;
        setChatInput(preview.slice(0, MAX_CHARS));
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      console.warn("Speech recognition error:", err);

      if (err === 'no-speech' || err === 'aborted') {
        return;
      }
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        shouldKeepRecordingRef.current = false;
        setIsRecording(false);
        setLiveInterimText('');
        liveInterimRef.current = '';
        setMicPermissionStatus('denied');
        setMicErrorMessage('Microphone access blocked');
        showToast("Microphone access is blocked. Please allow microphone permissions in your browser.", "error");
        return;
      }
      if (err === 'audio-capture') {
        shouldKeepRecordingRef.current = false;
        setIsRecording(false);
        setLiveInterimText('');
        liveInterimRef.current = '';
        showToast("No microphone found. Please connect an audio input device.", "warning");
        return;
      }
    };

    recognition.onend = async () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      if (shouldKeepRecordingRef.current && currentSessionIdRef.current === sessionId) {
        setLiveInterimText('');
        liveInterimRef.current = '';

        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldKeepRecordingRef.current && currentSessionIdRef.current === sessionId) {
            startRecognitionSession(currentTargetRef.current, sessionId);
          }
        }, 120);
        return;
      }

      setIsRecording(false);
      setLiveInterimText('');
      liveInterimRef.current = '';
      if (editorRef.current) {
        normalizeEditorUnderlines(editorRef.current);
        const finalContent = editorRef.current.innerHTML;
        setEditContent(finalContent);
        committedNoteHtmlRef.current = finalContent;
        if (activeNoteId) {
          setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: finalContent, updatedAt: Date.now() } : n));
        }
      }

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

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("Error executing recognition.start():", err);
      if (shouldKeepRecordingRef.current && currentSessionIdRef.current === sessionId) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldKeepRecordingRef.current && currentSessionIdRef.current === sessionId) {
            startRecognitionSession(currentTargetRef.current, sessionId);
          }
        }, 200);
      } else {
        setIsRecording(false);
      }
    }
  };

  const startVoiceRecording = async (target: 'chat' | 'note' = 'note', e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (target === 'note' && !activeNoteId) {
      return;
    }

    if (isRecording || shouldKeepRecordingRef.current) {
      stopVoiceRecording();
      return;
    }

    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      showToast("Voice recognition is not supported in this browser. Please try Chrome, Edge, or Safari.", "warning");
      return;
    }

    if (micPermissionStatus === 'denied') {
      const granted = await requestMicrophoneAccessFallback();
      if (!granted) {
        showToast("Microphone access is blocked. Please allow microphone access in your browser settings.", "error");
        return;
      }
    }

    currentSessionIdRef.current += 1;
    processedFinalTranscriptsRef.current = new Set();
    lastFinalUtteranceRef.current = { text: '', time: 0 };
    finalizedIndexSetRef.current = new Set();

    if (target === 'chat') {
      committedChatPrefixRef.current = chatInput;
    } else {
      if (editorRef.current) {
        const interimEl = editorRef.current.querySelector('#voice-interim-text');
        if (interimEl) interimEl.remove();
        committedNoteHtmlRef.current = editorRef.current.innerHTML;
      } else {
        committedNoteHtmlRef.current = editContent;
      }
    }

    shouldKeepRecordingRef.current = true;
    currentTargetRef.current = target;
    setLiveInterimText('');
    liveInterimRef.current = '';

    startRecognitionSession(target, currentSessionIdRef.current);
  };

  const deleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeNoteId === id) {
      stopVoiceRecording();
      setActiveNoteId(null);
    }
    setNotes(notes.filter((n) => n.id !== id));
    setOpenMenuId(null);
  };

  const exportData = () => {
    if (!triggerGatedFeature('Workspace Backup & Export')) return;
    const data = JSON.stringify({ notes, templates });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rainbow-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = () => {
    if (!triggerGatedFeature('Cloud Backup & Restore')) return;
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
          showToast("Storage restored successfully!", "success");
        } catch (err) {
          showToast("Invalid backup file. Could not restore notes.", "error");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const startEditing = (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isRecording || shouldKeepRecordingRef.current) {
      stopVoiceRecording();
    }
    setActiveNoteId(note.id);
    setIsDrawing(false);
    setDrawingHistory([]);
    setDrawingRedoStack([]);
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
    if (isRecording || shouldKeepRecordingRef.current) {
      stopVoiceRecording();
    }
    setActiveNoteId(note.id);
    setIsDrawing(true);
    setDrawingHistory([]);
    setDrawingRedoStack([]);
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
      if (isRecording || shouldKeepRecordingRef.current) {
        stopVoiceRecording();
      }
      setNotes(
        notes.map((n) =>
          n.id === activeNoteId ? { ...n, content: editContent, fontSize: editFontSize, updatedAt: Date.now() } : n
        )
      );
      setDrawingHistory([]);
      setDrawingRedoStack([]);
      setActiveNoteId(null);
      setIsEditorMenuOpen(false);
    }
  };

  const toggleComplete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(notes.map(n => n.id === id ? { ...n, completed: !n.completed, updatedAt: Date.now() } : n));
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

  const applyFormat = (command: string, e?: React.UIEvent) => {
    e?.preventDefault();
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
    if (!triggerGatedFeature('AI Smart Template Generation')) return;
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
        if (ai) {
          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
          });
          aiText = response.text || '';
        } else {
          aiText = "AI features require configuring a GEMINI_API_KEY.";
        }
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

  const handlePointerDown = (e: any) => {
    if (!activeNoteId || drawTool === 'pan') return;
    
    // Only draw if we are not multi-touching
    if (e.evt && e.evt.touches && e.evt.touches.length > 1) {
      isPointerDrawingRef.current = false;
      return;
    }

    if (e.evt && e.evt.cancelable) {
      e.evt.preventDefault();
    }

    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
      setDrawingHistory(prev => [...prev.slice(-25), {
        lines: note.drawingLines || [],
        offset: note.drawingOffset || { x: 0, y: 0 },
      }]);
      setDrawingRedoStack([]);
    }

    isPointerDrawingRef.current = true;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (pos) {
      // Calculate position relative to stage transforms
      const transform = stage.getAbsoluteTransform().copy().invert();
      const relativePos = transform.point(pos);
      
      const newLines = [...(note?.drawingLines || []), { 
        tool: drawTool, 
        points: [relativePos.x, relativePos.y], 
        color: drawColor,
        strokeWidth: drawTool === 'eraser' ? 40 / stageScale : 4 / stageScale
      }];
      updateDrawing(activeNoteId, newLines);
    }
  };

  const handlePointerMove = (e: any) => {
    if (!activeNoteId || drawTool === 'pan') return;

    if (e.evt && e.evt.touches && e.evt.touches.length > 1) {
      handleTouchMove(e);
      return;
    }
    
    // Drawing is active if touch pointer is down OR mouse button 1 is down
    const isDrawingActive = isPointerDrawingRef.current || (e.evt && e.evt.buttons === 1);
    if (!isDrawingActive) return;

    if (e.evt && e.evt.cancelable) {
      e.evt.preventDefault();
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const note = notes.find(n => n.id === activeNoteId);
    
    if (pos && note?.drawingLines && note.drawingLines.length > 0) {
      const transform = stage.getAbsoluteTransform().copy().invert();
      const relativePos = transform.point(pos);
      
      const lines = [...note.drawingLines];
      const lastLine = { ...lines[lines.length - 1] };
      const pts = lastLine.points;
      const lastX = pts[pts.length - 2];
      const lastY = pts[pts.length - 1];
      
      // Throttle negligible subpixel jitter
      if (Math.hypot(relativePos.x - lastX, relativePos.y - lastY) > 1.2) {
        lastLine.points = pts.concat([relativePos.x, relativePos.y]);
        lines[lines.length - 1] = lastLine;
        updateDrawing(activeNoteId, lines);
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
    if (e.evt && e.evt.cancelable) {
      e.evt.preventDefault();
    }
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

  const handlePointerUp = () => {
    isPointerDrawingRef.current = false;
    lastDist = 0;
    lastCenter = null;
  };

  const saveDrawingToHistory = (note: Note) => {
    setDrawingHistory(prev => [...prev.slice(-25), {
      lines: note.drawingLines || [],
      offset: note.drawingOffset || { x: 0, y: 0 },
    }]);
    setDrawingRedoStack([]);
  };

  const updateDrawing = (id: string, lines: DrawingLine[]) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, drawingLines: lines, updatedAt: Date.now() } : n));
  };

  const updateDrawingOffset = (id: string, offset: { x: number; y: number }) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, drawingOffset: offset, updatedAt: Date.now() } : n));
  };

  const applyDrawingSnapshot = (id: string, snapshot: DrawingSnapshot) => {
    setNotes(prev => prev.map(n => n.id === id
      ? { ...n, drawingLines: snapshot.lines, drawingOffset: snapshot.offset, updatedAt: Date.now() }
      : n
    ));
  };

  const undoDrawing = () => {
    if (!activeNoteId || drawingHistory.length === 0) return;
    const currentNote = notes.find(n => n.id === activeNoteId);
    const currentSnapshot: DrawingSnapshot = {
      lines: currentNote?.drawingLines || [],
      offset: currentNote?.drawingOffset || { x: 0, y: 0 },
    };
    const previousSnapshot = drawingHistory[drawingHistory.length - 1];
    setDrawingHistory(prev => prev.slice(0, -1));
    setDrawingRedoStack(prev => [...prev.slice(-25), currentSnapshot]);
    applyDrawingSnapshot(activeNoteId, previousSnapshot);
  };

  const redoDrawing = () => {
    if (!activeNoteId || drawingRedoStack.length === 0) return;
    const currentNote = notes.find(n => n.id === activeNoteId);
    const currentSnapshot: DrawingSnapshot = {
      lines: currentNote?.drawingLines || [],
      offset: currentNote?.drawingOffset || { x: 0, y: 0 },
    };
    const nextSnapshot = drawingRedoStack[drawingRedoStack.length - 1];
    setDrawingRedoStack(prev => prev.slice(0, -1));
    setDrawingHistory(prev => [...prev.slice(-25), currentSnapshot]);
    applyDrawingSnapshot(activeNoteId, nextSnapshot);
  };

  const clearDrawing = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const note = notes.find(n => n.id === id);
    if (note && note.drawingLines && note.drawingLines.length > 0) {
      setDrawingHistory(prev => [...prev.slice(-25), {
        lines: note.drawingLines || [],
        offset: note.drawingOffset || { x: 0, y: 0 },
      }]);
      setDrawingRedoStack([]);
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, drawingLines: [], updatedAt: Date.now() } : n));
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
        if (ai) {
          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
          });
          aiResponse = response.text || "I'm sorry, I couldn't process that.";
        } else {
          aiResponse = "AI Assistant requires configuring GEMINI_API_KEY in your environment.";
        }
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

      <header className="fixed top-0 left-0 right-0 z-[100] px-3 sm:px-4 md:px-[50px] py-3 sm:py-3.5 md:py-[20px] flex items-center justify-between bg-premium-header shadow-sm overflow-visible min-h-[68px] sm:min-h-[72px] md:min-h-0">
        {/* Subtle Rainbow Detail */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />
        
        <div className="flex items-center gap-2 sm:gap-3 md:gap-5 group cursor-default shrink-0 min-w-0">
          <div className="relative flex items-center justify-center shrink-0">
            {/* 3D-ish Note Frame Shadow/Glow */}
            <div className="absolute -inset-2 bg-teal-500/10 rounded-full blur-xl group-hover:bg-teal-500/20 transition-all duration-700" />
            
            {/* Note Shape with Folded Corner */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 md:w-14 md:h-14 bg-white border-2 border-teal-500/20 rounded-xl md:rounded-2xl shadow-sm flex items-center justify-center overflow-hidden">
              {/* Folded Corner Mimic */}
              <div className="absolute top-0 right-0 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-5 md:h-5 bg-gradient-to-br from-orange-100 to-orange-400 rounded-bl-lg md:rounded-bl-xl shadow-inner border-l border-b border-orange-500/20" />
              
              {/* Note Icon inside Note */}
              <StickyNote className="text-teal-600 mt-0.5 sm:mt-1" size={isMobile ? 22 : 28} />
              
              {/* Bottom Gloss */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-teal-50/50 to-transparent" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tighter flex items-center leading-[0.9] select-none">
              <span className="text-teal-700">Vocal</span>
              <span className="text-slate-700">Note</span>
            </h1>
            <div className="hidden md:flex items-center gap-2 mt-1.5">
              <div className="h-px w-3 bg-teal-500/30" />
              <p className={`text-[9px] font-black uppercase tracking-[0.15em] leading-none transition-colors duration-500 ${dashboardColor === '#1a1c1e' ? 'text-teal-400/60' : 'text-teal-600/80'}`}>
                Smart Notes & Canvas
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
          {/* View Mode Toggle - Icon only on mobile */}
          <div className="flex items-center bg-black/5 rounded-xl md:rounded-2xl p-0.5 md:p-1 border border-black/5">
             <button
              onClick={() => setViewMode('grid')}
              className={`min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] p-2 md:px-4 md:py-2 rounded-lg md:rounded-xl leading-none transition-all flex items-center justify-center active:scale-95 ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Grid</span>
              <Maximize size={17} className="md:hidden" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] p-2 md:px-4 md:py-2 rounded-lg md:rounded-xl leading-none transition-all flex items-center justify-center active:scale-95 ${viewMode === 'board' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Board View"
            >
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Board</span>
              <Hand size={17} className="md:hidden" />
            </button>
          </div>

          <div className="hidden xs:block h-4 w-px bg-black/10 mx-0.5 sm:mx-1" />

          {/* Theme cycle icon only on mobile */}
          <button
            onClick={() => {
              const currentIndex = DASHBOARD_COLORS.findIndex(c => c.value === dashboardColor);
              const nextIndex = (currentIndex + 1) % DASHBOARD_COLORS.length;
              setDashboardColor(DASHBOARD_COLORS[nextIndex].value);
            }}
            className="min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] p-2 sm:p-2.5 md:px-4 md:py-2.5 bg-black/5 rounded-xl md:rounded-2xl border border-black/5 hover:bg-black/10 transition-all group/palette flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95"
            title="Cycle Dashboard Theme"
          >
            <div 
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 rounded-full border-2 border-white shadow-sm transition-transform group-hover/palette:rotate-180 duration-500 shrink-0"
              style={{ backgroundColor: dashboardColor }}
            />
            <div className="hidden md:flex flex-col items-start leading-none text-left">
              <span className={`text-[9px] font-black uppercase tracking-widest ${dashboardColor === '#1a1c1e' ? 'text-white/40' : 'text-slate-400'}`}>Theme</span>
              <span className={`text-[11px] font-bold ${dashboardColor === '#1a1c1e' ? 'text-white' : 'text-slate-700'}`}>
                {DASHBOARD_COLORS.find(c => c.value === dashboardColor)?.name || 'Custom'}
              </span>
            </div>
            <Palette size={17} className={`hidden md:block ${dashboardColor === '#1a1c1e' ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </button>

          <div className="hidden md:block h-4 w-px bg-black/10 mx-1" />

          {/* Storage Buttons - Hide on very small screens or group */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={importData}
              className="min-w-[38px] min-h-[38px] p-2 md:p-3 rounded-xl md:rounded-2xl transition-all hover:bg-black/5 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              title="Restore Storage"
            >
              <Upload size={18} />
            </button>
            <button
              onClick={exportData}
              className="min-w-[38px] min-h-[38px] p-2 md:p-3 rounded-xl md:rounded-2xl transition-all hover:bg-black/5 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              title="Backup Storage"
            >
              <Download size={18} />
            </button>
          </div>
          
          <button
            onClick={() => setIsTemplatesModalOpen(true)}
            className="min-w-[34px] min-h-[34px] sm:min-w-[38px] sm:min-h-[38px] p-1.5 sm:p-2 md:p-3 rounded-xl md:rounded-2xl transition-all hover:bg-black/5 text-slate-400 hover:text-slate-600 flex items-center justify-center"
            title="Note Templates"
          >
            <Type size={18} className="md:w-5 md:h-5" />
          </button>
          
          {/* PWA Install Button (automatically suppresses when already standalone) */}
          <PWAInstallButton />

          {/* Unfinished Notes Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsNotificationOpen(!isNotificationOpen);
                setShowStartupReminder(false);
              }}
              className="relative min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] p-2 sm:p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all hover:bg-black/5 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-95"
              title={unfinishedCount > 0 ? `${unfinishedCount} Unfinished Notes` : "Notifications"}
              aria-label="Unfinished Notes Notification"
            >
              <Bell size={19} className={`md:w-5 md:h-5 ${unfinishedCount > 0 ? "text-slate-700" : "text-slate-400"}`} />
              {unfinishedCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] sm:min-w-[19px] h-[17px] sm:h-[19px] px-1 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white bg-rose-500 rounded-full shadow-md border-2 border-white">
                  {unfinishedCount > 99 ? '99+' : unfinishedCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            <AnimatePresence>
              {isNotificationOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="fixed top-[68px] right-2 sm:absolute sm:top-full sm:right-0 sm:mt-2 w-[calc(100vw-16px)] sm:w-96 max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/10 z-[1000] overflow-hidden flex flex-col text-slate-800"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50/90 border-b border-black/5">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-rose-500" />
                      <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">Unfinished Notes</h3>
                      {unfinishedCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black bg-rose-100 text-rose-600 rounded-full">
                          {unfinishedCount}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setIsNotificationOpen(false)}
                      className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto divide-y divide-black/5 p-1.5">
                    {unfinishedCount === 0 ? (
                      <div className="py-8 px-4 text-center flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2.5 shadow-inner">
                          <CheckCircle2 size={24} />
                        </div>
                        <p className="font-bold text-sm text-slate-700">You're all caught up!</p>
                        <p className="text-xs text-slate-400 mt-0.5">No unfinished notes.</p>
                      </div>
                    ) : (
                      unfinishedNotes.map((note) => {
                        const title = getNoteSummary(note);
                        const timeString = formatNoteTime(note);
                        return (
                          <div
                            key={note.id}
                            onContextMenu={(e) => e.preventDefault()}
                            className="group p-3 hover:bg-slate-50/80 rounded-xl transition-all flex items-center justify-between gap-3"
                          >
                            <div
                              onClick={() => {
                                startEditing(note);
                                setIsNotificationOpen(false);
                              }}
                              className="flex-1 cursor-pointer min-w-0"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${note.color || 'bg-slate-300'} ring-1 ring-black/10 shrink-0`} />
                                <span className="font-bold text-xs text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                  {title}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 pl-4.5">
                                Last edited: <span className="font-medium text-slate-500">{timeString}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  startEditing(note);
                                  setIsNotificationOpen(false);
                                }}
                                className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg transition-all"
                                title="Continue Editing"
                              >
                                CONTINUE
                              </button>
                              <button
                                onClick={(e) => {
                                  markComplete(note.id, e);
                                }}
                                className="px-2 py-1 text-[13px] font-black bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-lg transition-all flex items-center justify-center leading-none"
                                title="Mark as Completed"
                                aria-label="Mark note as completed"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => addNote()}
              className="group/btn px-3 sm:px-5 md:px-8 py-1.5 sm:py-2 md:py-3 bg-indigo-600 text-white rounded-xl md:rounded-[20px] text-[11px] sm:text-xs md:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95 shadow-md shrink-0 min-h-[34px] sm:min-h-[40px] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              <Plus size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="hidden sm:inline">NEW NOTE</span>
              <span className="sm:hidden">ADD NOTE</span>
            </button>

            {/* User Profile & Subscription Account Menu */}
            <UserProfileDropdown />
          </div>
        </div>
      </header>


      <main 
        className={`mx-auto pt-[76px] sm:pt-[96px] md:pt-[130px] pb-16 relative z-10 min-h-[calc(100vh-120px)] w-full max-w-full overflow-x-hidden ${isBoardActive ? 'w-full' : 'max-w-[1600px] px-3.5 sm:px-6 md:px-8'}`}
        style={isBoardActive ? { minHeight: `${Math.max(600, ...notes.map(n => (n.y || 0) + 400))}px` } : {}}
      >
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32 text-slate-400 px-4">
            <div className="p-5 sm:p-6 md:p-8 rounded-full bg-white shadow-inner mb-4 sm:mb-6 border border-black/5">
               <Plus className="opacity-20 w-8 h-8 md:w-12 md:h-12" size={32} />
            </div>
            <p className="text-base sm:text-lg md:text-xl font-semibold opacity-30 italic text-center max-w-xs sm:max-w-md">Start your vocal collection...</p>
          </div>
        ) : (
          <div className={isBoardActive ? "relative w-full min-h-[calc(100vh-140px)]" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 md:gap-8 items-start w-full max-w-md sm:max-w-none mx-auto"}>
            <AnimatePresence mode="popLayout">
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  layout={!isBoardActive}
                  drag={isBoardActive}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    if (isBoardActive) {
                      updateNotePosition(note.id, note.x + info.offset.x, note.y + info.offset.y);
                    }
                  }}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: isBoardActive ? note.x : 0, 
                    y: isBoardActive ? note.y : 0, 
                    rotate: isMobile ? 0 : note.rotation 
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.02, zIndex: 10, y: !isBoardActive ? -6 : (note.y - 6), transition: { duration: 0.2 } }}
                  whileDrag={{ scale: 1.1, zIndex: 100, boxShadow: "0 40px 80px rgba(0,0,0,0.2)" }}
                  onClick={() => startEditing(note)}
                  style={isBoardActive ? { position: 'absolute', top: 0, left: 0 } : {}}
                  className={`
                    relative w-full h-[280px] xs:h-[295px] sm:h-[310px] md:h-[330px] max-h-[340px] p-4 sm:p-5 md:p-[22px] flex flex-col items-start
                    note-shadow hover:note-shadow-hover paper-texture
                    border border-black/5 rounded-2xl md:rounded-3xl
                    transition-all duration-300 note-corner-fold group
                    ${openMenuId === note.id ? '!overflow-visible !z-50 ring-2 ring-indigo-500/20' : 'overflow-hidden z-0'}
                    ${isBoardActive ? '!w-[280px] md:!w-[310px] cursor-grab active:cursor-grabbing' : 'w-full cursor-pointer'}
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
                  
                  <div className="note-header w-full flex justify-between items-center text-[11px] uppercase tracking-[2.5px] font-black opacity-30 mb-2.5 shrink-0 pointer-events-none">
                    <div className="flex items-center gap-1">
                       <div className="w-2 h-2 rounded-full bg-white/50" />
                       <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}</span>
                    </div>
                    {note.completed && <span className="bg-black/10 px-2 py-0.5 rounded italic lowercase tracking-normal">Done</span>}
                  </div>

                  {note.image && (
                    <div className="relative w-full mb-2.5 shrink-0 pointer-events-none max-h-24 md:max-h-28 overflow-hidden rounded-xl">
                      <img 
                        src={note.image} 
                        alt="Attached photo" 
                        className="w-full h-full object-cover rounded-xl shadow-sm border border-black/5" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="w-full flex-1 min-h-0 flex flex-col relative overflow-hidden my-0.5">
                    {/* Drawing Layer Preview */}
                    {(note.drawingLines && note.drawingLines.length > 0) && (
                      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                        <Stage width={280} height={220} className="w-full h-full">
                          <Layer>
                            <Group x={note.drawingOffset?.x || 0} y={note.drawingOffset?.y || 0}>
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
                            </Group>
                          </Layer>
                        </Stage>
                      </div>
                    )}

                    <div 
                      className="w-full flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1.5 leading-[1.45] text-[#222] break-words relative z-10 note-content custom-scrollbar pointer-events-auto"
                      style={{ 
                        fontSize: `${Math.min(18, Math.max(13, (note.fontSize || 48) / 2.7))}px`
                      }}
                      dangerouslySetInnerHTML={{ __html: note.content || (!note.image && !note.drawingLines?.length ? '<span class="opacity-20 italic">Empty note...</span>' : '') }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2 pt-2 mt-auto shrink-0 w-full opacity-70 sm:opacity-40 sm:group-hover:opacity-100 transition-all transform translate-y-0 relative z-20 pointer-events-auto border-t border-black/[0.04]">
                    <button
                      onClick={(e) => toggleComplete(note.id, e)}
                      className={`min-w-[36px] min-h-[36px] p-2 rounded-xl transition-colors border border-black/10 flex items-center justify-center ${note.completed ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/20 hover:bg-emerald-500 hover:text-white text-emerald-600'}`}
                      title={note.completed ? "Mark as Incomplete" : "Mark as Completed"}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={(e) => changeColor(note.id, e)}
                      className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-white/20 hover:bg-white text-purple-600 transition-colors border border-black/10 flex items-center justify-center"
                      title="Warp Spectrum"
                    >
                      <Palette size={16} />
                    </button>
                    <button
                      onClick={(e) => toggleDrawing(note.id, e)}
                      className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-white/20 hover:bg-purple-600 hover:text-white text-purple-700 transition-colors border border-black/10 flex items-center justify-center"
                      title="Sketch Note"
                    >
                      <Pencil size={16} />
                    </button>

                    {/* Three-Dot Options Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => toggleMenu(note.id, e)}
                        className={`min-w-[36px] min-h-[36px] p-2 rounded-xl transition-colors border border-black/10 flex items-center justify-center ${openMenuId === note.id ? 'bg-black text-white shadow-md' : 'bg-white/20 hover:bg-white text-slate-700'}`}
                        title="More Options"
                        aria-label="More Options"
                      >
                        <MoreVertical size={16} />
                      </button>

                      <AnimatePresence>
                        {openMenuId === note.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -6 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-full right-0 mb-2 w-48 sm:w-52 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/10 z-[200] p-1.5 flex flex-col gap-0.5 text-slate-700 text-xs font-semibold overflow-visible"
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditing(note); setOpenMenuId(null); }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 text-slate-800 transition-colors w-full text-left min-h-[40px]"
                            >
                              <Edit3 size={15} className="text-slate-500" />
                              <span>Edit Note</span>
                            </button>
                            <button
                              onClick={(e) => toggleDrawing(note.id, e)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 text-purple-600 transition-colors w-full text-left min-h-[40px]"
                            >
                              <Pencil size={15} />
                              <span>Sketch / Draw</span>
                            </button>
                            <button
                              onClick={(e) => triggerGallery(note.id, e)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 text-blue-600 transition-colors w-full text-left min-h-[40px]"
                            >
                              <ImageIcon size={15} />
                              <span>Attach Photo</span>
                            </button>
                            <button
                              onClick={(e) => changeColor(note.id, e)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 text-amber-600 transition-colors w-full text-left min-h-[40px]"
                            >
                              <Palette size={15} />
                              <span>Cycle Color</span>
                            </button>
                            <button
                              onClick={(e) => toggleComplete(note.id, e)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 text-emerald-600 transition-colors w-full text-left min-h-[40px]"
                            >
                              <Check size={15} />
                              <span>{note.completed ? 'Mark Incomplete' : 'Mark Completed'}</span>
                            </button>
                            <div className="h-px bg-black/5 my-0.5" />
                            <button
                              onClick={(e) => deleteNote(note.id, e)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors w-full text-left min-h-[40px]"
                            >
                              <Trash2 size={15} />
                              <span>Delete Note</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={(e) => deleteNote(note.id, e)}
                      className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-white/20 hover:bg-red-500 hover:text-white text-red-500 transition-colors border border-black/10 flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
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
            <header className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3.5 flex items-center justify-between border-b border-black/5 bg-white/90 backdrop-blur-xl shrink-0 min-h-[66px] sm:min-h-[72px] relative z-[100] gap-2.5 overflow-x-auto no-scrollbar touch-pan-x">
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button 
                  onClick={saveNote}
                  className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 hover:bg-black/5 rounded-full transition-colors text-slate-600 flex items-center justify-center active:scale-95"
                  title="Back & Save"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} className="sm:w-[22px] sm:h-[22px]" />
                </button>
                <div className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${notes.find(n => n.id === activeNoteId)?.color} bg-opacity-40 border border-black/5 shadow-sm shrink-0`}>
                  <span className="hidden xs:inline">{isDrawing ? 'Sketch Mode' : 'Write Mode'}</span>
                  <span className="xs:hidden">{isDrawing ? 'Sketch' : 'Write'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0">
                {/* Repositioned Sketch Tools: undo, redo, pen, eraser, pan, color swatches, clear, reset zoom */}
                {isDrawing && activeNoteId && (
                  <div className="flex items-center gap-1 sm:gap-1.5 bg-black/5 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-black/5 shrink-0 touch-pan-x">
                    {/* Undo Stroke */}
                    <button
                      onClick={undoDrawing}
                      disabled={drawingHistory.length === 0}
                      className={`min-w-[34px] min-h-[34px] sm:min-w-[38px] sm:min-h-[38px] p-2 rounded-lg sm:rounded-xl transition-all flex items-center justify-center active:scale-95 ${
                        drawingHistory.length === 0 ? 'opacity-30 cursor-not-allowed text-slate-400' : 'hover:bg-black/10 text-slate-700'
                      }`}
                      title="Undo Stroke"
                      aria-label="Undo Stroke"
                    >
                      <RotateCcw size={16} className="sm:w-4.5 sm:h-4.5" />
                    </button>

                    {/* Redo Stroke */}
                    <button
                      onClick={redoDrawing}
                      disabled={drawingRedoStack.length === 0}
                      className={`min-w-[34px] min-h-[34px] sm:min-w-[38px] sm:min-h-[38px] p-2 rounded-lg sm:rounded-xl transition-all flex items-center justify-center active:scale-95 ${
                        drawingRedoStack.length === 0 ? 'opacity-30 cursor-not-allowed text-slate-400' : 'hover:bg-black/10 text-slate-700'
                      }`}
                      title="Redo Stroke"
                      aria-label="Redo Stroke"
                    >
                      <RotateCw size={16} className="sm:w-4.5 sm:h-4.5" />
                    </button>

                    <div className="w-px h-5 bg-black/10 mx-0.5" />

                    <button
                      onClick={() => setDrawTool('pen')}
                      className={`min-w-[34px] min-h-[34px] sm:min-w-[38px] sm:min-h-[38px] p-2 rounded-lg sm:rounded-xl transition-all flex items-center justify-center active:scale-95 ${drawTool === 'pen' ? 'bg-black text-white shadow-sm' : 'hover:bg-black/10 text-slate-700'}`}
                      title="Pen Tool"
                      aria-label="Pen Tool"
                    >
                      <Pencil size={16} className="sm:w-4.5 sm:h-4.5" />
                    </button>
                    <button
                      onClick={() => setDrawTool('eraser')}
                      className={`min-w-[34px] min-h-[34px] sm:min-w-[38px] sm:min-h-[38px] p-2 rounded-lg sm:rounded-xl transition-all flex items-center justify-center active:scale-95 ${drawTool === 'eraser' ? 'bg-black text-white shadow-sm' : 'hover:bg-black/10 text-slate-700'}`}
                      title="Eraser Tool"
                      aria-label="Eraser Tool"
                    >
                      <Eraser size={16} className="sm:w-4.5 sm:h-4.5" />
                    </button>
                    <button
                      onClick={() => setDrawTool('pan')}
                      className={`min-w-[34px] min-h-[34px] sm:min-w-[38px] sm:min-h-[38px] p-2 rounded-lg sm:rounded-xl transition-all flex items-center justify-center active:scale-95 ${drawTool === 'pan' ? 'bg-black text-white shadow-sm' : 'hover:bg-black/10 text-slate-700'}`}
                      title="Move Drawing (Drag strokes with finger/mouse)"
                      aria-label="Pan Tool"
                    >
                      <Hand size={16} className="sm:w-4.5 sm:h-4.5" />
                    </button>

                    <div className="w-px h-5 bg-black/10 mx-0.5" />

                    {/* Color Swatches */}
                    <div className="flex items-center gap-1.5 px-0.5">
                      {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'].map(c => (
                        <button
                          key={c}
                          onClick={() => { setDrawColor(c); setDrawTool('pen'); }}
                          className={`w-6 h-6 sm:w-6.5 sm:h-6.5 shrink-0 rounded-full border border-black/10 transition-all hover:scale-110 active:scale-95 ${drawColor === c && drawTool === 'pen' ? 'ring-2 ring-black ring-offset-1 scale-105' : ''}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>

                    <div className="w-px h-5 bg-black/10 mx-0.5" />

                    {/* Clear Canvas */}
                    <button
                      onClick={(e) => clearDrawing(activeNoteId, e)}
                      className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] px-2 py-1.5 rounded-lg sm:rounded-xl hover:bg-orange-50 text-slate-600 hover:text-orange-600 transition-all flex items-center justify-center gap-1 text-[11px] font-bold active:scale-95"
                      title="Clear Canvas"
                      aria-label="Clear Canvas"
                    >
                      <Trash2 size={15} className="sm:w-4 sm:h-4" />
                      <span className="hidden xl:inline">Clear</span>
                    </button>

                    {/* Reset Zoom */}
                    <button
                      onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }}
                      className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] p-2 rounded-lg sm:rounded-xl hover:bg-black/10 text-slate-500 transition-all flex items-center justify-center active:scale-95"
                      title="Reset Zoom"
                      aria-label="Reset Zoom"
                    >
                      <Maximize size={15} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                )}

                {/* Pencil / Sketch Mode Switcher */}
                <button
                  onClick={() => setIsDrawing(!isDrawing)}
                  className={`min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center active:scale-95 shrink-0 ${isDrawing ? 'bg-purple-600 text-white shadow-md' : 'bg-black/5 hover:bg-black/10 text-slate-700'}`}
                  title={isDrawing ? "Switch to Writing Mode" : "Switch to Sketch Mode"}
                  aria-label={isDrawing ? "Writing Mode" : "Sketch Mode"}
                >
                  <Pencil size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* Voice Dictation Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isRecording || shouldKeepRecordingRef.current) {
                      stopVoiceRecording();
                    } else {
                      startVoiceRecording('note', e);
                    }
                  }}
                  className={`min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-1.5 active:scale-95 font-bold text-xs shrink-0 ${
                    isRecording 
                      ? 'bg-red-500 text-white shadow-lg animate-pulse ring-2 ring-red-400' 
                      : micPermissionStatus === 'denied'
                        ? 'bg-red-50 text-red-500 border border-red-200'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60'
                  }`}
                  title={isRecording ? "Stop Voice Dictation" : (micPermissionStatus === 'denied' ? "Microphone Blocked" : "Voice Dictate to Note")}
                  aria-label="Voice Dictation"
                >
                  {micPermissionStatus === 'denied' ? (
                    <MicOff size={18} className="sm:w-5 sm:h-5 text-red-500" />
                  ) : (
                    <Mic size={18} className={`sm:w-5 sm:h-5 ${isRecording ? 'text-white' : 'text-rose-600'}`} />
                  )}
                  <span className="hidden xs:inline text-[11px] font-black uppercase tracking-wider">
                    {isRecording ? 'Listening...' : 'Dictate'}
                  </span>
                </button>

                {/* Attach Photo Button */}
                <button
                  onClick={(e) => triggerGallery(activeNoteId, e)}
                  className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl hover:bg-black/5 text-slate-500 hover:text-blue-500 transition-all flex items-center justify-center active:scale-95 shrink-0"
                  title="Attach Photo"
                  aria-label="Attach Photo"
                >
                  <ImageIcon size={19} className="sm:w-5 sm:h-5" />
                </button>

                {/* Cycle Note Color Theme */}
                <button
                  onClick={(e) => changeColor(activeNoteId!, e)}
                  className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl hover:bg-black/5 text-slate-500 hover:text-purple-600 transition-all flex items-center justify-center active:scale-95 shrink-0"
                  title="Cycle Note Color"
                  aria-label="Cycle Note Color"
                >
                  <Palette size={19} className="sm:w-5 sm:h-5" />
                </button>

                {/* Font Size Controls */}
                <div className="flex items-center gap-0.5 sm:gap-1 bg-black/5 p-1 rounded-xl sm:rounded-[20px] shrink-0">
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      setEditFontSize(prev => Math.max(12, prev - 4));
                    }}
                    className="w-8 h-8 sm:w-[34px] sm:h-[34px] rounded-lg sm:rounded-xl hover:bg-white text-slate-600 hover:text-black transition-all flex items-center justify-center font-bold active:scale-95 text-xs sm:text-sm"
                    title="Smaller text"
                    aria-label="Smaller text"
                  >
                    <Minus size={14} className="sm:w-4 sm:h-4" />
                  </button>
                  <div className="px-1 text-[10px] sm:text-xs font-bold text-slate-500 w-5 sm:w-6 text-center select-none">
                    {editFontSize}
                  </div>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      setEditFontSize(prev => Math.min(120, prev + 4));
                    }}
                    className="w-8 h-8 sm:w-[34px] sm:h-[34px] rounded-lg sm:rounded-xl hover:bg-white text-slate-600 hover:text-black transition-all flex items-center justify-center font-bold active:scale-95 text-xs sm:text-sm"
                    title="Larger text"
                    aria-label="Larger text"
                  >
                    <Plus size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Bold & Underline Formatting Controls with touch/click preventDefault */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      applyFormat('bold', e);
                    }}
                    className={`min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center active:scale-95 ${
                      isBold ? 'bg-black text-white shadow-sm' : 'bg-black/5 hover:bg-black/10 text-slate-700'
                    }`}
                    title="Bold"
                    aria-label="Bold"
                  >
                    <Bold size={17} className="sm:w-[18px] sm:h-[18px]" />
                  </button>

                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      applyFormat('underline', e);
                    }}
                    className={`min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center active:scale-95 ${
                      isUnderline ? 'bg-black text-white shadow-sm' : 'bg-black/5 hover:bg-black/10 text-slate-700'
                    }`}
                    title="Underline"
                    aria-label="Underline"
                  >
                    <Underline size={17} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>

                {/* AI Chat Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsChatOpen(!isChatOpen);
                  }}
                  className={`min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center active:scale-95 shrink-0 ${isChatOpen ? 'bg-blue-600 text-white shadow-md' : 'bg-black/5 hover:bg-blue-50 text-slate-600 hover:text-blue-600'}`}
                  title="AI Assistant Chat"
                  aria-label="AI Chat"
                >
                  <MessageCircle size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* Delete Note Button */}
                <button
                  onClick={(e) => deleteNote(activeNoteId!, e)}
                  className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center active:scale-95 shrink-0"
                  title="Delete Note"
                  aria-label="Delete Note"
                >
                  <Trash2 size={18} className="sm:w-5 sm:h-5" />
                </button>

                <div className="hidden sm:block w-px h-6 bg-black/5 mx-0.5" />

                {/* Save & Close Button */}
                <button
                  onClick={saveNote}
                  className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 sm:p-2.5 bg-black text-white rounded-xl sm:rounded-2xl hover:bg-slate-800 transition-all shadow-md flex items-center justify-center active:scale-95 shrink-0"
                  title="Save & Close"
                  aria-label="Save and Close"
                >
                  <CheckCircle2 size={19} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </header>


            {/* Hybrid Note Editor Body & Sidebar AI */}
            <div className="flex-1 flex overflow-hidden">
              <div className={`flex-1 relative overflow-hidden flex flex-col transition-all duration-500 ${notes.find(n => n.id === activeNoteId)?.color}`}>
                <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-12 lg:p-24 relative flex flex-col min-h-0 overflow-y-auto">
                  
                  {/* Voice Dictation Active Banner */}
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 mx-auto px-4 py-2 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-xl flex flex-wrap items-center justify-center gap-2 border border-white/10 z-30 max-w-full text-center"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                      <span className="font-bold tracking-wider uppercase text-[10px] text-red-400">Listening:</span>
                      {liveInterimText ? (
                        <span className="font-semibold text-indigo-200 text-xs sm:text-sm bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-xl animate-pulse max-w-full truncate">
                          "{liveInterimText}"
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">
                          Voice active. Say <span className="text-white font-semibold">"next line"</span>, <span className="text-white font-semibold">"next paragraph"</span>, <span className="text-white font-semibold">"delete that"</span>, <span className="text-white font-semibold">"stop listening"</span>, or <span className="text-white font-semibold">"bold [words]"</span>
                        </span>
                      )}
                      <button
                        onClick={() => stopVoiceRecording()}
                        className="ml-1 sm:ml-2 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all min-h-[32px] flex items-center justify-center"
                      >
                        Stop
                      </button>
                    </motion.div>
                  )}
                  
                  {/* Photo Layer */}
                  {notes.find(n => n.id === activeNoteId)?.image && (
                    <div className="relative mb-4 sm:mb-6 group shrink-0 z-10 w-full max-w-2xl mx-auto">
                      <img 
                        src={notes.find(n => n.id === activeNoteId)?.image} 
                        className="w-full max-h-[25vh] sm:max-h-[30vh] object-contain rounded-2xl shadow-xl transition-all"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => removeImage(activeNoteId)}
                        className="absolute top-3 right-3 min-w-[36px] min-h-[36px] p-2 bg-black/60 text-white rounded-full hover:bg-black transition-colors flex items-center justify-center"
                      >
                        <X size={18} />
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
                      fontSize: `${isMobile ? Math.min(28, Math.max(16, editFontSize * 0.65)) : editFontSize}px`,
                      fontWeight: 500
                    }}
                    className={`flex-1 w-full bg-transparent focus:outline-none leading-[1.35] text-[#333] note-content z-10 relative overflow-y-auto whitespace-pre-wrap ${isDrawing ? 'pointer-events-none' : 'pointer-events-auto'} min-h-[160px] pb-16`}
                  />
                  
                  {/* Live Speech Interim Preview Pill (Temporary, strictly separated from note body) */}
                  {isRecording && liveInterimText && (
                    <div className="z-20 my-2 px-3.5 py-2 rounded-xl bg-indigo-500/15 border border-indigo-400/40 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-semibold italic animate-pulse flex items-center gap-2 max-w-full">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-ping" />
                      <span className="truncate">Hearing: "{liveInterimText}"</span>
                    </div>
                  )}

                  {/* Character Count */}
                  <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-10 md:right-10 z-30 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-black text-white rounded-full text-[9px] font-black tracking-[0.2em] shadow-xl pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                    <span>{editContent.replace(/<[^>]*>/g, '').length}</span>
                    <div className="w-px h-2 bg-white/20" />
                    <span>{MAX_CHARS}</span>
                  </div>
                  {(editContent === '' || editContent === '<br>') && (
                    <div className="absolute top-0 left-0 text-slate-300 pointer-events-none italic opacity-50" style={{ fontSize: `${isMobile ? Math.min(28, Math.max(16, editFontSize * 0.65)) : editFontSize}px` }}>
                      Type your thoughts...
                    </div>
                  )}

                  {/* Drawing Layer Overlay */}
                  <div 
                    ref={canvasContainerRef} 
                    className={`absolute inset-0 z-20 touch-none ${isDrawing ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                    style={{ touchAction: 'none' }}
                  >
                    <Stage
                      width={canvasSize.width}
                      height={canvasSize.height}
                      scaleX={stageScale}
                      scaleY={stageScale}
                      x={stagePos.x}
                      y={stagePos.y}
                      draggable={drawTool === 'pan' && !((notes.find(n => n.id === activeNoteId)?.drawingLines || []).length > 0)}
                      onDragEnd={(e) => {
                        setStagePos({ x: e.target.x(), y: e.target.y() });
                      }}
                      onMouseDown={handlePointerDown}
                      onMouseMove={handlePointerMove}
                      onMouseUp={handlePointerUp}
                      onTouchStart={handlePointerDown}
                      onTouchMove={handlePointerMove}
                      onTouchEnd={handlePointerUp}
                      onWheel={handleWheel}
                    >
                      <Layer>
                        <Group
                          x={notes.find(n => n.id === activeNoteId)?.drawingOffset?.x || 0}
                          y={notes.find(n => n.id === activeNoteId)?.drawingOffset?.y || 0}
                          draggable={drawTool === 'pan'}
                          onDragEnd={(e) => {
                            e.cancelBubble = true;
                            const currentNote = notes.find(n => n.id === activeNoteId);
                            if (activeNoteId && currentNote?.drawingLines?.length) {
                              saveDrawingToHistory(currentNote);
                              // Persist the group transform on the note instead of
                              // rewriting every stroke coordinate after each move.
                              updateDrawingOffset(activeNoteId, {
                                x: e.target.x(),
                                y: e.target.y(),
                              });
                            }
                          }}
                        >
                          {(notes.find(n => n.id === activeNoteId)?.drawingLines || []).map((line, i) => (
                            <KonvaLine
                              key={i}
                              points={line.points}
                              stroke={line.color}
                              strokeWidth={line.strokeWidth}
                              hitStrokeWidth={Math.max(28, line.strokeWidth)}
                              tension={0.5}
                              lineCap="round"
                              lineJoin="round"
                              globalCompositeOperation={
                                line.tool === 'eraser' ? 'destination-out' : 'source-over'
                              }
                            />
                          ))}
                        </Group>
                      </Layer>
                    </Stage>
                  </div>
                </div>
              </div>

              {/* Sidebar Chat Box */}
              <AnimatePresence>
                {isChatOpen && activeNoteId && (
                  <>
                    {/* Mobile Backdrop Overlay */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsChatOpen(false)}
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[290] md:hidden"
                    />

                    {/* Chat Drawer / Window */}
                    <motion.div
                      initial={{ x: '100%', opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: '100%', opacity: 0 }}
                      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                      className="fixed md:relative inset-0 md:inset-auto w-full md:w-[420px] h-[100dvh] md:h-full bg-slate-950 border-l border-white/10 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-[300] max-w-full"
                    >
                      <div className="px-4 py-3 sm:p-5 md:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0 min-h-[56px] sm:min-h-[64px]">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
                            <Sparkles size={18} className="text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold tracking-tight text-sm sm:text-base">Vocal AI</span>
                            <span className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-widest font-black leading-none mt-0.5">Note Assistant</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsChatOpen(false)} 
                          className="p-2 sm:p-2.5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white min-w-[40px] min-h-[40px] flex items-center justify-center active:scale-95"
                          title="Close AI Assistant"
                          aria-label="Close AI Assistant"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-4 sm:space-y-6 relative bg-slate-950 min-h-0">
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
                        
                        <div ref={chatEndRef} />
                      </div>

                      <div className="p-3 sm:p-4 md:p-6 bg-slate-900 border-t border-white/10 flex flex-col gap-2.5 sm:gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => {
                              const val = e.target.value.slice(0, MAX_CHARS);
                              setChatInput(val);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Message Vocal AI..."
                            className="flex-1 bg-white/10 border border-white/10 rounded-xl md:rounded-2xl px-3.5 sm:px-5 py-2.5 sm:py-3.5 text-sm md:text-[15px] text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium min-h-[44px]"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRecording && currentTargetRef.current === 'chat') {
                                stopVoiceRecording();
                              } else {
                                startVoiceRecording('chat', e);
                              }
                            }}
                            className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl md:rounded-2xl transition-all flex items-center justify-center shrink-0 ${
                              isRecording && currentTargetRef.current === 'chat'
                                ? 'bg-rose-500 text-white animate-pulse shadow-lg'
                                : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                            }`}
                            title={isRecording && currentTargetRef.current === 'chat' ? 'Stop recording' : 'Voice input'}
                            aria-label="Voice input for chat"
                          >
                            {isRecording && currentTargetRef.current === 'chat' ? <MicOff size={16} /> : <Mic size={16} />}
                          </button>
                          <button
                            onClick={handleSendMessage}
                            disabled={isLoading || !chatInput.trim()}
                            className="min-w-[44px] min-h-[44px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-wider text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shrink-0"
                            title="Send"
                            aria-label="Send message"
                          >
                            <Send size={15} />
                            <span className="hidden sm:inline">Send</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates Modal */}
      <AnimatePresence>
        {isTemplatesModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6">
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
              className="relative w-full max-w-4xl bg-white rounded-2xl md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[90vh] md:max-h-[80vh]"
            >
              <div className="px-4 sm:px-8 md:px-12 py-3.5 sm:py-6 md:py-8 flex items-center justify-between border-b border-black/5 shrink-0">
                <div>
                  <h2 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight">Templates</h2>
                  <p className="hidden xs:block text-xs sm:text-sm text-slate-400 font-medium">Quick start your thoughts</p>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  <button
                    onClick={() => generateAIContent('template')}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 md:py-3 bg-indigo-600 text-white rounded-xl md:rounded-2xl hover:bg-indigo-700 transition-all shadow-md font-bold text-xs md:text-sm min-h-[38px] sm:min-h-[42px]"
                  >
                    <Wand2 size={16} className="md:w-5 md:h-5" />
                    <span>AI Generate</span>
                  </button>
                  <button 
                    onClick={() => setIsTemplatesModalOpen(false)}
                    className="min-w-[38px] min-h-[38px] p-2 md:p-3 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center text-slate-500"
                  >
                    <X size={20} className="md:w-6 md:h-6" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-8 md:p-12 overflow-y-auto flex-1">
                {templates.length === 0 ? (
                  <div className="py-16 sm:py-20 text-center text-slate-300">
                    <Sparkles className="mx-auto mb-4 opacity-20" size={56} />
                    <p className="text-base sm:text-lg md:text-xl italic font-medium">No templates saved yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 md:gap-6">
                    {templates.map(template => (
                      <div 
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className={`group relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md sm:shadow-lg border border-black/5 ${template.color}`}
                      >
                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                          <h3 className="font-bold text-base sm:text-lg truncate pr-6 sm:pr-8">{template.name}</h3>
                          <button 
                            onClick={(e) => deleteTemplate(template.id, e)}
                            className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 min-w-[32px] min-h-[32px] p-1.5 hover:bg-black/10 rounded-full transition-all flex items-center justify-center"
                          >
                            <Trash2 size={16} className="text-black/60" />
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm opacity-60 line-clamp-3 leading-relaxed note-content" dangerouslySetInnerHTML={{ __html: template.content || "Visual Template" }} />
                        <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-black/5 px-2.5 sm:px-3 py-1 rounded-full w-fit">
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

      {/* Startup Reminder Toast for Unfinished Notes */}
      <AnimatePresence>
        {showStartupReminder && unfinishedCount > 0 && !activeNoteId && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 right-6 z-[150] max-w-sm w-[calc(100vw-3rem)] bg-white/95 backdrop-blur-xl border border-rose-100 rounded-2xl shadow-2xl p-4 text-slate-800"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 shadow-inner">
                <Bell size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                    Unfinished Notes
                    <span className="px-1.5 py-0.5 text-[10px] font-black bg-rose-100 text-rose-600 rounded-full">
                      {unfinishedCount}
                    </span>
                  </h4>
                  <button
                    onClick={() => setShowStartupReminder(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  {unfinishedCount === 1
                    ? "You have 1 unfinished note waiting. Continue where you left off?"
                    : `You have ${unfinishedCount} unfinished notes waiting. Continue where you left off?`}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => {
                      setShowStartupReminder(false);
                      setIsNotificationOpen(true);
                    }}
                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    View Notes
                  </button>
                  <button
                    onClick={() => setShowStartupReminder(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Non-blocking Floating In-App Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-[9999] max-w-sm sm:max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-3.5 flex items-start gap-3 pointer-events-auto font-sans"
            role="status"
          >
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
              toast.type === 'error' ? 'bg-rose-500' :
              toast.type === 'warning' ? 'bg-amber-500' :
              toast.type === 'success' ? 'bg-emerald-500' :
              'bg-indigo-500'
            }`} />
            <p className="text-xs font-medium text-zinc-800 flex-1 leading-relaxed">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md text-xs shrink-0"
              aria-label="Dismiss notice"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .note-content b, .note-content strong { font-weight: 700; }
        .note-content u { text-decoration: underline; }
        .note-content s, .note-content strike, .note-content del { text-decoration: none; }
        .note-content p { margin: 0 0 0.35em 0; }
        .note-content p:last-child { margin-bottom: 0; }
        .note-content ul, .note-content ol { margin: 0.2em 0 0.4em 1.25em; }
        .note-content h1, .note-content h2, .note-content h3 { margin: 0 0 0.35em 0; line-height: 1.2; }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthGuard>
      <NotesApp />
      <SubscriptionView />
      <StudentVerificationModal />
      <LogoutConfirmModal />
    </AuthGuard>
  );
}
