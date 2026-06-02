// surfaces/api/api_docs_schema_fragments.ts
// OpenAPI specification YAML schema fragments

export const SCHEMA_FRAGMENTS = `openapi: 3.1.0
info:
  title: CloudMailFlare API
  description: API for managing disposable email inboxes, service accounts, and system observability.
  version: 1.0.0
  contact:
    name: CloudMailFlare Team
    url: https://github.com/rakaarwaky/cloud-mail-flare

servers:
  - url: /api
    description: Internal API surface

components:
  securitySchemes:
    SessionAuth:
      type: apiKey
      in: cookie
      name: mailflare_session
    ApiKeyAuth:
      type: apiKey
      in: header
      name: Authorization

  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error: { type: string }
        code: { type: string }
        details: { type: object }

    User:
      type: object
      properties:
        id: { type: string }
        email: { type: string, format: email }
        displayName: { type: string }
        role: { type: string, enum: [admin, agent, user] }

    Inbox:
      type: object
      properties:
        id: { type: string }
        email: { type: string }
        createdAt: { type: string, format: date-time }

    Email:
      type: object
      properties:
        id: { type: string }
        from:
          type: object
          properties:
            name: { type: string }
            email: { type: string }
        subject: { type: string }
        snippet: { type: string }
        receivedAt: { type: string, format: date-time }
        status: { type: string, enum: [read, unread, archived] }

    ApiKey:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        keyPrefix: { type: string }
        createdAt: { type: string, format: date-time }
        disabled: { type: boolean }

    Account:
      type: object
      properties:
        id: { type: string }
        inboxId: { type: string }
        provider: { type: string }
        targetEmail: { type: string, format: email }
        status: { type: string, enum: [pending, completed, failed] }

    AuditLog:
      type: object
      properties:
        id: { type: string }
        action: { type: string }
        actorId: { type: string }
        targetId: { type: string }
        createdAt: { type: string, format: date-time }

    Dashboard:
      type: object
      properties:
        summary:
          type: object
          properties:
            totalEmails: { type: number }
            unreadEmails: { type: number }
            activeInboxes: { type: number }
        metrics: { type: array, items: { type: object } }

    Settings:
      type: object
      additionalProperties: { type: string }

    LoginBody:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string }

    ApiKeyAuthBody:
      type: object
      required: [apiKey]
      properties:
        apiKey: { type: string }

    CreateUserBody:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string, minLength: 8 }
        displayName: { type: string }
        role: { type: string, enum: [user, admin] }

    UpdateUserBody:
      type: object
      properties:
        email: { type: string, format: email }
        password: { type: string, minLength: 8 }
        role: { type: string, enum: [user, admin] }

    CreateInboxBody:
      type: object
      properties:
        username: { type: string, maxLength: 50 }
        email: { type: string, format: email }

    QuickActionBody:
      type: object
      required: [action]
      properties:
        action: { type: string, enum: [star, archive, delete] }

    CreateAccountBody:
      type: object
      required: [inboxId, targetEmail]
      properties:
        inboxId: { type: string }
        provider: { type: string }
        targetEmail: { type: string, format: email }
        password: { type: string }

    UpdateSettingsBody:
      type: object
      required: [key, value]
      properties:
        key: { type: string }
        value: { type: string }

    CleanupBody:
      type: object
      properties:
        maxAgeHours: { type: integer, minimum: 1, maximum: 168 }

    CompleteAccountBody:
      type: object
      required: [apiKey]
      properties:
        apiKey: { type: string }

    FailAccountBody:
      type: object
      properties:
        error: { type: string }
`;
