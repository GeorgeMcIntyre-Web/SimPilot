import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Tag } from '../Tag'

describe('Tag', () => {
  it('renders label', () => {
    render(<Tag label="Hello" />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('applies color classes', () => {
    render(<Tag label="Blue" color="blue" />)
    expect(screen.getByText('Blue')).toHaveClass('bg-blue-100')
  })
})
