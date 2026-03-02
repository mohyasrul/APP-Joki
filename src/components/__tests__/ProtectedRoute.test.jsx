import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from '../../components/ProtectedRoute'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  Navigate: ({ to, replace }) => {
    mockNavigate(to, replace)
    return <div data-testid="navigate" data-to={to} />
  },
}))

// Mock AuthContext
const mockAuthValue = { user: null, profile: null, loading: false, isAdmin: false }
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockAuthValue.user = null
    mockAuthValue.profile = null
    mockAuthValue.loading = false
    mockAuthValue.isAdmin = false
  })

  it('shows loader when loading', () => {
    mockAuthValue.loading = true
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    // Should not show content while loading
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to /login when user is not authenticated', () => {
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    const nav = screen.getByTestId('navigate')
    expect(nav).toHaveAttribute('data-to', '/login')
  })

  it('renders children when user is authenticated (client)', () => {
    mockAuthValue.user = { id: '123' }
    mockAuthValue.profile = { role: 'client' }
    mockAuthValue.isAdmin = false

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects client to /katalog when adminOnly is true', () => {
    mockAuthValue.user = { id: '123' }
    mockAuthValue.profile = { role: 'client' }
    mockAuthValue.isAdmin = false

    render(
      <ProtectedRoute adminOnly>
        <div>Admin Content</div>
      </ProtectedRoute>
    )

    const nav = screen.getByTestId('navigate')
    expect(nav).toHaveAttribute('data-to', '/katalog')
  })

  it('redirects admin to /admin when visiting client route', () => {
    mockAuthValue.user = { id: '456' }
    mockAuthValue.profile = { role: 'admin' }
    mockAuthValue.isAdmin = true

    render(
      <ProtectedRoute>
        <div>Client Content</div>
      </ProtectedRoute>
    )

    const nav = screen.getByTestId('navigate')
    expect(nav).toHaveAttribute('data-to', '/admin')
  })

  it('renders children for admin on adminOnly route', () => {
    mockAuthValue.user = { id: '456' }
    mockAuthValue.profile = { role: 'admin' }
    mockAuthValue.isAdmin = true

    render(
      <ProtectedRoute adminOnly>
        <div>Admin Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })
})
