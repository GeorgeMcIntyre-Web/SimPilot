import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SourcingBadge } from '../SourcingBadge'

describe('SourcingBadge', () => {
  it('renders Unknown when sourcing missing', () => {
    render(<SourcingBadge />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('renders Reuse label', () => {
    render(<SourcingBadge sourcing="REUSE" />)
    expect(screen.getByText('Growing (Reuse)')).toBeInTheDocument()
  })

  it('renders New Buy label', () => {
    render(<SourcingBadge sourcing="NEW_BUY" />)
    expect(screen.getByText('New (Buy)')).toBeInTheDocument()
  })
})
