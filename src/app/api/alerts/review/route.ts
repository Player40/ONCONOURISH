import { reviewAlert } from "@/lib/clinical-workflow";
import { post } from "@/lib/workflow-http";

export const POST = post(async (session, body) => ({ alert: await reviewAlert(session, body) }));
