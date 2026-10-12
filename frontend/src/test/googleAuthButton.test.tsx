import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
// Registers the jest-dom matcher types used below; the runtime matchers are
// already installed by src/test/setup.ts.
import '@testing-library/jest-dom/vitest'

// The component captures the client ID at module load, so the environment
// must be stubbed before the dynamic import below.
vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-google-client-id')

const { default: GoogleAuthButton } = await import('../components/GoogleAuthButton')

const initializeMock = vi.fn()
const renderGoogleButtonMock = vi.fn()
const disableAutoSelectMock = vi.fn()

beforeEach(() => {
  initializeMock.mockClear()
  renderGoogleButtonMock.mockClear()
  disableAutoSelectMock.mockClear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  ;(window as unknown as { google: unknown }).google = {
    accounts: {
      id: {
        initialize: initializeMock,
        renderButton: renderGoogleButtonMock,
        disableAutoSelect: disableAutoSelectMock,
      },
    },
  }
})

function renderButton(props?: {
  onSuccess?: (credential: string, role: 'user' | 'admin') => void | Promise<void>
  onError?: (message: string) => void
}) {
  const utils = render(
    <GoogleAuthButton
      mode="login"
      role="user"
      onSuccess={props?.onSuccess ?? vi.fn()}
      onError={props?.onError ?? vi.fn()}
    />,
  )
  return utils
}

describe('GoogleAuthButton', () => {
  it('initializes the supported FedCM button flow with the configured client ID', async () => {
    renderButton()

    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'test-google-client-id',
          use_fedcm_for_button: true,
          auto_select: false,
        }),
      )
      expect(renderGoogleButtonMock).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expect.objectContaining({ text: 'continue_with' }),
      )
    })
  })

  it('delivers the Google credential to onSuccess with the selected role', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    render(
      <GoogleAuthButton
        mode="login"
        role="admin"
        onSuccess={onSuccess}
        onError={onError}
      />,
    )

    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalled()
    })

    const initConfig = initializeMock.mock.calls[0][0] as {
      callback: (response: { credential: string }) => void
    }
    await initConfig.callback({ credential: 'google-id-token' })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('google-id-token', 'admin')
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('validates sign-up details before passing the credential to the API', async () => {
    const onBeforeAuth = vi.fn(() => false)
    const onSuccess = vi.fn()
    render(
      <GoogleAuthButton
        mode="signup"
        role="user"
        onSuccess={onSuccess}
        onError={vi.fn()}
        onBeforeAuth={onBeforeAuth}
      />,
    )

    await waitFor(() => expect(initializeMock).toHaveBeenCalled())
    const initConfig = initializeMock.mock.calls[0][0] as {
      callback: (response: { credential: string }) => Promise<void>
    }
    await initConfig.callback({ credential: 'google-id-token' })

    expect(onBeforeAuth).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('submits a GIS credential only once while the API request is in flight', async () => {
    let finishSubmission: () => void = () => {}
    const onSuccess = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSubmission = resolve
        }),
    )
    renderButton({ onSuccess })

    await waitFor(() => expect(initializeMock).toHaveBeenCalled())
    const initConfig = initializeMock.mock.calls[0][0] as {
      callback: (response: { credential: string }) => Promise<void>
    }
    const first = initConfig.callback({ credential: 'google-id-token' })
    const second = initConfig.callback({ credential: 'google-id-token' })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    finishSubmission()
    await Promise.all([first, second])
  })
})
