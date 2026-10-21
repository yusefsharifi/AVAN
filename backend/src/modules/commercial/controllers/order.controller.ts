import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { CommercialOrderService } from '../services/commercial-order.service';
import { CreateOrderDto, UpdateOrderStatusDto, FilterOrdersDto } from '../dto/create-dtos';

@ApiTags('Commercial - Orders')
@ApiBearerAuth()
@Controller('/commercial/orders')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class OrderController {
  constructor(private readonly orderService: CommercialOrderService) {}

  @Post()
  @RequirePermission('commercial.order.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Create order' })
  async create(@Body() dto: CreateOrderDto, @CurrentUser('sub') userId: string) {
    const data = await this.orderService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('commercial.order.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'List orders' })
  async findAll(@Query() filter: FilterOrdersDto, @ZoneId() zoneId: string) {
    filter.zoneId = filter.zoneId || zoneId;
    const result = await this.orderService.findAll(filter);
    return { success: true, ...result };
  }

  @Get('overdue-milestones')
  @RequirePermission('commercial.order.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get overdue milestones' })
  async getOverdueMilestones(@ZoneId() zoneId: string) {
    const data = await this.orderService.getOverdueMilestones(zoneId);
    return { success: true, data };
  }

  @Get('stats')
  @RequirePermission('commercial.order.list.view')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Order statistics' })
  async getStats(@ZoneId() zoneId: string, @CurrentUser('companyId') companyId?: string) {
    const data = await this.orderService.getOrderStats(zoneId, companyId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('commercial.order.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Get order by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.orderService.findById(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @RequirePermission('commercial.order.list.update')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.orderService.updateStatus(id, dto, userId);
    return { success: true, data };
  }

  @Post(':id/milestones/:mid/complete')
  @RequirePermission('commercial.order.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Complete milestone' })
  async completeMilestone(
    @Param('id') orderId: string,
    @Param('mid') milestoneId: string,
    @CurrentUser('sub') userId: string,
    @Body('notes') notes?: string,
  ) {
    const data = await this.orderService.completeMilestone(orderId, milestoneId, userId, notes);
    return { success: true, data };
  }

  @Post(':id/convert-to-invoice')
  @RequirePermission('commercial.order.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Convert to finance invoice' })
  async convertToInvoice(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.orderService.convertToInvoice(id, userId);
    return { success: true, data };
  }
}
