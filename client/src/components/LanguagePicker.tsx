import { useState, useRef, useEffect } from 'react';

interface LanguagePickerProps {
  language: string | null;
  isTranslating: boolean;
  disabled: boolean;
  onSelect: (language: string | null) => void;
}

const QUICK_LANGUAGES = [
  'English',
  'Español',
  'Français',
  'Deutsch',
  'Nederlands',
  'Italiano',
  'Português',
  '中文',
  '日本語',
  '한국어',
  'العربية',
  'हिन्दी'
];

export default function LanguagePicker({
  language,
  isTranslating,
  disabled,
  onSelect
}: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const [customLanguage, setCustomLanguage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const choose = (lang: string | null) => {
    setOpen(false);
    setCustomLanguage('');
    onSelect(lang);
  };

  return (
    <div className="language-picker" ref={containerRef}>
      <button
        className={`language-button ${language ? 'active' : ''}`}
        onClick={() => setOpen(o => !o)}
        disabled={disabled || isTranslating}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918" />
        </svg>
        <span>{isTranslating ? 'Translating…' : language || 'Translate'}</span>
      </button>

      {open && (
        <div className="language-menu" role="menu">
          {language && (
            <button className="language-option original" onClick={() => choose(null)}>
              ↩ Show original
            </button>
          )}
          <div className="language-quick">
            {QUICK_LANGUAGES.map(lang => (
              <button
                key={lang}
                className={`language-option ${language === lang ? 'selected' : ''}`}
                onClick={() => choose(lang)}
              >
                {lang}
              </button>
            ))}
          </div>
          <form
            className="language-custom"
            onSubmit={e => {
              e.preventDefault();
              if (customLanguage.trim()) choose(customLanguage.trim());
            }}
          >
            <input
              type="text"
              placeholder="Any language…"
              value={customLanguage}
              maxLength={40}
              onChange={e => setCustomLanguage(e.target.value)}
            />
            <button type="submit" disabled={!customLanguage.trim()}>
              Go
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
