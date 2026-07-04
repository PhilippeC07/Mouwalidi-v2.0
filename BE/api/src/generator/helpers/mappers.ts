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
        monthlyConsumptions: { amountPaid: number; monthlyFee: number }[];
      }[];
    }[];
  } | null;
};

export function mapGeneratorsToDto(generators: GeneratorRow[]): GeneratorsResponseDto[] {
  return generators.map((gen) => {
    const allCustomers =
      gen.generatorGroup?.consumptionTypes?.flatMap((ct) =>
        ct.customers.map((c) => ({
          status: c.consumptionStatus.Status,
          ampere: ct.Ampere,
          monthlyConsumptions: c.monthlyConsumptions,
        })),
      ) ?? [];

    const totalClients = allCustomers.length;
    const totalLoad = allCustomers.reduce((sum, c) => sum + c.ampere, 0);
    const overdueCount = allCustomers.filter((c) => c.status.toLowerCase() === 'overdue').length;
    const unpaidCount = allCustomers.filter((c) => c.status.toLowerCase() === 'unpaid').length;
    const totalRevenue = allCustomers.reduce(
      (sum, c) => sum + c.monthlyConsumptions.reduce((s, mc) => s + mc.amountPaid, 0),
      0,
    );
    const monthlyBill = allCustomers.reduce(
      (sum, c) => sum + c.monthlyConsumptions.reduce((s, mc) => s + mc.monthlyFee, 0),
      0,
    );

    return {
      id: gen.id,
      name: gen.name,
      location: gen.generatorGroup?.region?.name ?? 'Unknown',
      kvaCapacity: gen.kvaCapacity,
      averageDieselConsumption: gen.averageDieselConsumption,
      status: gen.status,
      totalClients,
      totalLoad,
      totalRevenue,
      overdueCount,
      unpaidCount,
      monthlyBill,
    };
  });
}
