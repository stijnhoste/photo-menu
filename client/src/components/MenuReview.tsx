import type { DietaryTag, Dish, MenuMetadata } from '../types';

interface MenuReviewProps {
  dishes: Dish[];
  metadata: MenuMetadata;
  onDishesChange: (dishes: Dish[]) => void;
  onMetadataChange: (metadata: MenuMetadata) => void;
  onConfirm: () => void;
  onRescan: () => void;
}

const DIETARY_TAGS: DietaryTag[] = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'halal',
  'kosher',
  'spicy'
];

function splitList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function parsePrice(value: string): number | null {
  const normalized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function MenuReview({
  dishes,
  metadata,
  onDishesChange,
  onMetadataChange,
  onConfirm,
  onRescan
}: MenuReviewProps) {
  const canConfirm = dishes.length > 0 && dishes.every(dish => dish.name.trim());

  const updateDish = (id: string, updates: Partial<Dish>) => {
    onDishesChange(dishes.map(dish => dish.id === id ? { ...dish, ...updates } : dish));
  };

  const removeDish = (id: string) => {
    onDishesChange(dishes.filter(dish => dish.id !== id));
  };

  const addDish = () => {
    const last = dishes.at(-1);
    onDishesChange([
      ...dishes,
      {
        id: crypto.randomUUID(),
        name: 'New dish',
        description: null,
        price: null,
        priceValue: null,
        imageUrl: null,
        imageIsRepresentative: true,
        category: last?.category || 'Other',
        categoryOrder: last?.categoryOrder ?? 0,
        itemOrder: dishes.length,
        ingredients: [],
        allergens: [],
        dietaryTags: []
      }
    ]);
  };

  return (
    <section className="review-page" aria-labelledby="review-title">
      <div className="review-heading">
        <div>
          <p className="eyebrow">Review your scan</p>
          <h2 id="review-title">Make sure everything looks right</h2>
          <p>AI can make mistakes. Confirm prices and ask restaurant staff about allergens.</p>
        </div>
        <span className="review-count">{dishes.length} dishes</span>
      </div>

      <div className="review-metadata card-panel">
        <label>
          Restaurant
          <input
            value={metadata.restaurantName || ''}
            placeholder="Restaurant name"
            onChange={event => onMetadataChange({ ...metadata, restaurantName: event.target.value || null })}
          />
        </label>
        <label>
          Menu
          <input
            value={metadata.menuName || ''}
            placeholder="Dinner menu"
            onChange={event => onMetadataChange({ ...metadata, menuName: event.target.value || null })}
          />
        </label>
        <label>
          Currency
          <input
            value={metadata.currency || ''}
            placeholder="USD"
            maxLength={10}
            onChange={event => onMetadataChange({ ...metadata, currency: event.target.value || null })}
          />
        </label>
      </div>

      <div className="review-list">
        {dishes.map((dish, index) => (
          <article className="review-dish card-panel" key={dish.id}>
            <div className="review-dish-number">{index + 1}</div>
            <div className="review-dish-fields">
              <div className="review-row review-row-primary">
                <label>
                  Dish name
                  <input
                    value={dish.name}
                    maxLength={200}
                    onChange={event => updateDish(dish.id, { name: event.target.value })}
                  />
                </label>
                <label className="review-price-field">
                  Price
                  <input
                    value={dish.price || ''}
                    maxLength={30}
                    placeholder="$12.00"
                    onChange={event => updateDish(dish.id, {
                      price: event.target.value || null,
                      priceValue: parsePrice(event.target.value)
                    })}
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  value={dish.description || ''}
                  maxLength={500}
                  rows={2}
                  placeholder="Description printed on the menu"
                  onChange={event => updateDish(dish.id, { description: event.target.value || null })}
                />
              </label>
              <div className="review-row">
                <label>
                  Category
                  <input
                    value={dish.category}
                    maxLength={60}
                    onChange={event => updateDish(dish.id, { category: event.target.value })}
                  />
                </label>
                <label>
                  Ingredients <span>(comma separated)</span>
                  <input
                    value={dish.ingredients.join(', ')}
                    onChange={event => updateDish(dish.id, { ingredients: splitList(event.target.value) })}
                  />
                </label>
              </div>
              <label>
                Allergens shown or indicated <span>(comma separated)</span>
                <input
                  value={dish.allergens.join(', ')}
                  onChange={event => updateDish(dish.id, { allergens: splitList(event.target.value) })}
                />
              </label>
              <fieldset className="dietary-checks">
                <legend>Dietary indicators</legend>
                {DIETARY_TAGS.map(tag => (
                  <label key={tag}>
                    <input
                      type="checkbox"
                      checked={dish.dietaryTags.includes(tag)}
                      onChange={() => updateDish(dish.id, {
                        dietaryTags: dish.dietaryTags.includes(tag)
                          ? dish.dietaryTags.filter(value => value !== tag)
                          : [...dish.dietaryTags, tag]
                      })}
                    />
                    {tag}
                  </label>
                ))}
              </fieldset>
            </div>
            <button
              className="review-remove"
              onClick={() => removeDish(dish.id)}
              aria-label={`Remove ${dish.name}`}
            >
              ×
            </button>
          </article>
        ))}
      </div>

      <button className="secondary-button review-add" onClick={addDish}>+ Add missing dish</button>

      <div className="review-actions">
        <button className="secondary-button" onClick={onRescan}>Scan again</button>
        <button className="scan-button" onClick={onConfirm} disabled={!canConfirm}>
          View corrected menu
        </button>
      </div>
    </section>
  );
}
