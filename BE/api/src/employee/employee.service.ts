import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto.js';
import { assertEmployeeOwned, assertRegionsOwned, employeeWhere, type RequestingUser } from '../auth/ownership.util.js';

const EMPLOYEE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  role: true,
  salary: true,
  status: true,
  notes: true,
  regions: { select: { id: true, name: true } },
  profilePictureUrl: true,
  idDocumentUrl: true,
  visibleToCustomers: true,
} as const;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const UPLOAD_ROOT = join(process.cwd(), 'uploads', 'employees');

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

function resolveExtension(file: Express.Multer.File): string {
  return MIME_EXTENSIONS[file.mimetype] ?? extname(file.originalname) ?? '';
}

/** Removes any previously-uploaded file for this employee in the given directory (extension may differ from the new upload), so replacing a photo/document never leaves an orphaned file behind. */
function removeExistingFile(dir: string, employeeId: string): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(`${employeeId}.`)) {
      try { unlinkSync(join(dir, name)); } catch { /* best-effort */ }
    }
  }
}

function saveUpload(dir: string, employeeId: string, file: Express.Multer.File): string {
  mkdirSync(dir, { recursive: true });
  removeExistingFile(dir, employeeId);
  const filename = `${employeeId}${resolveExtension(file)}`;
  writeFileSync(join(dir, filename), file.buffer);
  return filename;
}

@Injectable()
export class EmployeeService {
  constructor(private readonly db: PrismaService) {}

  async createEmployee(dto: CreateEmployeeDto, user: RequestingUser) {
    const { regionIds, ...employeeData } = dto;
    await assertRegionsOwned(this.db, user, regionIds ?? []);

    return this.db.employee.create({
      data: {
        ...employeeData,
        ownerId: user.id,
        regions: regionIds?.length ? { connect: regionIds.map((id) => ({ id })) } : undefined,
      },
      select: EMPLOYEE_SELECT,
    });
  }

  async listEmployees(user: RequestingUser) {
    return this.db.employee.findMany({
      where: employeeWhere(user),
      select: EMPLOYEE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEmployee(id: string, user: RequestingUser) {
    await assertEmployeeOwned(this.db, user, id);
    return this.db.employee.findUnique({ where: { id }, select: EMPLOYEE_SELECT });
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto, user: RequestingUser) {
    await assertEmployeeOwned(this.db, user, id);
    const { regionIds, ...employeeData } = dto;
    if (regionIds !== undefined) await assertRegionsOwned(this.db, user, regionIds);

    return this.db.employee.update({
      where: { id },
      data: {
        ...employeeData,
        ...(regionIds !== undefined ? { regions: { set: regionIds.map((regionId) => ({ id: regionId })) } } : {}),
      },
      select: EMPLOYEE_SELECT,
    });
  }

  async deleteEmployee(id: string, user: RequestingUser) {
    await assertEmployeeOwned(this.db, user, id);
    return this.db.employee.delete({ where: { id } });
  }

  /** For the CUSTOMER role: the employees their region's admin has chosen to make visible, scoped to the customer's own region — never accepts a region/customer id from the caller. */
  async listMyRegionTeam(user: RequestingUser) {
    if (!user.customerId) throw new BadRequestException('No customer account linked.');
    const customer = await this.db.customer.findUnique({
      where: { id: user.customerId },
      select: { consumptionType: { select: { generatorGroup: { select: { regionId: true } } } } },
    });
    const regionId = customer?.consumptionType.generatorGroup.regionId;
    if (!regionId) return [];

    return this.db.employee.findMany({
      where: { visibleToCustomers: true, status: 'active', regions: { some: { id: regionId } } },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true, role: true, profilePictureUrl: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async uploadPhoto(id: string, file: Express.Multer.File | undefined, user: RequestingUser) {
    await assertEmployeeOwned(this.db, user, id);
    if (!file) throw new BadRequestException('No file uploaded.');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Profile picture must be an image.');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestException('File is too large (max 5MB).');

    const dir = join(UPLOAD_ROOT, 'photos');
    const filename = saveUpload(dir, id, file);

    return this.db.employee.update({
      where: { id },
      data: { profilePictureUrl: `/uploads/employees/photos/${filename}` },
      select: EMPLOYEE_SELECT,
    });
  }

  async uploadIdDocument(id: string, file: Express.Multer.File | undefined, user: RequestingUser) {
    await assertEmployeeOwned(this.db, user, id);
    if (!file) throw new BadRequestException('No file uploaded.');
    if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
      throw new BadRequestException('ID document must be an image or PDF.');
    }
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestException('File is too large (max 5MB).');

    const dir = join(UPLOAD_ROOT, 'documents');
    const filename = saveUpload(dir, id, file);

    return this.db.employee.update({
      where: { id },
      data: { idDocumentUrl: `/uploads/employees/documents/${filename}` },
      select: EMPLOYEE_SELECT,
    });
  }
}
