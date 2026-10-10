import { reorderContent } from '@/lib/content-order'

export async function PUT(request: Request) {
  return reorderContent(request, 'jobs')
}
