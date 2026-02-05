import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusPill } from '../StatusPill'

describe('StatusPill', () => {
  it('formats underscore status and applies active styles', () => {
    render(<StatusPill status="IN_PROGRESS" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toHaveClass('bg-blue-100')
  })

  it('falls back to gray styles for unknown status', () => {
    render(<StatusPill status="FOO" />)
    expect(screen.getByText('Foo')).toBeInTheDocument()
    expect(screen.getByText('Foo')).toHaveClass('bg-gray-100')
  })
})
