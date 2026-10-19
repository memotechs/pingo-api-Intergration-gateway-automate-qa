import 'dotenv/config';

import type {
  BookingTestData,
  CreateBookingRequest,
} from '../types/booking.types';

function requiredText(name: string): string {
  const value = process.env[name]?.trim();

  if (!value || value === 'REPLACE') {
    throw new Error(`Set ${name} in your .env file.`);
  }

  return value;
}

function requiredNumber(name: string, minimum = 0): number {
  const value = Number(requiredText(name));

  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} must be a number >= ${minimum}.`);
  }

  return value;
}

function requiredInteger(name: string, minimum = 0): number {
  const value = requiredNumber(name, minimum);

  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer.`);
  }

  return value;
}

function validDate(value: string): string {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);

  if (!match) {
    throw new Error('BOOKING_TEST_DATE must use DD-MM-YYYY.');
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('BOOKING_TEST_DATE is not a real calendar date.');
  }

  return value;
}

export function getBookingAuth() {
  return {
    baseURL: requiredText('API_BASE_URL'),
    username: requiredText('API_BASIC_AUTH_USERNAME'),
    password: requiredText('API_BASIC_AUTH_PASSWORD'),
  };
}

export function getBookingData(): BookingTestData {
  const searchDate = validDate(requiredText('BOOKING_TEST_DATE'));
  const time = requiredText('BOOKING_TIME');
  const cancelValue = process.env.BOOKING_CANCEL_AFTER_COMPLETE ?? 'false';

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('BOOKING_TIME must use HH:mm, for example 14:30.');
  }

  if (!['true', 'false'].includes(cancelValue)) {
    throw new Error('BOOKING_CANCEL_AFTER_COMPLETE must be true or false.');
  }

  const cancelAfterComplete = cancelValue === 'true';

  const customer = {
    name: 'QA Booking Customer',
    phoneNumber: requiredText('BOOKING_CUSTOMER_PHONE'),
    emailAddress: requiredText('BOOKING_CUSTOMER_EMAIL'),
  };

  return {
    searchDate,
    bookingDate: searchDate.replace(/-/g, '/'),
    fromLocationId: requiredInteger('BOOKING_FROM_LOCATION_ID', 1),
    toLocationId: requiredInteger('BOOKING_TO_LOCATION_ID', 1),
    scheduleId: requiredInteger('BOOKING_SCHEDULE_ID', 1),
    scheduleLineId: requiredInteger('BOOKING_SCHEDULE_LINE_ID', 1),
    merchantId: requiredInteger('BOOKING_MERCHANT_ID', 1),
    seatId: requiredInteger('BOOKING_SEAT_ID', 1),
    availableSeatStatus: requiredInteger('BOOKING_AVAILABLE_SEAT_STATUS'),
    priceId: requiredInteger('BOOKING_PRICE_ID', 1),
    nationalityId: requiredInteger('BOOKING_NATIONALITY_ID', 1),
    amount: requiredNumber('BOOKING_AMOUNT'),
    time,
    pickUp: requiredText('BOOKING_PICK_UP'),
    dropOff: requiredText('BOOKING_DROP_OFF'),
    customer,
    passenger: {
      ...customer,
      name: 'QA Test Passenger',
    },
    completedStatus: requiredInteger('BOOKING_COMPLETED_STATUS'),
    cancelAfterComplete,
    cancelledStatus: cancelAfterComplete
      ? requiredInteger('BOOKING_CANCELLED_STATUS')
      : undefined,
  };
}

export function buildBookingRequest(
  data: BookingTestData,
  reference: string,
): CreateBookingRequest {
  return {
    passengerCount: 1,
    bookings: [
      {
        date: data.bookingDate,
        scheduleLineId: data.scheduleLineId,
        bookingItems: [
          {
            seatId: data.seatId,
            priceId: data.priceId,
            amount: data.amount,
            gender: 'male',
            notation: reference,
            nationalityId: data.nationalityId,
            passenger: data.passenger,
          },
        ],
        customer: data.customer,
        notation: reference,
        time: data.time,
        pickUp: data.pickUp,
        dropOff: data.dropOff,
        numberOfPassenger: 1,
      },
    ],
  };
}