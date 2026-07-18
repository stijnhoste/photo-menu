import { Link, useParams } from 'react-router-dom';
import MenuGrid from './MenuGrid';
import { loadMenus } from '../utils/menuStorage';

export default function SavedMenuPage() {
  const { id } = useParams<{ id: string }>();
  const menu = loadMenus().find(candidate => candidate.id === id);

  if (!menu) {
    return (
      <div className="share-page">
        <Link to="/saved" className="back-link">← Saved menus</Link>
        <div className="error-message">This saved menu is no longer available on this device.</div>
      </div>
    );
  }

  return (
    <div className="share-page">
      <Link to="/saved" className="back-link">← Saved menus</Link>
      <header className="saved-menu-header">
        <p className="eyebrow">{menu.restaurantName || 'Saved menu'}</p>
        <h1>{menu.menuName || 'Untitled menu'}</h1>
      </header>
      <MenuGrid dishes={menu.dishes} menu={menu} isLoading={false} onReset={() => window.location.assign('/')} />
    </div>
  );
}
