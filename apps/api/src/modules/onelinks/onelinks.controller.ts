import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OneLinksService } from './onelinks.service';
import { CreateOneLinkDto } from './dto/create-onelink.dto';
import { UpdateOneLinkDto } from './dto/update-onelink.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('OneLinks')
@Controller('onelinks')
export class OneLinksController {
  constructor(private readonly oneLinksService: OneLinksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new OneLink' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOneLinkDto) {
    return this.oneLinksService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all OneLinks for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const result = await this.oneLinksService.findAll(
      userId,
      page ? parseInt(page) : undefined,
      pageSize ? parseInt(pageSize) : undefined
    );
    return result;
  }

  @Get('code/:shortCode')
  @ApiOperation({ summary: 'Get OneLink by short code' })
  async findByShortCode(@Param('shortCode') shortCode: string) {
    const oneLink = await this.oneLinksService.findByShortCode(shortCode);
    if (!oneLink) {
      throw new NotFoundException('OneLink not found');
    }
    return oneLink;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific OneLink' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.oneLinksService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a OneLink' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOneLinkDto
  ) {
    return this.oneLinksService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a OneLink' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.oneLinksService.remove(userId, id);
  }
}
