 import { test, expect } from '../../fixtures/api.fixure';

const endpoint = '/api/vehicle-type/v1/list';

const defaultParams = {
  page: 1,
  pageSize: 5,
  orderBy: 'ASC',
  sortBy: 'createdAt',
};

type VehicleType = {
  id: number;
  icon: string;
  name: string;
  description: string;
  serviceType: {
    id: number;
    icon: string;
    name: string;
  };
};

type VehicleTypeList = {
  data: VehicleType[];
  page: number;
  count: number;
  pageSize: number;
  hasNext: boolean;
};

function validateResponse(
  body: VehicleTypeList,
  page?: number,
  pageSize?: number,
): void {
  expect(body).toEqual(
    expect.objectContaining({
      data: expect.any(Array),
      page: expect.any(Number),
      count: expect.any(Number),
      pageSize: expect.any(Number),
      hasNext: expect.any(Boolean),
    }),
  );

  expect(Number.isInteger(body.page)).toBe(true);
  expect(Number.isInteger(body.count)).toBe(true);
  expect(Number.isInteger(body.pageSize)).toBe(true);

  expect(body.page).toBeGreaterThanOrEqual(0);
  expect(body.count).toBeGreaterThanOrEqual(0);
  expect(body.pageSize).toBeGreaterThan(0);
  expect(body.data.length).toBeLessThanOrEqual(body.pageSize);

  if (page !== undefined) {
    expect(body.page).toBe(page);
  }

  if (pageSize !== undefined) {
    expect(body.pageSize).toBe(pageSize);
  }

  for (const item of body.data) {
    expect(item).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        icon: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        serviceType: expect.objectContaining({
          id: expect.any(Number),
          icon: expect.any(String),
          name: expect.any(String),
        }),
      }),
    );

    expect(Number.isInteger(item.id)).toBe(true);
    expect(Number.isInteger(item.serviceType.id)).toBe(true);
  }

  const ids = body.data.map((item) => item.id);

  expect(new Set(ids).size).toBe(ids.length);
}

test.describe('Vehicle Type List API', () => {
  test('VEHICLE-TYPE-001: return list without optional parameters', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint);

    expect(response.status()).toBe(200);

    const body: VehicleTypeList = await response.json();

    validateResponse(body);
  });

  test('VEHICLE-TYPE-002: return list with pagination', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: defaultParams,
    });

    expect(response.status()).toBe(200);

    const body: VehicleTypeList = await response.json();

    validateResponse(
      body,
      defaultParams.page,
      defaultParams.pageSize,
    );
  });

  const pageSizeCases = [
    { id: 'VEHICLE-TYPE-003', pageSize: 1 },
    { id: 'VEHICLE-TYPE-004', pageSize: 3 },
    { id: 'VEHICLE-TYPE-005', pageSize: 10 },
  ];

  for (const { id, pageSize } of pageSizeCases) {
    test(`${id}: respect pageSize=${pageSize}`, async ({
      apiClient,
    }) => {
      const response = await apiClient.get(endpoint, {
        params: {
          ...defaultParams,
          pageSize,
        },
      });

      expect(response.status()).toBe(200);

      const body: VehicleTypeList = await response.json();

      validateResponse(body, defaultParams.page, pageSize);
    });
  }

  test('VEHICLE-TYPE-006: return requested second page', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        ...defaultParams,
        page: 2,
      },
    });

    expect(response.status()).toBe(200);

    const body: VehicleTypeList = await response.json();

    validateResponse(body, 2, defaultParams.pageSize);
  });

  test('VEHICLE-TYPE-007: accept descending order', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        ...defaultParams,
        orderBy: 'DESC',
      },
    });

    expect(response.status()).toBe(200);

    const body: VehicleTypeList = await response.json();

    validateResponse(
      body,
      defaultParams.page,
      defaultParams.pageSize,
    );
  });

  test('VEHICLE-TYPE-008: accept empty search query', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        ...defaultParams,
        query: '',
      },
    });

    expect(response.status()).toBe(200);

    const body: VehicleTypeList = await response.json();

    validateResponse(
      body,
      defaultParams.page,
      defaultParams.pageSize,
    );
  });

  test('VEHICLE-TYPE-009: reject invalid authentication', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: defaultParams,
      authMode: 'invalid-password',
    });

    expect(response.status()).toBe(401);
  });
});