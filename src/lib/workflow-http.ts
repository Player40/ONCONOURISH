import { WorkflowError } from "./clinical-workflow";
import { WriteConflict } from "./repository";
import { getSession, type Session } from "./session";
import { isRecord } from "./workflow-input";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: PRIVATE_HEADERS });

export function errorResponse(error: unknown) {
  if (error instanceof WorkflowError) return json({ error: error.message }, error.status);
  if (error instanceof WriteConflict) return json({ error: "Record changed or is no longer available. Reload and retry." }, 409);
  return json({ error: "Workflow temporarily unavailable." }, 503);
}

export async function requireSession(request?: Request): Promise<Session> {
  const session = await getSession(request);
  if (!session) throw new WorkflowError(401, "Sign in required.");
  return session;
}

async function readJson(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new WorkflowError(415, "Content-Type must be application/json.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new WorkflowError(400, "A JSON object is required.");
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_384) {
      await reader.cancel();
      throw new WorkflowError(413, "Request body is too large.");
    }
    text += decoder.decode(value, { stream: true });
  }
  const body: unknown = JSON.parse(text + decoder.decode());
  if (!isRecord(body)) throw new WorkflowError(400, "A JSON object is required.");
  return body;
}

export function post(handler: (session: Session, body: Record<string, unknown>) => Promise<unknown>) {
  return async (request: Request): Promise<Response> => {
    try {
      const origin = request.headers.get("origin");
      const fetchSite = request.headers.get("sec-fetch-site");
      // Next may normalize the request URL to its internal hostname. A browser's
      // same-origin metadata and the inbound Host together cover that case.
      const browserSameOrigin = fetchSite === "same-origin" && origin !== null &&
        URL.canParse(origin) && new URL(origin).host === request.headers.get("host");
      if (fetchSite === "cross-site" ||
          (origin !== null && origin !== new URL(request.url).origin && !browserSameOrigin)) {
        throw new WorkflowError(403, "Cross-origin write denied.");
      }
      const session = await requireSession(request);
      const body = await readJson(request);
      return json(await handler(session, body));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) {
        return json({ error: "Invalid workflow input." }, 400);
      }
      return errorResponse(error);
    }
  };
}
