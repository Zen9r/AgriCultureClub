// File: app/api/proxy/[[...path]]/route.ts

// This line is crucial for performance. It deploys the proxy to the Edge Network.
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
  // Retrieve Supabase URL and Key from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Safety check to ensure variables are defined
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are not set.');
    return new NextResponse('Internal server configuration error.', { status: 500 });
  }

  // Reconstruct the target Supabase URL by taking the path from the incoming request
  // e.g., /api/proxy/rest/v1/events -> /rest/v1/events
  const path = req.nextUrl.pathname.replace('/api/proxy', '');
  const url = new URL(path + req.nextUrl.search, supabaseUrl);

  // Copy original headers from the client request
  const headers = new Headers(req.headers);

  // Set mandatory Supabase headers
  headers.set('apikey', supabaseAnonKey);
  // The 'Authorization' header is passed through automatically from the client

  // Define the options for the fetch request to Supabase
  const options: RequestInit = {
    method: req.method,
    headers,
  };

  // IMPORTANT: Only add a 'body' to the request if the method is not GET or HEAD.
  // This is the fix for both the Edge runtime error and the login (POST) issue.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    options.body = req.body;
    // The 'duplex' property is required by the Edge runtime to stream request bodies
    // @ts-ignore
    options.duplex = 'half';
  }

  try {
    // Forward the request to Supabase and stream the response back
    const response = await fetch(url.toString(), options);
    return response;
  } catch (error) {
    console.error('Edge Proxy error:', error);
    return new NextResponse('Error forwarding request to Supabase.', { status: 502 }); // 502 Bad Gateway
  }
}

// Export the same handler for all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;