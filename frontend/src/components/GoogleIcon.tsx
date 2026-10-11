interface GoogleIconProps {
  size?: number
  className?: string
}

export default function GoogleIcon({ size = 20, className = '' }: GoogleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l-.003.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M24 44c6.48 0 11.93-2.132 15.89-5.78l-6.19-5.238C29.211 35.091 26.715 36 24 36c-4.42 0-8.166-2.948-9.516-6.984l-6.457 5.025C11.505 39.556 17.294 44 24 44z"
      />
      <path
        fill="#4CAF50"
        d="M14.484 26.984c-.29-.872-.457-1.796-.457-2.752s.167-1.88.457-2.752l-6.457-5.025C6.495 18.444 4 22.536 4 24s2.495 5.556 6.027 7.793l6.457-5.025z"
      />
      <path
        fill="#1976D2"
        d="M24 12c3.05 0 5.79 1.056 7.914 2.786l5.95-5.95C35.93 6.132 30.48 4 24 4 17.294 4 11.505 8.444 7.573 14.207l6.457 5.025C15.834 14.948 19.58 12 24 12z"
      />
    </svg>
  )
}