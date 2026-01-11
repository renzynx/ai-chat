import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "cleanup anonymous users",
  { hourUTC: 3, minuteUTC: 0 },
  internal.cleanup.cleanupAnonymousUsers,
);

crons.daily(
  "cleanup expired files",
  { hourUTC: 4, minuteUTC: 0 },
  internal.cleanup.cleanupExpiredFiles,
);

export default crons;
