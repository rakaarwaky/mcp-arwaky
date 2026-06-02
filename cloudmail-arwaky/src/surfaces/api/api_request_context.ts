// surfaces/api/api_request_context.ts
// Request-scoped context using WeakMap (safe for concurrent requests in isolate)

const requestIdStore = new WeakMap<Request, string>();

export function setRequestId(request: Request, id: string): void {
  requestIdStore.set(request, id);
}

export function getRequestId(request: Request): string | undefined {
  return requestIdStore.get(request);
}
