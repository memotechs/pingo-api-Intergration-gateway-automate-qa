import type {
  APIRequestContext,
  APIResponse,
} from '@playwright/test';

import type {
  BookingTestData,
  CancelBookingRequest,
  CreateBookingRequest,
  UpdateBookingRequest,
} from '../types/booking.types';

export type BookingListParams = {
  page?: number;
  pageSize?: number;
  orderBy?: 'ASC' | 'DESC';
  sortBy?: string;
  query?: string;
  subDomain?: string;
  userId?: number;
  isUpcoming?: boolean;
};

export const BOOKING_ROUTES = {
  create: '/api/booking/v1/create',
  update: '/api/booking/v1/update',
  cancel: '/api/booking/v1/cancel',
  list: '/api/booking/v1/list',
  byNumber: '/api/booking/v1/no',
  byId: '/api/booking/v1',
  status: '/api/booking/v1/check-status',
} as const;

export const DEFAULT_BOOKING_LIST_PARAMS: BookingListParams = {
  page: 1,
  pageSize: 5,
  orderBy: 'ASC',
  sortBy: 'createdAt',
};

export const BOOKING_AUTH_CASES = [
  {
    name: 'create booking',
    method: 'POST',
    path: BOOKING_ROUTES.create,
    body: {
      passengerCount: 1,
      bookings: [],
    },
  },
  {
    name: 'update booking',
    method: 'PUT',
    path: BOOKING_ROUTES.update,
    body: {
      action: 'complete',
      bookingTrxNo: 'QA-INVALID-AUTH',
      customer: {
        name: 'QA Customer',
        phoneNumber: '000000000',
        emailAddress: 'qa@example.com',
      },
    },
  },
  {
    name: 'cancel booking',
    method: 'PUT',
    path: BOOKING_ROUTES.cancel,
    body: {
      bookingTrxNo: 'QA-INVALID-AUTH',
      bookings: ['QA-INVALID-AUTH'],
    },
  },
  {
    name: 'list bookings',
    method: 'GET',
    path: BOOKING_ROUTES.list,
  },
  {
    name: 'get booking by number',
    method: 'GET',
    path: `${BOOKING_ROUTES.byNumber}/QA-INVALID-AUTH`,
  },
  {
    name: 'get booking by ID',
    method: 'GET',
    path: `${BOOKING_ROUTES.byId}/0`,
  },
  {
    name: 'check transaction status',
    method: 'GET',
    path: `${BOOKING_ROUTES.status}/QA-INVALID-AUTH`,
  },
];

export async function readJson<T>(
  response: APIResponse,
  operation: string,
): Promise<T> {
  if (response.status() !== 200) {
    const responseBody = await response.text();

    throw new Error(
      [
        `${operation}: expected HTTP 200, received ${response.status()}.`,
        `URL: ${response.url()}`,
        `Response: ${responseBody}`,
      ].join('\n'),
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(
      `${operation}: HTTP 200 response was not valid JSON. ` +
        `URL: ${response.url()}`,
    );
  }
}

export class BookingApi {
  constructor(private readonly request: APIRequestContext) {}

  getAvailableLocations(): Promise<APIResponse> {
    return this.request.get(
      '/api/location/v1/all-available-location',
    );
  }

  getSchedules(
    data: BookingTestData,
    page: number,
  ): Promise<APIResponse> {
    return this.request.get('/api/schedule/v1/list', {
      params: {
        date: data.searchDate,
        fromLocation: data.fromLocationId,
        toLocation: data.toLocationId,
        page,
        pageSize: 50,
        orderBy: 'ASC',
        sortBy: 'departureAt',
      },
    });
  }

  getScheduleDetail(
    data: BookingTestData,
  ): Promise<APIResponse> {
    return this.request.get(
      `/api/schedule/v1/${data.scheduleId}`,
      {
        params: {
          date: data.searchDate,
          merchantId: data.merchantId,
        },
      },
    );
  }

  getBookings(
    params: BookingListParams = DEFAULT_BOOKING_LIST_PARAMS,
  ): Promise<APIResponse> {
    return this.request.get(BOOKING_ROUTES.list, {
      params,
    });
  }

  getById(id: number | string): Promise<APIResponse> {
    return this.request.get(
      `${BOOKING_ROUTES.byId}/${encodeURIComponent(String(id))}`,
    );
  }

  getByNumber(bookingNo: string): Promise<APIResponse> {
    return this.request.get(
      `${BOOKING_ROUTES.byNumber}/${encodeURIComponent(bookingNo)}`,
    );
  }

  create(
    data: CreateBookingRequest,
  ): Promise<APIResponse> {
    return this.request.post(BOOKING_ROUTES.create, {
      data,
    });
  }

  checkStatus(trxNo: string): Promise<APIResponse> {
    return this.request.get(
      `${BOOKING_ROUTES.status}/${encodeURIComponent(trxNo)}`,
    );
  }

  complete(
    data: UpdateBookingRequest,
  ): Promise<APIResponse> {
    return this.request.put(BOOKING_ROUTES.update, {
      data,
    });
  }

  cancel(
    data: CancelBookingRequest,
  ): Promise<APIResponse> {
    return this.request.put(BOOKING_ROUTES.cancel, {
      data,
    });
  }
}