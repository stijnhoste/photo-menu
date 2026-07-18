import path from 'node:path';
import { expect, test } from '@playwright/test';

test('scan, correct, save, and reopen a menu', async ({ page }) => {
  await page.route('**/api/scan', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const dish = {
      id: '0bf80c95-5f7d-47c5-bb90-c73c3e9ba106', index: 0,
      name: 'Wild mushroom risotto', description: 'Mushrooms and parmesan', price: '$18', priceValue: 18,
      category: 'Main Courses', categoryOrder: 0, itemOrder: 0, imageUrl: null,
      imageIsRepresentative: true, ingredients: ['mushrooms', 'parmesan'], allergens: ['milk'],
      dietaryTags: ['vegetarian'], imageSearch: 'creamy mushroom risotto plate'
    };
    const body = [
      'event: metadata\ndata: {"restaurantName":"Demo Bistro","menuName":"Dinner","currency":"USD","sourceLanguage":"English"}\n\n',
      `event: dish\ndata: ${JSON.stringify(dish)}\n\n`,
      'event: progress\ndata: {"phase":"images","completed":1,"total":1}\n\n',
      'event: done\ndata: {"totalDishes":1}\n\n'
    ].join('');
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
  });

  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(path.resolve('client/public/pwa-192x192.png'));
  await page.getByRole('button', { name: 'Scan 1 page' }).click();
  await expect(page.getByRole('heading', { name: 'Make sure everything looks right' })).toBeVisible();
  await page.getByLabel('Restaurant').fill('Corrected Bistro');
  await page.getByLabel('Dish name').fill('Truffle mushroom risotto');
  await page.getByRole('button', { name: 'View corrected menu' }).click();
  await expect(page.getByRole('heading', { name: 'Truffle mushroom risotto' })).toBeVisible();
  await page.getByRole('link', { name: 'Saved menus' }).click();
  await expect(page.getByRole('heading', { name: 'Dinner' })).toBeVisible();
  await expect(page.getByText('Corrected Bistro')).toBeVisible();
  await page.getByRole('link', { name: 'View Dinner' }).click();
  await expect(page.getByRole('heading', { name: 'Truffle mushroom risotto' })).toBeVisible();
});

test('ships valid install assets and SPA routes', async ({ request }) => {
  for (const asset of ['/favicon.svg', '/apple-touch-icon.png', '/pwa-192x192.png', '/pwa-512x512.png', '/manifest.webmanifest']) {
    const response = await request.get(asset);
    expect(response.ok(), asset).toBeTruthy();
    expect(response.headers()['content-type']).not.toContain('text/html');
  }
  expect((await request.get('/saved')).ok()).toBeTruthy();
});
