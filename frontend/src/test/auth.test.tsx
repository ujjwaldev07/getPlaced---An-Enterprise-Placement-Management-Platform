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

function GoogleLoginConsumer() {
  const { googleLogin, user } = useAuth()
  return (
    <div>
      <button
        type="button"
        onClick={() => void googleLogin({ credential: 'id-token', role: 'user' })}
      >
        sign-in-with-google
      </button>
      <span data-testid="current-user">{user ? user.email : 'anonymous'}</span>
    </div>
  )
}

describe('AuthContext.googleLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.post).mockResolvedValue({
      data: {
        token: 'jwt-token',
        user: {
          id: 'u1',
          name: 'Google User',
          email: 'google@example.com',
          role: 'user',
        },
      },
    } as AxiosResponse)
  })

  it('saves the token and sets the authenticated user in context', async () => {
    render(
      <AuthProvider>
        <GoogleLoginConsumer />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'sign-in-with-google' }))

    await waitFor(() => {
      expect(screen.getByTestId('current-user').textContent).toBe('google@example.com')
    })

    expect(api.post).toHaveBeenCalledWith('/auth/google', {
      credential: 'id-token',
      role: 'user',
    })
    expect(saveSession).toHaveBeenCalledWith('jwt-token')
  })
})
