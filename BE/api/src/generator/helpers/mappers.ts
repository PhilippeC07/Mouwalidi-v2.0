import { GeneratorsResponseDto } from '../dto/region.dto.js';

type GeneratorRow = {
  id: string;
  name: string;
  status: string;
  averageDieselConsumption: number;
  kvaCapacity: number;
  generatorGroup: {
    id: string;
    region: { name: string } | null;
    consumptionTypes: {
      Ampere: number;
      customers: {
        consumptionStatus: { Status: string };
      }[];
    }[];
  } | null;
};

export function mapGeneratorsToDto(generators: GeneratorRow[]): GeneratorsResponseDto[] {
  return generators.map((gen) => {
    const allCustomers =
      gen.generatorGroup?.consumptionTypes?.flatMap((ct) =>
        ct.customers.map((c) => ({ status: c.consumptionStatus.Status, ampere: ct.Ampere })),
      ) ?? [];

    const totalClients = allCustomers.length;

    const totalLoad = allCustomers.reduce((sum, c) => sum + c.ampere, 0);

    const overdueCount = allCustomers.filter(
      (c) => c.status.toLowerCase() === 'overdue',
    ).length;

    const unpaidCount = allCustomers.filter(
      (c) => c.status.toLowerCase() === 'unpaid',
    ).length;

    return {
      id: gen.id,
      name: gen.name,
      location: gen.generatorGroup?.region?.name ?? 'Unknown',
      kvaCapacity: gen.kvaCapacity,
      averageDieselConsumption: gen.averageDieselConsumption,
      status: gen.status,
      totalClients,
      totalLoad,
      totalRevenue: 0,
      overdueCount,
      unpaidCount,
      monthlyBill: 0,
    };
  });
}
