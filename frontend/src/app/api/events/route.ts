import { forwardToBackendApi } from "../../../../server/backendProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = {
  path?: string[];
};

export async function GET(request: Request): Promise<Response> {
  return forwardToBackendApi(request, Promise.resolve<Params>({ path: [] }), [
    "events",
  ]);
}
