import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CanonicalIdDisplay } from '../CanonicalIdDisplay'

describe('CanonicalIdDisplay', () => {
  it('renders PlantKey-UIDShort-CanonicalKey', () => {
    render(
      <CanonicalIdDisplay
        plantKey="PLANT_A"
        uid="st_12345678-1234-1234-1234-abcdef012345"
        entityKey="AL010"
      />,
    )

    expect(screen.getByText('PLANT_A-ef012345-AL010')).toBeInTheDocument()
  })

  it('copies canonical ID to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(
      <CanonicalIdDisplay
        plantKey="PLANT_A"
        uid="st_12345678-1234-1234-1234-abcdef012345"
        entityKey="AL010"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /copy canonical id/i }))

    expect(writeText).toHaveBeenCalledWith('PLANT_A-ef012345-AL010')
  })
})
