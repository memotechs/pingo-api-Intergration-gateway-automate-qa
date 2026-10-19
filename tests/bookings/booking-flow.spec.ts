import { randomUUID } from 'node:crypto';

import { test, expect } from '@playwright/test';

import {
  buildBookingRequest,
  getBookingAuth,
  getBookingData,
} from '../../data/booking.data';

import {
  BookingApi,
  readJson,
} from '../../helpers/booking.helper';

import type {
  AvailableLocations,
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

test.describe('Booking Flow API', () => {
  test.describe.configure({ retries: 0 });

  test(
    'BOOKING-FLOW-001: create, verify and complete booking',
    async ({ request }, testInfo) => {
      test.setTimeout(180_000);

      const api = new BookingApi(request);
      const data = getBookingData();
      const reference = `QA-${randomUUID()}`;

      let transaction!: BookingTransaction;
      let createdBooking!: Booking;
      let selectedSeatNumber = '';

      async function waitForStatus(expectedStatus: number) {
        await expect
          .poll(
            async () => {
              const response = await api.checkStatus(transaction.trxNo);

              const status = await readJson<BookingStatus>(
                response,
                'Check transaction status',
              );

              expect(status.trxNo).toBe(transaction.trxNo);
              expect(Array.isArray(status.bookings)).toBe(true);

              expect(
                status.bookings.some(
                  (booking) =>
                    booking.bookingNo === createdBooking.bookingNo,
                ),
                'Transaction must contain the created booking',
              ).toBe(true);

              return status.status;
            },
            {
              message:
                `Transaction ${transaction.trxNo} must reach ` +
                `status ${expectedStatus}`,
              timeout: 30_000,
              intervals: [1_000, 2_000, 3_000],
            },
          )
          .toBe(expectedStatus);
      }

      await test.step('Verify the selected location pair', async () => {
        const response = await api.getAvailableLocations();

        const body = await readJson<AvailableLocations>(
          response,
          'Get available locations',
        );

        expect(body.items).toBeDefined();

        const pairs = Array.isArray(body.items)
          ? body.items
          : [body.items];

        const pairExists = pairs.some(
          (pair) =>
            pair.fromLocation?.id === data.fromLocationId &&
            pair.toLocation?.id === data.toLocationId,
        );

        expect(
          pairExists,
          'Configured departure and arrival pair must be available',
        ).toBe(true);
      });

      await test.step('Find the configured schedule', async () => {
        let selectedSchedule: ScheduleSummary | undefined;
        let searchedPages = 0;
        let returnedSchedules = 0;

        for (let page = 1; page <= 20; page += 1) {
          const response = await api.getSchedules(data, page);

          const body = await readJson<Pagination<ScheduleSummary>>(
            response,
            'Search schedules',
          );

          expect(Array.isArray(body.data)).toBe(true);
          expect(typeof body.hasNext).toBe('boolean');

          searchedPages += 1;
          returnedSchedules += body.data.length;

          console.log('Schedule search parameters:', {
            date: data.searchDate,
            fromLocationId: data.fromLocationId,
            toLocationId: data.toLocationId,
            expectedScheduleId: data.scheduleId,
            expectedMerchantId: data.merchantId,
            requestedPage: page,
            returnedPage: body.page,
            count: body.count,
            returnedItems: body.data.length,
            hasNext: body.hasNext,
          });

          console.table(
            body.data.map((schedule) => ({
              scheduleId: schedule.id,
              merchantId: schedule.merchant?.id,
              fromLocationId: schedule.fromLocation?.id,
              toLocationId: schedule.toLocation?.id,
              availableSeats: schedule.availableSeats,
            })),
          );

          selectedSchedule = body.data.find(
            (schedule) =>
              schedule.id === data.scheduleId &&
              schedule.merchant?.id === data.merchantId,
          );

          if (selectedSchedule || !body.hasNext) {
            break;
          }
        }

        if (!selectedSchedule) {
          throw new Error(
            [
              'Configured schedule was not found.',
              `Date: ${data.searchDate}.`,
              `Route: ${data.fromLocationId} -> ${data.toLocationId}.`,
              `Expected schedule ID: ${data.scheduleId}.`,
              `Expected merchant ID: ${data.merchantId}.`,
              `Searched pages: ${searchedPages}.`,
              `Returned schedule rows: ${returnedSchedules}.`,
            ].join(' '),
          );
        }

        expect(selectedSchedule.fromLocation.id).toBe(
          data.fromLocationId,
        );

        expect(selectedSchedule.toLocation.id).toBe(
          data.toLocationId,
        );

        expect(
          selectedSchedule.availableSeats,
          'The selected schedule must have available seats',
        ).toBeGreaterThan(0);
      });

      await test.step('Select an available numbered seat', async () => {
        const response = await api.getScheduleDetail(data);

        const detail = await readJson<ScheduleDetail>(
          response,
          'Get schedule detail',
        );

        expect(detail.id).toBe(data.scheduleId);
        expect(detail.merchant.id).toBe(data.merchantId);
        expect(detail.fromLocation.id).toBe(data.fromLocationId);
        expect(detail.toLocation.id).toBe(data.toLocationId);

        expect(
          Array.isArray(detail.schedule.scheduleSeatLayouts),
        ).toBe(true);

        const seats = detail.schedule.scheduleSeatLayouts.flatMap(
          (layout) => layout.scheduleVehicleSeats,
        );

        console.table(
          seats.map((item) => ({
            scheduleVehicleSeatId: item.id,
            seatId: item.seat?.id,
            seatNumber: item.seat?.seatNumber,
            status: item.status,
          })),
        );

        const selectedSeat = seats.find(
          (item) =>
            typeof item.seat?.seatNumber === 'string' &&
            item.seat.seatNumber.trim().length > 0 &&
            Number.isInteger(item.seat.id) &&
            item.seat.id > 0 &&
            item.status === data.availableSeatStatus,
        );

        if (!selectedSeat) {
          throw new Error(
            [
              'No available numbered seat was found.',
              `Schedule ID: ${data.scheduleId}.`,
              `Expected available status: ${data.availableSeatStatus}.`,
              'Confirm the seat-status meaning with your API team.',
            ].join(' '),
          );
        }

        // Preserve the existing mapping to nested seat.id.
        // Confirm this mapping with the booking API contract.
        data.seatId = selectedSeat.seat.id;
        selectedSeatNumber = selectedSeat.seat.seatNumber;

        expect(selectedSeat.status).toBe(data.availableSeatStatus);

        console.log('Selected booking seat:', {
          scheduleId: detail.id,
          nestedScheduleId: detail.schedule.id,
          configuredScheduleLineId: data.scheduleLineId,
          selectedSeatId: data.seatId,
          scheduleVehicleSeatId: selectedSeat.id,
          seatNumber: selectedSeatNumber,
          status: selectedSeat.status,
          date: data.bookingDate,
        });

        await testInfo.attach('selected-booking-seat', {
          body: JSON.stringify(
            {
              scheduleId: detail.id,
              nestedScheduleId: detail.schedule.id,
              scheduleLineId: data.scheduleLineId,
              seatId: data.seatId,
              scheduleVehicleSeatId: selectedSeat.id,
              seatNumber: selectedSeatNumber,
              status: selectedSeat.status,
              date: data.bookingDate,
            },
            null,
            2,
          ),
          contentType: 'application/json',
        });
      });

      await test.step('Create one booking for one passenger', async () => {
        const payload = buildBookingRequest(data, reference);

        expect(payload.passengerCount).toBe(1);
        expect(payload.bookings).toHaveLength(1);

        const bookingRequest = payload.bookings[0];

        expect(bookingRequest.numberOfPassenger).toBe(1);
        expect(bookingRequest.bookingItems).toHaveLength(1);
        expect(bookingRequest.bookingItems[0].seatId).toBe(data.seatId);
        expect(bookingRequest.scheduleLineId).toBe(data.scheduleLineId);

        // Log identifiers only; exclude customer details and credentials.
        console.log('Create booking request IDs:', {
          date: bookingRequest.date,
          scheduleLineId: bookingRequest.scheduleLineId,
          seatId: bookingRequest.bookingItems[0].seatId,
          priceId: bookingRequest.bookingItems[0].priceId,
          nationalityId: bookingRequest.bookingItems[0].nationalityId,
          amount: bookingRequest.bookingItems[0].amount,
        });

        const response = await api.create(payload);

        transaction = await readJson<BookingTransaction>(
          response,
          'Create booking',
        );

        expect(typeof transaction.trxNo).toBe('string');
        expect(transaction.trxNo.length).toBeGreaterThan(0);

        testInfo.annotations.push({
          type: 'booking-transaction',
          description: transaction.trxNo,
        });

        console.log(`Booking transaction: ${transaction.trxNo}`);

        expect(Array.isArray(transaction.bookings)).toBe(true);
        expect(transaction.bookings).toHaveLength(1);

        createdBooking = transaction.bookings[0];

        expect(createdBooking.id).toEqual(expect.any(Number));
        expect(typeof createdBooking.bookingNo).toBe('string');
        expect(createdBooking.bookingNo.length).toBeGreaterThan(0);

        testInfo.annotations.push({
          type: 'booking-number',
          description: createdBooking.bookingNo,
        });

        console.log(`Booking number: ${createdBooking.bookingNo}`);
      });

      await test.step('Wait for status 3 from the flow diagram', async () => {
        await waitForStatus(3);
      });

      await test.step('Verify booking detail by booking number', async () => {
        const response = await api.getByNumber(
          createdBooking.bookingNo,
        );

        const booking = await readJson<Booking>(
          response,
          'Get booking detail',
        );

        expect(booking.id).toBe(createdBooking.id);
        expect(booking.bookingNo).toBe(createdBooking.bookingNo);
        expect(booking.merchant.id).toBe(data.merchantId);
        expect(booking.fromLocation.id).toBe(data.fromLocationId);
        expect(booking.toLocation.id).toBe(data.toLocationId);
        expect(booking.numberOfSeats).toBe(1);

        expect(Array.isArray(booking.bookingItems)).toBe(true);
        expect(booking.bookingItems).toHaveLength(1);

        const item = booking.bookingItems[0];

        expect(item.seat.id).toBe(data.seatId);
        expect(item.seat.seatNumber).toBe(selectedSeatNumber);
        expect(item.amount).toBeCloseTo(data.amount, 2);
        expect(item.gender).toBe('male');
        expect(item.passenger.name).toBe(data.passenger.name);

        expect(item.passenger.phoneNumber).toBe(
          data.passenger.phoneNumber,
        );

        expect(item.passenger.emailAddress).toBe(
          data.passenger.emailAddress,
        );
      });

      await test.step('Complete the booking transaction', async () => {
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

        await waitForStatus(data.completedStatus);

        const detailResponse = await api.getByNumber(
          createdBooking.bookingNo,
        );

        const booking = await readJson<Booking>(
          detailResponse,
          'Verify customer after completion',
        );

        expect(booking.id).toBe(createdBooking.id);
        expect(booking.bookingNo).toBe(createdBooking.bookingNo);

        expect(booking.customer.phoneNumber).toBe(
          data.customer.phoneNumber,
        );

        expect(booking.customer.emailAddress).toBe(
          data.customer.emailAddress,
        );
      });

      if (data.cancelAfterComplete) {
        await test.step('Cancel the eligible paid booking', async () => {
          if (data.cancelledStatus === undefined) {
            throw new Error(
              'Set BOOKING_CANCELLED_STATUS when cancellation is enabled.',
            );
          }

          const response = await api.cancel({
            bookingTrxNo: transaction.trxNo,
            bookings: [createdBooking.bookingNo],
          });

          const cancelled = await readJson<BookingTransaction>(
            response,
            'Cancel booking',
          );

          expect(cancelled.trxNo).toBe(transaction.trxNo);

          await waitForStatus(data.cancelledStatus);
        });
      }
    },
  );
});