import { useEffect, useRef, useState, type ReactNode } from 'react'
import GoogleIcon from './GoogleIcon'

interface GoogleAuthButtonProps {
  mode: 'login' | 'signup'
  role: 'user' | 'admin'
  onSuccess: (credential: string, role: 'user' | 'admin') => void
  onError: (message: string) => void
  onBeforeAuth?: () => boolean | Promise<boolean>
  children?: ReactNode
  disabled?: boolean
  className?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean }) => void
          prompt: (notificationCallback?: (notification: {
            isNotDisplayed: () => boolean
            isSkippedMoment: () => boolean
            getNotDisplayedReason: () => string
            getSkippedReason: () => string
          }) => void) => void
          renderButton: (parent: HTMLElement, options: { theme?: string; size?: string; type?: string; text?: string; shape?: string; logo_alignment?: string; width?: string }) => void
          disableAutoSelect: () => void
        }
        oauth2: {
          initTokenClient: (config: { client_id: string; scope: string; callback: (response: { access_token: string }) => void }) => { requestAccessToken: (options?: { prompt?: string }) => void }
        }
      }
    }
  }
}

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = import.meta.env.GOOGLE_CLIENT_ID as string | undefined

let gisScriptLoaded = false
let gisScriptPromise: Promise<void> | null = null

function loadGISScript(): Promise<void> {
  if (gisScriptLoaded) return Promise.resolve()
  if (gisScriptPromise) return gisScriptPromise

  gisScriptPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('GIS not available in SSR'))
      return
    }
    if (window.google?.accounts?.id) {
      gisScriptLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => {
      gisScriptLoaded = true
      resolve()
    }
    script.onerror = () => {
      gisScriptPromise = null
      reject(new Error('Failed to load Google Identity Services'))
    }
    document.head.appendChild(script)
  })

  return gisScriptPromise
}

export default function GoogleAuthButton({
  mode,
  role,
  onSuccess,
  onError,
  onBeforeAuth,
  children,
  disabled = false,
  className = '',
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(() =>
    !CLIENT_ID ? 'Google Client ID not configured' : null,
  )
  const buttonRef = useRef<HTMLButtonElement>(null)
  const roleRef = useRef(role)
  const modeRef = useRef(mode)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    roleRef.current = role
    modeRef.current = mode
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  }, [role, mode, onSuccess, onError])

  useEffect(() => {
    if (!CLIENT_ID) return

    let cancelled = false
    loadGISScript()
      .then(() => {
        if (cancelled) return
        if (!window.google?.accounts?.id) {
          setScriptError('Google Identity Services failed to initialize')
          return
        }

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              setLoading(false)
              onSuccessRef.current(response.credential, roleRef.current)
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })
      })
      .catch((err) => {
        if (!cancelled) {
          setScriptError(err.message)
        }
      })

    return () => {
      cancelled = true
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect()
      }
    }
  }, [])

  const handleClick = async () => {
    if (loading || disabled || scriptError || !CLIENT_ID) return

    if (onBeforeAuth) {
      const canProceed = await onBeforeAuth()
      if (!canProceed) return
    }

    if (!window.google?.accounts?.id) {
      try {
        await loadGISScript()
      } catch {
        onErrorRef.current('Google sign-in is temporarily unavailable. Please try again later.')
        return
      }
    }

    if (!window.google?.accounts?.id) {
      onErrorRef.current('Google sign-in is temporarily unavailable. Please try again later.')
      return
    }

    setLoading(true)

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason()
        setLoading(false)
        // Surface the real GIS reason (e.g. origin_not_allowed, invalid_client)
        // in the browser console and the error banner so the failure is diagnosable.
        console.warn('[Google Sign-In] Prompt not displayed. Reason:', reason)
        if (reason === 'browser_not_supported') {
          onErrorRef.current('Google sign-in is not supported in this browser.')
        } else {
          onErrorRef.current(
            `Google sign-in could not be started (${reason}). Check that the Google Client ID is valid and this site's origin is authorized in Google Cloud Console.`,
          )
        }
        return
      }

      if (notification.isSkippedMoment()) {
        const reason = notification.getSkippedReason()
        setLoading(false)
        if (reason === 'user_cancelled' || reason === 'tap_outside') {
          // The user deliberately dismissed the prompt. This is expected
          // behavior, not an error, so no error banner is shown.
          console.info('[Google Sign-In] Dismissed by user. Reason:', reason)
          return
        }
        console.warn('[Google Sign-In] Prompt skipped. Reason:', reason)
        onErrorRef.current(
          reason === 'auto_cancel'
            ? 'Google sign-in was interrupted before completing. Please try again.'
            : `Google sign-in was not completed (${reason}). Please try again.`,
        )
      }
    })
  }

  const isDisabled = disabled || loading || !!scriptError || !CLIENT_ID

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`btn-secondary w-full py-3.5 text-sm font-bold transition-all ${className} ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      aria-label={`Continue with Google as ${role === 'user' ? 'Student' : 'Admin'}`}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <span className="animate-spin inline-block h-5 w-5 border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />
          <span>Authenticating...</span>
        </>
      ) : (
        <>
          <GoogleIcon size={20} className="shrink-0" />
          <span>{children || 'Continue with Google'}</span>
        </>
      )}
    </button>
  )
}