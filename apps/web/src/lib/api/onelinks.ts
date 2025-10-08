import { apiClient } from './client';

export enum DeviceType {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export interface OneLinkTarget {
  deviceType: DeviceType;
  url: string;
  priority?: number;
}

export interface CreateOneLinkRequest {
  shortCode?: string;
  title?: string;
  description?: string;
  targets: OneLinkTarget[];
  fallbackUrl: string;
}

export interface UpdateOneLinkRequest {
  title?: string;
  description?: string;
  targets?: OneLinkTarget[];
  fallbackUrl?: string;
  isActive?: boolean;
}

export interface OneLink {
  id: string;
  shortCode: string;
  title?: string;
  description?: string;
  targets: OneLinkTarget[];
  fallbackUrl: string;
  clicks: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export const oneLinksApi = {
  getAll: async (params?: { page?: number; pageSize?: number }): Promise<OneLink[]> => {
    const response = await apiClient.get('/onelinks', { params });
    return response.data;
  },

  getById: async (id: string): Promise<OneLink> => {
    const response = await apiClient.get(`/onelinks/${id}`);
    return response.data;
  },

  getByShortCode: async (shortCode: string): Promise<OneLink> => {
    const response = await apiClient.get(`/onelinks/code/${shortCode}`);
    return response.data;
  },

  create: async (data: CreateOneLinkRequest): Promise<OneLink> => {
    const response = await apiClient.post('/onelinks', data);
    return response.data;
  },

  update: async (id: string, data: UpdateOneLinkRequest): Promise<OneLink> => {
    const response = await apiClient.patch(`/onelinks/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/onelinks/${id}`);
  },
};
