// surfaces/api/api_docs_system_fragments.ts
// OpenAPI specification YAML system and infrastructure path fragments

export const SYSTEM_PATH_FRAGMENTS = `  /api/worker-settings:
    get:
      summary: Get worker settings
      security:
        - SessionAuth: []
      responses:
        '200':
          description: System settings
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Settings' }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }
    put:
      summary: Update worker settings (admin only)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateSettingsBody' }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Settings updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Settings' }
        '400': { description: Validation error }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/cleanup:
    post:
      summary: Trigger expired data cleanup (admin only)
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CleanupBody' }
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Cleanup result
          content:
            application/json:
              schema:
                type: object
                properties:
                  deletedCount: { type: integer }
        '400': { description: Validation error }
        '401': { description: Unauthorized }
        '403': { description: Forbidden }

  /api/metrics:
    get:
      summary: Get Prometheus-style metrics
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Metrics text output
          content:
            text/plain:
              schema: { type: string }
        '401': { description: Unauthorized }

  /api/dashboard:
    get:
      summary: Get user dashboard metrics
      security:
        - SessionAuth: []
      responses:
        '200':
          description: Dashboard data
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Dashboard' }
        '401': { description: Unauthorized }

  /api/health:
    get:
      summary: Health check
      responses:
        '200':
          description: System is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  lifecycle: { type: object }
                  database: { type: object }
        '503': { description: Service unhealthy }

  /api/docs:
    get:
      summary: Swagger UI documentation
      security:
        - SessionAuth: []
      responses:
        '200':
          description: HTML Swagger UI
          content:
            text/html:
              schema: { type: string }

  /api/openapi.yaml:
    get:
      summary: OpenAPI specification
      responses:
        '200':
          description: OpenAPI YAML
          content:
            text/yaml:
              schema: { type: string }
`;
