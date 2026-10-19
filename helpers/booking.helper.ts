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

  return (await response.json()) as T;
}

export class BookingApi {
  constructor(private readonly request: APIRequestContext) {}

  getAvailableLocations(): Promise<APIResponse> {
    return this.request.get('/api/location/v1/all-available-location');
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

  getScheduleDetail(data: BookingTestData): Promise<APIResponse> {
    return this.request.get(`/api/schedule/v1/${data.scheduleId}`, {
      params: {
        date: data.searchDate,
        merchantId: data.merchantId,
      },
    });
  }

  create(data: CreateBookingRequest): Promise<APIResponse> {
    return this.request.post('/api/booking/v1/create', {
      data,
    });
  }

  checkStatus(trxNo: string): Promise<APIResponse> {
    return this.request.get(
      `/api/booking/v1/check-status/${encodeURIComponent(trxNo)}`,
    );
  }

  getByNumber(bookingNo: string): Promise<APIResponse> {
    return this.request.get(
      `/api/booking/v1/no/${encodeURIComponent(bookingNo)}`,
    );
  }

  complete(data: UpdateBookingRequest): Promise<APIResponse> {
    return this.request.put('/api/booking/v1/update', {
      data,
    });
  }

  cancel(data: CancelBookingRequest): Promise<APIResponse> {
    return this.request.put('/api/booking/v1/cancel', {
      data,
    });
  }
}