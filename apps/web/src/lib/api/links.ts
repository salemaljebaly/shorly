import { apiClient } from './client';

export interface CreateLinkRequest {
  destinationUrl: string;
  shortCode?: string;
  title?: string;
  isActive?: boolean;
  expiresAt?: string;
}

export interface UpdateLinkRequest {
  destinationUrl?: string;
  title?: string;
  isActive?: boolean;
  expiresAt?: string;
}

export interface Link {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title?: string;
  clicks: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export const linksApi = {
  getAll: async (params?: { page?: number; pageSize?: number; tag?: string }): Promise<Link[]> => {
    const response = await apiClient.get('/links', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Link> => {
    const response = await apiClient.get(`/links/${id}`);
    return response.data;
  },

  getByShortCode: async (shortCode: string): Promise<Link> => {
    const response = await apiClient.get(`/links/code/${shortCode}`);
    return response.data;
  },

  create: async (data: CreateLinkRequest): Promise<Link> => {
    const response = await apiClient.post('/links', data);
    return response.data;
  },

  update: async (id: string, data: UpdateLinkRequest): Promise<Link> => {
    const response = await apiClient.patch(`/links/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/links/${id}`);
  },
};
