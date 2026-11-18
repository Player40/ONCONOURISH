import { ask } from "@/lib/clinical-workflow";
import { post } from "@/lib/workflow-http";

export const POST = post(async (session, body) => ({ response: await ask(session, body) }));
