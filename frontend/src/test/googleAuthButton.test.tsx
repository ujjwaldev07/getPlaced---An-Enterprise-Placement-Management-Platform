import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// The component captures the client ID at module load, so the environment
// must be stubbed before the dynamic import below.
vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-google-client-id')

const { default: GoogleAuthButton } = await import('../components/GoogleAuthButton')

const initializeMock = vi.fn()
const promptMock = vi.fn()
const disableAutoSelectMock = vi.fn()

type GisNotification = {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
  getNotDisplayedReason: () => string
  getSkippedReason: () => string
}

beforeEach(() => {
  initializeMock.mockClear()
  promptMock.mockClear()
  disableAutoSelectMock.mockClear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  ;(window as unknown as { google: unknown }).google = {
    accounts: {
      id: {
        initialize: initializeMock,
        prompt: promptMock,
        disableAutoSelect: disableAutoSelectMock,
      },
    },
  }
})

function renderButton(props?: {
  onSuccess?: (credential: string, role: 'user' | 'admin') => void
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

async function clickAndGetPromptCallback() {
  await waitFor(() => {
    expect(initializeMock).toHaveBeenCalled()
  })
  await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
  await waitFor(() => {
    expect(promptMock).toHaveBeenCalled()
  })
  return promptMock.mock.calls[0][0] as (notification: GisNotification) => void
}

describe('GoogleAuthButton', () => {
  it('initializes Google Identity Services with the configured client ID', async () => {
    renderButton()

    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: 'test-google-client-id' }),
      )
    })
  })

  it('starts the Google prompt when clicked', async () => {
    const onBeforeAuth = vi.fn(() => true)
    render(
      <GoogleAuthButton
        mode="login"
        role="user"
        onSuccess={vi.fn()}
        onError={vi.fn()}
        onBeforeAuth={onBeforeAuth}
      />,
    )

    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalled()
    })

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => {
      expect(promptMock).toHaveBeenCalled()
    })
    expect(onBeforeAuth).toHaveBeenCalled()
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
    initConfig.callback({ credential: 'google-id-token' })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('google-id-token', 'admin')
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('surfaces the GIS reason when the prompt cannot be displayed', async () => {
    const onError = vi.fn()
    renderButton({ onError })

    const notify = await clickAndGetPromptCallback()
    notify({
      isNotDisplayed: () => true,
      isSkippedMoment: () => false,
      getNotDisplayedReason: () => 'origin_not_allowed',
      getSkippedReason: () => '',
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('origin_not_allowed'),
      )
    })
  })

  it('does not show an error when the user deliberately dismisses the prompt', async () => {
    const onError = vi.fn()
    renderButton({ onError })

    const notify = await clickAndGetPromptCallback()
    notify({
      isNotDisplayed: () => false,
      isSkippedMoment: () => true,
      getNotDisplayedReason: () => '',
      getSkippedReason: () => 'tap_outside',
    })

    expect(onError).not.toHaveBeenCalled()
  })

  it('reports an interrupted (auto-cancelled) sign-in as an error', async () => {
    const onError = vi.fn()
    renderButton({ onError })

    const notify = await clickAndGetPromptCallback()
    notify({
      isNotDisplayed: () => false,
      isSkippedMoment: () => true,
      getNotDisplayedReason: () => '',
      getSkippedReason: () => 'auto_cancel',
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('interrupted'),
      )
    })
  })
})
