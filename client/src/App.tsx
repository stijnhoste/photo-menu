import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import CameraCapture from './components/CameraCapture';
import MenuGrid from './components/MenuGrid';
import SharePage from './components/SharePage';
import SavedMenus from './components/SavedMenus';
import type { Dish } from './types';

function HomePage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (images: string[]) => {
    setIsScanning(true);
    setDishes([]);
    setError(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images })
      });

      if (response.status === 429) {
        setError('Rate limit exceeded. Please try again later.');
        setIsScanning(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Scan failed');
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const dish = JSON.parse(data) as Dish;
              setDishes(prev => [...prev, dish]);
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>menu.pictures</h1>
        <p>Snap a menu, see the dishes</p>
      </header>

      <main>
        {dishes.length === 0 && !isScanning ? (
          <CameraCapture onCapture={handleScan} />
        ) : (
          <MenuGrid
            dishes={dishes}
            isLoading={isScanning}
            onReset={() => setDishes([])}
          />
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </main>
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
