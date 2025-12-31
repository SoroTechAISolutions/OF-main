import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  ApiResponse,
  User,
  LoginRequest,
  RegisterRequest,
  Model,
  CreateModelRequest,
  UpdateModelRequest,
  Persona,
  FanvueChat,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sorotech.ru/of-api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor - handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/of-dashboard/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(data: LoginRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.client.post('/auth/login', data);
    // API returns accessToken, normalize to token
    if (response.data.success && response.data.data) {
      response.data.data.token = response.data.data.accessToken;
    }
    return response.data;
  }

  async register(data: RegisterRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // Models
  async getModels(): Promise<ApiResponse<Model[]>> {
    const response = await this.client.get('/models');
    // API returns paginated { items: [], total, page, ... }, normalize to array
    if (response.data.success && response.data.data?.items) {
      response.data.data = response.data.data.items;
    }
    return response.data;
  }

  async getModel(id: string): Promise<ApiResponse<Model>> {
    const response = await this.client.get(`/models/${id}`);
    return response.data;
  }

  async createModel(data: CreateModelRequest): Promise<ApiResponse<Model>> {
    const response = await this.client.post('/models', data);
    return response.data;
  }

  async updateModel(id: string, data: UpdateModelRequest): Promise<ApiResponse<Model>> {
    const response = await this.client.put(`/models/${id}`, data);
    return response.data;
  }

  async deleteModel(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/models/${id}`);
    return response.data;
  }

  // Personas
  async getPersonas(): Promise<ApiResponse<Persona[]>> {
    const response = await this.client.get('/personas');
    return response.data;
  }

  // Fanvue
  async startFanvueAuth(modelId: string): Promise<ApiResponse<{ authUrl: string }>> {
    const response = await this.client.post(`/fanvue/auth/start`, { modelId });
    return response.data;
  }

  async getFanvueStatus(modelId: string): Promise<ApiResponse<{ connected: boolean; creatorId?: string }>> {
    const response = await this.client.get(`/fanvue/status/${modelId}`);
    return response.data;
  }

  async disconnectFanvue(modelId: string): Promise<ApiResponse<void>> {
    const response = await this.client.post('/fanvue/disconnect', { modelId });
    return response.data;
  }

  async getFanvueChats(modelId: string): Promise<ApiResponse<FanvueChat[]>> {
    const response = await this.client.get(`/fanvue/chats/${modelId}`);
    return response.data;
  }

  async getFanvueMessages(modelId: string, fanUserUuid: string, cursor?: string): Promise<ApiResponse<{
    messages: Array<{
      uuid: string;
      text: string;
      sentAt: string;
      senderUuid: string;
      hasMedia: boolean;
      mediaType: string | null;
      type: string;
    }>;
    pagination: { nextCursor?: string };
  }>> {
    const params = cursor ? `?cursor=${cursor}` : '';
    const response = await this.client.get(`/fanvue/chats/${modelId}/${fanUserUuid}/messages${params}`);
    // API returns data array and pagination separately, normalize
    return {
      ...response.data,
      data: {
        messages: response.data.data || [],
        pagination: response.data.pagination || {}
      }
    };
  }

  async sendFanvueMessage(modelId: string, fanUserUuid: string, content: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.post(`/fanvue/chats/${modelId}/${fanUserUuid}/message`, { content });
      return response.data;
    } catch (error: any) {
      // Return error response from server if available
      if (error.response?.data) {
        return error.response.data;
      }
      return { success: false, error: error.message || 'Failed to send message' };
    }
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<{
    activeModels: number;
    aiResponsesToday: number;
    aiResponsesChange: number;
    avgResponseTime: number;
    totalMessages: number;
    usedCount: number;
  }>> {
    const response = await this.client.get('/dashboard/stats');
    return response.data;
  }

  async getDashboardActivity(limit = 10): Promise<ApiResponse<Array<{
    id: string;
    model: string;
    action: string;
    fanName: string;
    persona: string;
    time: string;
    responseTime: number;
  }>>> {
    const response = await this.client.get(`/dashboard/activity?limit=${limit}`);
    return response.data;
  }

  // Extension API test
  async generateAIResponse(fanMessage: string, personaId: string): Promise<ApiResponse<{ reply: string }>> {
    const response = await this.client.post('/extension/generate', {
      fanMessage,
      personaId,
    }, {
      headers: {
        'X-Extension-Key': 'muse-alpha-2025',
      },
    });
    return response.data;
  }
}

export const api = new ApiService();
export default api;
