import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BuildingService } from './building.service.js';
import { CreateBuildingDto, UpdateBuildingDto } from './dto/building.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@ApiTags('Building')
@Controller('building')
@Roles(Role.SUPERADMIN, Role.ADMIN)
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @ApiBody({ type: CreateBuildingDto })
  createBuilding(@Body() body: CreateBuildingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.buildingService.createBuilding(body, user);
  }

  @Get('details')
  @ApiQuery({ name: 'generatorGroupId', required: true, description: 'UUID of the GeneratorGroup' })
  getBuildingDetails(@Query('generatorGroupId') generatorGroupId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.buildingService.getBuildingDetails(generatorGroupId, user);
  }

  @Get()
  @ApiQuery({ name: 'generatorGroupId', required: true, description: 'UUID of the GeneratorGroup' })
  getBuildingsByGroup(@Query('generatorGroupId') generatorGroupId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.buildingService.getBuildingsByGroup(generatorGroupId, user);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateBuildingDto })
  updateBuilding(@Param('id') id: string, @Body() body: UpdateBuildingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.buildingService.updateBuilding(id, body, user);
  }

  @Delete(':id')
  deleteBuilding(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.buildingService.deleteBuilding(id, user);
  }
}
