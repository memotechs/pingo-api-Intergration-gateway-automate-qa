import { test, expect } from '../../fixtures/api.fixure';
import {
  expectLocationPairsResponse,
  locationTestData,
} from './location.data';

const endpoint = '/api/location/v1/available-pairs';

test.describe('Location Available Pairs API', () => {
  test('LOCATION-PAIR-001: return available location pairs', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        date: locationTestData.date,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();

    expectLocationPairsResponse(body);
  });

  test('LOCATION-PAIR-002: reject missing required date', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint);
    
    expect([400, 422]).toContain(response.status());
  });

  test('LOCATION-PAIR-003: reject impossible date', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        date: '32-13-2026',
      },
    });

    expect([400, 422]).toContain(response.status());
  });

  test('LOCATION-PAIR-004: reject invalid authentication', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        date: locationTestData.date,
      },
      authMode: 'invalid-password',
    });

    expect(response.status()).toBe(401);
  });
});