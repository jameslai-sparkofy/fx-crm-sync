import { Router } from 'itty-router';
import { objectRoutes } from './objects.js';
import { objectsEnhancedRoutes } from './objects-enhanced.js';
import { schemaRoutes } from './schema.js';
import { schemaEnhancedRoutes } from './schema-enhanced.js';
import { fieldSyncRoutes } from './field-sync.js';
import { syncRoutes } from './sync.js';
import { debugRoutes } from './debug.js';
import { webhookRoutes } from './webhook.js';
import { crudRoutes } from './crud.js';
import { backupRoutes } from './backup.js';
import { adminHTML } from '../admin/admin-html.js';
import { adminHTMLDebug } from '../admin/admin-html-debug.js';
import { adminHTMLTest } from '../admin/admin-html-test.js';
import { adminHTMLReproduce } from '../admin/admin-html-reproduce.js';

const router = Router();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

// Admin UI routes
router.get('/', () => {
  return new Response(adminHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/admin', () => {
  return new Response(adminHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/debug', () => {
  return new Response(adminHTMLDebug, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/test', () => {
  return new Response(adminHTMLTest, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/reproduce', () => {
  return new Response(adminHTMLReproduce, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

// API routes
router.all('/api/objects/*', objectsEnhancedRoutes.handle);
router.all('/api/objects', objectsEnhancedRoutes.handle);
router.all('/api/schema/*', schemaEnhancedRoutes.handle);
router.all('/api/field-sync/*', fieldSyncRoutes.handle);
router.all('/api/sync/*', syncRoutes.handle);
router.all('/api/debug/*', debugRoutes.handle);
router.all('/api/webhook/*', webhookRoutes.handle);
router.all('/api/crud/*', crudRoutes.handle);
router.all('/api/backup/*', backupRoutes.handle);

// Health check
router.get('/api/health', () => {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// 404 handler
router.all('*', () => {
  return new Response(JSON.stringify({ 
    error: 'Not Found' 
  }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

export async function handleRequest(request, env, ctx) {
  try {
    // Add env to request for use in routes
    request.env = env;
    request.ctx = ctx;
    
    const response = await router.handle(request);
    
    // Add CORS headers to all responses
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });
    
    return newResponse;
  } catch (error) {
    console.error('Router error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}