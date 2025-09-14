/**
 * Minimal router for /lists endpoints. Purely in-memory for now.
 * Replace with real DynamoDB logic later.
 */
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const router: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const method = event.requestContext.http.method;
    const resource = event.rawPath; // e.g., /prod/lists or /prod/lists/{id}
    const body = event.body ? JSON.parse(event.body) : null;

    if (method === 'GET' && /\/lists$/.test(resource)) {
      return ok([{ id: 'demo-list', title: 'My List' }]);
    }
    if (method === 'POST' && /\/lists$/.test(resource)) {
      if (!body?.title) return bad('title is required');
      return ok({ id: 'new-list-id', title: body.title });
    }
    if (method === 'GET' && /\/lists\/[^/]+$/.test(resource)) {
      const id = resource.split('/').pop();
      return ok({ id, title: 'One List' });
    }
    if (method === 'PATCH' && /\/lists\/[^/]+$/.test(resource)) {
      const id = resource.split('/').pop();
      return ok({ id, ...body });
    }
    if (method === 'DELETE' && /\/lists\/[^/]+$/.test(resource)) {
      const id = resource.split('/').pop();
      return ok({ deleted: id });
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
