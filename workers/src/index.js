import { handleScheduled } from './sync/scheduler.js';
import { handleRequest } from './api/router.js';

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(event, env, ctx));
  },
};