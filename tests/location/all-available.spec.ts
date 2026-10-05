import { test, expect } from '../../fixtures/api.fixure';
import { expectLocationPairsResponse } from './location.data';

const endpoint = '/api/location/v1/all-available-location';

test.describe('Location All Available API', () => {
  test('LOCATION-ALL-001: return all available locations', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint);

    expect(response.status()).toBe(200);

    const body = await response.json();

    expectLocationPairsResponse(body);
  });

  test('LOCATION-ALL-002: reject invalid authentication', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      authMode: 'invalid-password',
    });

    expect(response.status()).toBe(401);
  });
});