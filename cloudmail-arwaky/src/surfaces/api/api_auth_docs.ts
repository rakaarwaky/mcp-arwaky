// surfaces/api/api_docs_auth_fragments.ts
// OpenAPI specification YAML auth and user path fragments

export const AUTH_PATH_FRAGMENTS = `paths:
  /api/auth/login:
    post:
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LoginBody' }
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token: { type: string }
                  expiresAt: { type: string }
        '400': { description: Validation error }
        '401': { description: Authentication failed }
        '429': { description: Rate limited }

  /api/auth/logout:
    post:
      summary: User logout
      security:
        - SessionAuth: []
      responses:
        '200': { description: Logout successful }

  /api/auth/apikey:
    post:
      summary: Authenticate with API key
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ApiKeyAuthBody' }
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token: { type: string }
                  apiKeyId: { type: string }
        '400': { description: Validation error }
        '401': { description: Authentication failed }

  /api/users:
    get:
      summary: List all users (Admin only)
      security:
        - SessionAuth: []
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: object
                properties:
                  users: { type: array, items: { $ref: '#/components/schemas/User' } }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }
    post:
      summary: Create new user (Admin only)
      security:
        - SessionAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateUserBody' }
      responses:
        '200':
          description: User created
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: '#/components/schemas/User' }
        '400': { description: Validation error }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/users/{id}:
    get:
      summary: Get user details
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: User details
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: '#/components/schemas/User' }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }
        '404': { description: User not found }
    put:
      summary: Update user (Admin or self)
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      security:
        - SessionAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateUserBody' }
      responses:
        '200':
          description: User updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
        '400': { description: Validation error }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }
    delete:
      summary: Delete user (Admin or self)
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: User deleted
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }
        '404': { description: User not found }
`;
