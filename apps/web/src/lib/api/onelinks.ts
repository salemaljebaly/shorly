import { apiClient } from './client';

export interface OneLinkTarget {
  android?: string;
  ios?: string;
  web: string;
}

export interface CreateOneLinkRequest {
  shortCode?: string;
  title?: string;
  targets: OneLinkTarget;
  isActive?: boolean;
  expiresAt?: string;
}

export interface UpdateOneLinkRequest {
  title?: string;
  targets?: OneLinkTarget;
  isActive?: boolean;
  expiresAt?: string;
}

export interface OneLink {
  id: string;
  shortCode: string;
  title?: string;
  targets: OneLinkTarget;
  clicks: number;
  isActive: boolean;
  expiresAt?: string;
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
