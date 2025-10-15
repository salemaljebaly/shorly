import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  total_links: number;
  total_onelinks: number;
  total_clicks: number;
  createdAt: string;
  suspendedAt: string | null;
  suspendedBy: string | null;
  suspensionReason: string | null;
}

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  plan?: 'FREE' | 'STARTER' | 'PRO';
  status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  sortBy?: 'email' | 'name' | 'createdAt' | 'total_links' | 'total_clicks';
  sortOrder?: 'ASC' | 'DESC';
}

export interface UserListResponse {
  data: User[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserUsageStats {
  allTime: {
    totalLinks: number;
    totalOneLinks: number;
    totalClicks: number;
  };
  currentMonth: {
    linksThisMonth: number;
    oneLinksThisMonth: number;
    clicksThisMonth: number;
  };
  limits: {
    links: number;
    onelinks: number;
    clicks: number;
  };
}

export interface UserActivity {
  type: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface UserDetails {
  user: User & {
    avatar: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    timezone: string;
    language: string;
    emailNotifications: boolean;
    analyticsTracking: boolean;
    isActive: boolean;
    lastLoginAt?: string;
  };
  usage: UserUsageStats;
  recentActivity: UserActivity[];
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  timezone?: string;
  language?: string;
  emailNotifications?: boolean;
  analyticsTracking?: boolean;
  isActive?: boolean;
  plan?: 'FREE' | 'STARTER' | 'PRO';
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface CreateUserData extends UpdateUserData {
  password: string;
}

export interface SuspendUserData {
  reason: string;
  notifyUser: boolean;
}

export interface ActivateUserData {
  notifyUser: boolean;
}

export interface DeleteUserData {
  confirm: string;
  reason: string;
}

export interface ImpersonateUserResponse {
  token: string;
  expiresIn: number;
  targetUser: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface AdminActionResponse {
  success: boolean;
  message: string;
  user?: User;
}

// Billing & Subscription Management
export interface Subscription {
  id: string;
  userId: string;
  plan: 'FREE' | 'STARTER' | 'PRO';
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'PAUSED' | 'INACTIVE';
  provider?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any> | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface SubscriptionListQuery {
  page?: number;
  pageSize?: number;
  status?: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'PAUSED' | 'INACTIVE';
  plan?: 'FREE' | 'STARTER' | 'PRO';
  search?: string;
  sortBy?: 'createdAt' | 'currentPeriodStart' | 'plan' | 'status';
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface SubscriptionListResponse {
  data: Subscription[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRunRate: number;
  subscriptionsByPlan: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  newSubscriptionsThisMonth: number;
  churnedSubscriptionsThisMonth: number;
}

export interface CreateManualSubscriptionData {
  customer: string;
  plan: 'STARTER' | 'PRO';
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface CancelSubscriptionData {
  immediate: boolean;
  reason?: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  users: {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    active: number;
  };
  usage: {
    totalLinks: number;
    totalOneLinks: number;
    totalClicks: number;
    clicksToday: number;
  };
  signupsByDay: Array<{
    date: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: string;
    timestamp: string;
    details: Record<string, any>;
  }>;
}

// Monitoring Data
export interface UserAtRisk {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  linksUsed: number;
  linksLimit: number;
  clicksUsed: number;
  clicksLimit: number;
  linksUsagePercentage: number;
  clicksUsagePercentage: number;
  status?: string;
}

export interface HeavyUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  totalLinks: number;
  totalOneLinks: number;
  totalClicks: number;
}

export interface SystemHealth {
  activeUsers: number;
  activeLinks: number;
  clicksToday: number;
  clicksLastHour: number;
  database: { status: 'healthy' | 'degraded' | 'down' };
  redis: { status: 'healthy' | 'degraded' | 'down' };
  api: { status: 'healthy' | 'degraded' | 'down' };
}

export interface MonitoringData {
  usersAtRisk: UserAtRisk[];
  heavyUsers: HeavyUser[];
  systemHealth: SystemHealth;
}

export const adminApi = {
  // User Management
  getUsers: (query: UserListQuery = {}) =>
    apiClient.get<UserListResponse>('/admin/users', { params: query }),

  getUserDetails: (userId: string) =>
    apiClient.get<UserDetails>(`/admin/users/${userId}`),

  createUser: (data: CreateUserData) =>
    apiClient.post<AdminActionResponse>('/admin/users', data),

  updateUser: (userId: string, data: UpdateUserData) =>
    apiClient.patch<AdminActionResponse>(`/admin/users/${userId}`, data),

  suspendUser: (userId: string, data: SuspendUserData) =>
    apiClient.post<AdminActionResponse>(`/admin/users/${userId}/suspend`, data),

  activateUser: (userId: string, data: ActivateUserData) =>
    apiClient.post<AdminActionResponse>(`/admin/users/${userId}/activate`, data),

  deleteUser: (userId: string, data: DeleteUserData) =>
    apiClient.delete<AdminActionResponse>(`/admin/users/${userId}`, { data }),

  impersonateUser: (userId: string) =>
    apiClient.post<ImpersonateUserResponse>(`/admin/users/${userId}/impersonate`),

  // Billing & Subscription Management
  getSubscriptions: (query: SubscriptionListQuery = {}) =>
    apiClient.get<SubscriptionListResponse>('/billing/admin/subscriptions', { params: query }),

  getSubscriptionMetrics: () =>
    apiClient.get<{ success: boolean; metrics: SubscriptionMetrics }>('/billing/admin/metrics'),

  createManualSubscription: (data: CreateManualSubscriptionData) =>
    apiClient.post<any>('/billing/admin/subscriptions/manual', data),

  cancelSubscription: (subscriptionId: string, data: CancelSubscriptionData) =>
    apiClient.delete<any>(`/billing/admin/subscriptions/${subscriptionId}`, { params: data }),

  // Dashboard Metrics
  getDashboardMetrics: () =>
    apiClient.get<DashboardMetrics>('/admin/metrics/dashboard'),

  // Monitoring
  getMonitoringData: () =>
    apiClient.get<MonitoringData>('/admin/metrics/monitoring'),
};
