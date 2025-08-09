/**
 * 簡單的 Bearer Token 認證中間件
 */

export async function requireAuth(request, env) {
  // 獲取 Authorization header
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing or invalid Authorization header'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 提取 token
  const token = authHeader.substring(7);
  
  // 獲取環境變數中的 API_TOKEN
  const validToken = env.API_TOKEN || 'test-token-123'; // 預設測試 token
  
  // 驗證 token
  if (token !== validToken) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid token'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 認證通過
  return null;
}

/**
 * 包裝需要認證的路由
 */
export function withAuth(handler) {
  return async (request, ...args) => {
    const authError = await requireAuth(request, request.env);
    if (authError) {
      return authError;
    }
    return handler(request, ...args);
  };
}