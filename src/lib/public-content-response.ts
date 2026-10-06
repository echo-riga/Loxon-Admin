import { NextResponse } from 'next/server'

// Only successful, public content GETs use this response. Private data and writes do not.
export function publicContentResponse(request: Request, data: unknown) {
  const fresh = new URL(request.url).searchParams.get('fresh') === '1'
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': fresh ? 'private, no-store' : 'public, max-age=0, must-revalidate',
      'CDN-Cache-Control': fresh ? 'no-store' : 'public, s-maxage=60, must-revalidate',
      'Vercel-CDN-Cache-Control': fresh ? 'no-store' : 'public, s-maxage=60, must-revalidate',
      // Cache CORS responses separately for each calling origin, including requests without Origin.
      Vary: 'Origin',
    },
  })
}
