import { GeneratorsResponseDto } from '../dto/region.dto.js';

type GeneratorRow = {
  id: string;
  name: string;
  averageDieselConsumption: number;
  kvaCapacity: number;
  generatorGroup: {
    id: string;
    region: {
      name: string;
    } | null;
    buildings: {
      buildingfloors: {
        customer: {
          status: string;
          consumptionType: {
            Ampere: number;
          };
        } | null;
      }[];
    }[];
  } | null;
};
export function mapGeneratorsToDto(
  generators: GeneratorRow[],
): GeneratorsResponseDto[] {
  return generators.map((gen) => {
    const totalClients =
      gen.generatorGroup?.buildings?.flatMap((s) => s.buildingfloors).length ||
      0;

    const totalLoad =
      gen.generatorGroup?.buildings
        ?.flatMap((b) =>
          b.buildingfloors.map((f) => f.customer?.consumptionType?.Ampere ?? 0),
        )
        .reduce((sum, amp) => sum + amp, 0) ?? 0;

    const totalRevenue = totalClients * 100;

    const overdueCount =
      gen.generatorGroup?.buildings
        ?.flatMap((b) =>
          b.buildingfloors.map((f) =>
            f.customer?.status === 'overdue' ? 1 : 0,
          ),
        )
        ?.reduce((sum, amp) => sum + amp, 0 as number) ?? 0;

    const unpaidCount =
      gen.generatorGroup?.buildings
        ?.flatMap((b) =>
          b.buildingfloors.map((f) =>
            f.customer?.status === 'unpaid' ? 1 : 0,
          ),
        )
        ?.reduce((sum, amp) => sum + amp, 0 as number) ?? 0;

    const monthlyBill = 10000;

    return {
      id: gen.id,
      name: gen.name,
      location: gen.generatorGroup?.region?.name ?? 'Unknown',
      kvaCapacity: gen.kvaCapacity,
      averageDieselConsumption: gen.averageDieselConsumption,
      status: 'running',
      totalClients,
      totalLoad,
      totalRevenue,
      overdueCount,
      unpaidCount,
      monthlyBill,
    };
  });
}
