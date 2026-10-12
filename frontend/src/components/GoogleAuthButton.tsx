import { useEffect, useRef, type ReactNode } from 'react'

interface GoogleAuthButtonProps {
  mode: 'login' | 'signup'
  role: 'user' | 'admin'
  onSuccess: (credential: string, role: 'user' | 'admin') => void | Promise<void>
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
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
            use_fedcm_for_button?: boolean
          }) => void
          renderButton: (parent: HTMLElement, options: { theme?: string; size?: string; type?: string; text?: string; shape?: string; logo_alignment?: string; width?: number }) => void
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
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

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
  role,
  onSuccess,
  onError,
  onBeforeAuth,
  disabled = false,
  className = '',
}: GoogleAuthButtonProps) {
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const roleRef = useRef(role)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const onBeforeAuthRef = useRef(onBeforeAuth)
  const submittingRef = useRef(false)

  useEffect(() => {
    roleRef.current = role
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
    onBeforeAuthRef.current = onBeforeAuth
  }, [role, onSuccess, onError, onBeforeAuth])

  useEffect(() => {
    if (!CLIENT_ID) {
      onErrorRef.current(
        'Google sign-in is not configured. Please check the frontend Google Client ID environment variable.',
      )
      return
    }

    let cancelled = false
    loadGISScript()
      .then(() => {
        if (cancelled) return
        if (!window.google?.accounts?.id) {
          onErrorRef.current('Google Identity Services failed to initialize')
          return
        }

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response) => {
            if (response.credential && !submittingRef.current) {
              submittingRef.current = true
              try {
                const shouldProceed = await onBeforeAuthRef.current?.()
                if (shouldProceed === false) return
                await onSuccessRef.current(response.credential, roleRef.current)
              } finally {
                submittingRef.current = false
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_button: true,
        })

        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: Math.floor(googleButtonRef.current.getBoundingClientRect().width),
          })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          onErrorRef.current(`Google sign-in could not initialize: ${err.message}`)
        }
      })

    return () => {
      cancelled = true
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect()
      }
    }
  }, [])

  return (
    <div
      ref={googleButtonRef}
      className={`w-full min-h-[48px] ${className} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      aria-label={`Continue with Google as ${role === 'user' ? 'Student' : 'Admin'}`}
      aria-busy={disabled}
    />
  )
}
