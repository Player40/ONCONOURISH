import { approvePlan } from "@/lib/clinical-workflow";
import { post } from "@/lib/workflow-http";

export const POST = post(async (session, body) => ({ plan: await approvePlan(session, body) }));
