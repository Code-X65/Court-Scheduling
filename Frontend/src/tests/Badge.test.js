import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../components/StatusBadge.jsx'

describe('Badge Component', () => {
  it('renders correctly with different values', () => {
    const { rerender } = render(<Badge value="pending" />)
    expect(screen.getByText('Pending')).toBeDefined()
    
    rerender(<Badge value="scheduled" />)
    expect(screen.getByText('Scheduled')).toBeDefined()
  })

  it('handles unknown values gracefully', () => {
    render(<Badge value="unknown" />)
    expect(screen.getByText('Unknown')).toBeDefined()
  })
})
