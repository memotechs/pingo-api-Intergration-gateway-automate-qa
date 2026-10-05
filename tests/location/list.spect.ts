import { test, expect } from '../../fixtures/api.fixure';
import {
  expectLocation,
  locationTestData,
} from './location.data';

const endpoint = '/api/location/v1/list';

test.describe('Location List API', () => {
  test('LOCATION-LIST-001: return locations with pagination', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        page: locationTestData.page,
        pageSize: locationTestData.pageSize,
        orderBy: 'ASC',
        sortBy: 'createdAt',
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toEqual(
      expect.objectContaining({
        data: expect.any(Array),
        page: locationTestData.page,
        count: expect.any(Number),
        pageSize: locationTestData.pageSize,
        hasNext: expect.any(Boolean),
      }),
    );

    expect(Number.isInteger(body.count)).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(0);

    expect(body.data.length).toBeLessThanOrEqual(
      locationTestData.pageSize,
    );

    for (const location of body.data) {
      expectLocation(location);
    }

    const ids = body.data.map(
      (location: { id: number }) => location.id,
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  test('LOCATION-LIST-002: respect different page sizes', async ({
    apiClient,
  }) => {
    for (const pageSize of [1, 3]) {
      const response = await apiClient.get(endpoint, {
        params: {
          page: locationTestData.page,
          pageSize,
          orderBy: 'ASC',
          sortBy: 'createdAt',
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();

      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pageSize).toBe(pageSize);
      expect(body.data.length).toBeLessThanOrEqual(pageSize);
    }
  });

  test('LOCATION-LIST-003: return requested second page', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        page: 2,
        pageSize: locationTestData.pageSize,
        orderBy: 'ASC',
        sortBy: 'createdAt',
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(Array.isArray(body.data)).toBe(true);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(locationTestData.pageSize);
    expect(body.data.length).toBeLessThanOrEqual(
      locationTestData.pageSize,
    );

    for (const location of body.data) {
      expectLocation(location);
    }
  });

  test('LOCATION-LIST-004: reject invalid authentication', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        page: locationTestData.page,
        pageSize: locationTestData.pageSize,
      },
      authMode: 'invalid-password',
    });

    expect(response.status()).toBe(401);
  });
});