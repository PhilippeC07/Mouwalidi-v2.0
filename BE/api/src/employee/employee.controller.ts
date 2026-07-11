import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags } from '@nestjs/swagger';
import { EmployeeService } from './employee.service.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

const UPLOAD_OPTIONS = { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } };

@ApiTags('Employees')
@Controller('employees')
@Roles(Role.SUPERADMIN, Role.ADMIN)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.createEmployee(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.listEmployees(user);
  }

  // Declared before ':id' so it isn't swallowed by that dynamic route.
  @Get('my-team')
  @Roles(Role.CUSTOMER)
  findMyTeam(@CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.listMyRegionTeam(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.getEmployee(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.updateEmployee(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.deleteEmployee(id, user);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.uploadPhoto(id, file, user);
  }

  @Post(':id/id-document')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  uploadIdDocument(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.uploadIdDocument(id, file, user);
  }
}
