import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import CameraCapture from './components/CameraCapture';
import MenuGrid from './components/MenuGrid';
import SharePage from './components/SharePage';
import SavedMenus from './components/SavedMenus';
import LanguagePicker from './components/LanguagePicker';
import ChatWidget from './components/ChatWidget';
import { readSSE } from './utils/sse';
import type { Dish } from './types';

function HomePage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [translatedDishes, setTranslatedDishes] = useState<Dish[] | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayDishes = translatedDishes ?? dishes;

  const handleScan = async (images: string[]) => {
    setIsScanning(true);
    setDishes([]);
    setTranslatedDishes(null);
    setLanguage(null);
    setError(null);
    setStatusMessage('Analyzing menu…');

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images })
      });

      if (response.status === 429) {
        setError('Rate limit exceeded. Please try again later.');
        return;
      }

      if (!response.ok) {
        throw new Error('Scan failed');
      }

      await readSSE(response, (event, data) => {
        if (event === 'dish') {
          const dish = data as Dish;
          if (dish && typeof dish.name === 'string') {
            setDishes(prev => [...prev, dish]);
          }
        } else if (event === 'status') {
          const status = data as { message?: string };
          if (status.message) setStatusMessage(status.message);
        } else if (event === 'error') {
          const err = data as { message?: string };
          setError(err.message || 'Something went wrong');
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsScanning(false);
      setStatusMessage(null);
    }
  };

  const handleTranslate = async (targetLanguage: string | null) => {
    if (!targetLanguage) {
      setTranslatedDishes(null);
      setLanguage(null);
      return;
    }

    setIsTranslating(true);
    setError(null);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishes: dishes.map(d => ({ name: d.name, category: d.category })),
          targetLanguage
        })
      });

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? 'Translation limit reached. Please try again later.'
            : 'Translation failed. Please try again.'
        );
      }

      const { dishes: translated } = (await response.json()) as {
        dishes: { name: string; category: string }[];
      };

      setTranslatedDishes(
        dishes.map((dish, i) => ({
          ...dish,
          name: translated[i]?.name || dish.name,
          category: translated[i]?.category || dish.category,
          originalName: dish.name
        }))
      );
      setLanguage(targetLanguage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReset = () => {
    setDishes([]);
    setTranslatedDishes(null);
    setLanguage(null);
    setError(null);
  };

  const showGrid = dishes.length > 0 || isScanning;

  return (
    <div className="app">
      <header className="header">
        <h1>
          menu<span className="header-dot">.</span>pictures
        </h1>
        <p>Snap a menu, see every dish</p>
      </header>

      <main>
        {!showGrid ? (
          <CameraCapture onCapture={handleScan} />
        ) : (
          <>
            <div className="toolbar">
              <LanguagePicker
                language={language}
                isTranslating={isTranslating}
                disabled={isScanning || dishes.length === 0}
                onSelect={handleTranslate}
              />
            </div>
            <MenuGrid
              dishes={displayDishes}
              isLoading={isScanning}
              statusMessage={statusMessage}
              onReset={handleReset}
            />
          </>
        )}

        {error && <div className="error-message">{error}</div>}
      </main>

      {dishes.length > 0 && !isScanning && (
        <ChatWidget dishes={displayDishes} language={language} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/menu/:id" element={<SharePage />} />
        <Route path="/saved" element={<SavedMenus />} />
      </Routes>
    </BrowserRouter>
  );
}
