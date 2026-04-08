import { randomUUID } from "node:crypto";
import { hostname as getHostname } from "node:os";

const bootId = randomUUID();
const hostname = getHostname();

export type RuntimeIdentity = {
  instanceId: string;
  taskId: string | null;
  hostname: string;
  pid: number;
  bootId: string;
  region: string | null;
  nodeEnv: string | null;
};

function extractTaskId(metadataUri: string | undefined): string | null {
  if (!metadataUri) return null;

  const match = metadataUri.match(
    /\/task\/([0-9a-f]{8,}|[0-9a-f-]{16,})$/i
  );

  return match?.[1] ?? null;
}

export function getRuntimeIdentity(): RuntimeIdentity {
  const taskId =
    process.env.ECS_TASK_ID ||
    extractTaskId(process.env.ECS_CONTAINER_METADATA_URI_V4);

  return {
    instanceId:
      process.env.APP_INSTANCE_ID ||
      process.env.HOSTNAME ||
      taskId ||
      hostname,
    taskId,
    hostname,
    pid: process.pid,
    bootId,
    region: process.env.AWS_REGION || null,
    nodeEnv: process.env.NODE_ENV || null,
  };
}
