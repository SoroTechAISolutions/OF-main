// ============================================
// OF Agency Platform - TypeScript Types
// ============================================

// User roles
export type UserRole = 'owner' | 'admin' | 'chatter';

// Database entity interfaces
export interface Agency {
  id: string;
  name: string;
  email?: string;
  plan: string;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  agency_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Model {
  id: string;
  agency_id: string;
  of_username: string;
  of_user_id?: number;
  display_name?: string;
  avatar_url?: string;
  header_url?: string;
  subscription_price?: number;
  is_verified: boolean;
  persona_prompt?: string;
  ai_enabled: boolean;
  settings: Record<string, any>;
  last_seen_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Chat {
  id: string;
  model_id: string;
  fan_of_id: string;
  fan_username: string;
  fan_display_name?: string;
  fan_avatar_url?: string;
  status: 'active' | 'archived' | 'blocked';
  total_messages: number;
  total_spent: number;
  last_message_at?: Date;
  last_message_preview?: string;
  tags: string[];
  notes?: string;
  subscription_active: boolean;
  first_message_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  chat_id: string;
  of_message_id?: string;
  direction: 'incoming' | 'outgoing';
  content?: string;
  has_media: boolean;
  media_type?: string;
  media_count: number;
  is_ppv: boolean;
  ppv_price?: number;
  ppv_unlocked: boolean;
  unlocked: boolean;
  read_at?: Date;
  sent_by_user_id?: string;
  sent_by_ai: boolean;
  created_at: Date;
}

export interface AIResponse {
  id: string;
  message_id?: string;
  model_id: string;
  input_text: string;
  output_text: string;
  llm_model?: string;
  tokens_input?: number;
  tokens_output?: number;
  latency_ms?: number;
  was_used: boolean;
  was_edited: boolean;
  feedback?: string;
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  device_info?: string;
  ip_address?: string;
  expires_at: Date;
  created_at: Date;
}

export interface FanStats {
  id: string;
  chat_id: string;
  total_tips: number;
  total_ppv_purchased: number;
  total_subscriptions: number;
  messages_sent: number;
  messages_received: number;
  avg_response_time_seconds?: number;
  last_purchase_at?: Date;
  last_tip_at?: Date;
  engagement_score: number;
  created_at: Date;
  updated_at: Date;
}

// API Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  agency_name: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  agencyId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
