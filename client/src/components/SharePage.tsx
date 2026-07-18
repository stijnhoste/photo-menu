import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MenuGrid from './MenuGrid';
import type { Dish, Menu } from '../types';

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);

  useEffect(() => {
    if (!id) return;

    // AbortController for cleanup on unmount
    const controller = new AbortController();

    fetch(`/api/share/${id}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Menu not found');
        return res.json();
      })
      .then(data => {
        const sharedMenu = data.menu as Menu | undefined;
        setMenu(sharedMenu || null);
        setDishes(sharedMenu?.dishes || data.dishes || []);
        setLoading(false);
      })
      .catch(err => {
        // Ignore abort errors (component unmounted)
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="share-page">
        <p>Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="share-page">
        <Link to="/" className="back-link">
          ← Back to home
        </Link>
        <div className="error-message">
          {error === 'Menu not found'
            ? 'This menu has expired or does not exist.'
            : error}
        </div>
      </div>
    );
  }

  return (
    <div className="share-page">
      <Link to="/" className="back-link">
        ← Scan your own menu
      </Link>
      <MenuGrid
        dishes={dishes}
        menu={menu}
        isLoading={false}
        onReset={() => window.location.href = '/'}
      />
    </div>
  );
}
