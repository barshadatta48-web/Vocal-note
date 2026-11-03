/**
 * Intelligent Speech-to-Text Post-Processor for Vocal Note
 * Converts spoken keywords into symbols and formatting markers instantly with low latency.
 */

export const SPEECH_POST_PROCESSOR_PROMPT = `You are a real-time speech-to-text post-processor for a notepad application. Process the incoming transcription instantly with low latency. Convert spoken keywords into symbols and formatting markers according to these strict rules:

1. Punctuation Mapping:
- Spoken "period", "dot", or "full stop" -> .
- Spoken "question mark" -> ?
- Spoken "comma" -> ,
- Spoken "exclamation mark" -> !
- Spoken "new line" -> Line break

2. Text Formatting Commands:
- Spoken "bold [text]" or wrapping speech with formatting cues -> Apply markdown bold syntax **text** around the spoken words.
- Spoken "underline [text]" -> Apply HTML underline tags <u>text</u> around the spoken words.

Keep processing extremely fast, maintain natural word spacing, and do not spell out the command words literally. Return ONLY the processed text with no conversational preamble or quotes.`;

/**
 * Applies text formatting commands for spoken bold and underline cues.
 * - Spoken "bold [text]" or wrapped bold -> **text**
 * - Spoken "underline [text]" or wrapped underline -> <u>text</u>
 */
export function applyTextFormattingCommands(text: string): string {
  if (!text) return '';

  let res = text;

  // 1. Explicitly wrapped commands (start bold ... end bold, open underline ... close underline, etc.)
  res = res.replace(/\b(?:start\s+bold|open\s+bold|bold)\s+(.+?)\s+(?:end\s+bold|stop\s+bold|close\s+bold|unbold)\b/gi, (_, content) => {
    const trimmed = content.trim();
    return trimmed ? `**${trimmed}**` : '';
  });

  res = res.replace(/\b(?:start\s+underline|open\s+underline|underline)\s+(.+?)\s+(?:end\s+underline|stop\s+underline|close\s+underline|stop\s+underlining)\b/gi, (_, content) => {
    const trimmed = content.trim();
    return trimmed ? `<u>${trimmed}</u>` : '';
  });

  // 2. Prefix commands: spoken "bold [text]"
  // Captures up to the next formatting command, line break, punctuation mark, or end of string
  res = res.replace(/\b(?:start\s+bold|bold)\s+([^.,!?:;\n<]+?)(?=\s*(?:\b(?:start\s+underline|underline|new\s+line|next\s+line)\b|[.,!?:;\n<]|$))/gi, (_, content) => {
    const trimmed = content.trim();
    if (!trimmed || /^[.,!?:;]+$/.test(trimmed)) return trimmed;
    return `**${trimmed}**`;
  });

  // 3. Prefix commands: spoken "underline [text]"
  res = res.replace(/\b(?:start\s+underline|underline)\s+([^.,!?:;\n<]+?)(?=\s*(?:\b(?:start\s+bold|bold|new\s+line|next\s+line)\b|[.,!?:;\n<]|$))/gi, (_, content) => {
    const trimmed = content.trim();
    if (!trimmed || /^[.,!?:;]+$/.test(trimmed)) return trimmed;
    return `<u>${trimmed}</u>`;
  });

  // Clean up any double spaces introduced by command replacements
  res = res.replace(/[ ]{2,}/g, ' ');

  return res;
}

export type VoiceCommand = 
  | 'NEW_LINE' 
  | 'NEW_PARAGRAPH' 
  | 'DELETE_THAT' 
  | 'STOP_LISTENING' 
  | 'START_LISTENING';

export interface CommandDetectionResult {
  isPureCommand: boolean;
  command?: VoiceCommand;
  segments?: Array<{ type: 'text' | 'command'; content?: string; command?: VoiceCommand }>;
}

/**
 * Detects voice commands from finalized speech recognition results.
 * Supports variations in case, punctuation, and whitespace.
 * Prevents false positives in ordinary speech (e.g. "the next line of code").
 */
export function detectVoiceCommand(rawTranscript: string): CommandDetectionResult {
  if (!rawTranscript) return { isPureCommand: false };

  const normalized = rawTranscript.toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();

  // 1. Check direct standalone command (case-insensitive, punctuation-stripped)
  if (normalized === 'next line' || normalized === 'new line') {
    return { isPureCommand: true, command: 'NEW_LINE' };
  }
  if (normalized === 'next paragraph' || normalized === 'new paragraph') {
    return { isPureCommand: true, command: 'NEW_PARAGRAPH' };
  }
  if (normalized === 'delete that' || normalized === 'scratch that' || normalized === 'undo that' || normalized === 'delete last' || normalized === 'delete last word') {
    return { isPureCommand: true, command: 'DELETE_THAT' };
  }
  if (normalized === 'stop listening' || normalized === 'stop recording' || normalized === 'stop dictation' || normalized === 'stop mic' || normalized === 'stop microphone') {
    return { isPureCommand: true, command: 'STOP_LISTENING' };
  }
  if (normalized === 'start listening' || normalized === 'start recording' || normalized === 'start dictation') {
    return { isPureCommand: true, command: 'START_LISTENING' };
  }

  // 2. Check if utterance contains discrete voice commands bounded by punctuation, pause, or clause boundary
  // Negative lookahead prevents matching inside ordinary sentences like "the next line of" or "next linear"
  const commandPattern = /\b(next\s+paragraph|new\s+paragraph|next\s+line|new\s+line|delete\s+that|scratch\s+that|stop\s+listening|stop\s+recording)(?!\s+(?:of|in|from|on|was|is|were|are|that|which|to))\b/i;
  
  if (!commandPattern.test(rawTranscript)) {
    return { isPureCommand: false };
  }

  const segments: Array<{ type: 'text' | 'command'; content?: string; command?: VoiceCommand }> = [];
  const regex = /\b(next\s+paragraph|new\s+paragraph|next\s+line|new\s+line|delete\s+that|scratch\s+that|stop\s+listening|stop\s+recording)(?!\s+(?:of|in|from|on|was|is|were|are|that|which|to))\b/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawTranscript)) !== null) {
    const textBefore = rawTranscript.slice(lastIndex, match.index).trim();
    if (textBefore) {
      segments.push({ type: 'text', content: textBefore });
    }

    const matchedCmd = match[1].toLowerCase().replace(/\s+/g, ' ');
    let cmdType: VoiceCommand = 'NEW_LINE';
    if (matchedCmd === 'next paragraph' || matchedCmd === 'new paragraph') {
      cmdType = 'NEW_PARAGRAPH';
    } else if (matchedCmd === 'delete that' || matchedCmd === 'scratch that') {
      cmdType = 'DELETE_THAT';
    } else if (matchedCmd === 'stop listening' || matchedCmd === 'stop recording') {
      cmdType = 'STOP_LISTENING';
    }

    segments.push({ type: 'command', command: cmdType });
    lastIndex = match.index + match[0].length;
  }

  const trailingText = rawTranscript.slice(lastIndex).trim();
  if (trailingText) {
    segments.push({ type: 'text', content: trailingText });
  }

  return { isPureCommand: false, segments };
}

/**
 * Real-time synchronous dictionary-based speech-to-text post-processor.
 * Converts punctuation commands, formats bold/underline, and ensures proper spacing and capitalization.
 */
export function postProcessSpeechTranscript(text: string, isHtml: boolean = false): string {
  if (!text) return '';

  let processed = text;

  // 1. Spoken punctuation phrases with multiple words first
  processed = processed.replace(/\b(?:exclamation\s+mark|exclamation\s+point)\b/gi, '!');
  processed = processed.replace(/\bquestion\s+mark\b/gi, '?');
  processed = processed.replace(/\bfull\s+stop\b/gi, '.');
  processed = processed.replace(/\b(?:semi-colon|semi\s+colon|semicolon)\b/gi, ';');

  // 2. Line break & paragraph commands
  const paragraphBreakTag = isHtml ? '<br><br>' : '\n\n';
  processed = processed.replace(/\s*\b(?:new\s+paragraph|next\s+paragraph)\b\s*/gi, paragraphBreakTag);
  const breakTag = isHtml ? '<br>' : '\n';
  processed = processed.replace(/\s*\b(?:new\s+line|next\s+line)\b\s*/gi, breakTag);

  // 3. Single-word punctuation commands
  processed = processed.replace(/\bperiod\b/gi, '.');
  processed = processed.replace(/\bcomma\b/gi, ',');
  processed = processed.replace(/\bcolon\b/gi, ':');
  // 'dot' when spoken as punctuation: e.g. "end of sentence dot"
  processed = processed.replace(/(?<=\w)\s+\bdot\b/gi, '.');
  processed = processed.replace(/\bdot\b\s+(?=\w)/gi, '. ');

  // 4. Text Formatting Commands:
  // - Spoken "bold [text]" -> **text**
  // - Spoken "underline [text]" -> <u>text</u>
  processed = applyTextFormattingCommands(processed);

  // 5. Grammar and spacing normalization:
  // Remove spaces immediately before punctuation
  processed = processed.replace(/\s+([.,!?:;])/g, '$1');

  // Ensure single space after punctuation if followed immediately by letter/digit
  processed = processed.replace(/([.,!?:;])(?=[A-Za-z0-9])/g, '$1 ');

  // Capitalize letter after sentence enders (. ? !)
  processed = processed.replace(/([.?!]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  processed = processed.replace(/([.?!]\s+\*\*)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  processed = processed.replace(/([.?!]\s+<u>)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // Capitalize letter after line breaks
  if (isHtml) {
    processed = processed.replace(/(<br>\s*)([a-z])/gi, (_, p1, p2) => p1 + p2.toUpperCase());
    processed = processed.replace(/(<br>\s*\*\*)([a-z])/gi, (_, p1, p2) => p1 + p2.toUpperCase());
    processed = processed.replace(/(<br>\s*<u>)([a-z])/gi, (_, p1, p2) => p1 + p2.toUpperCase());
  } else {
    processed = processed.replace(/(\n\s*)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
    processed = processed.replace(/(\n\s*\*\*)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
    processed = processed.replace(/(\n\s*<u>)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  }

  // Capitalize leading character (even if preceded by ** or <u>)
  processed = processed.replace(/^([a-z])/, (match) => match.toUpperCase());
  processed = processed.replace(/^(\*\*|\<u>)([a-z])/, (_, prefix, char) => prefix + char.toUpperCase());

  return processed;
}

/**
 * Asynchronous AI-powered post-processor using server proxy or Gemini SDK.
 */
export async function aiPostProcessSpeech(text: string, isHtml: boolean = false): Promise<string> {
  if (!text.trim()) return text;

  // 1. Apply rule-based post-processor first for instant cleanliness
  const preProcessed = postProcessSpeechTranscript(text, isHtml);

  // 2. Try server-side post-process endpoint
  try {
    const res = await fetch('/api/speech-postprocess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: preProcessed, isHtml }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        return data.text.trim();
      }
    }
  } catch (err) {
    console.warn('AI speech post-processor fallback to rule-based:', err);
  }

  return preProcessed;
}
