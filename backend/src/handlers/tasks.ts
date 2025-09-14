/**
 * Minimal router for /lists/{id}/tasks endpoints. In-memory stub.
 */
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const router: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const method = event.requestContext.http.method;
    const resource = event.rawPath; // includes stage
    const body = event.body ? JSON.parse(event.body) : null;

    if (method === 'GET' && /\/lists\/[^/]+\/tasks$/.test(resource)) {
      return ok([{ id: 't1', title: 'First task' }]);
    }
    if (method === 'POST' && /\/lists\/[^/]+\/tasks$/.test(resource)) {
      if (!body?.title) return bad('title is required');
      return ok({ id: 'new-task', title: body.title });
    }
    if (method === 'PATCH' && /\/lists\/[^/]+\/tasks\/[^/]+$/.test(resource)) {
      const taskId = resource.split('/').pop();
      return ok({ id: taskId, ...body });
    }
    if (method === 'DELETE' && /\/lists\/[^/]+\/tasks\/[^/]+$/.test(resource)) {
      const taskId = resource.split('/').pop();
      return ok({ deleted: taskId });
    }
    return notFound();
  } catch (err) {
    return error(err);
  }
};

function ok(payload: unknown) {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  };
}
function bad(message: string) {
  return {
    statusCode: 400,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code: 'BAD_REQUEST', message } })
  };
}
function notFound() {
  return {
    statusCode: 404,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'route' } })
  };
}
function error(e: unknown) {
  console.error('handler error', e);
  return {
    statusCode: 500,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code: 'INTERNAL', message: 'oops' } })
  };
}
