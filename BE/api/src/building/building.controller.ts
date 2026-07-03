import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BuildingService } from './building.service.js';
import { CreateBuildingDto, UpdateBuildingDto } from './dto/building.dto.js';

@ApiTags('Building')
@Controller('building')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @ApiBody({ type: CreateBuildingDto })
  createBuilding(@Body() body: CreateBuildingDto) {
    return this.buildingService.createBuilding(body);
  }

  @Get('details')
  @ApiQuery({ name: 'generatorGroupId', required: true, description: 'UUID of the GeneratorGroup' })
  getBuildingDetails(@Query('generatorGroupId') generatorGroupId: string) {
    return this.buildingService.getBuildingDetails(generatorGroupId);
  }

  @Get()
  @ApiQuery({ name: 'generatorGroupId', required: true, description: 'UUID of the GeneratorGroup' })
  getBuildingsByGroup(@Query('generatorGroupId') generatorGroupId: string) {
    return this.buildingService.getBuildingsByGroup(generatorGroupId);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateBuildingDto })
  updateBuilding(@Param('id') id: string, @Body() body: UpdateBuildingDto) {
    return this.buildingService.updateBuilding(id, body);
  }

  @Delete(':id')
  deleteBuilding(@Param('id') id: string) {
    return this.buildingService.deleteBuilding(id);
  }
}
