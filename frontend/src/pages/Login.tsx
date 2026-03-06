import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

const LOGO_URL = '/Logo.png'
const BRAND_NAME = 'Silverline'

export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [autoLogin, setAutoLogin] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await api.post('/auth/login', { email, password })
            if (response.data.success) {
                login(response.data.data.token)
                navigate('/dashboard')
            } else {
                setError(response.data.message || 'Failed to login')
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to login')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page-split">
            {/* Left: Form */}
            <div className="login-split-form-wrap">
                <div className="login-card-split login-card-enter">
                    <div className="login-logo-split">
                        <img src={LOGO_URL} alt={BRAND_NAME} className="login-logo-img" />
                    </div>
                    <h1 className="login-title-split">Welcome Back</h1>
                    <p className="login-subtitle-split">
                        Sign in to your {BRAND_NAME} account
                    </p>

                    {error && (
                        <div className="login-error" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form-split">
                        <div className="form-group">
                            <label className="form-label" htmlFor="email">Email Address</label>
                            <div className="input-with-icon">
                                <Mail className="input-icon-left" size={18} />
                                <input
                                    id="email"
                                    className="form-input form-input-with-icon"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <div className="input-with-icon">
                                <Lock className="input-icon-left" size={18} />
                                <input
                                    id="password"
                                    className="form-input form-input-with-icon"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="input-icon-right"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="login-btn-wrap">
                            <button
                                type="submit"
                                className="btn btn-primary login-btn-split"
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </div>

                        <label className="login-auto-login">
                            <input
                                type="checkbox"
                                checked={autoLogin}
                                onChange={(e) => setAutoLogin(e.target.checked)}
                            />
                            <span>Auto Login</span>
                        </label>
                    </form>

                    <p className="login-signup-text">
                        Don't have an account? <Link to="/signup" className="login-signup-link">Sign Up</Link>
                    </p>
                </div>
            </div>

            {/* Right: Branding */}
            <div className="login-split-branding">
                <div className="login-branding-shine" aria-hidden />
                <div className="login-branding-badge">
                    <img src={LOGO_URL} alt="" className="login-branding-logo" />
                </div>
                <h2 className="login-branding-title">{BRAND_NAME}</h2>
                <p className="login-branding-tagline">
                    Streamline your projects with our all-in-one platform
                </p>
                <p className="login-branding-desc">
                    Manage projects, vendors, materials, and teams from one powerful place. Built for professionals who move fast.
                </p>
            </div>
        </div>
    )
}
