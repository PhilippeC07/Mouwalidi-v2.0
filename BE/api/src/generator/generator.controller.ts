import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { GeneratorService } from './generator.service.js';
import {
  CreateGeneratorDto,
  CreateGeneratorGroupDto,
  CreateRegionDto,
  GeneratorsResponseDto,
  GroupOverviewDto,
  RegionResponseDto,
  RegionWhatsappResultDto,
  SendRegionWhatsappDto,
  UpdateGeneratorDto,
  UpdateGeneratorGroupDto,
  UpdateRegionDto,
} from './dto/region.dto.js';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@ApiTags('Generator')
@Controller('generator')
@Roles(Role.SUPERADMIN, Role.ADMIN)
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  /* ── Regions ── */
  @Get('regions')
  getAllRegions(@CurrentUser() user: AuthenticatedUser): Promise<RegionResponseDto[]> {
    return this.generatorService.getAllRegions(user);
  }

  @Post('region')
  @ApiBody({ type: CreateRegionDto })
  createRegion(@Body() body: CreateRegionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.generatorService.createRegion(body.name, user);
  }

  @Put('region/:id')
  @ApiBody({ type: UpdateRegionDto })
  updateRegion(@Param('id') id: string, @Body() body: UpdateRegionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.generatorService.updateRegion(id, body.name, user);
  }

  @Delete('region/:id')
  deleteRegion(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.generatorService.deleteRegion(id, user);
  }

  @Post('region/:id/whatsapp-broadcast')
  @ApiBody({ type: SendRegionWhatsappDto })
  sendRegionWhatsappBroadcast(
    @Param('id') id: string,
    @Body() body: SendRegionWhatsappDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RegionWhatsappResultDto> {
    return this.generatorService.sendRegionWhatsappBroadcast(id, body.message, user);
  }

  /* ── Generator Groups ── */
  @Get('group-summaries')
  getGroupSummaries(@CurrentUser() user: AuthenticatedUser): Promise<GroupOverviewDto[]> {
    return this.generatorService.getGroupSummaries(user);
  }

  @Post('group')
  @ApiBody({ type: CreateGeneratorGroupDto })
  createGeneratorGroup(@Body() body: CreateGeneratorGroupDto, @CurrentUser() user: AuthenticatedUser) {
    return this.generatorService.createGeneratorGroup(body.name, body.regionId, user);
  }

  @Patch('group/:id')
  @ApiBody({ type: UpdateGeneratorGroupDto })
  updateGeneratorGroup(@Param('id') id: string, @Body() body: UpdateGeneratorGroupDto, @CurrentUser() user: AuthenticatedUser) {
    return this.generatorService.updateGeneratorGroup(id, body, user);
  }

  @Delete('group/:id')
  deleteGeneratorGroup(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.generatorService.deleteGeneratorGroup(id, user);
  }

  /* ── Generators ── */
  @Get('generators')
  getGenerators(@CurrentUser() user: AuthenticatedUser): Promise<GeneratorsResponseDto[]> {
    return this.generatorService.getGenerators(user);
  }

  @Post()
  @ApiBody({ type: CreateGeneratorDto })
  createGenerator(@Body() body: CreateGeneratorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.generatorService.createGenerator(body, user);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateGeneratorDto })
  updateGenerator(@Param('id') id: string, @Body() body: UpdateGeneratorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.generatorService.updateGenerator(id, body, user);
  }

  @Delete(':id')
  deleteGenerator(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.generatorService.deleteGenerator(id, user);
  }
}
