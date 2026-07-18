import { useState, useMemo } from 'react';
import DishCard from './DishCard';
import ShareButton from './ShareButton';
import type { DietaryTag, Dish, Menu, ScanProgress } from '../types';

interface MenuGridProps {
  dishes: Dish[];
  isLoading: boolean;
  statusMessage?: string | null;
  progress?: ScanProgress | null;
  menu?: Menu | null;
  onCancel?: () => void;
  onDishChange?: (dish: Dish) => void;
  onReset: () => void;
}

export default function MenuGrid({ dishes, isLoading, statusMessage, progress, menu, onCancel, onDishChange, onReset }: MenuGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDietary, setSelectedDietary] = useState<DietaryTag | null>(null);
  const [maxPrice, setMaxPrice] = useState('');

  // Get unique categories from dishes
  const categories = useMemo(() => {
    const order = new Map<string, number>();
    dishes.forEach(dish => order.set(dish.category, Math.min(order.get(dish.category) ?? Infinity, dish.categoryOrder ?? dish.itemOrder ?? 0)));
    return Array.from(order.keys()).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  }, [dishes]);

  const dietaryOptions = useMemo(
    () => Array.from(new Set(dishes.flatMap(dish => dish.dietaryTags || []))),
    [dishes]
  );

  // Filter dishes by search and category
  const filteredDishes = useMemo(() => {
    return dishes.filter(dish => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = query === '' ||
        dish.name.toLowerCase().includes(query) ||
        (dish.description?.toLowerCase().includes(query) ?? false) ||
        (dish.ingredients || []).some(ingredient => ingredient.toLowerCase().includes(query)) ||
        (dish.originalName?.toLowerCase().includes(query) ?? false);
      const matchesCategory = selectedCategory === null ||
        dish.category === selectedCategory;
      const matchesDietary = selectedDietary === null || (dish.dietaryTags || []).includes(selectedDietary);
      const numericMax = Number(maxPrice);
      const matchesPrice = !maxPrice || dish.priceValue === null || dish.priceValue <= numericMax;
      return matchesSearch && matchesCategory && matchesDietary && matchesPrice;
    });
  }, [dishes, searchQuery, selectedCategory, selectedDietary, maxPrice]);

  // Group dishes by category for display
  const dishesByCategory = useMemo(() => {
    const grouped = new Map<string, Dish[]>();
    filteredDishes.forEach(dish => {
      const existing = grouped.get(dish.category) || [];
      grouped.set(dish.category, [...existing, dish]);
    });
    return grouped;
  }, [filteredDishes]);

  // Sort categories for consistent display
  const sortedCategories = useMemo(() => {
    return categories.filter(category => dishesByCategory.has(category));
  }, [categories, dishesByCategory]);

  return (
    <div className="menu-container">
      {/* Header with count and actions */}
      <div className="grid-header">
        <h2>{filteredDishes.length} item{filteredDishes.length !== 1 ? 's' : ''} found</h2>
        <div className="grid-actions">
          <ShareButton menu={menu} dishes={dishes} disabled={isLoading || dishes.length === 0 || !menu} />
          <button className="icon-button" onClick={onReset} title="New scan">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="search-bar">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="search-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search dishes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category filter chips */}
      {categories.length > 1 && (
        <div className="category-chips">
          <button
            className={`category-chip ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
            aria-label="Show all categories"
            aria-pressed={selectedCategory === null}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              aria-label={`Filter by ${cat}`}
              aria-pressed={selectedCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {(dietaryOptions.length > 0 || dishes.some(dish => typeof dish.priceValue === 'number')) && (
        <div className="advanced-filters" aria-label="Dietary and price filters">
          {dietaryOptions.map(tag => (
            <button
              key={tag}
              className={`category-chip ${selectedDietary === tag ? 'active' : ''}`}
              onClick={() => setSelectedDietary(selectedDietary === tag ? null : tag)}
              aria-pressed={selectedDietary === tag}
            >
              {tag}
            </button>
          ))}
          <label className="price-filter">
            Max price
            <input type="number" min="0" step="1" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} />
          </label>
        </div>
      )}

      {/* Dishes grouped by category */}
      <div className="categories-container">
        {sortedCategories.map(category => (
          <div key={category} className="category-section">
            <h3 className="category-title">{category}</h3>
            <div className="menu-grid">
              {dishesByCategory.get(category)?.map((dish, index) => (
                <DishCard
                  key={dish.id || `${dish.name}-${dish.price || 'no-price'}-${index}`}
                  dish={dish}
                  onImageChange={onDishChange ? imageUrl => onDishChange({ ...dish, imageUrl }) : undefined}
                />
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <>
            {statusMessage && (
              <p className="status-message">
                {statusMessage}
                {progress?.total ? ` ${progress.completed}/${progress.total}` : ''}
              </p>
            )}
            {onCancel && <button className="secondary-button scan-cancel" onClick={onCancel}>Cancel scan</button>}
            <div className="menu-grid">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </>
        )}

        {!isLoading && filteredDishes.length === 0 && dishes.length > 0 && (
          <div className="no-results">
            <p>No dishes match your search</p>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory(null); setSelectedDietary(null); setMaxPrice(''); }}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="dish-card skeleton-card">
      <div className="skeleton skeleton-image" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text short" />
    </div>
  );
}
