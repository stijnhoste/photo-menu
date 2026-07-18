import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deleteMenu, loadMenus, saveMenu } from '../utils/menuStorage';
import type { Menu } from '../types';

export default function SavedMenus() {
  const [menus, setMenus] = useState<Menu[]>([]);

  useEffect(() => {
    setMenus(loadMenus());
  }, []);

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this saved menu from this device?')) return;
    setMenus(deleteMenu(id));
  };

  const handleRename = (menu: Menu) => {
    const name = window.prompt('Menu name', menu.menuName || '');
    if (name === null) return;
    setMenus(saveMenu({ ...menu, menuName: name.trim() || null }));
  };

  return (
    <div className="saved-menus">
      <Link to="/" className="back-link">
        ← Back to home
      </Link>

      <h2 className="saved-menus-title">Saved Menus</h2>

      {menus.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p>No saved menus yet.</p>
          <p>Scan a menu and share it to save it here.</p>
        </div>
      ) : (
        menus.map(menu => (
          <div key={menu.id} className="saved-menu-item">
            <div className="saved-menu-summary">
              <div>
                <h3>{menu.menuName || menu.restaurantName || 'Untitled menu'}</h3>
                {menu.restaurantName && menu.menuName && <p>{menu.restaurantName}</p>}
                <p>
                  {new Date(menu.createdAt).toLocaleDateString()} at{' '}
                  {new Date(menu.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="saved-menu-actions">
                <button className="icon-button" onClick={() => handleRename(menu)} title="Rename menu" aria-label={`Rename ${menu.menuName || 'menu'}`}>
                  ✎
                </button>
                <Link
                  to={`/saved/${menu.id}`}
                  className="icon-button"
                  title="View menu"
                  aria-label={`View ${menu.menuName || 'saved menu'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
                <button
                  className="icon-button"
                  onClick={() => handleDelete(menu.id)}
                  title="Delete"
                  data-variant="danger"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="saved-menu-preview">
              {menu.dishes.slice(0, 3).map(d => d.name).join(', ')}
              {menu.dishes.length > 3 && ` +${menu.dishes.length - 3} more`}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
