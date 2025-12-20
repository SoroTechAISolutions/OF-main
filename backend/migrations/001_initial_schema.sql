-- OF Agency Platform - Initial Schema
-- Migration: 001_initial_schema.sql
-- Date: 2025-12-02

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AGENCIES
-- ============================================
-- Агентства (верхний уровень, владеют моделями)
CREATE TABLE agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    plan VARCHAR(50) DEFAULT 'free', -- free, starter, pro, enterprise
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USERS
-- ============================================
-- Пользователи системы (админы, чаттеры)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'chatter', -- owner, admin, chatter
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_agency ON users(agency_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- MODELS (OF Accounts)
-- ============================================
-- OnlyFans аккаунты креаторов
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    of_username VARCHAR(255) NOT NULL, -- @username на OF
    display_name VARCHAR(255),
    avatar_url TEXT,
    persona_prompt TEXT, -- Системный промпт для AI (личность модели)
    ai_enabled BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(agency_id, of_username)
);

CREATE INDEX idx_models_agency ON models(agency_id);
CREATE INDEX idx_models_username ON models(of_username);

-- ============================================
-- CHATS
-- ============================================
-- Чаты с фанами
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    fan_of_id VARCHAR(255), -- ID фана на OnlyFans
    fan_username VARCHAR(255),
    fan_display_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- active, archived, blocked
    total_messages INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0, -- Сколько фан потратил
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview TEXT,
    tags TEXT[], -- Теги для категоризации (whale, new, vip)
    notes TEXT, -- Заметки чаттера
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(model_id, fan_of_id)
);

CREATE INDEX idx_chats_model ON chats(model_id);
CREATE INDEX idx_chats_fan ON chats(fan_of_id);
CREATE INDEX idx_chats_last_message ON chats(last_message_at DESC);
CREATE INDEX idx_chats_status ON chats(status);

-- ============================================
-- MESSAGES
-- ============================================
-- История сообщений
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    of_message_id VARCHAR(255), -- ID сообщения на OnlyFans (для дедупликации)
    direction VARCHAR(10) NOT NULL, -- 'incoming' (от фана) или 'outgoing' (от креатора)
    content TEXT,
    has_media BOOLEAN DEFAULT FALSE,
    media_type VARCHAR(50), -- image, video, audio, ppv
    media_count INTEGER DEFAULT 0,
    is_ppv BOOLEAN DEFAULT FALSE,
    ppv_price DECIMAL(10,2),
    ppv_unlocked BOOLEAN DEFAULT FALSE,
    sent_by_user_id UUID REFERENCES users(id), -- Кто отправил (если outgoing)
    sent_by_ai BOOLEAN DEFAULT FALSE, -- Было ли AI-сгенерировано
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_of_id ON messages(of_message_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_direction ON messages(direction);

-- ============================================
-- AI RESPONSES
-- ============================================
-- Логи AI ответов (для аналитики и дебага)
CREATE TABLE ai_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- Исходное сообщение фана
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    input_text TEXT, -- Что получил AI
    output_text TEXT, -- Что сгенерировал AI
    llm_model VARCHAR(100), -- gpt-4o-mini, gpt-4o, claude-3, etc
    tokens_input INTEGER,
    tokens_output INTEGER,
    latency_ms INTEGER, -- Время генерации
    was_used BOOLEAN DEFAULT FALSE, -- Использовал ли чаттер этот ответ
    was_edited BOOLEAN DEFAULT FALSE, -- Редактировал ли перед отправкой
    feedback VARCHAR(50), -- good, bad, skipped
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_responses_model ON ai_responses(model_id);
CREATE INDEX idx_ai_responses_created ON ai_responses(created_at DESC);
CREATE INDEX idx_ai_responses_used ON ai_responses(was_used);

-- ============================================
-- SESSIONS (для extension авторизации)
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE agencies IS 'Агентства - владельцы OF аккаунтов';
COMMENT ON TABLE users IS 'Пользователи системы (владельцы, админы, чаттеры)';
COMMENT ON TABLE models IS 'OnlyFans аккаунты креаторов';
COMMENT ON TABLE chats IS 'Чаты с фанами';
COMMENT ON TABLE messages IS 'История сообщений';
COMMENT ON TABLE ai_responses IS 'Логи AI-генерации для аналитики';
COMMENT ON TABLE sessions IS 'Сессии авторизации (JWT tokens)';
