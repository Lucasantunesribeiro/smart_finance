import { api } from '@/lib/api';
import { 
  AnalyticsData, 
  TrendData, 
  CashFlowData,
  AnalyticsFilter,
  AnalyticsSummary
} from '@/types/analytics';

export const analyticsService = {
  async getAnalyticsData(filter: AnalyticsFilter): Promise<AnalyticsData[]> {
    const params = new URLSearchParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get<AnalyticsData[]>(`/analytics/data?${params}`);
    return response.data;
  },

  async getTrendData(filter: AnalyticsFilter): Promise<TrendData[]> {
    const params = new URLSearchParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get<TrendData[]>(`/analytics/trends?${params}`);
    return response.data;
  },

  async getSummary(filter: AnalyticsFilter): Promise<AnalyticsSummary> {
    const params = new URLSearchParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get<AnalyticsSummary>(`/analytics/summary?${params}`);
    return response.data;
  },

  async getCashFlowData(filter: AnalyticsFilter): Promise<CashFlowData[]> {
    const params = new URLSearchParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get<CashFlowData[]>(`/analytics/cash-flow?${params}`);
    return response.data;
  },


}; 