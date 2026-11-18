import { updateRamadan } from "@/lib/clinical-workflow";
import { post } from "@/lib/workflow-http";

export const POST = post(async (session, body) => ({ request: await updateRamadan(session, body) }));
