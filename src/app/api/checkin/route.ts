import { submitCheckIn } from "@/lib/clinical-workflow";
import { post } from "@/lib/workflow-http";

export const POST = post(submitCheckIn);
