import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User,
} from 'firebase/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signupSchema } from '../domain/validation'
import { auth, friendly } from '../services/firebase'
import { Brand, Button, ErrorText, Field } from '../components/ui'

const emailSchema = z.object({ email: z.email('Enter a valid email address') })
const loginSchema = emailSchema.extend({ password: z.string().min(1, 'Enter your password') })
type Values = {
  email: string
  password?: string
  confirm?: string
  firstName?: string
  lastName?: string
}
const headings = {
  register: ['Create your account', 'Make space for the work that matters.'],
  login: ['Welcome back', 'Pick up where you left off.'],
  reset: ['Reset your password', 'We’ll send a reset link to your email address.'],
}
export function AuthPage({ mode, user }: { mode: keyof typeof headings; user: User | null }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [googleBusy, setGoogleBusy] = useState(false)
  const [title, subtitle] = headings[mode]
  const form = useForm<Values>({
    resolver: zodResolver(
      mode === 'register' ? signupSchema : mode === 'login' ? loginSchema : emailSchema,
    ),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', confirm: '' },
  })
  if (user && !form.formState.isSubmitting) return <Navigate to="/app" replace />
  async function submit(values: Values) {
    if (!auth) return
    setError('')
    setNotice('')
    try {
      if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, values.email, values.password!)
        await updateProfile(result.user, { displayName: values.firstName + ' ' + values.lastName })
        void sendEmailVerification(result.user).catch(() => {})
        navigate('/app')
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, values.email, values.password!)
        navigate('/app')
      } else {
        try {
          await sendPasswordResetEmail(auth, values.email)
        } catch (e) {
          if (!(e instanceof Error && 'code' in e && e.code === 'auth/user-not-found')) throw e
        }
        setNotice('If an account exists for this email, a reset link is on its way.')
      }
    } catch (e) {
      setError(friendly(e))
    }
  }
  async function google() {
    if (!auth) return
    setError('')
    setGoogleBusy(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      navigate('/app')
    } catch (e) {
      setError(friendly(e))
    } finally {
      setGoogleBusy(false)
    }
  }
  const field = (key: keyof Values, label: string, type = 'text', autoComplete?: string) => (
    <div>
      <Field label={label}>
        <input type={type} autoComplete={autoComplete} {...form.register(key)} />
      </Field>
      <ErrorText message={form.formState.errors[key]?.message ?? ''} />
    </div>
  )
  return (
    <div className="auth-layout">
      <div className="auth-main">
        <Brand />
        <Link className="back-link" to={mode === 'reset' ? '/login' : '/'}>
          <ArrowLeft size={16} /> {mode === 'reset' ? 'Back to sign in' : 'Back to CampusFlow'}
        </Link>
        <div className="auth-content">
          <div className="eyebrow">YOUR STUDY WORKSPACE</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {!auth ? (
            <div className="auth-unavailable">
              <ErrorText message="Account sign-in needs a Firebase project or the local emulators. The interactive demo is ready to use." />
              <Link to="/demo" className="button primary">
                Try interactive demo
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              {mode !== 'reset' && (
                <>
                  <Button
                    className="google-button"
                    variant="outline"
                    type="button"
                    onClick={google}
                    disabled={googleBusy}
                  >
                    <b aria-hidden>G</b>
                    {googleBusy ? 'Connecting…' : 'Continue with Google'}
                  </Button>
                  <div className="form-divider">
                    <span>or use email</span>
                  </div>
                </>
              )}
              <form noValidate onSubmit={form.handleSubmit(submit)}>
                {mode === 'register' && (
                  <div className="field-grid">
                    {field('firstName', 'First name', 'text', 'given-name')}
                    {field('lastName', 'Last name', 'text', 'family-name')}
                  </div>
                )}
                {field('email', 'Email address', 'email', 'email')}
                {mode !== 'reset' &&
                  field(
                    'password',
                    'Password',
                    'password',
                    mode === 'register' ? 'new-password' : 'current-password',
                  )}
                {mode === 'register' && field('confirm', 'Confirm password', 'password', 'new-password')}
                {mode === 'login' && (
                  <Link className="auth-forgot" to="/reset">
                    Forgot password?
                  </Link>
                )}
                <ErrorText message={error} />
                {notice && (
                  <p className="success" role="status">
                    <CheckCircle2 size={17} />
                    {notice}
                  </p>
                )}
                <Button className="wide-button" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? 'Working…'
                    : mode === 'login'
                      ? 'Sign in'
                      : mode === 'register'
                        ? 'Create account'
                        : 'Send reset link'}
                  <ArrowRight size={16} />
                </Button>
              </form>
            </>
          )}
          {mode !== 'reset' && (
            <p className="auth-switch">
              {mode === 'register' ? 'Already have an account?' : 'New to CampusFlow?'}{' '}
              <Link to={mode === 'register' ? '/login' : '/register'}>
                {mode === 'register' ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          )}
        </div>
      </div>
      <aside className="auth-art">
        <span className="art-orbit orbit-a" />
        <span className="art-orbit orbit-b" />
        <GraduationCap size={78} strokeWidth={1.1} />
        <div className="eyebrow">CAMPUSFLOW</div>
        <h2>
          Less Stress.
          <br />
          More Progress.
        </h2>
        <p>Your academic life, organized.</p>
      </aside>
    </div>
  )
}
