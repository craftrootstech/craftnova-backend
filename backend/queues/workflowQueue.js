import { Queue } from "bullmq";

import redisConnection
from "../config/redis.js";

export const workflowQueue =
new Queue("workflowQueue", {
    connection: redisConnection
});