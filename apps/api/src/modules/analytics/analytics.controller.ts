import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';

class TrackClickDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  linkId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  oneLinkId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ip?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  referer?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  device?: string;
}

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track a click event' })
  trackClick(@Body() dto: TrackClickDto) {
    return this.analyticsService.trackClick({
      linkId: dto.linkId,
      oneLinkId: dto.oneLinkId,
      userAgent: dto.userAgent,
      referer: dto.referer,
      country: dto.country,
      city: dto.city,
      device: dto.device,
      headers: {
        'x-forwarded-for': dto.ip,
        'user-agent': dto.userAgent,
      },
    });
  }

  @Get('links/:linkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics for a link' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getLinkAnalytics(
    @Param('linkId') linkId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.analyticsService.getLinkAnalytics(
      linkId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Get('onelinks/:oneLinkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics for a OneLink' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getOneLinkAnalytics(
    @Param('oneLinkId') oneLinkId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.analyticsService.getOneLinkAnalytics(
      oneLinkId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Get('links/:linkId/timeseries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get time series analytics for a link' })
  @ApiQuery({ name: 'interval', required: false, enum: ['hour', 'day', 'week', 'month'] })
  getLinkTimeSeries(
    @Param('linkId') linkId: string,
    @Query('interval') interval?: string
  ) {
    return this.analyticsService.getLinkTimeSeries(linkId, interval || 'day');
  }
}
