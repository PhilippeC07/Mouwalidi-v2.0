import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { GeneratorService } from './generator.service.js';
import {
  CreateRegionDto,
  GeneratorsResponseDto,
  RegionResponseDto,
  UpdateRegionDto,
} from './dto/region.dto.js';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Generator')
@Controller('generator')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

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

  @Get('generators')
  getGenerators(): Promise<GeneratorsResponseDto[]> {
    return this.generatorService.getGenerators();
  }
}
