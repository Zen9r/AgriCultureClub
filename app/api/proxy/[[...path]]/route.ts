// File: app/api/proxy/[[...path]]/route.ts

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are not set.');
    return new NextResponse('Internal server configuration error.', { status: 500 });
  }

  const path = req.nextUrl.pathname.replace('/api/proxy', '');
  const url = new URL(path + req.nextUrl.search, supabaseUrl);

  const headers = new Headers(req.headers);
  headers.set('apikey', supabaseAnonKey);

  // --- بداية التعديل المهم ---
  // نحذف هذا الهيدر لأنه يسبب مشاكل في بيئة الـ Edge
  headers.delete('x-forwarded-host');
  // --- نهاية التعديل المهم ---
  
  const options: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    options.body = req.body;
    // @ts-ignore
    options.duplex = 'half';
  }

  try {
    const response = await fetch(url.toString(), options);
    return response;
  } catch (error) {
    console.error('Edge Proxy error:', error);
    return new NextResponse('Error forwarding request to Supabase.', { status: 502 });
  }
}

// Export the same handler for all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;