const MCP_FUNCTION_URL =
  "https://asia-northeast1-lightlist-prod-b0269.cloudfunctions.net/mcp";
const PROXY_SECRET_HEADER = "x-lightlist-proxy-secret";

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  MCP_PROXY_SECRET: string;
  MCP_RATE_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
};

const proxyMcp = async (request: Request, env: Env): Promise<Response> => {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success } = await env.MCP_RATE_LIMITER.limit({ key: ip });
  if (!success) {
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": "60", "Cache-Control": "no-store" },
      },
    );
  }
  const forwarded = new Request(MCP_FUNCTION_URL, request);
  forwarded.headers.set(PROXY_SECRET_HEADER, env.MCP_PROXY_SECRET);
  return fetch(forwarded);
};

export default {
  fetch: (request: Request, env: Env) =>
    new URL(request.url).pathname === "/mcp"
      ? proxyMcp(request, env)
      : env.ASSETS.fetch(request),
};
