import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RequirePermissions } from '../rbac/decorators';
import { Role, Permission } from '../rbac/enums';
import { AdminService } from './admin.service';
import { GetUsersQueryDto, UserPlan, UserStatus } from './dto/get-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SuspendUserDto, ActivateUserDto, DeleteUserDto } from './dto/suspend-user.dto';
import { AdminLog, LogUserManagement } from '../rbac/decorators/admin-logging.decorator';
import { AdminLogAction, AdminLogTargetType } from '../rbac/admin-logging.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Admin - User Management')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get paginated list of users
   * Task 2.1: User List API
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @RequirePermissions(Permission.USERS_WRITE)
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.adminService.createUser(createUserDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of users with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by email, name, or ID',
  })
  @ApiQuery({ name: 'plan', required: false, enum: UserPlan, description: 'Filter by plan' })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort direction (ASC/DESC)',
  })
  @RequirePermissions(Permission.USERS_READ)
  @AdminLog({
    action: AdminLogAction.VIEW_USER,
    targetType: AdminLogTargetType.USER,
    logRequest: false,
    logResponse: false,
  })
  async getUserList(@Query() query: GetUsersQueryDto, @Request() req: any) {
    return await this.adminService.getUserList(query, req.user.id);
  }

  /**
   * Get detailed user information
   * Task 2.2: User Details API
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get detailed user information' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @RequirePermissions(Permission.USERS_READ)
  @AdminLog({
    action: AdminLogAction.VIEW_USER,
    targetType: AdminLogTargetType.USER,
    targetIdParam: 'id',
    logRequest: false,
    logResponse: false,
  })
  async getUserDetails(@Param('id') id: string, @Request() req: any) {
    return this.adminService.getUserDetails(id, req.user.id);
  }

  /**
   * Update user information
   * Task 2.7: Update User endpoint
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @RequirePermissions(Permission.USERS_WRITE)
  @LogUserManagement(AdminLogAction.EDIT_USER, 'id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
    @Request() req: any
  ) {
    return this.adminService.updateUser(id, updateData, req.user.id);
  }

  /**
   * Suspend user account
   * Task 2.4: Suspend User endpoint
   */
  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend user account' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'User is already suspended' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @RequirePermissions(Permission.USERS_WRITE)
  @LogUserManagement(AdminLogAction.SUSPEND_USER, 'id')
  async suspendUser(
    @Param('id') id: string,
    @Body() suspendData: SuspendUserDto,
    @Request() req: any
  ) {
    return this.adminService.suspendUser(id, suspendData, req.user.id);
  }

  /**
   * Activate suspended user account
   * Task 2.4: Activate User endpoint
   */
  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate suspended user account' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'User is not suspended' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @RequirePermissions(Permission.USERS_WRITE)
  @LogUserManagement(AdminLogAction.ACTIVATE_USER, 'id')
  async activateUser(
    @Param('id') id: string,
    @Body() activateData: ActivateUserDto,
    @Request() req: any
  ) {
    return this.adminService.activateUser(id, activateData, req.user.id);
  }

  /**
   * Delete user account (soft delete)
   * Task 2.5: Delete User endpoint
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user account (soft delete)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete admin users or insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @RequirePermissions(Permission.USERS_DELETE)
  @Roles(Role.SUPER_ADMIN) // Only SUPER_ADMIN can delete users
  @LogUserManagement(AdminLogAction.DELETE_USER, 'id')
  async deleteUser(
    @Param('id') id: string,
    @Body() deleteData: DeleteUserDto,
    @Request() req: any
  ) {
    return this.adminService.deleteUser(id, deleteData, req.user.id);
  }

  /**
   * Generate impersonation token
   * Task 2.6: User Impersonation
   */
  @Post(':id/impersonate')
  @ApiOperation({ summary: 'Generate impersonation token for user' })
  @ApiResponse({ status: 200, description: 'Impersonation token generated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Cannot impersonate admin users' })
  @ApiParam({ name: 'id', description: 'User ID to impersonate' })
  @RequirePermissions(Permission.USERS_IMPERSONATE)
  @LogUserManagement(AdminLogAction.IMPERSONATE_USER, 'id')
  async impersonateUser(@Param('id') id: string, @Request() req: any) {
    return this.adminService.impersonateUser(id, req.user.id);
  }
}
