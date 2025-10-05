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
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Links')
@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new short link' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateLinkDto) {
    return this.linksService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all links for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('tag') tag?: string
  ) {
    const result = await this.linksService.findAll(
      userId,
      page ? parseInt(page) : undefined,
      pageSize ? parseInt(pageSize) : undefined,
      tag
    );
    return result.data;
  }

  @Get('code/:shortCode')
  @ApiOperation({ summary: 'Get link by short code' })
  async findByShortCode(@Param('shortCode') shortCode: string) {
    const link = await this.linksService.findByShortCode(shortCode);
    if (!link) {
      throw new NotFoundException('Link not found');
    }
    return link;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific link' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.linksService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a link' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateLinkDto) {
    return this.linksService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a link' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.linksService.remove(userId, id);
  }
}
