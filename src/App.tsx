/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, Check, X, Palette, MessageCircle, Send, Sparkles, Loader2, Image as ImageIcon, Camera, MoreVertical, CheckCircle2, Mic, MicOff, Pencil, Eraser, ArrowLeft, Wand2, Bold, Type, Minus, Underline, Hand, Maximize, StickyNote, Download, Upload, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { loadOfflineSnapshot, saveOfflineSnapshot } from './offlineStorage';
import { activatePWAUpdate } from './pwa';

import { Stage, Layer, Line as KonvaLine } from 'react-konva';

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
  const notesRef = useRef<Note[]>([]);
  const templatesRef = useRef<Template[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [offlineStorageReady, setOfflineStorageReady] = useState(false);
  const offlineSaveTimerRef = useRef<number | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showIosInstallHelp, setShowIosInstallHelp] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
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
  const activeNoteIdRef = useRef<string | null>(null);
  const [showLastNoteSummary, setShowLastNoteSummary] = useState(false);
  const [lastSummaryNoteId, setLastSummaryNoteId] = useState<string | null>(null);
  const lastLeavingNoteIdRef = useRef<string | null>(null);
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
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!showNotificationMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-notification-control]')) {
        setShowNotificationMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showNotificationMenu]);

  // Install experience, connection status, and service-worker updates.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const updateInstalledState = () => {
      const iosStandalone = (window.navigator as any).standalone === true;
      setIsAppInstalled(mediaQuery.matches || iosStandalone);
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsAppInstalled(true);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    updateInstalledState();
    setIsOnline(navigator.onLine);
    mediaQuery.addEventListener?.('change', updateInstalledState);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mediaQuery.removeEventListener?.('change', updateInstalledState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) setUpdateAvailable(true);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });
  }, []);

  const isIosDevice = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const canInstallApp = !isAppInstalled && (!!deferredInstallPrompt || isIosDevice);

  const installApp = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice?.outcome === 'accepted') setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
      return;
    }

    if (isIosDevice) setShowIosInstallHelp(true);
  };

  const getLastNoteSummary = (note?: Note) => {
    if (!note) return 'You have no notes yet.';
    const plainText = note.content
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();

    if (!plainText) return 'Your latest note is empty.';
    const sentences = plainText.split(/(?<=[.!?])\s+/).filter(Boolean);
    const summary = sentences.slice(0, 2).join(' ');
    return (summary || plainText).slice(0, 180) + ((summary || plainText).length > 180 ? '…' : '');
  };

  const requestNoteNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      const lastNote = notes[0];
      new Notification('Vocal Note — Latest Note', {
        body: getLastNoteSummary(lastNote),
        icon: '/icon.svg',
        tag: 'vocal-note-latest-summary'
      });
    }
  };

  const notifyLatestNote = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      setShowNotificationMenu(true);
      return;
    }

    const lastNote = notes[0];
    new Notification('Vocal Note — Latest Note', {
      body: getLastNoteSummary(lastNote),
      icon: '/icon.svg',
      tag: 'vocal-note-latest-summary'
    });
  };

  // Load notes and templates from durable offline storage.
  // IndexedDB is the primary store; existing localStorage data is migrated once.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const snapshot = await loadOfflineSnapshot();
      if (cancelled) return;

      if (snapshot) {
        setNotes(snapshot.notes as Note[]);
        setTemplates(snapshot.templates as Template[]);
      }

      setOfflineStorageReady(true);

      const hasVisited = localStorage.getItem('vocal-note-visited');
      if (!hasVisited && !(snapshot?.notes?.length)) {
        setTimeout(() => {
          const welcomeId = Date.now().toString();
          const welcomeNote: Note = {
            id: welcomeId,
            content: `<h1 style="font-size: 1.5em; font-weight: 900; margin-bottom: 0.5em;">Welcome to Vocal Note! 🎤</h1><p>Your premium space for voice-captured thoughts. Try these features:</p><ul style="margin-top: 1em; list-style-type: disc; padding-left: 1.5em;"><li><b>Voice Dictation:</b> Hit the mic and start talking.</li><li><b>AI Assistant:</b> Brainstorm ideas right in the chat.</li><li><b>Sketch Mode:</b> Draw your visions with the pencil tool.</li></ul><p style="margin-top: 1em; font-style: italic; opacity: 0.7;">Feel free to delete this note or make it your own!</p>`,
            color: 'bg-note-indigo', rotation: -1 + Math.random() * 2, x: 100, y: 100,
          };
          setNotes(prev => [welcomeNote, ...prev]);
          setActiveNoteId(welcomeId);
          setEditContent(welcomeNote.content);
          setEditFontSize(48);
          setIsChatOpen(true);
          localStorage.setItem('vocal-note-visited', 'true');
        }, 1000);
      }

      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' as any }).then(result => {
          setMicPermissionStatus(result.state);
          result.onchange = () => setMicPermissionStatus(result.state);
        }).catch(err => console.warn("Permissions API not fully supported for microphone query:", err));
      } else {
        setMicPermissionStatus('prompt');
      }
    };

    load().catch((error) => {
      console.error('Failed to initialize offline storage:', error);
      setOfflineStorageReady(true);
    });

    return () => { cancelled = true; };
  }, []);

  // Keep a current notes reference for navigation/event handlers without
  // re-registering browser history listeners every time a note is edited.
  useEffect(() => {
    notesRef.current = notes;
    templatesRef.current = templates;
  }, [notes, templates]);
  
  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);

  // Persist the complete workspace after every change. IndexedDB keeps the
  // workspace available even when the browser is offline or localStorage is full.
  useEffect(() => {
    if (!offlineStorageReady) return;

    if (offlineSaveTimerRef.current !== null) {
      window.clearTimeout(offlineSaveTimerRef.current);
    }

    offlineSaveTimerRef.current = window.setTimeout(() => {
      void saveOfflineSnapshot(notesRef.current, templatesRef.current);
      offlineSaveTimerRef.current = null;
    }, 250);

    return () => {
      if (offlineSaveTimerRef.current !== null) {
        window.clearTimeout(offlineSaveTimerRef.current);
        offlineSaveTimerRef.current = null;
      }
    };
  }, [notes, templates, offlineStorageReady]);

  useEffect(() => {
    if (!offlineStorageReady) return;
    const flush = () => { void saveOfflineSnapshot(notesRef.current, templatesRef.current); };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [offlineStorageReady]);

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
      if (editorRef.current.innerHTML !== editContent) editorRef.current.innerHTML = editContent;
      normalizeEditorUnderlines(editorRef.current);
    }
  }, [activeNoteId, editContent]);

  // Keep browser navigation synchronized with the single-note editor.
  // The list is the base entry. Each opened note gets one dedicated entry.
  useEffect(() => {
    if (!offlineStorageReady) return;

    const getNoteIdFromLocation = () => {
      const state = window.history.state;
      if (state?.vocalNoteEditor) return state.vocalNoteEditor as string;
      const match = window.location.hash.match(/^#note-(.+)$/);
      return match ? decodeURIComponent(match[1]) : null;
    };

    const closeEditor = (showSummary = true) => {
      const leavingNoteId = lastLeavingNoteIdRef.current || activeNoteIdRef.current;
      setActiveNoteId(null);
      setIsDrawing(false);
      setIsChatOpen(false);
      setIsEditorMenuOpen(false);
      setOpenMenuId(null);

      if (showSummary && leavingNoteId && notesRef.current.some(n => n.id === leavingNoteId)) {
        setLastSummaryNoteId(leavingNoteId);
        setShowLastNoteSummary(true);
      }
      lastLeavingNoteIdRef.current = null;
    };

    const restoreEditorFromHistory = () => {
      const noteId = getNoteIdFromLocation();
      if (!noteId) {
        closeEditor();
        return;
      }
      const note = notesRef.current.find(n => n.id === noteId);
      if (!note) {
        window.history.replaceState({ vocalNoteList: true }, '', window.location.pathname + window.location.search);
        closeEditor();
        return;
      }
      setActiveNoteId(note.id);
      setIsDrawing(false);
      setEditContent(note.content);
      setEditFontSize(note.fontSize || 48);
      setIsEditorMenuOpen(false);
      setOpenMenuId(null);
      setStageScale(1);
      setStagePos({ x: 0, y: 0 });
    };

    if (!window.history.state?.vocalNoteEditor && !window.history.state?.vocalNoteList) {
      window.history.replaceState({ vocalNoteList: true }, '', window.location.pathname + window.location.search);
    }
    if (getNoteIdFromLocation()) restoreEditorFromHistory();

    window.addEventListener('popstate', restoreEditorFromHistory);
    window.addEventListener('hashchange', restoreEditorFromHistory);
    return () => {
      window.removeEventListener('popstate', restoreEditorFromHistory);
      window.removeEventListener('hashchange', restoreEditorFromHistory);
    };
  }, [offlineStorageReady]);

  useEffect(() => {
    if (!offlineStorageReady || !activeNoteId) return;
    if (window.history.state?.vocalNoteEditor === activeNoteId) return;
    if (!notesRef.current.some(n => n.id === activeNoteId)) return;
    window.history.pushState({ vocalNoteEditor: activeNoteId }, '', `#note-${encodeURIComponent(activeNoteId)}`);
  }, [activeNoteId, offlineStorageReady]);

  // Handle outside clicks to close menus
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setIsHeaderMenuOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const addNote = (content = '', image?: string, drawingLines?: DrawingLine[], color?: string, pattern?: string): string => {
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
    // Every note opens immediately in the dedicated single-page editor.
    // Use a functional update so the new note is never lost if state updates are batched.
    lastLeavingNoteIdRef.current = null;
    setShowLastNoteSummary(false);
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setIsDrawing(false);
    setEditContent(content);
    setEditFontSize(newNote.fontSize || 48);
    setOpenMenuId(null);
    setIsEditorMenuOpen(false);
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
    return newNote.id;
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
    setTemplates(prev => [...prev, newTemplate]);
    setOpenMenuId(null);
    setIsEditorMenuOpen(false);
  };

  const applyTemplate = (template: Template) => {
    const newNoteId = addNote(template.content, template.image, template.drawingLines, template.color, template.pattern);
    setNotes(prev => prev.map(n => n.id === newNoteId ? { ...n, fontSize: template.fontSize || 48 } : n));
    setIsTemplatesModalOpen(false);
    setIsHeaderMenuOpen(false);
  };

  const deleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const deleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const deletingActiveNote = activeNoteId === id;
    if (deletingActiveNote) {
      lastLeavingNoteIdRef.current = null;
      setShowLastNoteSummary(false);
    }
    setNotes(prev => prev.filter(n => n.id !== id));
    setOpenMenuId(null);
    if (deletingActiveNote) {
      setIsEditorMenuOpen(false);
      setIsDrawing(false);
      setIsChatOpen(false);
      setActiveNoteId(null);
      setEditContent('');
      setLastSummaryNoteId(null);
      setShowLastNoteSummary(false);
      // A deleted note must never remain as a browser-history target.
      window.history.replaceState(
        { vocalNoteList: true },
        '',
        window.location.pathname + window.location.search
      );
    }
  };

  const exportData = () => {
    const data = JSON.stringify({
      notes: notesRef.current,
      templates: templatesRef.current,
    });
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
          const importedNotes = Array.isArray(data?.notes)
            ? data.notes.filter((note: any) => note && typeof note === 'object' && typeof note.id === 'string' && typeof note.content === 'string').map((note: any) => ({
                ...note,
                color: typeof note.color === 'string' ? note.color : COLORS[0],
                rotation: typeof note.rotation === 'number' ? note.rotation : 0,
                x: typeof note.x === 'number' ? note.x : 50,
                y: typeof note.y === 'number' ? note.y : 50,
                fontSize: typeof note.fontSize === 'number' ? note.fontSize : 48,
              }))
            : null;
          const importedTemplates = Array.isArray(data?.templates)
            ? data.templates.filter((template: any) => template && typeof template === 'object' && typeof template.id === 'string' && typeof template.name === 'string' && typeof template.content === 'string').map((template: any) => ({
                ...template,
                color: typeof template.color === 'string' ? template.color : COLORS[0],
                fontSize: typeof template.fontSize === 'number' ? template.fontSize : 48,
              }))
            : null;
          if (!importedNotes && !importedTemplates) throw new Error('Invalid backup structure');
          if (importedNotes) setNotes(importedNotes);
          if (importedTemplates) setTemplates(importedTemplates);
          lastLeavingNoteIdRef.current = null;
          setShowLastNoteSummary(false);
          setActiveNoteId(null);
          setIsDrawing(false);
          setIsChatOpen(false);
          window.history.replaceState({ vocalNoteList: true }, '', window.location.pathname + window.location.search);
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
    lastLeavingNoteIdRef.current = null;
    setShowLastNoteSummary(false);
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
    lastLeavingNoteIdRef.current = null;
    setShowLastNoteSummary(false);
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
    if (!activeNoteId) return;

    const noteId = activeNoteId;
    const latestContent = editorRef.current?.innerHTML ?? editContent;
    lastLeavingNoteIdRef.current = noteId;
    setEditContent(latestContent);
    setNotes(prev =>
      prev.map(n =>
        n.id === noteId ? { ...n, content: latestContent, fontSize: editFontSize } : n
      )
    );
    setIsEditorMenuOpen(false);

    // Return through browser history so the dashboard is restored cleanly.
    if (window.history.state?.vocalNoteEditor === noteId) {
      window.history.back();
    } else {
      setActiveNoteId(null);
      setIsDrawing(false);
      setIsChatOpen(false);
      setLastSummaryNoteId(noteId);
      setShowLastNoteSummary(true);
      lastLeavingNoteIdRef.current = null;
    }
  };

  const toggleComplete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, completed: !n.completed } : n));
    setOpenMenuId(null);
  };

  const changeColor = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(
      prev => prev.map((n) => {
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
    // Enter finishes the current note and returns to the dashboard.
    // Shift+Enter is intentionally also treated as finish so Enter never inserts a new line.
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      saveNote();
      return;
    }

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

      if (!ai) throw new Error('Gemini API key is not configured.');

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const aiText = response.text;

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
        // Update existing note and keep the open editor synchronized.
        setNotes(prev => prev.map(n => n.id === lastUploadTargetId ? { ...n, image: base64 } : n));
        if (lastUploadTargetId === activeNoteId && editorRef.current) {
          // The image is rendered from the active note state; keep the editor focused.
          editorRef.current.focus();
        }
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

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        try { recognition.stop(); } catch {}
      }
      recognitionRef.current = null;
    };
  }, []);

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
      const cleanTranscript = transcript.trim();
      
      if (cleanTranscript.length === 0) return;
      
      if (target === 'chat') {
        setChatInput(prev => {
          // If we already have this in the end of prev, don't add it
          if (prev.endsWith(cleanTranscript)) return prev;
          const combined = prev + (prev ? ' ' : '') + cleanTranscript;
          return combined.slice(0, MAX_CHARS);
        });
      } else {
        setEditContent(prev => {
          if (prev.endsWith(cleanTranscript)) return prev;
          const combined = prev + (prev ? ' ' : '') + cleanTranscript;
          return combined.slice(0, MAX_CHARS);
        });
        if (editorRef.current) {
          const content = editorRef.current.innerHTML;
          if (!content.endsWith(cleanTranscript)) {
            editorRef.current.innerHTML = content + (content.length > 0 ? ' ' : '') + cleanTranscript;
          }
        }
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
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
    if (!pointer || !Number.isFinite(oldScale) || oldScale <= 0) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 0.05;
    const rawScale = e.evt.deltaY > 0 ? oldScale * (1 - speed) : oldScale * (1 + speed);
    const newScale = Math.min(4, Math.max(0.25, rawScale));

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

      const rawScale = currScale * (dist / lastDist);
      const newScale = Math.min(4, Math.max(0.25, rawScale));

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
    if (!ai) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI Assistant is unavailable because the Gemini API key is not configured.' }]);
      setChatInput('');
      return;
    }

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
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const aiResponse = response.text || "I'm sorry, I couldn't process that.";

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
    
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: newContent } : n));
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

      <header className="fixed top-0 left-0 right-0 z-[2000] px-4 md:px-[50px] py-4 md:py-[20px] flex items-center justify-between bg-premium-header shadow-sm overflow-visible min-h-[72px] md:min-h-0">
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