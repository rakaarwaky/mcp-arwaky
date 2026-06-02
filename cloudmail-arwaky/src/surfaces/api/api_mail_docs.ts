// surfaces/api/api_docs_mail_fragments.ts
// OpenAPI specification YAML mail and inbox path fragments

export const MAIL_PATH_FRAGMENTS = `  /api/me:
    get:
      summary: Get current authenticated user
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Current user
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: '#/components/schemas/User' }
        '401': { description: Unauthorized }

  /api/me/inbox:
    get:
      summary: Get current user inbox
      security:
        - SessionAuth: []
        - ApiKeyAuth: []
      responses:
        '200':
          description: Inbox emails
          content:
            application/json:
              schema:
                type: object
                properties:
                  emails: { type: array, items: { $ref: '#/components/schemas/Email' } }
                  archivedCount: { type: number }
        '401': { description: Unauthorized }

  /api/me/inbox/wait:
    get:
      summary: Wait for an email
      parameters:
        - name: from
          in: query
          schema: { type: string }
        - name: subject
          in: query
          schema: { type: string }
        - name: timeout
          in: query
          schema: { type: integer }
        - name: pollInterval
          in: query
          schema: { type: integer }
      security:
        - SessionAuth: []
        - ApiKeyAuth: []
      responses:
        '200':
          description: Email received
          content:
            application/json:
              schema:
                type: object
                properties:
                  email: { $ref: '#/components/schemas/Email' }
        '408': { description: Timeout waiting for email }
        '401': { description: Unauthorized }

  /api/me/emails/{emailId}:
    get:
      summary: Get specific email
      parameters:
        - name: emailId
          in: path
          required: true
          schema: { type: string }
      security:
        - SessionAuth: []
        - ApiKeyAuth: []
      responses:
        '200':
          description: Email content
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Email' }
        '401': { description: Unauthorized }
        '404': { description: Email not found }

  /api/me/emails/{emailId}/action:
    post:
      summary: Perform action on email
      parameters:
        - name: emailId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/QuickActionBody' }
      security:
        - SessionAuth: []
        - ApiKeyAuth: []
      responses:
        '200': { description: Action performed }
        '400': { description: Validation error }
        '401': { description: Unauthorized }

  /api/inboxes:
    get:
      summary: List user inboxes with quota
      security:
        - SessionAuth: []
        - ApiKeyAuth: []
      responses:
        '200':
          description: Inboxes list
          content:
            application/json:
              schema:
                type: object
                properties:
                  inboxes: { type: array, items: { $ref: '#/components/schemas/Inbox' } }
                  quota:
                    type: object
                    properties:
                      used: { type: number }
                      limit: { type: number }
        '401': { description: Unauthorized }
    post:
      summary: Create temporary inbox
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateInboxBody' }
      security:
        - SessionAuth: []
        - ApiKeyAuth: []
      responses:
        '200':
          description: Inbox created
          content:
            application/json:
              schema:
                type: object
                properties:
                  inbox: { $ref: '#/components/schemas/Inbox' }
                  credentials:
                    type: object
                    properties:
                      username: { type: string }
                      email: { type: string }
                      password: { type: string }
        '400': { description: Validation error }
        '401': { description: Unauthorized }
        '429': { description: Quota exceeded }

  /api/inboxes/{id}:
    delete:
      summary: Delete/Close inbox
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      security:
        - SessionAuth: []
        - ApiKeyAuth: []
      responses:
        '200':
          description: Inbox closed
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  deletedInboxId: { type: string }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/users/{userId}/inbox:
    get:
      summary: Get user inbox (admin or self)
      parameters:
        - name: userId
          in: path
          required: true
          schema: { type: string }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: User inbox
          content:
            application/json:
              schema:
                type: object
                properties:
                  userId: { type: string }
                  emails: { type: array, items: { $ref: '#/components/schemas/Email' } }
                  archivedCount: { type: number }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/users/{userId}/emails/{emailId}:
    get:
      summary: Get user email (admin or self)
      parameters:
        - name: userId
          in: path
          required: true
          schema: { type: string }
        - name: emailId
          in: path
          required: true
          schema: { type: string }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Email content
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Email' }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }
        '404': { description: Email not found }

  /api/users/{userId}/emails/{emailId}/action:
    post:
      summary: Perform action on user email (admin or self)
      parameters:
        - name: userId
          in: path
          required: true
          schema: { type: string }
        - name: emailId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/QuickActionBody' }
      security:
        - SessionAuth: []
      responses:
        '200': { description: Action performed }
        '400': { description: Validation error }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }
`;
