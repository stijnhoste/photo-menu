import { randomUUID } from 'crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = ':memory:';
  const module = await import('./app.js');
  app = module.createApp();
});

function validMenu() {
  const now = new Date().toISOString();
  return {
    version: 2 as const,
    id: randomUUID(),
    restaurantName: 'Test Bistro', menuName: 'Dinner', currency: 'USD', sourceLanguage: 'English',
    createdAt: now, updatedAt: now,
    dishes: [{
      id: randomUUID(), name: 'Tomato soup', description: 'Tomato and basil', price: '$8', priceValue: 8,
      category: 'Soups', categoryOrder: 0, itemOrder: 0, imageUrl: null,
      imageIsRepresentative: true, ingredients: ['tomato', 'basil'], allergens: [], dietaryTags: ['vegan']
    }]
  };
}

describe('application API', () => {
  it('reports health with a correlation ID', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body).toMatchObject({ status: 'ok', app: 'menu.pictures' });
  });

  it('rejects malformed share documents', async () => {
    await request(app).post('/api/share').send({ menu: { dishes: [] } }).expect(400);
  });

  it('creates and retrieves a permanent validated menu link', async () => {
    const menu = validMenu();
    const created = await request(app).post('/api/share').send({ menu }).expect(200);
    expect(created.body.expiresAt).toBeNull();
    const fetched = await request(app).get(`/api/share/${created.body.shareId}`).expect(200);
    expect(fetched.body.menu).toEqual(menu);
    expect(fetched.body.expiresAt).toBeNull();
  });
});
