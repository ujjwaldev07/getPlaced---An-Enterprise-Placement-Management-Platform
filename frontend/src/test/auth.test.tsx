import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { AuthProvider } from '../context/AuthContext'
import { useAuth } from '../context/AuthContextValue'
import { api, saveSession } from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
  saveSession: vi.fn(),
  clearSession: vi.fn(),
  getToken: vi.fn(() => null),
}))

function EmailLoginConsumer() {
  const { login, user } = useAuth()
  return (
    <div>
      <button
        type="button"
        onClick={() => void login('test@example.com', 'password123')}
      >
        login-with-email
      </button>
      <span data-testid="current-user">{user ? user.email : 'anonymous'}</span>
    </div>
  )
}

describe('AuthContext.login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.post).mockResolvedValue({
      data: {
        token: 'jwt-token',
        user: {
          id: 'u1',
          name: 'Local User',
          email: 'local@example.com',
          role: 'user',
        },
      },
    } as AxiosResponse)
  })

  it('saves the token and sets the authenticated user in context', async () => {
    render(
      <AuthProvider>
        <EmailLoginConsumer />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'login-with-email' }))

    await waitFor(() => {
      expect(screen.getByTestId('current-user').textContent).toBe('local@example.com')
    })

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    })
    expect(saveSession).toHaveBeenCalledWith('jwt-token')
  })
})
