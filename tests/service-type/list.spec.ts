import { test, expect } from '../../fixtures/api.fixure';

const endpoint = '/api/service-type/v1/list';

const defaultParams = {
  page: 1,
  pageSize: 5,
  orderBy: 'ASC',
  sortBy: 'createdAt',
};

type ServiceType = {
  id: number;
  icon: string;
  name: string;
};

type ServiceTypeList = {
  data: ServiceType[];
  page: number;
  count: number;
  pageSize: number;
  hasNext: boolean;
};

function validateResponse(
  body: ServiceTypeList,
  page: number,
  pageSize: number,
): void {
  expect(body).toEqual(
    expect.objectContaining({
      data: expect.any(Array),
      page,
      count: expect.any(Number),
      pageSize,
      hasNext: expect.any(Boolean),
    }),
  );

  expect(Number.isInteger(body.count)).toBe(true);
  expect(body.count).toBeGreaterThanOrEqual(0);
  expect(body.data.length).toBeLessThanOrEqual(pageSize);

  for (const item of body.data) {
    expect(item).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        icon: expect.any(String),
        name: expect.any(String),
      }),
    );

    expect(Number.isInteger(item.id)).toBe(true);
  }

  const ids = body.data.map((item) => item.id);

  expect(new Set(ids).size).toBe(ids.length);
}

test.describe('Service Type List API', () => {
  test('SERVICE-TYPE-001: return list without optional parameters', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint);

    expect(response.status()).toBe(200);

    const body: ServiceTypeList = await response.json();

    expect(body.page).toEqual(expect.any(Number));
    expect(body.pageSize).toEqual(expect.any(Number));
    expect(Number.isInteger(body.page)).toBe(true);
    expect(Number.isInteger(body.pageSize)).toBe(true);
    expect(body.page).toBeGreaterThanOrEqual(0);
    expect(body.pageSize).toBeGreaterThan(0);

    validateResponse(body, body.page, body.pageSize);
  });

  test('SERVICE-TYPE-002: return list with pagination metadata', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: defaultParams,
    });

    expect(response.status()).toBe(200);

    const body: ServiceTypeList = await response.json();

    validateResponse(
      body,
      defaultParams.page,
      defaultParams.pageSize,
    );
  });

  for (const pageSize of [1, 3, 10]) {
    test(`SERVICE-TYPE-003: respect pageSize=${pageSize}`, async ({
      apiClient,
    }) => {
      const response = await apiClient.get(endpoint, {
        params: {
          ...defaultParams,
          pageSize,
        },
      });

      expect(response.status()).toBe(200);

      const body: ServiceTypeList = await response.json();

      validateResponse(body, defaultParams.page, pageSize);
    });
  }

  test('SERVICE-TYPE-004: return requested second page', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        ...defaultParams,
        page: 2,
      },
    });

    expect(response.status()).toBe(200);

    const body: ServiceTypeList = await response.json();

    validateResponse(body, 2, defaultParams.pageSize);
  });

  test('SERVICE-TYPE-005: accept descending order', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        ...defaultParams,
        orderBy: 'DESC',
      },
    });

    expect(response.status()).toBe(200);

    const body: ServiceTypeList = await response.json();

    validateResponse(
      body,
      defaultParams.page,
      defaultParams.pageSize,
    );
  });

  test('SERVICE-TYPE-006: accept empty search query', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: {
        ...defaultParams,
        query: '',
      },
    });

    expect(response.status()).toBe(200);

    const body: ServiceTypeList = await response.json();

    validateResponse(
      body,
      defaultParams.page,
      defaultParams.pageSize,
    );
  });

  test('SERVICE-TYPE-007: reject invalid authentication', async ({
    apiClient,
  }) => {
    const response = await apiClient.get(endpoint, {
      params: defaultParams,
      authMode: 'invalid-password',
    });

    expect(response.status()).toBe(401);
  });
});