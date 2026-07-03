import { useState, useRef, useEffect, useCallback } from 'react';
import { readSSE } from '../utils/sse';
import type { Dish, ChatMessage } from '../types';

interface ChatWidgetProps {
  dishes: Dish[];
  language: string | null;
}

// Minimal typings for the Web Speech API (not in the default TS DOM lib)
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Map menu display languages to BCP-47 codes for speech recognition/synthesis
const LANGUAGE_CODES: Record<string, string> = {
  english: 'en-US',
  español: 'es-ES',
  spanish: 'es-ES',
  français: 'fr-FR',
  french: 'fr-FR',
  deutsch: 'de-DE',
  german: 'de-DE',
  nederlands: 'nl-NL',
  dutch: 'nl-NL',
  italiano: 'it-IT',
  italian: 'it-IT',
  português: 'pt-PT',
  portuguese: 'pt-PT',
  '中文': 'zh-CN',
  chinese: 'zh-CN',
  '日本語': 'ja-JP',
  japanese: 'ja-JP',
  '한국어': 'ko-KR',
  korean: 'ko-KR',
  'العربية': 'ar-SA',
  arabic: 'ar-SA',
  'हिन्दी': 'hi-IN',
  hindi: 'hi-IN'
};

function speechLangFor(language: string | null): string {
  if (language) {
    const code = LANGUAGE_CODES[language.toLowerCase()] || LANGUAGE_CODES[language];
    if (code) return code;
  }
  return navigator.language || 'en-US';
}

const SUGGESTIONS = [
  'What is the most expensive dish?',
  'Which wine pairs well with steak?',
  'What can vegetarians eat here?'
];

export default function ChatWidget({ dishes, language }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speakRepliesRef = useRef(speakReplies);
  speakRepliesRef.current = speakReplies;

  const voiceSupported = getSpeechRecognition() !== null;
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Stop any speech/recognition when the widget unmounts
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLangFor(language);
      window.speechSynthesis.speak(utterance);
    },
    [language, ttsSupported]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setChatError(null);
      setInput('');
      const history: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
      setMessages([...history, { role: 'assistant', content: '' }]);
      setIsStreaming(true);

      let reply = '';
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.slice(-20),
            dishes: dishes.map(d => ({ name: d.name, price: d.price, category: d.category })),
            language
          })
        });

        if (!response.ok) {
          throw new Error(
            response.status === 429
              ? 'Chat limit reached. Please try again later.'
              : 'The assistant is unavailable right now.'
          );
        }

        await readSSE(response, (event, data) => {
          if (event === 'delta') {
            const { text: delta } = data as { text?: string };
            if (delta) {
              reply += delta;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: reply };
                return next;
              });
            }
          } else if (event === 'error') {
            const err = data as { message?: string };
            throw new Error(err.message || 'Chat failed');
          }
        });

        if (!reply) {
          setMessages(prev => prev.slice(0, -1));
        } else if (speakRepliesRef.current) {
          speak(reply);
        }
      } catch (err) {
        setMessages(prev => (reply ? prev : prev.slice(0, -1)));
        setChatError(err instanceof Error ? err.message : 'Chat failed');
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, dishes, language, isStreaming, speak]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionImpl = getSpeechRecognition();
    if (!SpeechRecognitionImpl) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = speechLangFor(language);
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInput(finalTranscript || interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const spoken = finalTranscript.trim();
      if (spoken) {
        // Voice in → voice out
        setSpeakReplies(true);
        speakRepliesRef.current = true;
        void sendMessage(spoken);
      }
    };

    recognitionRef.current = recognition;
    setInput('');
    setIsListening(true);
    recognition.start();
  }, [language, sendMessage]);

  if (!open) {
    return (
      <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Ask about this menu">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <span>Ask the menu</span>
      </button>
    );
  }

  return (
    <div className="chat-panel" role="dialog" aria-label="Menu assistant">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-title-main">Menu assistant</span>
          <span className="chat-title-sub">Ask anything about this menu</span>
        </div>
        <div className="chat-header-actions">
          {ttsSupported && (
            <button
              className={`chat-icon-button ${speakReplies ? 'active' : ''}`}
              onClick={() => {
                if (speakReplies) window.speechSynthesis.cancel();
                setSpeakReplies(s => !s);
              }}
              title={speakReplies ? 'Mute spoken replies' : 'Speak replies aloud'}
              aria-pressed={speakReplies}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            </button>
          )}
          <button className="chat-icon-button" onClick={() => setOpen(false)} aria-label="Close chat">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Try asking:</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map(suggestion => (
                <button key={suggestion} onClick={() => void sendMessage(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
            {voiceSupported && <p className="chat-hint">…or tap the mic and just ask.</p>}
          </div>
        )}
        {messages.map((message, i) => (
          <div key={i} className={`chat-bubble ${message.role}`}>
            {message.content || <span className="chat-typing">•••</span>}
          </div>
        ))}
        {chatError && <div className="chat-error">{chatError}</div>}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="chat-input-row"
        onSubmit={e => {
          e.preventDefault();
          void sendMessage(input);
        }}
      >
        {voiceSupported && (
          <button
            type="button"
            className={`chat-mic-button ${isListening ? 'listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isStreaming}
            aria-label={isListening ? 'Stop listening' : 'Ask by voice'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}
        <input
          type="text"
          value={input}
          placeholder={isListening ? 'Listening…' : 'Ask about the menu…'}
          onChange={e => setInput(e.target.value)}
          disabled={isStreaming}
        />
        <button type="submit" className="chat-send-button" disabled={isStreaming || !input.trim()} aria-label="Send">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  );
}
