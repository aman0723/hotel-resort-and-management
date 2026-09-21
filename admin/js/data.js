/* ==========================================================================
   data.js — Mock Data Layer (MongoDB-shaped documents)
   All data access goes through window.HRMS.data.*
   Swap getAll/getById/create/update/remove for fetch() calls later.
   ========================================================================== */

(function () {
  'use strict';

  // --- Helpers ---------------------------------------------------------------
  function today(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  function oid(prefix, n) {
    return prefix + String(n).padStart(4, '0');
  }

  // --- SEED DATA -------------------------------------------------------------

  var ROOMS = [
    { _id: oid('room', 1),  number: '101', type: 'Standard',      floor: 1, pricePerNight: 4500,  capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Hot Water'],                              status: 'available',   description: 'Cozy standard room with garden view.' },
    { _id: oid('room', 2),  number: '102', type: 'Standard',      floor: 1, pricePerNight: 4500,  capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Hot Water'],                              status: 'occupied',    description: 'Cozy standard room with garden view.' },
    { _id: oid('room', 3),  number: '103', type: 'Standard',      floor: 1, pricePerNight: 4500,  capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Hot Water'],                              status: 'cleaning',    description: 'Cozy standard room with pool view.' },
    { _id: oid('room', 4),  number: '104', type: 'Standard',      floor: 1, pricePerNight: 4500,  capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Hot Water'],                              status: 'available',   description: 'Comfortable standard room.' },
    { _id: oid('room', 5),  number: '201', type: 'Deluxe',        floor: 2, pricePerNight: 8500,  capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Balcony'],        status: 'available',   description: 'Spacious deluxe room with sea view.' },
    { _id: oid('room', 6),  number: '202', type: 'Deluxe',        floor: 2, pricePerNight: 8500,  capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Balcony'],        status: 'occupied',    description: 'Spacious deluxe room with pool view.' },
    { _id: oid('room', 7),  number: '203', type: 'Deluxe',        floor: 2, pricePerNight: 8500,  capacity: 3, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Balcony'],        status: 'available',   description: 'Deluxe triple room.' },
    { _id: oid('room', 8),  number: '204', type: 'Deluxe',        floor: 2, pricePerNight: 8500,  capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi'],                   status: 'maintenance', description: 'Deluxe room — under maintenance.' },
    { _id: oid('room', 9),  number: '301', type: 'Ocean Suite',   floor: 3, pricePerNight: 18000, capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Private Pool', 'Butler'], status: 'occupied', description: 'Exclusive ocean-facing suite.' },
    { _id: oid('room', 10), number: '302', type: 'Ocean Suite',   floor: 3, pricePerNight: 18000, capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Private Pool', 'Butler'], status: 'available', description: 'Luxury ocean suite with private pool.' },
    { _id: oid('room', 11), number: '303', type: 'Garden Suite',  floor: 3, pricePerNight: 15000, capacity: 3, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Garden View', 'Butler'], status: 'available', description: 'Serene suite overlooking the resort garden.' },
    { _id: oid('room', 12), number: '304', type: 'Garden Suite',  floor: 3, pricePerNight: 15000, capacity: 3, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Garden View'],   status: 'occupied',    description: 'Garden suite with extended stay comfort.' },
    { _id: oid('room', 13), number: '401', type: 'Villa',         floor: 4, pricePerNight: 35000, capacity: 6, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Private Pool', 'Kitchen', 'Butler', 'Gym'], status: 'available', description: 'Ultra-luxury private villa.' },
    { _id: oid('room', 14), number: '402', type: 'Villa',         floor: 4, pricePerNight: 35000, capacity: 6, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Private Pool', 'Kitchen', 'Butler', 'Gym'], status: 'occupied', description: 'Premium villa with panoramic views.' },
    { _id: oid('room', 15), number: '205', type: 'Deluxe',        floor: 2, pricePerNight: 9000,  capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Balcony', 'Bathtub'],       status: 'available',   description: 'Corner deluxe room with dual view.' },
    { _id: oid('room', 16), number: '105', type: 'Standard',      floor: 1, pricePerNight: 4500,  capacity: 2, amenities: ['AC', 'TV', 'WiFi'],                                          status: 'available',   description: 'Budget-friendly standard room.' },
    { _id: oid('room', 17), number: '106', type: 'Standard',      floor: 1, pricePerNight: 4800,  capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Hot Water', 'Safe'],                     status: 'cleaning',    description: 'Standard room with extra amenities.' },
    { _id: oid('room', 18), number: '305', type: 'Garden Suite',  floor: 3, pricePerNight: 15500, capacity: 4, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Garden View', 'Butler'], status: 'available', description: 'Family garden suite.' },
    { _id: oid('room', 19), number: '306', type: 'Ocean Suite',   floor: 3, pricePerNight: 19000, capacity: 2, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Private Pool', 'Butler', 'Telescope'], status: 'available', description: 'Romantic ocean suite with telescope.' },
    { _id: oid('room', 20), number: '403', type: 'Villa',         floor: 4, pricePerNight: 40000, capacity: 8, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Private Pool', 'Kitchen', 'Butler', 'Gym', 'Home Theatre'], status: 'available', description: 'Presidential villa — the finest.' }
  ];

  var GUESTS = [
    { _id: oid('guest', 1),  name: 'Arjun Mehta',        email: 'arjun.mehta@email.com',    phone: '9876543210', city: 'Mumbai',    idType: 'Aadhar', totalStays: 5, joinedDate: '2022-03-15' },
    { _id: oid('guest', 2),  name: 'Priya Sharma',       email: 'priya.sharma@gmail.com',   phone: '9812345678', city: 'Delhi',     idType: 'Passport', totalStays: 3, joinedDate: '2022-07-22' },
    { _id: oid('guest', 3),  name: 'Rohit Verma',        email: 'rohit.v@outlook.com',      phone: '9988776655', city: 'Bengaluru', idType: 'Aadhar', totalStays: 8, joinedDate: '2021-11-10' },
    { _id: oid('guest', 4),  name: 'Kavya Nair',         email: 'kavya.nair@yahoo.com',     phone: '9123456789', city: 'Kochi',     idType: 'PAN',    totalStays: 2, joinedDate: '2023-01-05' },
    { _id: oid('guest', 5),  name: 'Siddharth Joshi',    email: 's.joshi@company.com',      phone: '9765432100', city: 'Pune',      idType: 'Aadhar', totalStays: 6, joinedDate: '2022-05-18' },
    { _id: oid('guest', 6),  name: 'Ananya Reddy',       email: 'ananya.r@email.com',       phone: '9654321098', city: 'Hyderabad', idType: 'Passport', totalStays: 4, joinedDate: '2022-09-30' },
    { _id: oid('guest', 7),  name: 'Vikram Singh',       email: 'vikram.s@gmail.com',       phone: '9543210987', city: 'Jaipur',    idType: 'Voter ID', totalStays: 1, joinedDate: '2023-04-12' },
    { _id: oid('guest', 8),  name: 'Meera Iyer',         email: 'meera.iyer@yahoo.com',     phone: '9432109876', city: 'Chennai',   idType: 'Aadhar', totalStays: 7, joinedDate: '2021-08-25' },
    { _id: oid('guest', 9),  name: 'Rajesh Khanna',      email: 'r.khanna@outlook.com',     phone: '9321098765', city: 'Kolkata',   idType: 'PAN',    totalStays: 3, joinedDate: '2023-02-14' },
    { _id: oid('guest', 10), name: 'Deepika Patel',      email: 'deepika.p@email.com',      phone: '9210987654', city: 'Ahmedabad', idType: 'Aadhar', totalStays: 9, joinedDate: '2021-06-01' },
    { _id: oid('guest', 11), name: 'Aditya Kumar',       email: 'aditya.k@gmail.com',       phone: '9109876543', city: 'Lucknow',   idType: 'Passport', totalStays: 2, joinedDate: '2023-06-20' },
    { _id: oid('guest', 12), name: 'Sneha Pillai',       email: 'sneha.pillai@email.com',   phone: '9098765432', city: 'Thiruvananthapuram', idType: 'Aadhar', totalStays: 5, joinedDate: '2022-12-08' },
    { _id: oid('guest', 13), name: 'Karan Malhotra',     email: 'karan.m@company.com',      phone: '9087654321', city: 'Chandigarh', idType: 'Voter ID', totalStays: 4, joinedDate: '2022-04-17' },
    { _id: oid('guest', 14), name: 'Swati Gupta',        email: 'swati.g@gmail.com',        phone: '9076543210', city: 'Bhopal',    idType: 'Aadhar', totalStays: 1, joinedDate: '2023-08-03' },
    { _id: oid('guest', 15), name: 'Nikhil Choudhary',   email: 'nikhil.c@yahoo.com',       phone: '9065432109', city: 'Indore',    idType: 'PAN',    totalStays: 6, joinedDate: '2022-01-29' }
  ];

  // Build bookings relative to today so the dashboard always looks fresh
  var BOOKINGS = [
    // Currently checked-in
    { _id: oid('book', 1),  guestId: oid('guest', 1),  roomId: oid('room', 2),  checkIn: today(-3),  checkOut: today(2),  guests: 2, status: 'checked-in',  totalAmount: 27000,  tax: 3660,  notes: 'Early check-in requested.' },
    { _id: oid('book', 2),  guestId: oid('guest', 3),  roomId: oid('room', 6),  checkIn: today(-2),  checkOut: today(3),  guests: 2, status: 'checked-in',  totalAmount: 52360,  tax: 7092,  notes: '' },
    { _id: oid('book', 3),  guestId: oid('guest', 8),  roomId: oid('room', 9),  checkIn: today(-1),  checkOut: today(4),  guests: 2, status: 'checked-in',  totalAmount: 112000, tax: 15192, notes: 'Anniversary package.' },
    { _id: oid('book', 4),  guestId: oid('guest', 12), roomId: oid('room', 12), checkIn: today(-4),  checkOut: today(1),  guests: 3, status: 'checked-in',  totalAmount: 67200,  tax: 9112,  notes: '' },
    { _id: oid('book', 5),  guestId: oid('guest', 5),  roomId: oid('room', 14), checkIn: today(-5),  checkOut: today(2),  guests: 4, status: 'checked-in',  totalAmount: 245000, tax: 33220, notes: 'VIP guest.' },
    // Upcoming confirmed
    { _id: oid('book', 6),  guestId: oid('guest', 2),  roomId: oid('room', 5),  checkIn: today(1),   checkOut: today(4),  guests: 2, status: 'confirmed',   totalAmount: 28560,  tax: 3872,  notes: '' },
    { _id: oid('book', 7),  guestId: oid('guest', 4),  roomId: oid('room', 11), checkIn: today(2),   checkOut: today(6),  guests: 2, status: 'confirmed',   totalAmount: 67200,  tax: 9112,  notes: 'Birthday stay.' },
    { _id: oid('book', 8),  guestId: oid('guest', 7),  roomId: oid('room', 13), checkIn: today(3),   checkOut: today(8),  guests: 3, status: 'confirmed',   totalAmount: 196000, tax: 26572, notes: '' },
    { _id: oid('book', 9),  guestId: oid('guest', 10), roomId: oid('room', 7),  checkIn: today(1),   checkOut: today(3),  guests: 2, status: 'confirmed',   totalAmount: 19040,  tax: 2581,  notes: '' },
    { _id: oid('book', 10), guestId: oid('guest', 13), roomId: oid('room', 15), checkIn: today(5),   checkOut: today(9),  guests: 2, status: 'confirmed',   totalAmount: 40320,  tax: 5467,  notes: '' },
    // Pending
    { _id: oid('book', 11), guestId: oid('guest', 6),  roomId: oid('room', 1),  checkIn: today(7),   checkOut: today(10), guests: 2, status: 'pending',     totalAmount: 15120,  tax: 2050,  notes: 'Awaiting deposit.' },
    { _id: oid('book', 12), guestId: oid('guest', 9),  roomId: oid('room', 4),  checkIn: today(6),   checkOut: today(8),  guests: 1, status: 'pending',     totalAmount: 10080,  tax: 1368,  notes: '' },
    { _id: oid('book', 13), guestId: oid('guest', 11), roomId: oid('room', 10), checkIn: today(10),  checkOut: today(14), guests: 2, status: 'pending',     totalAmount: 80640,  tax: 10940, notes: 'Honeymoon package.' },
    // Today's check-ins
    { _id: oid('book', 14), guestId: oid('guest', 14), roomId: oid('room', 16), checkIn: today(0),   checkOut: today(3),  guests: 1, status: 'confirmed',   totalAmount: 15120,  tax: 2050,  notes: '' },
    { _id: oid('book', 15), guestId: oid('guest', 15), roomId: oid('room', 19), checkIn: today(0),   checkOut: today(5),  guests: 2, status: 'confirmed',   totalAmount: 106960, tax: 14504, notes: '' },
    // Today's check-outs
    { _id: oid('book', 16), guestId: oid('guest', 1),  roomId: oid('room', 3),  checkIn: today(-5),  checkOut: today(0),  guests: 2, status: 'checked-out', totalAmount: 25200,  tax: 3418,  notes: '' },
    { _id: oid('book', 17), guestId: oid('guest', 2),  roomId: oid('room', 17), checkIn: today(-2),  checkOut: today(0),  guests: 2, status: 'checked-out', totalAmount: 11424,  tax: 1549,  notes: '' },
    // Checked-out (past)
    { _id: oid('book', 18), guestId: oid('guest', 3),  roomId: oid('room', 1),  checkIn: today(-15), checkOut: today(-10), guests: 2, status: 'checked-out', totalAmount: 25200,  tax: 3418,  notes: '' },
    { _id: oid('book', 19), guestId: oid('guest', 5),  roomId: oid('room', 5),  checkIn: today(-20), checkOut: today(-15), guests: 2, status: 'checked-out', totalAmount: 47600,  tax: 6456,  notes: '' },
    { _id: oid('book', 20), guestId: oid('guest', 8),  roomId: oid('room', 7),  checkIn: today(-30), checkOut: today(-24), guests: 3, status: 'checked-out', totalAmount: 53550,  tax: 7262,  notes: '' },
    // Cancelled
    { _id: oid('book', 21), guestId: oid('guest', 6),  roomId: oid('room', 8),  checkIn: today(-10), checkOut: today(-7),  guests: 2, status: 'cancelled',   totalAmount: 28560,  tax: 3872,  notes: 'Cancelled by guest.' },
    { _id: oid('book', 22), guestId: oid('guest', 9),  roomId: oid('room', 20), checkIn: today(-5),  checkOut: today(-2),  guests: 6, status: 'cancelled',   totalAmount: 134400, tax: 18230, notes: 'Corporate event cancelled.' },
    { _id: oid('book', 23), guestId: oid('guest', 11), roomId: oid('room', 4),  checkIn: today(15),  checkOut: today(17),  guests: 1, status: 'cancelled',   totalAmount: 10080,  tax: 1368,  notes: '' },
    { _id: oid('book', 24), guestId: oid('guest', 13), roomId: oid('room', 1),  checkIn: today(-60), checkOut: today(-55), guests: 2, status: 'checked-out', totalAmount: 25200,  tax: 3418,  notes: '' },
    { _id: oid('book', 25), guestId: oid('guest', 15), roomId: oid('room', 11), checkIn: today(-45), checkOut: today(-40), guests: 3, status: 'checked-out', totalAmount: 75000,  tax: 10170, notes: '' }
  ];

  var SERVICES = [
    { _id: oid('svc', 1),  name: 'Continental Breakfast',   category: 'Restaurant',     description: 'Fresh continental breakfast for two.',    price: 1200, available: true },
    { _id: oid('svc', 2),  name: 'Candlelight Dinner',      category: 'Restaurant',     description: 'Romantic 3-course dinner by the pool.',    price: 4500, available: true },
    { _id: oid('svc', 3),  name: 'Swedish Massage',         category: 'Spa & Wellness', description: '60-minute full-body Swedish massage.',     price: 3500, available: true },
    { _id: oid('svc', 4),  name: 'Couple Spa Package',      category: 'Spa & Wellness', description: 'Relaxing couples spa with aromatherapy.',   price: 7000, available: true },
    { _id: oid('svc', 5),  name: 'Pool Day Access',         category: 'Swimming Pool',  description: 'Full day access to the infinity pool.',    price: 800,  available: true },
    { _id: oid('svc', 6),  name: 'Pool Private Session',    category: 'Swimming Pool',  description: '2-hour private pool booking.',             price: 3000, available: false },
    { _id: oid('svc', 7),  name: 'Express Laundry',         category: 'Laundry',        description: 'Same-day laundry service (up to 5 items).', price: 600, available: true },
    { _id: oid('svc', 8),  name: 'Room Service - Snacks',   category: 'Room Service',   description: 'Curated snack platter delivered to room.',  price: 950,  available: true },
    { _id: oid('svc', 9),  name: 'Room Service - Meals',    category: 'Room Service',   description: 'Full à la carte room service.',             price: 2200, available: true },
    { _id: oid('svc', 10), name: 'Airport Transfer',        category: 'Transport',      description: 'Luxury cab transfer to/from airport.',     price: 2500, available: true },
    { _id: oid('svc', 11), name: 'Private Event Setup',     category: 'Events',         description: 'Decor and setup for private functions.',    price: 25000, available: true },
    { _id: oid('svc', 12), name: 'Yoga Session',            category: 'Spa & Wellness', description: 'Morning yoga session at the garden deck.',  price: 1500, available: true }
  ];

  var PAYMENTS = [
    { _id: oid('pay', 1),  bookingId: oid('book', 16), guestId: oid('guest', 1),  amount: 25200,  method: 'UPI',         date: today(-5),  status: 'paid' },
    { _id: oid('pay', 2),  bookingId: oid('book', 17), guestId: oid('guest', 2),  amount: 11424,  method: 'Card',        date: today(-2),  status: 'paid' },
    { _id: oid('pay', 3),  bookingId: oid('book', 18), guestId: oid('guest', 3),  amount: 25200,  method: 'Net Banking', date: today(-15), status: 'paid' },
    { _id: oid('pay', 4),  bookingId: oid('book', 19), guestId: oid('guest', 5),  amount: 47600,  method: 'Card',        date: today(-20), status: 'paid' },
    { _id: oid('pay', 5),  bookingId: oid('book', 20), guestId: oid('guest', 8),  amount: 53550,  method: 'Cash',        date: today(-30), status: 'paid' },
    { _id: oid('pay', 6),  bookingId: oid('book', 1),  guestId: oid('guest', 1),  amount: 27000,  method: 'UPI',         date: today(-3),  status: 'paid' },
    { _id: oid('pay', 7),  bookingId: oid('book', 2),  guestId: oid('guest', 3),  amount: 52360,  method: 'Card',        date: today(-2),  status: 'paid' },
    { _id: oid('pay', 8),  bookingId: oid('book', 3),  guestId: oid('guest', 8),  amount: 112000, method: 'Net Banking', date: today(-1),  status: 'paid' },
    { _id: oid('pay', 9),  bookingId: oid('book', 6),  guestId: oid('guest', 2),  amount: 28560,  method: 'UPI',         date: today(0),   status: 'paid' },
    { _id: oid('pay', 10), bookingId: oid('book', 11), guestId: oid('guest', 6),  amount: 7560,   method: 'UPI',         date: today(0),   status: 'pending' },
    { _id: oid('pay', 11), bookingId: oid('book', 12), guestId: oid('guest', 9),  amount: 10080,  method: 'Card',        date: today(-1),  status: 'pending' },
    { _id: oid('pay', 12), bookingId: oid('book', 21), guestId: oid('guest', 6),  amount: 28560,  method: 'Card',        date: today(-10), status: 'refunded' },
    { _id: oid('pay', 13), bookingId: oid('book', 22), guestId: oid('guest', 9),  amount: 134400, method: 'Net Banking', date: today(-5),  status: 'refunded' },
    { _id: oid('pay', 14), bookingId: oid('book', 4),  guestId: oid('guest', 12), amount: 67200,  method: 'Cash',        date: today(-4),  status: 'paid' },
    { _id: oid('pay', 15), bookingId: oid('book', 5),  guestId: oid('guest', 5),  amount: 245000, method: 'Net Banking', date: today(-5),  status: 'paid' },
    { _id: oid('pay', 16), bookingId: oid('book', 7),  guestId: oid('guest', 4),  amount: 33600,  method: 'UPI',         date: today(0),   status: 'paid' },
    { _id: oid('pay', 17), bookingId: oid('book', 8),  guestId: oid('guest', 7),  amount: 98000,  method: 'Card',        date: today(0),   status: 'pending' },
    { _id: oid('pay', 18), bookingId: oid('book', 24), guestId: oid('guest', 13), amount: 25200,  method: 'Cash',        date: today(-60), status: 'paid' },
    { _id: oid('pay', 19), bookingId: oid('book', 25), guestId: oid('guest', 15), amount: 75000,  method: 'Net Banking', date: today(-45), status: 'paid' },
    { _id: oid('pay', 20), bookingId: oid('book', 13), guestId: oid('guest', 11), amount: 40320,  method: 'Card',        date: today(0),   status: 'failed' }
  ];

  var STAFF = [
    { _id: oid('staff', 1),  name: 'Rahul Desai',       role: 'Manager',        department: 'Administration', phone: '9811001001', email: 'rahul.d@resort.com',  shift: 'Morning', joiningDate: '2020-01-15', status: 'active' },
    { _id: oid('staff', 2),  name: 'Priyanka Mishra',   role: 'Receptionist',   department: 'Front Desk',     phone: '9811001002', email: 'priyanka.m@resort.com', shift: 'Morning', joiningDate: '2021-03-20', status: 'active' },
    { _id: oid('staff', 3),  name: 'Suresh Babu',       role: 'Receptionist',   department: 'Front Desk',     phone: '9811001003', email: 'suresh.b@resort.com',  shift: 'Evening', joiningDate: '2021-06-10', status: 'active' },
    { _id: oid('staff', 4),  name: 'Lakshmi Devi',      role: 'Housekeeping',   department: 'Housekeeping',   phone: '9811001004', email: 'lakshmi.d@resort.com', shift: 'Morning', joiningDate: '2022-02-01', status: 'active' },
    { _id: oid('staff', 5),  name: 'Mohan Rao',         role: 'Housekeeping',   department: 'Housekeeping',   phone: '9811001005', email: 'mohan.r@resort.com',   shift: 'Evening', joiningDate: '2022-04-15', status: 'active' },
    { _id: oid('staff', 6),  name: 'Anjali Shetty',     role: 'Chef',           department: 'Kitchen',        phone: '9811001006', email: 'anjali.s@resort.com',  shift: 'Morning', joiningDate: '2020-08-01', status: 'active' },
    { _id: oid('staff', 7),  name: 'Krishnan Pillai',   role: 'Chef',           department: 'Kitchen',        phone: '9811001007', email: 'krishnan.p@resort.com', shift: 'Evening', joiningDate: '2021-01-12', status: 'on-leave' },
    { _id: oid('staff', 8),  name: 'Ravi Shankar',      role: 'Security',       department: 'Security',       phone: '9811001008', email: 'ravi.s@resort.com',    shift: 'Night',   joiningDate: '2020-11-20', status: 'active' },
    { _id: oid('staff', 9),  name: 'Sunita Rawat',      role: 'Security',       department: 'Security',       phone: '9811001009', email: 'sunita.r@resort.com',  shift: 'Morning', joiningDate: '2022-07-01', status: 'active' },
    { _id: oid('staff', 10), name: 'Dinesh Kumar',      role: 'Maintenance',    department: 'Maintenance',    phone: '9811001010', email: 'dinesh.k@resort.com',  shift: 'Morning', joiningDate: '2021-09-05', status: 'active' },
    { _id: oid('staff', 11), name: 'Nandini Rao',       role: 'Receptionist',   department: 'Front Desk',     phone: '9811001011', email: 'nandini.r@resort.com', shift: 'Night',   joiningDate: '2023-01-10', status: 'active' },
    { _id: oid('staff', 12), name: 'Ashok Tiwari',      role: 'Manager',        department: 'Operations',     phone: '9811001012', email: 'ashok.t@resort.com',   shift: 'Morning', joiningDate: '2019-05-15', status: 'active' }
  ];

  var SERVICE_REQUESTS = [
    { _id: oid('sreq', 1), guestId: oid('guest', 1),  roomId: oid('room', 2),  serviceId: oid('svc', 8),  date: today(-1), status: 'completed' },
    { _id: oid('sreq', 2), guestId: oid('guest', 3),  roomId: oid('room', 6),  serviceId: oid('svc', 3),  date: today(0),  status: 'in-progress' },
    { _id: oid('sreq', 3), guestId: oid('guest', 8),  roomId: oid('room', 9),  serviceId: oid('svc', 4),  date: today(0),  status: 'requested' },
    { _id: oid('sreq', 4), guestId: oid('guest', 12), roomId: oid('room', 12), serviceId: oid('svc', 7),  date: today(-2), status: 'completed' },
    { _id: oid('sreq', 5), guestId: oid('guest', 5),  roomId: oid('room', 14), serviceId: oid('svc', 2),  date: today(0),  status: 'in-progress' },
    { _id: oid('sreq', 6), guestId: oid('guest', 1),  roomId: oid('room', 2),  serviceId: oid('svc', 10), date: today(1),  status: 'requested' },
    { _id: oid('sreq', 7), guestId: oid('guest', 8),  roomId: oid('room', 9),  serviceId: oid('svc', 1),  date: today(1),  status: 'requested' },
    { _id: oid('sreq', 8), guestId: oid('guest', 3),  roomId: oid('room', 6),  serviceId: oid('svc', 9),  date: today(-1), status: 'completed' }
  ];

  // --- LocalStorage persistence -----------------------------------------------
  var STORAGE_KEY = 'hrms_data_v1';
  var _store;

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        _store = JSON.parse(raw);
      } else {
        _store = {
          rooms: ROOMS,
          guests: GUESTS,
          bookings: BOOKINGS,
          services: SERVICES,
          payments: PAYMENTS,
          staff: STAFF,
          serviceRequests: SERVICE_REQUESTS
        };
        saveStore();
      }
    } catch (e) {
      // In-memory fallback if localStorage unavailable
      _store = {
        rooms: ROOMS.slice(),
        guests: GUESTS.slice(),
        bookings: BOOKINGS.slice(),
        services: SERVICES.slice(),
        payments: PAYMENTS.slice(),
        staff: STAFF.slice(),
        serviceRequests: SERVICE_REQUESTS.slice()
      };
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_store));
    } catch (e) { /* quota exceeded or private mode — silently ignore */ }
  }

  // --- Collection name map (plural key in store) ------------------------------
  var COLL = {
    rooms: 'rooms',
    guests: 'guests',
    bookings: 'bookings',
    services: 'services',
    payments: 'payments',
    staff: 'staff',
    serviceRequests: 'serviceRequests'
  };

  // --- Counter for new IDs ----------------------------------------------------
  function nextId(collection) {
    var arr = _store[collection] || [];
    if (!arr.length) return collection.slice(0, 3) + '0001';
    // Extract numeric suffix from last _id
    var last = arr[arr.length - 1]._id;
    var num = parseInt(last.replace(/\D/g, ''), 10) || arr.length;
    var prefix = last.replace(/\d+$/, '');
    return prefix + String(num + 1).padStart(4, '0');
  }

  // --- Public API -------------------------------------------------------------
  var data = {
    /** Return a shallow copy of all documents in a collection. */
    getAll: function (collection) {
      return (_store[collection] || []).slice();
    },

    /** Find one document by _id. Returns undefined if not found. */
    getById: function (collection, id) {
      return (_store[collection] || []).find(function (d) { return d._id === id; });
    },

    /** Find documents matching a predicate. */
    find: function (collection, predicate) {
      return (_store[collection] || []).filter(predicate);
    },

    /** Insert a new document. Assigns _id automatically. Returns the new doc. */
    create: function (collection, doc) {
      if (!_store[collection]) _store[collection] = [];
      var newDoc = Object.assign({}, doc, { _id: nextId(collection) });
      _store[collection].push(newDoc);
      saveStore();
      return newDoc;
    },

    /** Update fields of an existing document by _id. Returns updated doc or null. */
    update: function (collection, id, patch) {
      var arr = _store[collection] || [];
      var idx = arr.findIndex(function (d) { return d._id === id; });
      if (idx === -1) return null;
      arr[idx] = Object.assign({}, arr[idx], patch);
      saveStore();
      return arr[idx];
    },

    /** Remove a document by _id. Returns true if found and removed. */
    remove: function (collection, id) {
      var arr = _store[collection] || [];
      var idx = arr.findIndex(function (d) { return d._id === id; });
      if (idx === -1) return false;
      arr.splice(idx, 1);
      saveStore();
      return true;
    },

    /** Reset ALL data back to seed (useful for demo reset). */
    resetToSeed: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      loadStore();
    }
  };

  // Boot
  loadStore();

  // Expose on global namespace
  window.HRMS = window.HRMS || {};
  window.HRMS.data = data;

}());
