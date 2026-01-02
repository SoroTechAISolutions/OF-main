// User & Auth
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'chatter' | 'viewer';
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// Models
export interface Model {
  id: string;
  agency_id: string;
  of_username?: string;
  display_name: string;
  avatar_url?: string;
  persona_prompt?: string;
  persona_id?: string;
  ai_enabled: boolean;
  platform: 'onlyfans' | 'fanvue' | 'both';
  fanvue_username?: string;
  fanvue_user_uuid?: string;
  fanvue_access_token?: string;
  stats?: ModelStats;
  created_at: string;
  updated_at: string;
}

export interface ModelStats {
  total_messages: number;
  ai_responses: number;
  avg_response_time: number;
  revenue_estimate?: number;
}

export interface CreateModelRequest {
  display_name: string;
  of_username: string;
  platform: 'onlyfans' | 'fanvue' | 'both';
  persona_id: string;
}

export interface UpdateModelRequest {
  display_name?: string;
  of_username?: string;
  platform?: 'onlyfans' | 'fanvue' | 'both';
  persona_id?: string;
  ai_enabled?: boolean;
}

// Personas
export interface Persona {
  id: string;
  name: string;
  style: string;
  description: string;
  audience: string;
}

// Fanvue
export interface FanvueChat {
  id: string;
  fan_id: string;
  fan_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface FanvueMessage {
  id: string;
  content: string;
  sender: 'creator' | 'fan';
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
