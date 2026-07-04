import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { GeneratorService } from './generator.service.js';
import {
  CreateGeneratorDto,
  CreateGeneratorGroupDto,
  CreateRegionDto,
  GeneratorsResponseDto,
  GroupOverviewDto,
  RegionResponseDto,
  UpdateGeneratorDto,
  UpdateGeneratorGroupDto,
  UpdateRegionDto,
} from './dto/region.dto.js';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Generator')
@Controller('generator')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  /* ── Regions ── */
  @Get('regions')
  getAllRegions(): Promise<RegionResponseDto[]> {
    return this.generatorService.getAllRegions();
  }

  @Post('region')
  @ApiBody({ type: CreateRegionDto })
  createRegion(@Body() body: CreateRegionDto) {
    return this.generatorService.createRegion(body.name);
  }

  @Put('region/:id')
  @ApiBody({ type: UpdateRegionDto })
  updateRegion(@Param('id') id: string, @Body() body: UpdateRegionDto) {
    return this.generatorService.updateRegion(id, body.name);
  }

  @Delete('region/:id')
  deleteRegion(@Param('id') id: string) {
    return this.generatorService.deleteRegion(id);
  }

  /* ── Generator Groups ── */
  @Get('group-summaries')
  getGroupSummaries(): Promise<GroupOverviewDto[]> {
    return this.generatorService.getGroupSummaries();
  }

  @Post('group')
  @ApiBody({ type: CreateGeneratorGroupDto })
  createGeneratorGroup(@Body() body: CreateGeneratorGroupDto) {
    return this.generatorService.createGeneratorGroup(body.name, body.regionId);
  }

  @Patch('group/:id')
  @ApiBody({ type: UpdateGeneratorGroupDto })
  updateGeneratorGroup(@Param('id') id: string, @Body() body: UpdateGeneratorGroupDto) {
    return this.generatorService.updateGeneratorGroup(id, body);
  }

  @Delete('group/:id')
  deleteGeneratorGroup(@Param('id') id: string) {
    return this.generatorService.deleteGeneratorGroup(id);
  }

  /* ── Generators ── */
  @Get('generators')
  getGenerators(): Promise<GeneratorsResponseDto[]> {
    return this.generatorService.getGenerators();
  }

  @Post()
  @ApiBody({ type: CreateGeneratorDto })
  createGenerator(@Body() body: CreateGeneratorDto) {
    return this.generatorService.createGenerator(body);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateGeneratorDto })
  updateGenerator(@Param('id') id: string, @Body() body: UpdateGeneratorDto) {
    return this.generatorService.updateGenerator(id, body);
  }

  @Delete(':id')
  deleteGenerator(@Param('id') id: string) {
    return this.generatorService.deleteGenerator(id);
  }
}
