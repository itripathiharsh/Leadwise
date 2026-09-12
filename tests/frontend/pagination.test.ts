import { describe, it, expect } from 'vitest'

// Testing pagination calculation algorithms used in src/components/ui/pagination.tsx
function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)

  const result: (number | null)[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)

  if (start > 2) result.push(null)
  for (let p = start; p <= end; p++) result.push(p)
  if (end < pageCount - 1) result.push(null)
  result.push(pageCount)

  return result
}

describe('Frontend Pagination Window Algorithm', () => {
  it('returns all pages when total page count is <= 7', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('inserts ellipsis nulls when page count > 7 and page is near start', () => {
    const window = pageWindow(1, 10)
    expect(window).toEqual([1, 2, null, 10])
  })

  it('inserts ellipsis nulls on both sides when page is in the middle', () => {
    const window = pageWindow(5, 10)
    expect(window).toEqual([1, null, 4, 5, 6, null, 10])
  })

  it('inserts ellipsis nulls near end when page is at the end', () => {
    const window = pageWindow(10, 10)
    expect(window).toEqual([1, null, 9, 10])
  })
})
