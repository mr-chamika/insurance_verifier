import type { ExtractedPage } from '~/types/verification'

export const normaliseText = (text: string) => text
  .normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().toLowerCase()

export function textWindows(pages: ExtractedPage[]) {
  return pages.flatMap(({ page, text }) => normaliseText(text).split(/\n\s*\n|(?<=[.!?;])\s+(?=[a-z])/i)
    .map(value => ({ page, text: value.trim() })).filter(x => x.text.length > 2))
}
