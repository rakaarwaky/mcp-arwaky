// surfaces/api/api_docs_entry.ts
// API Documentation surface — Swagger UI entry point

import type { AgentEnv } from '../../agent/di_container_registry';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import { OPENAPI_SPEC_YAML } from './api_docs_data';

export async function handleApiDocs(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="CloudMailFlare API Documentation" />
  <title>CloudMailFlare API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #fafafa;
    }
    #swagger-ui {
      max-width: 1200px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
      });
    };
  </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export async function handleOpenApiSpec(
  _request: Request,
  _env: any,
  _ctx: ExecutionContext
): Promise<Response> {
  return new Response(OPENAPI_SPEC_YAML, {
    headers: { 'content-type': 'text/yaml; charset=utf-8' },
  });
}
