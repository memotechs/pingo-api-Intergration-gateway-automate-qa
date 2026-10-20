export interface Contact {
  name: string;
  phoneNumber: string;
  emailAddress: string;
}

export interface Pagination<T> {
  data: T[];
  page: number;
  count: number;
  pageSize: number;
  hasNext: boolean;
}

export interface LocationPair {
  fromLocation: { id: number };
  toLocation: { id: number };
}

export interface AvailableLocations {
  items: LocationPair | LocationPair[];
}

export interface ScheduleSummary {
  id: number;
  availableSeats: number;
  merchant: { id: number };
  fromLocation: { id: number };
  toLocation: { id: number };
}

export interface ScheduleSeat {
  id: number;
  status: number;
  seat: {
    id: number;
    seatNumber: string;
  };
}

export interface ScheduleDetail extends ScheduleSummary {
  schedule: {
    id: number;
    scheduleSeatLayouts: Array<{
      scheduleVehicleSeats: ScheduleSeat[];
    }>;
  };
}

export interface CreateBookingRequest {
  passengerCount: number;
  bookings: Array<{
    date: string;
    scheduleLineId: number;
    bookingItems: Array<{
      seatId: number;
      priceId: number;
      amount: number;
      gender: string;
      notation: string;
      nationalityId: number;
      passenger: Contact;
    }>;
    customer: Contact;
    notation: string;
    time: string;
    pickUp: string;
    dropOff: string;
    numberOfPassenger: number;
  }>;
}

export interface UpdateBookingRequest {
  action: 'complete';
  bookingTrxNo: string;
  customer: Contact;
}

export interface CancelBookingRequest {
  bookingTrxNo: string;
  bookings?: string[];
}

export interface Booking {
  id: number;
  bookingNo: string;
  status: number;
  paymentStatus: number;
  numberOfSeats: number;
  merchant: { id: number };
  fromLocation: { id: number };
  toLocation: { id: number };
  customer: {
    phoneNumber: string;
    emailAddress: string;
  };
  bookingItems: Array<{
    amount: number;
    gender: string;
    seat: {
      id: number;
      seatNumber: string;
    };
    passenger: Contact;
  }>;
}

export interface BookingTransaction {
  id: number;
  trxNo: string;
  status: number;
  subTotal: number;
  discount: number;
  total: number;
  currency: string;
  bookings: Booking[];
}

export interface BookingStatus {
  id: number;
  trxNo: string;
  status: number;
  paymentStatus: number;
  bookings: Array<{
    id: number;
    bookingNo: string;
    status: number;
    paymentStatus: number;
    currency: string;
  }>;
}

export interface BookingTestData {
  searchDate: string;
  bookingDate: string;
  fromLocationId: number;
  toLocationId: number;
  scheduleId: number;
  scheduleLineId: number;
  merchantId: number;
  seatId: number;
  availableSeatStatus: number;
  priceId: number;
  nationalityId: number;
  amount: number;
  time: string;
  pickUp: string;
  dropOff: string;
  customer: Contact;
  passenger: Contact;
  completedStatus: number;
  cancelAfterComplete: boolean;
  cancelledStatus?: number;
}