import { Bill, Room } from '@/types/domain';

export const seedPastReceipts: Bill[] = [
	{
		id: 9001,
		roomNumber: 101,
		guestName: 'Puja Karki',
		phone: '+977-980 111 2233',
		roomPrice: 1500,
		advancePaid: 0,
		days: 2,
		foodItems: [
			{ name: 'Tea', price: 60 },
			{ name: 'Momo', price: 220 },
		],
		discount: 100,
		grandTotal: 3180,
		date: '4/1/2026',
	},
	{
		id: 9002,
		roomNumber: 107,
		guestName: 'Nabin Rai',
		phone: '981-556-7788',
		roomPrice: 1200,
		advancePaid: 0,
		days: 1,
		foodItems: [
			{ name: 'Breakfast', price: 180 },
		],
		discount: 0,
		grandTotal: 1380,
		date: '4/2/2026',
	},
	{
		id: 9003,
		roomNumber: 104,
		guestName: 'Asha Gurung',
		phone: '9800009999',
		roomPrice: 2000,
		advancePaid: 0,
		days: 3,
		foodItems: [
			{ name: 'Dinner', price: 450 },
			{ name: 'Laundry', price: 300 },
		],
		discount: 250,
		grandTotal: 6500,
		date: '4/3/2026',
	},
];

export const seedRooms: Room[] = [
	{ id: 101, status: 'Available', guest: null, price: 1500 },
	{
		id: 102,
		status: 'Occupied',
		guest: {
			name: 'Arjun Thapa',
			phone: '9801234567',
			nationality: 'Nepali',
			totalGuests: 1,
			idPreview: null,
		},
		price: 1200,
		startDate: new Date('2026-04-04'),
		endDate: new Date('2026-04-06'),
	},
	{ id: 103, status: 'Available', guest: null, price: 1500 },
	{
		id: 104,
		status: 'Occupied',
		guest: {
			name: 'Sita Sharma',
			phone: '9817654321',
			nationality: 'Nepali',
			totalGuests: 2,
			idPreview: null,
		},
		price: 2000,
		startDate: new Date('2026-04-05'),
		endDate: new Date('2026-04-07'),
	},
	{ id: 105, status: 'Available', guest: null, price: 1500 },
	{ id: 106, status: 'Available', guest: null, price: 1500 },
	{ id: 107, status: 'Available', guest: null, price: 1200 },
	{ id: 108, status: 'Available', guest: null, price: 1800 },
];
