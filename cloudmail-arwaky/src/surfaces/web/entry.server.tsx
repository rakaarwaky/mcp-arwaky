import { ServerRouter } from "react-router";
import type { EntryContext } from "react-router";
import { renderToReadableStream } from "react-dom/server";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  let shellRendered = false;
  const stream = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      onError(error: unknown) {
        responseStatusCode = 500;
        // Log streaming errors after they've started
        if (shellRendered) {
          console.error(error);
        }
      },
    }
  );
  shellRendered = true;

  // For Cloudflare Workers, we must wait for the stream to be ready if we want to handle errors properly
  // but we can also just return the stream immediately for better TTFB.
  // Given we are in a worker, we return the stream as a Response.

  responseHeaders.set("Content-Type", "text/html");

  return new Response(stream, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
