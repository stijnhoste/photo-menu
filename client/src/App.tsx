import { BrowserRouter, Link, Routes, Route } from 'react-router-dom';
import { useRef, useState } from 'react';
import CameraCapture from './components/CameraCapture';
import MenuGrid from './components/MenuGrid';
import SharePage from './components/SharePage';
import SavedMenus from './components/SavedMenus';
import SavedMenuPage from './components/SavedMenuPage';
import LanguagePicker from './components/LanguagePicker';
import ChatWidget from './components/ChatWidget';
import MenuReview from './components/MenuReview';
import { readSSE } from './utils/sse';
import { createMenu, saveMenu } from './utils/menuStorage';
import type { Dish, Menu, MenuMetadata, ScanProgress } from './types';
import { APP_NAME } from './config';

const EMPTY_METADATA: MenuMetadata = {
  restaurantName: null,
  menuName: null,
  currency: null,
  sourceLanguage: null
};

function HomePage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [translatedDishes, setTranslatedDishes] = useState<Dish[] | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [metadata, setMetadata] = useState<MenuMetadata>(EMPTY_METADATA);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null);
  const scanControllerRef = useRef<AbortController | null>(null);

  const displayDishes = translatedDishes ?? dishes;

  const handleScan = async (images: string[]) => {
    scanControllerRef.current?.abort();
    const controller = new AbortController();
    scanControllerRef.current = controller;
    setIsScanning(true);
    setDishes([]);
    setTranslatedDishes(null);
    setLanguage(null);
    setMetadata(EMPTY_METADATA);
    setProgress(null);
    setIsReviewing(false);
    setError(null);
    setStatusMessage('Analyzing menu…');
    setActiveMenu(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
        signal: controller.signal
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
            setDishes(prev => [...prev, dish].sort((a, b) => a.itemOrder - b.itemOrder));
          }
        } else if (event === 'image') {
          const update = data as { id?: string; imageUrl?: string | null };
          if (update.id) {
            setDishes(prev => prev.map(dish => dish.id === update.id
              ? { ...dish, imageUrl: update.imageUrl || null }
              : dish));
          }
        } else if (event === 'metadata') {
          setMetadata(data as MenuMetadata);
        } else if (event === 'progress') {
          setProgress(data as ScanProgress);
        } else if (event === 'ready' || event === 'done') {
          setIsReviewing(true);
        } else if (event === 'status') {
          const status = data as { message?: string };
          if (status.message) setStatusMessage(status.message);
        } else if (event === 'error') {
          const err = data as { message?: string };
          setError(err.message || 'Something went wrong');
        }
      });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(
          err instanceof TypeError
            ? 'The scan connection was interrupted. Please check your connection and try again.'
            : err instanceof Error ? err.message : 'An error occurred'
        );
      }
    } finally {
      if (scanControllerRef.current === controller) scanControllerRef.current = null;
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
    scanControllerRef.current?.abort();
    scanControllerRef.current = null;
    setDishes([]);
    setTranslatedDishes(null);
    setLanguage(null);
    setMetadata(EMPTY_METADATA);
    setProgress(null);
    setIsReviewing(false);
    setError(null);
    setActiveMenu(null);
  };

  const handleCancelScan = () => {
    scanControllerRef.current?.abort();
    setIsScanning(false);
    setStatusMessage(null);
    if (dishes.length > 0) setIsReviewing(true);
  };

  const handleReviewConfirm = () => {
    const menu = createMenu(metadata, dishes, activeMenu?.id);
    saveMenu(menu);
    setActiveMenu(menu);
    setIsReviewing(false);
  };

  const handleDishChange = (updatedDish: Dish) => {
    const updatedDishes = dishes.map(dish => dish.id === updatedDish.id ? updatedDish : dish);
    setDishes(updatedDishes);
    if (activeMenu) {
      const updatedMenu = { ...activeMenu, dishes: updatedDishes };
      saveMenu(updatedMenu);
      setActiveMenu(updatedMenu);
    }
  };

  const showGrid = dishes.length > 0 || isScanning;

  return (
    <div className="app">
      <header className="header">
        <h1>
          {APP_NAME.includes('.') ? <>{APP_NAME.split('.')[0]}<span className="header-dot">.</span>{APP_NAME.split('.').slice(1).join('.')}</> : APP_NAME}
        </h1>
        <p>Snap a menu, see every dish</p>
        <nav className="header-nav" aria-label="Main navigation">
          <Link to="/saved">Saved menus</Link>
        </nav>
      </header>

      <main>
        {!showGrid ? (
          <CameraCapture onCapture={handleScan} />
        ) : isReviewing ? (
          <MenuReview
            dishes={dishes}
            metadata={metadata}
            onDishesChange={setDishes}
            onMetadataChange={setMetadata}
            onConfirm={handleReviewConfirm}
            onRescan={handleReset}
          />
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
              progress={progress}
              menu={activeMenu}
              onCancel={handleCancelScan}
              onDishChange={handleDishChange}
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
        <Route path="/saved/:id" element={<SavedMenuPage />} />
      </Routes>
    </BrowserRouter>
  );
}
