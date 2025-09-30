import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the Supabase URL and anon key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Extract the path from the request URL
    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/supabase-proxy/', '')
    const searchParams = url.searchParams.toString()
    
    // Construct the target URL
    const targetUrl = `${supabaseUrl}/${path}${searchParams ? `?${searchParams}` : ''}`

    // Prepare headers
    const headers = new Headers()
    
    // Copy relevant headers from the original request
    req.headers.forEach((value, key) => {
      // Skip host header to avoid conflicts
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value)
      }
    })

    // Add the Supabase API key
    headers.set('apikey', supabaseAnonKey)
    
    // Ensure proper content type for JSON requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }

    // Prepare the request body
    let body: string | undefined
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.text()
      } catch (error) {
        console.error('Error reading request body:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to read request body' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'content-type': 'application/json' } 
          }
        )
      }
    }

    // Make the request to Supabase
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body || undefined,
    })

    // Create response headers
    const responseHeaders = new Headers()
    
    // Copy response headers from Supabase
    response.headers.forEach((value, key) => {
      // Skip headers that might cause issues
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })

    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value)
    })

    // Stream the response back to the client
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'content-type': 'application/json' } 
      }
    )
  }
})
