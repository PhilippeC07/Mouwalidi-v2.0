import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';
import { Role } from '../generated/prisma/client.js';

export interface RequestingUser {
  id: string;
  role: Role;
  customerId?: string | null;
}

export const isSuperAdmin = (user: RequestingUser): boolean => user.role === Role.SUPERADMIN;

/** {} for SUPERADMIN (no filter), { ownerId: user.id } otherwise. */
export const ownerScope = (user: RequestingUser) => (isSuperAdmin(user) ? {} : { ownerId: user.id });

// Relation-path depth per model, reusing the codebase's existing
// consumptionType.generatorGroup.region walk (NOT buildingFloor, which is
// nullable and would silently miss customers with no floor assigned).
export const regionWhere = (user: RequestingUser) => ({ ...ownerScope(user) });
export const generatorGroupWhere = (user: RequestingUser) => ({ region: { ...ownerScope(user) } });
export const generatorWhere = (user: RequestingUser) => ({ generatorGroup: { region: { ...ownerScope(user) } } });
export const buildingWhere = (user: RequestingUser) => ({ generatorGroup: { region: { ...ownerScope(user) } } });
export const customerWhere = (user: RequestingUser) => ({
  consumptionType: { generatorGroup: { region: { ...ownerScope(user) } } },
});
export const viaCustomerWhere = (user: RequestingUser) => ({ customer: customerWhere(user) });
export const consumptionTypeWhere = (user: RequestingUser) => ({ generatorGroup: { region: { ...ownerScope(user) } } });
export const employeeWhere = (user: RequestingUser) => ({ ...ownerScope(user) });

function assertOwned<T>(record: T | null, message: string): T {
  if (!record) throw new NotFoundException(message);
  return record;
}

export const assertRegionOwned = (db: PrismaService, user: RequestingUser, id: string) =>
  db.region.findFirst({ where: { id, ...regionWhere(user) } }).then((r) => assertOwned(r, 'Region not found.'));

export const assertGeneratorGroupOwned = (db: PrismaService, user: RequestingUser, id: string) =>
  db.generatorGroup
    .findFirst({ where: { id, ...generatorGroupWhere(user) } })
    .then((r) => assertOwned(r, 'Generator group not found.'));

export const assertGeneratorOwned = (db: PrismaService, user: RequestingUser, id: string) =>
  db.generator
    .findFirst({ where: { id, ...generatorWhere(user) } })
    .then((r) => assertOwned(r, 'Generator not found.'));

export const assertBuildingOwned = (db: PrismaService, user: RequestingUser, id: string) =>
  db.building
    .findFirst({ where: { id, ...buildingWhere(user) } })
    .then((r) => assertOwned(r, 'Building not found.'));

export const assertCustomerOwned = (db: PrismaService, user: RequestingUser, id: string) =>
  db.customer
    .findFirst({ where: { id, ...customerWhere(user) } })
    .then((r) => assertOwned(r, 'Customer not found.'));

export const assertConsumptionTypeOwned = (db: PrismaService, user: RequestingUser, id: string) =>
  db.consumptionType
    .findFirst({ where: { id, ...consumptionTypeWhere(user) } })
    .then((r) => assertOwned(r, 'Consumption type not found.'));

export const assertEmployeeOwned = (db: PrismaService, user: RequestingUser, id: string) =>
  db.employee
    .findFirst({ where: { id, ...employeeWhere(user) } })
    .then((r) => assertOwned(r, 'Employee not found.'));

/** CUSTOMER role may only ever access their own single record; ADMIN/SUPERADMIN fall back to ownership. */
export async function assertCustomerAccessible(db: PrismaService, user: RequestingUser, id: string) {
  if (user.role === Role.CUSTOMER) {
    if (user.customerId !== id) throw new NotFoundException('Customer not found.');
    return;
  }
  await assertCustomerOwned(db, user, id);
}

/** Bulk variant for endpoints taking arbitrary customer id arrays (e.g. receipts). Throws unless EVERY id is owned. */
export async function assertCustomersOwned(db: PrismaService, user: RequestingUser, customerIds: string[]) {
  if (isSuperAdmin(user) || customerIds.length === 0) return;
  const owned = await db.customer.count({ where: { id: { in: customerIds }, ...customerWhere(user) } });
  if (owned !== customerIds.length) throw new NotFoundException('One or more customers were not found.');
}

/** Bulk variant for endpoints taking arbitrary MonthlyConsumption id arrays (bulk-counters, and doubles as the singular check for PATCH /billing/monthly/:id). */
export async function assertMonthlyConsumptionsOwned(db: PrismaService, user: RequestingUser, consumptionIds: string[]) {
  if (isSuperAdmin(user) || consumptionIds.length === 0) return;
  const owned = await db.monthlyConsumption.count({ where: { id: { in: consumptionIds }, ...viaCustomerWhere(user) } });
  if (owned !== consumptionIds.length) throw new NotFoundException('One or more billing records were not found.');
}

/** Bulk variant for endpoints taking arbitrary region id arrays (e.g. an employee's region assignments). Throws unless EVERY id is owned. */
export async function assertRegionsOwned(db: PrismaService, user: RequestingUser, regionIds: string[]) {
  if (isSuperAdmin(user) || regionIds.length === 0) return;
  const owned = await db.region.count({ where: { id: { in: regionIds }, ...regionWhere(user) } });
  if (owned !== regionIds.length) throw new NotFoundException('One or more regions were not found.');
}
