'use client'

import { TwentyFirstToolbar } from '@21st-extension/toolbar-next'

export default function DevToolbarClient() {
  if (process.env.NODE_ENV !== 'development') return null
  return <TwentyFirstToolbar config={{ plugins: [] }} />
}
