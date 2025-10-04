import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and/or anonymous key are missing in .env.local file. Check variable names.")
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PUT')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PATCH')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'DELETE')
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'HEAD')
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'OPTIONS')
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Construct the target URL by appending the path to the Supabase URL
    const path = pathSegments.join('/')
    const targetUrl = `${supabaseUrl}/${path}`
    
    // Get the query string from the original request
    const searchParams = request.nextUrl.searchParams.toString()
    const fullTargetUrl = searchParams ? `${targetUrl}?${searchParams}` : targetUrl

    // Prepare headers from the original request
    const headers = new Headers()
    
    // Copy relevant headers from the original request, including Content-Type and Content-Length
    request.headers.forEach((value, key) => {
      // Skip host header to avoid conflicts, but keep Content-Type and Content-Length
      const lowerKey = key.toLowerCase()
      if (lowerKey !== 'host') {
        headers.set(key, value)
      }
    })

    // Add the Supabase API key
    headers.set('apikey', supabaseAnonKey!)
    
    // Only add default JSON content type if there's no Content-Type header already
    // (This preserves multipart/form-data for file uploads)
    if (method !== 'GET' && method !== 'HEAD' && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    // For non-GET/HEAD requests, pass the body as a stream
    // This is critical for file uploads (multipart/form-data)
    if (method !== 'GET' && method !== 'HEAD' && request.body) {
      fetchOptions.body = request.body
      // @ts-ignore - duplex is required for streaming bodies but not in TypeScript types yet
      fetchOptions.duplex = 'half'
    }

    // Make the request to Supabase
    const response = await fetch(fullTargetUrl, fetchOptions)

    // Create response headers
    const responseHeaders = new Headers()
    
    // Copy response headers from Supabase
    response.headers.forEach((value, key) => {
      // Skip headers that might cause issues
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })

    // Add CORS headers to allow the frontend to access the response
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info, x-client-version')

    // Stream the response back to the client
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
