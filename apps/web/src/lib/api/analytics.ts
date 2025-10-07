import { apiClient } from './client';

export interface AnalyticsData {
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDate: Array<{
    date: string;
    clicks: number;
  }>;
  clicksByCountry: Array<{
    country: string;
    clicks: number;
  }>;
  clicksByDevice: Array<{
    device: string;
    clicks: number;
  }>;
  clicksByBrowser: Array<{
    browser: string;
    clicks: number;
  }>;
  clicksByReferrer: Array<{
    referrer: string;
    clicks: number;
  }>;
}

export const analyticsApi = {
  getLinkAnalytics: async (
    linkId: string,
    params?: { startDate?: string; endDate?: string }
  ): Promise<AnalyticsData> => {
    const response = await apiClient.get(`/analytics/links/${linkId}`, { params });
    return response.data;
  },

  getOneLinkAnalytics: async (
    oneLinkId: string,
    params?: { startDate?: string; endDate?: string }
  ): Promise<AnalyticsData> => {
    const response = await apiClient.get(`/analytics/onelinks/${oneLinkId}`, { params });
    return response.data;
  },

  getLinkTimeSeries: async (
    linkId: string,
    interval: 'hour' | 'day' | 'week' | 'month' = 'day'
  ) => {
    const response = await apiClient.get(`/analytics/links/${linkId}/timeseries`, {
      params: { interval },
    });
    return response.data;
  },
};
