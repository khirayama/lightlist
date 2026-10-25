const MCP_FUNCTION_URL =
  "https://asia-northeast1-lightlist-prod-b0269.cloudfunctions.net/mcp";

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

export default {
  fetch: (request: Request, env: Env) =>
    new URL(request.url).pathname === "/mcp"
      ? fetch(new Request(MCP_FUNCTION_URL, request))
      : env.ASSETS.fetch(request),
};
