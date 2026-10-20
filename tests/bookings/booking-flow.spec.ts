import { randomUUID } from 'node:crypto';

import {
  test,
  expect,
  type APIRequestContext,
} from '@playwright/test';

import {
  buildBookingRequest,
  getBookingAuth,
  getBookingData,
} from '../../data/booking.data';

import {
  BOOKING_AUTH_CASES,
  DEFAULT_BOOKING_LIST_PARAMS,
  BookingApi,
  readJson,
} from '../../helpers/booking.helper';

import type {
  Booking,
  BookingStatus,
  BookingTransaction,
  Pagination,
  ScheduleDetail,
  ScheduleSummary,
} from '../../types/booking.types';

const auth = getBookingAuth();

test.use({
  baseURL: auth.baseURL,
  httpCredentials: {
    username: auth.username,
    password: auth.password,
    send: 'always',
  },
  extraHTTPHeaders: {
    Accept: 'application/json',
  },
});

function assertBooking(booking: Booking): void {
  expect(booking).toBeTruthy();

  expect(Number.isInteger(booking.id)).toBe(true);
  expect(booking.id).toBeGreaterThan(0);

  expect(typeof booking.bookingNo).toBe('string');
  expect(booking.bookingNo.trim().length).toBeGreaterThan(0);

  expect(booking.status).toEqual(expect.any(Number));
  expect(booking.paymentStatus).toEqual(expect.any(Number));

  expect(Number.isInteger(booking.numberOfSeats)).toBe(true);
  expect(booking.numberOfSeats).toBeGreaterThanOrEqual(0);

  expect(booking.merchant).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
    }),
  );

  expect(booking.fromLocation).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
    }),
  );

  expect(booking.toLocation).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
    }),
  );

  expect(Array.isArray(booking.bookingItems)).toBe(true);

  for (const item of booking.bookingItems) {
    expect(Number.isFinite(item.amount)).toBe(true);
    expect(item.amount).toBeGreaterThanOrEqual(0);

    expect(item.seat).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        seatNumber: expect.any(String),
      }),
    );
  }
}

function assertPage(
  body: Pagination<Booking>,
  page: number,
  pageSize: number,
): void {
  expect(body).toBeTruthy();
  expect(Array.isArray(body.data)).toBe(true);

  console.log('Booking list pagination:', {
    requestedPage: page,
    requestedPageSize: pageSize,
    returnedPage: body.page,
    returnedPageSize: body.pageSize,
    returnedItems: body.data.length,
    count: body.count,
    hasNext: body.hasNext,
  });

  expect.soft(
    body.page,
    'Response page must match the requested page.',
  ).toBe(page);

  expect.soft(
    body.pageSize,
    'Response pageSize must match the requested pageSize.',
  ).toBe(pageSize);

  expect.soft(
    body.data.length,
    'Returned items must not exceed the requested pageSize.',
  ).toBeLessThanOrEqual(pageSize);

  expect(Number.isInteger(body.count)).toBe(true);
  expect(body.count).toBeGreaterThanOrEqual(0);
  expect(typeof body.hasNext).toBe('boolean');

  const ids = body.data.map((booking) => booking.id);

  expect(
    new Set(ids).size,
    'A page must not contain duplicate booking IDs.',
  ).toBe(ids.length);

  for (const booking of body.data) {
    assertBooking(booking);
  }
}

async function findExistingBooking(
  request: APIRequestContext,
): Promise<Booking> {
  const api = new BookingApi(request);

  const response = await api.getBookings({
    ...DEFAULT_BOOKING_LIST_PARAMS,
    page: 1,
    pageSize: 1,
  });

  const body = await readJson<Pagination<Booking>>(
    response,
    'Find an existing booking',
  );

  expect(Array.isArray(body.data)).toBe(true);

  expect(
    body.data.length,
    'Test data required: this account must have an existing booking.',
  ).toBeGreaterThan(0);

  // Pagination is checked in list tests.
  // Detail tests only need an existing booking.
  const booking = body.data[0];

  assertBooking(booking);

  return booking;
}

test.describe('Booking read APIs', () => {
  test('BOOKING-LIST-001: return bookings with pagination', async ({
    request,
  }) => {
    const api = new BookingApi(request);

    const response = await api.getBookings({
      ...DEFAULT_BOOKING_LIST_PARAMS,
      page: 1,
      pageSize: 5,
    });

    const body = await readJson<Pagination<Booking>>(
      response,
      'List bookings',
    );

    assertPage(body, 1, 5);
  });

  test('BOOKING-LIST-002: honor pageSize 1', async ({
    request,
  }) => {
    const api = new BookingApi(request);

    const response = await api.getBookings({
      ...DEFAULT_BOOKING_LIST_PARAMS,
      page: 1,
      pageSize: 1,
    });

    const body = await readJson<Pagination<Booking>>(
      response,
      'List bookings with pageSize 1',
    );

    assertPage(body, 1, 1);
  });

  test('BOOKING-LIST-003: paginate without repeating booking IDs', async ({
    request,
  }) => {
    const api = new BookingApi(request);

    const params = {
      ...DEFAULT_BOOKING_LIST_PARAMS,
      page: 1,
      pageSize: 5,
      orderBy: 'ASC' as const,
      sortBy: 'id',
    };

    const firstResponse = await api.getBookings(params);

    const first = await readJson<Pagination<Booking>>(
      firstResponse,
      'Get first booking page',
    );

    assertPage(first, 1, 5);

    // Keep existing assertion failures visible rather than skipping them.
    if (!first.hasNext) {
      test.skip(
        test.info().errors.length === 0,
        'At least two pages of bookings are required.',
      );

      return;
    }

    const secondResponse = await api.getBookings({
      ...params,
      page: 2,
    });

    const second = await readJson<Pagination<Booking>>(
      secondResponse,
      'Get second booking page',
    );

    assertPage(second, 2, 5);

    expect(
      second.data.length,
      'hasNext=true must lead to a nonempty next page.',
    ).toBeGreaterThan(0);

    const firstIds = new Set(
      first.data.map((booking) => booking.id),
    );

    for (const booking of second.data) {
      expect.soft(
        firstIds.has(booking.id),
        `Booking ${booking.id} appears on both pages.`,
      ).toBe(false);
    }
  });

  test('BOOKING-GET-ID-001: get an existing booking by ID', async ({
    request,
  }) => {
    const api = new BookingApi(request);
    const selected = await findExistingBooking(request);

    const response = await api.getById(selected.id);

    const booking = await readJson<Booking>(
      response,
      'Get booking by ID',
    );

    assertBooking(booking);

    expect(booking.id).toBe(selected.id);
    expect(booking.bookingNo).toBe(selected.bookingNo);
    expect(booking.merchant.id).toBe(selected.merchant.id);
  });

  test('BOOKING-GET-NO-001: get an existing booking by number', async ({
    request,
  }) => {
    const api = new BookingApi(request);
    const selected = await findExistingBooking(request);

    const response = await api.getByNumber(
      selected.bookingNo,
    );

    const booking = await readJson<Booking>(
      response,
      'Get booking by number',
    );

    assertBooking(booking);

    expect(booking.id).toBe(selected.id);
    expect(booking.bookingNo).toBe(selected.bookingNo);
    expect(booking.merchant.id).toBe(selected.merchant.id);
  });

  test('BOOKING-STATUS-001: check an existing transaction', async ({
    request,
  }) => {
    const trxNo =
      process.env.BOOKING_EXISTING_TRX_NO?.trim();

    test.skip(
      !trxNo || trxNo === 'REPLACE',
      'Set BOOKING_EXISTING_TRX_NO to an existing QA transaction.',
    );

    const api = new BookingApi(request);

    const response = await api.checkStatus(trxNo!);

    const body = await readJson<BookingStatus>(
      response,
      'Check existing transaction',
    );

    expect(body.trxNo).toBe(trxNo);
    expect(body.status).toEqual(expect.any(Number));
    expect(body.paymentStatus).toEqual(expect.any(Number));

    expect(Array.isArray(body.bookings)).toBe(true);
    expect(body.bookings.length).toBeGreaterThan(0);

    for (const booking of body.bookings) {
      expect(booking.id).toEqual(expect.any(Number));
      expect(typeof booking.bookingNo).toBe('string');
      expect(booking.bookingNo.length).toBeGreaterThan(0);
      expect(booking.status).toEqual(expect.any(Number));
      expect(booking.paymentStatus).toEqual(expect.any(Number));
    }
  });
});

test.describe('Booking authentication', () => {
  for (const authCase of BOOKING_AUTH_CASES) {
    test(`reject invalid authentication: ${authCase.name}`, async ({
      playwright,
    }) => {
      const invalidRequest =
        await playwright.request.newContext({
          baseURL: auth.baseURL,
          extraHTTPHeaders: {
            Accept: 'application/json',
            Authorization:
              `Basic ${Buffer.from(
                'qa-invalid-user:qa-invalid-password',
              ).toString('base64')}`,
          },
        });

      try {
        const response = await invalidRequest.fetch(
          authCase.path,
          {
            method: authCase.method,
            data: authCase.body,
            maxRedirects: 0,
          },
        );

        expect(
          response.status(),
          `${authCase.method} ${authCase.path}: expected documented HTTP 401.`,
        ).toBe(401);
      } finally {
        await invalidRequest.dispose();
      }
    });
  }
});

test.describe('Booking mutation flow', () => {
  test.describe.configure({ retries: 0 });

  test('BOOKING-FLOW-001: create, retrieve, complete and optionally cancel', async ({
    request,
  }, testInfo) => {
    test.setTimeout(180_000);

    const api = new BookingApi(request);
    const data = getBookingData();
    const reference = `QA-${randomUUID()}`;

    let transaction!: BookingTransaction;
    let createdBooking!: Booking;
    let selectedSeatNumber = '';

    async function waitForStatus(
      expectedStatus: number,
    ): Promise<void> {
      await expect
        .poll(
          async () => {
            const response = await api.checkStatus(
              transaction.trxNo,
            );

            const body = await readJson<BookingStatus>(
              response,
              'Check transaction status',
            );

            expect(body.trxNo).toBe(transaction.trxNo);
            expect(Array.isArray(body.bookings)).toBe(true);

            expect(
              body.bookings.some(
                (booking) =>
                  booking.bookingNo === createdBooking.bookingNo,
              ),
            ).toBe(true);

            return body.status;
          },
          {
            message:
              `Transaction must reach status ${expectedStatus}`,
            timeout: 30_000,
            intervals: [1_000, 2_000, 3_000],
          },
        )
        .toBe(expectedStatus);
    }

    await test.step('Find the configured schedule', async () => {
      let selected: ScheduleSummary | undefined;

      for (let page = 1; page <= 20; page += 1) {
        const response = await api.getSchedules(data, page);

        const body = await readJson<
          Pagination<ScheduleSummary>
        >(response, 'Search schedules');

        expect(Array.isArray(body.data)).toBe(true);
        expect(typeof body.hasNext).toBe('boolean');

        selected = body.data.find(
          (schedule) =>
            schedule.id === data.scheduleId &&
            schedule.merchant?.id === data.merchantId,
        );

        if (selected || !body.hasNext) {
          break;
        }
      }

      if (!selected) {
        throw new Error(
          [
            'Configured schedule was not found.',
            `Schedule: ${data.scheduleId}.`,
            `Merchant: ${data.merchantId}.`,
            `Date: ${data.searchDate}.`,
            `Route: ${data.fromLocationId} -> ${data.toLocationId}.`,
          ].join(' '),
        );
      }

      expect(selected.fromLocation.id).toBe(
        data.fromLocationId,
      );

      expect(selected.toLocation.id).toBe(
        data.toLocationId,
      );

      expect(selected.availableSeats).toBeGreaterThan(0);
    });

    await test.step('Validate the configured seat', async () => {
      const response = await api.getScheduleDetail(data);

      const detail = await readJson<ScheduleDetail>(
        response,
        'Get schedule detail',
      );

      expect(detail.id).toBe(data.scheduleId);
      expect(detail.merchant.id).toBe(data.merchantId);

      expect(detail.fromLocation.id).toBe(
        data.fromLocationId,
      );

      expect(detail.toLocation.id).toBe(
        data.toLocationId,
      );

      expect(
        Array.isArray(detail.schedule.scheduleSeatLayouts),
      ).toBe(true);

      const seats =
        detail.schedule.scheduleSeatLayouts.flatMap(
          (layout) => layout.scheduleVehicleSeats,
        );

      console.table(
        seats.map((item) => ({
          scheduleVehicleSeatId: item.id,
          nestedSeatId: item.seat?.id,
          seatNumber: item.seat?.seatNumber,
          status: item.status,
        })),
      );

      // Existing assumption: BOOKING_SEAT_ID is nested seat.id.
      // The booking API's required ID mapping is still unconfirmed.
      const selected = seats.find(
        (item) =>
          item.seat?.id === data.seatId &&
          typeof item.seat.seatNumber === 'string' &&
          item.seat.seatNumber.trim().length > 0,
      );

      if (!selected) {
        throw new Error(
          `Configured nested seat ID ${data.seatId} ` +
            `was not found as a numbered seat in schedule ` +
            `${data.scheduleId}. Confirm the booking seat-ID mapping.`,
        );
      }

      expect(
        selected.status,
        'Seat must have the configured available status.',
      ).toBe(data.availableSeatStatus);

      selectedSeatNumber = selected.seat.seatNumber;

      console.log('Booking identifiers:', {
        scheduleId: detail.id,
        nestedScheduleId: detail.schedule.id,
        scheduleLineId: data.scheduleLineId,
        nestedSeatId: selected.seat.id,
        scheduleVehicleSeatId: selected.id,
        seatNumber: selectedSeatNumber,
        date: data.bookingDate,
      });
    });

    await test.step('POST create booking', async () => {
      const payload = buildBookingRequest(data, reference);
      const bookingRequest = payload.bookings[0];
      const bookingItem = bookingRequest.bookingItems[0];

      console.log('Create booking request IDs:', {
        date: bookingRequest.date,
        scheduleLineId: bookingRequest.scheduleLineId,
        seatId: bookingItem.seatId,
        priceId: bookingItem.priceId,
        nationalityId: bookingItem.nationalityId,
        amount: bookingItem.amount,
      });

      const response = await api.create(payload);

      transaction = await readJson<BookingTransaction>(
        response,
        'Create booking',
      );

      if (typeof transaction.trxNo === 'string') {
        testInfo.annotations.push({
          type: 'booking-transaction',
          description: transaction.trxNo,
        });
      }

      expect(typeof transaction.trxNo).toBe('string');
      expect(transaction.trxNo.length).toBeGreaterThan(0);

      expect(Array.isArray(transaction.bookings)).toBe(true);
      expect(transaction.bookings).toHaveLength(1);

      createdBooking = transaction.bookings[0];

      assertBooking(createdBooking);

      testInfo.annotations.push({
        type: 'booking-number',
        description: createdBooking.bookingNo,
      });

      expect(createdBooking.numberOfSeats).toBe(1);
      expect(createdBooking.bookingItems).toHaveLength(1);

      expect(createdBooking.merchant.id).toBe(
        data.merchantId,
      );

      expect(createdBooking.fromLocation.id).toBe(
        data.fromLocationId,
      );

      expect(createdBooking.toLocation.id).toBe(
        data.toLocationId,
      );

      const item = createdBooking.bookingItems[0];

      expect(item.seat.seatNumber).toBe(selectedSeatNumber);
      expect(item.amount).toBeCloseTo(data.amount, 2);
      expect(item.gender).toBe('male');
      expect(item.passenger.name).toBe(data.passenger.name);
    });

    await test.step('GET check transaction status', async () => {
      // Expected ready status from your previously shared flow.
      await waitForStatus(3);
    });

    await test.step('GET booking by ID', async () => {
      const response = await api.getById(
        createdBooking.id,
      );

      const booking = await readJson<Booking>(
        response,
        'Get created booking by ID',
      );

      assertBooking(booking);

      expect(booking.id).toBe(createdBooking.id);
      expect(booking.bookingNo).toBe(
        createdBooking.bookingNo,
      );
    });

    await test.step('GET booking by number', async () => {
      const response = await api.getByNumber(
        createdBooking.bookingNo,
      );

      const booking = await readJson<Booking>(
        response,
        'Get created booking by number',
      );

      assertBooking(booking);

      expect(booking.id).toBe(createdBooking.id);
      expect(booking.bookingNo).toBe(
        createdBooking.bookingNo,
      );

      expect(booking.bookingItems).toHaveLength(1);

      const item = booking.bookingItems[0];

      expect(item.seat.seatNumber).toBe(selectedSeatNumber);
      expect(item.amount).toBeCloseTo(data.amount, 2);
      expect(item.gender).toBe('male');

      expect(item.passenger.name).toBe(
        data.passenger.name,
      );

      expect(item.passenger.phoneNumber).toBe(
        data.passenger.phoneNumber,
      );

      expect(item.passenger.emailAddress).toBe(
        data.passenger.emailAddress,
      );
    });

    await test.step('PUT complete transaction', async () => {
      const response = await api.complete({
        action: 'complete',
        bookingTrxNo: transaction.trxNo,
        customer: data.customer,
      });

      const updated = await readJson<BookingTransaction>(
        response,
        'Complete booking',
      );

      expect(updated.trxNo).toBe(transaction.trxNo);
      expect(Array.isArray(updated.bookings)).toBe(true);

      expect(
        updated.bookings.some(
          (booking) => booking.id === createdBooking.id,
        ),
      ).toBe(true);

      await waitForStatus(data.completedStatus);

      const detailResponse = await api.getByNumber(
        createdBooking.bookingNo,
      );

      const booking = await readJson<Booking>(
        detailResponse,
        'Verify completed booking',
      );

      expect(booking.id).toBe(createdBooking.id);

      expect(booking.customer.phoneNumber).toBe(
        data.customer.phoneNumber,
      );

      expect(booking.customer.emailAddress).toBe(
        data.customer.emailAddress,
      );
    });

    if (data.cancelAfterComplete) {
      await test.step('PUT cancel eligible booking', async () => {
        if (data.cancelledStatus === undefined) {
          throw new Error(
            'Set BOOKING_CANCELLED_STATUS when cancellation is enabled.',
          );
        }

        const response = await api.cancel({
          bookingTrxNo: transaction.trxNo,
          bookings: [createdBooking.bookingNo],
        });

        const cancelled =
          await readJson<BookingTransaction>(
            response,
            'Cancel booking',
          );

        expect(cancelled.trxNo).toBe(transaction.trxNo);

        await waitForStatus(data.cancelledStatus);
      });
    } else {
      testInfo.annotations.push({
        type: 'coverage',
        description:
          'Successful cancellation was not exercised because cancellation is disabled.',
      });
    }
  });
});