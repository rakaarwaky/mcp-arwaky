// surfaces/api/api_docs_admin_fragments.ts
// OpenAPI specification YAML administrative path fragments

export const ADMIN_PATH_FRAGMENTS = `  /api/users/{userId}/accounts:
    get:
      summary: List user accounts
      parameters:
        - name: userId
          in: path
          required: true
          schema: { type: string }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Accounts list
          content:
            application/json:
              schema:
                type: object
                properties:
                  account: { $ref: '#/components/schemas/Account' }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/accounts:
    post:
      summary: Create external service account
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateAccountBody' }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Account created
          content:
            application/json:
              schema:
                type: object
                properties:
                  account: { $ref: '#/components/schemas/Account' }
        '400': { description: Validation error }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/accounts/pending:
    get:
      summary: List pending accounts (admin only)
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Pending accounts
          content:
            application/json:
              schema:
                type: object
                properties:
                  accounts: { type: array, items: { $ref: '#/components/schemas/Account' } }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/accounts/{accountId}/complete:
    post:
      summary: Mark account as completed (admin only)
      parameters:
        - name: accountId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CompleteAccountBody' }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Account completed
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  apiKeyId: { type: string }
        '400': { description: Validation error }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/accounts/{accountId}/fail:
    post:
      summary: Mark account as failed (admin only)
      parameters:
        - name: accountId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/FailAccountBody' }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Account marked failed
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/apikeys:
    get:
      summary: List API keys (admin only)
      security:
        - SessionAuth: []
      responses:
        '200':
          description: API keys list
          content:
            application/json:
              schema:
                type: object
                properties:
                  keys: { type: array, items: { $ref: '#/components/schemas/ApiKey' } }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }
    post:
      summary: Create API key (admin only)
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: API key created
          content:
            application/json:
              schema:
                type: object
                properties:
                  apiKey: { $ref: '#/components/schemas/ApiKey' }
                  rawKey: { type: string }
        '400': { description: Validation error }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/apikeys/{id}:
    delete:
      summary: Revoke API key (admin only)
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: API key revoked
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/audit-logs:
    get:
      summary: Get system-wide audit logs (admin only)
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 100 }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Audit logs
          content:
            application/json:
              schema:
                type: object
                properties:
                  logs: { type: array, items: { $ref: '#/components/schemas/AuditLog' } }
                  count: { type: integer }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/audit-logs/user/{userId}:
    get:
      summary: Get audit logs for specific user
      parameters:
        - name: userId
          in: path
          required: true
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 100 }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: User audit logs
          content:
            application/json:
              schema:
                type: object
                properties:
                  logs: { type: array, items: { $ref: '#/components/schemas/AuditLog' } }
                  count: { type: integer }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/audit-logs/apikey/{apiKeyId}:
    get:
      summary: Get audit logs for API key (admin only)
      parameters:
        - name: apiKeyId
          in: path
          required: true
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 100 }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: API key audit logs
          content:
            application/json:
              schema:
                type: object
                properties:
                  logs: { type: array, items: { $ref: '#/components/schemas/AuditLog' } }
                  count: { type: integer }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/audit-logs/target/{targetId}:
    get:
      summary: Get audit logs for target (admin only)
      parameters:
        - name: targetId
          in: path
          required: true
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 100 }
        - name: type
          in: query
          schema: { type: string }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Target audit logs
          content:
            application/json:
              schema:
                type: object
                properties:
                  logs: { type: array, items: { $ref: '#/components/schemas/AuditLog' } }
                  count: { type: integer }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }
`;
