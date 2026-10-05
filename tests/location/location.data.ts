import { expect } from '../../fixtures/api.fixure';

export const locationTestData = {
  date: process.env.LOCATION_TEST_DATE ?? '31-10-2026',
  page: 1,
  pageSize: 5,
};

export function expectLocation(value: unknown): void {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      nameKh: expect.any(String),
      shortName: expect.any(String),
    }),
  );
}

export function expectLocationPairsResponse(body: unknown): void {
  expect(body).toEqual(
    expect.objectContaining({
      count: expect.any(Number),
      items: expect.anything(),
    }),
  );

  const response = body as {
    count: number;
    items: unknown;
  };

  expect(Number.isInteger(response.count)).toBe(true);
  expect(response.count).toBeGreaterThanOrEqual(0);

  // Swagger shows one object; some responses may contain an array.
  const pairs = Array.isArray(response.items)
    ? response.items
    : [response.items];

  for (const pair of pairs) {
    expect(pair).toEqual(
      expect.objectContaining({
        count: expect.any(Number),
        fromLocation: expect.any(Object),
        toLocation: expect.any(Object),
      }),
    );

    expect(Number.isInteger(pair.count)).toBe(true);
    expect(pair.count).toBeGreaterThanOrEqual(0);

    expectLocation(pair.fromLocation);
    expectLocation(pair.toLocation);
  }
}