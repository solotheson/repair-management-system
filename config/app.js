module.exports = {
  APP_ROLES: {
    superadmin: 'superadmin',
    user: 'user',
  },
  APP_REPAIR_STATUS: {
    in_progress: 'in_progress',
    completed: 'completed',
  },
  APP_SWAGGER_DEFINITION: {
    openapi: '3.0.0',
    info: {
      version: '0.1.0',
      title: 'Repair Management Service',
      description: 'Repair Management Service - API Specification (OpenAPI): [openapi.json](/swagger/openapi.json)',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local server',
      },
    ],
    components: {
      schemas: {
        StandardError: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'internal_server_error' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            field: { type: 'string', example: 'email' },
            message: { type: 'string', example: 'email_is_required' },
          },
        },
        ValidationErrors: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: { $ref: '#/components/schemas/ValidationError' },
            },
          },
        },
        UnauthorizedError: {
          type: 'object',
          properties: { message: { type: 'string', example: 'invalid_token' } },
        },
        ForbiddenError: {
          type: 'object',
          properties: { message: { type: 'string', example: 'forbidden' } },
        },
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
};
