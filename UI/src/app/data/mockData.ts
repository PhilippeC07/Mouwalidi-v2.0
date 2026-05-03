export type PaymentStatus = 'paid' | 'unpaid' | 'overdue';

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  amperes: number; // subscribed amperage
  currentReading: number; // current month reading in A
  voltage: number; // 220V or 380V
  hoursPerDay: number;
  ratePerKwh: number; // price per kWh
  status: PaymentStatus;
  connectionDate: string;
}

export interface Generator {
  id: string;
  name: string;
  region: string;
  location: string;
  capacity: number; // in kVA
  fuelType: string;
  installDate: string;
  status: 'running' | 'maintenance' | 'offline';
  customers: Customer[];
}

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const CURRENT_MONTH = 'March 2026';

export const generators: Generator[] = [
  {
    id: 'gen-001',
    name: 'Generator Alpha',
    region: 'North Region',
    location: 'North District – Zone A',
    capacity: 100,
    fuelType: 'Diesel',
    installDate: '2021-03-15',
    status: 'running',
    customers: [
      {
        id: 'c001',
        name: 'Jean-Pierre Morel',
        address: '12 Rue des Acacias',
        phone: '+509 3712-4455',
        amperes: 20,
        currentReading: 18.4,
        voltage: 220,
        hoursPerDay: 12,
        ratePerKwh: 0.18,
        status: 'paid',
        connectionDate: '2021-05-10',
      },
      {
        id: 'c002',
        name: 'Marie Céline Dupont',
        address: '45 Allée des Manguiers',
        phone: '+509 3623-8810',
        amperes: 30,
        currentReading: 27.6,
        voltage: 220,
        hoursPerDay: 10,
        ratePerKwh: 0.18,
        status: 'unpaid',
        connectionDate: '2022-01-22',
      },
      {
        id: 'c003',
        name: 'Robert Étienne',
        address: '7 Impasse Fleurie',
        phone: '+509 3845-2230',
        amperes: 15,
        currentReading: 14.1,
        voltage: 220,
        hoursPerDay: 8,
        ratePerKwh: 0.18,
        status: 'paid',
        connectionDate: '2021-09-05',
      },
      {
        id: 'c004',
        name: 'Claudette Valcin',
        address: '88 Boulevard Principal',
        phone: '+509 3756-6612',
        amperes: 40,
        currentReading: 38.5,
        voltage: 220,
        hoursPerDay: 14,
        ratePerKwh: 0.18,
        status: 'overdue',
        connectionDate: '2020-11-18',
      },
      {
        id: 'c005',
        name: 'Théodore Augustin',
        address: '3 Rue de la Paix',
        phone: '+509 3690-1147',
        amperes: 25,
        currentReading: 22.0,
        voltage: 220,
        hoursPerDay: 10,
        ratePerKwh: 0.18,
        status: 'paid',
        connectionDate: '2023-02-14',
      },
      {
        id: 'c006',
        name: 'Nadège Pierre-Louis',
        address: '22 Chemin des Roses',
        phone: '+509 3812-9900',
        amperes: 20,
        currentReading: 19.3,
        voltage: 220,
        hoursPerDay: 12,
        ratePerKwh: 0.18,
        status: 'unpaid',
        connectionDate: '2022-07-30',
      },
      {
        id: 'c007',
        name: 'François Belizaire',
        address: '5 Rue Principale',
        phone: '+509 3734-5521',
        amperes: 10,
        currentReading: 9.5,
        voltage: 220,
        hoursPerDay: 8,
        ratePerKwh: 0.18,
        status: 'paid',
        connectionDate: '2023-06-01',
      },
    ],
  },
  {
    id: 'gen-002',
    name: 'Generator Beta',
    region: 'North Region',
    location: 'South District – Zone B',
    capacity: 150,
    fuelType: 'Diesel',
    installDate: '2020-07-22',
    status: 'running',
    customers: [
      {
        id: 'c008',
        name: 'Sophia Lafortune',
        address: '10 Rue Centrale',
        phone: '+509 3601-3344',
        amperes: 50,
        currentReading: 47.2,
        voltage: 220,
        hoursPerDay: 16,
        ratePerKwh: 0.2,
        status: 'paid',
        connectionDate: '2020-09-01',
      },
      {
        id: 'c009',
        name: 'Marcus Brutus',
        address: '31 Avenue des Palmes',
        phone: '+509 3778-8823',
        amperes: 35,
        currentReading: 33.0,
        voltage: 220,
        hoursPerDay: 12,
        ratePerKwh: 0.2,
        status: 'paid',
        connectionDate: '2021-03-11',
      },
      {
        id: 'c010',
        name: 'Carline Desroches',
        address: '67 Rue du Commerce',
        phone: '+509 3891-2256',
        amperes: 60,
        currentReading: 55.4,
        voltage: 220,
        hoursPerDay: 14,
        ratePerKwh: 0.2,
        status: 'overdue',
        connectionDate: '2020-08-20',
      },
      {
        id: 'c011',
        name: 'Patrick Dorsainvil',
        address: '14 Passage Victor',
        phone: '+509 3645-7700',
        amperes: 25,
        currentReading: 23.1,
        voltage: 220,
        hoursPerDay: 10,
        ratePerKwh: 0.2,
        status: 'unpaid',
        connectionDate: '2022-11-05',
      },
      {
        id: 'c012',
        name: 'Yolande Cadet',
        address: '9 Rue des Lilas',
        phone: '+509 3812-4411',
        amperes: 45,
        currentReading: 41.0,
        voltage: 220,
        hoursPerDay: 12,
        ratePerKwh: 0.2,
        status: 'paid',
        connectionDate: '2021-06-18',
      },
      {
        id: 'c013',
        name: 'Ernst Toussaint',
        address: '2 Boulevard du Lac',
        phone: '+509 3723-0099',
        amperes: 30,
        currentReading: 28.8,
        voltage: 220,
        hoursPerDay: 10,
        ratePerKwh: 0.2,
        status: 'paid',
        connectionDate: '2022-04-07',
      },
    ],
  },
  {
    id: 'gen-003',
    name: 'Generator Gamma',
    region: 'East Region',
    location: 'East District – Zone C',
    capacity: 75,
    fuelType: 'Diesel',
    installDate: '2022-11-10',
    status: 'maintenance',
    customers: [
      {
        id: 'c014',
        name: 'Lise Dorcéant',
        address: '55 Rue Sainte-Anne',
        phone: '+509 3867-5532',
        amperes: 20,
        currentReading: 19.0,
        voltage: 220,
        hoursPerDay: 10,
        ratePerKwh: 0.17,
        status: 'paid',
        connectionDate: '2023-01-15',
      },
      {
        id: 'c015',
        name: 'Gérard Noel',
        address: '18 Allée des Cocotiers',
        phone: '+509 3756-2289',
        amperes: 15,
        currentReading: 13.5,
        voltage: 220,
        hoursPerDay: 8,
        ratePerKwh: 0.17,
        status: 'unpaid',
        connectionDate: '2023-03-22',
      },
      {
        id: 'c016',
        name: 'Immaculée Joseph',
        address: '4 Rue des Jasmins',
        phone: '+509 3634-8801',
        amperes: 25,
        currentReading: 24.2,
        voltage: 220,
        hoursPerDay: 12,
        ratePerKwh: 0.17,
        status: 'paid',
        connectionDate: '2022-12-01',
      },
      {
        id: 'c017',
        name: 'Wilner Chéry',
        address: '77 Chemin Neuf',
        phone: '+509 3809-1133',
        amperes: 30,
        currentReading: 28.0,
        voltage: 220,
        hoursPerDay: 10,
        ratePerKwh: 0.17,
        status: 'overdue',
        connectionDate: '2023-02-28',
      },
      {
        id: 'c018',
        name: 'Denise Moreau',
        address: '11 Impasse des Bougainvillers',
        phone: '+509 3712-6678',
        amperes: 10,
        currentReading: 9.8,
        voltage: 220,
        hoursPerDay: 8,
        ratePerKwh: 0.17,
        status: 'paid',
        connectionDate: '2023-04-10',
      },
    ],
  },
  {
    id: 'gen-004',
    name: 'Generator Delta',
    region: 'East Region',
    location: 'West District – Zone D',
    capacity: 200,
    fuelType: 'Diesel',
    installDate: '2019-05-30',
    status: 'running',
    customers: [
      {
        id: 'c019',
        name: 'Alix Fleuriot',
        address: '100 Rue du Marché',
        phone: '+509 3845-9977',
        amperes: 80,
        currentReading: 76.5,
        voltage: 220,
        hoursPerDay: 18,
        ratePerKwh: 0.22,
        status: 'paid',
        connectionDate: '2019-07-01',
      },
      {
        id: 'c020',
        name: 'Bernadette Léon',
        address: '23 Rue Saint-Joseph',
        phone: '+509 3678-4400',
        amperes: 40,
        currentReading: 37.2,
        voltage: 220,
        hoursPerDay: 12,
        ratePerKwh: 0.22,
        status: 'paid',
        connectionDate: '2020-02-14',
      },
      {
        id: 'c021',
        name: 'Christophe Volcy',
        address: '6 Avenue des Fleurs',
        phone: '+509 3734-1122',
        amperes: 60,
        currentReading: 58.0,
        voltage: 220,
        hoursPerDay: 14,
        ratePerKwh: 0.22,
        status: 'overdue',
        connectionDate: '2019-09-25',
      },
      {
        id: 'c022',
        name: 'Dominique Sanon',
        address: '38 Rue des Pins',
        phone: '+509 3890-5566',
        amperes: 35,
        currentReading: 34.1,
        voltage: 220,
        hoursPerDay: 10,
        ratePerKwh: 0.22,
        status: 'unpaid',
        connectionDate: '2021-07-19',
      },
      {
        id: 'c023',
        name: 'Elodie Marcelin',
        address: '15 Passage du Roi',
        phone: '+509 3767-3310',
        amperes: 50,
        currentReading: 48.3,
        voltage: 220,
        hoursPerDay: 14,
        ratePerKwh: 0.22,
        status: 'paid',
        connectionDate: '2020-05-08',
      },
      {
        id: 'c024',
        name: 'Fabrice Estimé',
        address: "42 Rue de l'Église",
        phone: '+509 3623-0077',
        amperes: 45,
        currentReading: 43.5,
        voltage: 220,
        hoursPerDay: 12,
        ratePerKwh: 0.22,
        status: 'paid',
        connectionDate: '2021-11-30',
      },
      {
        id: 'c025',
        name: 'Ghislaine Bazile',
        address: '8 Chemin de la Croix',
        phone: '+509 3801-4432',
        amperes: 30,
        currentReading: 29.0,
        voltage: 220,
        hoursPerDay: 10,
        ratePerKwh: 0.22,
        status: 'unpaid',
        connectionDate: '2022-08-12',
      },
      {
        id: 'c026',
        name: 'Henri Laroche',
        address: '19 Boulevard de la Mer',
        phone: '+509 3756-7788',
        amperes: 70,
        currentReading: 67.4,
        voltage: 220,
        hoursPerDay: 16,
        ratePerKwh: 0.22,
        status: 'paid',
        connectionDate: '2019-12-05',
      },
    ],
  },
];

// Billing calculation helpers
export function calculateMonthlyKwh(customer: Customer, days = 30): number {
  // kWh = A × V × hours_per_day × days / 1000
  return (
    (customer.currentReading * customer.voltage * customer.hoursPerDay * days) /
    1000
  );
}

export function calculateMonthlyBill(customer: Customer, days = 30): number {
  return calculateMonthlyKwh(customer, days) * customer.ratePerKwh;
}

export function calculateGeneratorTotalLoad(generator: Generator): number {
  return generator.customers.reduce((sum, c) => sum + c.currentReading, 0);
}

export function calculateGeneratorTotalBill(generator: Generator): number {
  return generator.customers.reduce(
    (sum, c) => sum + calculateMonthlyBill(c),
    0,
  );
}

export function getStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'paid';
    case 'unpaid':
      return 'unpaid';
    case 'overdue':
      return 'overdue';
  }
}

export function getGeneratorStatusColor(status: Generator['status']): string {
  switch (status) {
    case 'running':
      return 'running';
    case 'maintenance':
      return 'maintenance';
    case 'offline':
      return 'offline';
  }
}

export function getStatusStyle(status: PaymentStatus): {
  color: string;
  backgroundColor: string;
} {
  switch (status) {
    case 'paid':
      return { color: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)' };
    case 'unpaid':
      return { color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)' };
    case 'overdue':
      return { color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)' };
  }
}

export function getGeneratorStatusStyle(status: Generator['status']): {
  color: string;
  backgroundColor: string;
} {
  switch (status) {
    case 'running':
      return { color: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)' };
    case 'maintenance':
      return { color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)' };
    case 'offline':
      return { color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)' };
  }
}
