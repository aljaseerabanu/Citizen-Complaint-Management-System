import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: searchParams.get('role') || 'citizen'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const credentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
        // Don't send role - backend will verify
      };

      const response = await authAPI.login(credentials);
      
      if (response.data.success) {
        const userData = response.data.user;
        
        // Check if user's actual role matches selected tab role
        if (formData.role !== 'citizen' && userData.role !== formData.role) {
          setApiError(`This account is registered as ${userData.role}, not ${formData.role}`);
          setLoading(false);
          return;
        }
        
        // Store token and user data
        login(response.data.token, userData);
        
        // Redirect based on actual user role
        switch (userData.role) {
          case 'citizen':
            navigate('/citizen/dashboard');
            break;
          case 'staff':
            navigate('/staff/dashboard');
            break;
          case 'admin':
            navigate('/admin/dashboard');
            break;
          default:
            navigate('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setApiError(
        error.response?.data?.message || 
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = () => {
    switch (formData.role) {
      case 'citizen':
        return '👤';
      case 'staff':
        return '👨‍💼';
      case 'admin':
        return '👨‍💻';
      default:
        return '🔐';
    }
  };

  const getRoleColor = () => {
    switch (formData.role) {
      case 'citizen':
        return 'role-citizen';
      case 'staff':
        return 'role-staff';
      case 'admin':
        return 'role-admin';
      default:
        return '';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container fade-in">
        <div className="auth-card">
          <div className={`auth-header ${getRoleColor()}`}>
            <div className="auth-icon">{getRoleIcon()}</div>
            <h2>Welcome Back</h2>
            <p>Login to your {formData.role} account</p>
          </div>

          {/* Role Selector Tabs */}
          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab ${formData.role === 'citizen' ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, role: 'citizen' }))}
            >
              <span>👤</span> Citizen
            </button>
            <button
              type="button"
              className={`role-tab ${formData.role === 'staff' ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, role: 'staff' }))}
            >
              <span>👨‍💼</span> Staff
            </button>
            <button
              type="button"
              className={`role-tab ${formData.role === 'admin' ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
            >
              <span>👨‍💻</span> Admin
            </button>
          </div>

          {apiError && (
            <div className="alert alert-error">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="your.email@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <span className="form-error">{errors.email}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {errors.password && (
                <span className="form-error">{errors.password}</span>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <div className="flex-center">
                  <div className="loading-spinner"></div>
                  <span style={{ marginLeft: '10px' }}>Logging in...</span>
                </div>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Register here
              </Link>
            </p>
          </div>

          {/* Demo Credentials Info */}
          <div className="demo-credentials">
            <h4>🔍 Demo Credentials</h4>
            <div className="demo-list">
              <div className="demo-item">
                <strong>Citizen:</strong>
                <span>citizen@demo.com / password123</span>
              </div>
              <div className="demo-item">
                <strong>Staff:</strong>
                <span>staff@demo.com / password123</span>
              </div>
              <div className="demo-item">
                <strong>Admin:</strong>
                <span>admin@demo.com / password123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="auth-info-panel">
          <h3>Secure Login</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <div>
                <h4>Encrypted Connection</h4>
                <p>Your data is transmitted securely using SSL encryption</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">🛡️</span>
              <div>
                <h4>Role-Based Access</h4>
                <p>Access only the features relevant to your role</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">⚡</span>
              <div>
                <h4>Fast & Efficient</h4>
                <p>Optimized performance for quick access</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">📱</span>
              <div>
                <h4>Mobile Friendly</h4>
                <p>Access from any device, anywhere</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;