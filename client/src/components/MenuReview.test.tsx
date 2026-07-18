// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MenuReview from './MenuReview';
import type { Dish, MenuMetadata } from '../types';

const dish: Dish = {
  id: 'fdcd155b-c1f8-4a89-8fe9-25c158550ae8',
  name: 'Mushroom risotto',
  description: 'Wild mushrooms and parmesan',
  price: '$18',
  priceValue: 18,
  imageUrl: null,
  imageIsRepresentative: true,
  category: 'Main Courses',
  categoryOrder: 1,
  itemOrder: 0,
  ingredients: ['mushrooms', 'parmesan'],
  allergens: ['milk'],
  dietaryTags: ['vegetarian']
};

const metadata: MenuMetadata = {
  restaurantName: 'The Test Kitchen',
  menuName: 'Dinner',
  currency: 'USD',
  sourceLanguage: 'English'
};

afterEach(cleanup);

describe('MenuReview', () => {
  it('allows correcting menu metadata and dish fields', () => {
    const onDishesChange = vi.fn();
    const onMetadataChange = vi.fn();

    render(
      <MenuReview
        dishes={[dish]}
        metadata={metadata}
        onDishesChange={onDishesChange}
        onMetadataChange={onMetadataChange}
        onConfirm={vi.fn()}
        onRescan={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Restaurant'), {
      target: { value: 'Corrected Restaurant' }
    });
    expect(onMetadataChange).toHaveBeenCalledWith({
      ...metadata,
      restaurantName: 'Corrected Restaurant'
    });

    fireEvent.change(screen.getByLabelText('Dish name'), {
      target: { value: 'Truffle risotto' }
    });
    expect(onDishesChange).toHaveBeenCalledWith([
      { ...dish, name: 'Truffle risotto' }
    ]);
  });

  it('requires every dish to have a name before continuing', () => {
    render(
      <MenuReview
        dishes={[{ ...dish, name: ' ' }]}
        metadata={metadata}
        onDishesChange={vi.fn()}
        onMetadataChange={vi.fn()}
        onConfirm={vi.fn()}
        onRescan={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'View corrected menu' })).toBeDisabled();
  });
});
