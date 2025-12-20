import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OF Agency Platform API',
      version: '1.0.0',
      description: 'AI-powered chat assistant platform for content creators',
      contact: {
        name: 'SoroTech AI Solutions',
        email: 'support@sorotech.ru'
      }
    },
    servers: [
      {
        url: 'https://sorotech.ru/of-api',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from /api/auth/login'
        },
        ExtensionKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Extension-Key',
          description: 'API key for Chrome Extension'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['owner', 'admin', 'chatter'] },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Model: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            of_username: { type: 'string' },
            persona_prompt: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Chat: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            model_id: { type: 'string', format: 'uuid' },
            fan_of_id: { type: 'string' },
            fan_username: { type: 'string' },
            status: { type: 'string', enum: ['active', 'archived', 'blocked'] },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            chat_id: { type: 'string', format: 'uuid' },
            direction: { type: 'string', enum: ['inbound', 'outbound'] },
            content: { type: 'string' },
            is_ai_generated: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        AIResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            response_text: { type: 'string' },
            was_sent: { type: 'boolean' },
            was_edited: { type: 'boolean' },
            generation_time_ms: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'Team management' },
      { name: 'Models', description: 'Model/creator management' },
      { name: 'Chats', description: 'Chat and message management' },
      { name: 'AI', description: 'AI generation and analytics' },
      { name: 'Extension', description: 'Chrome Extension API' }
    ]
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
