import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, Lock, Mail, ChevronRight, Activity, Globe, AlertCircle, Phone } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';
import './AuthScreen.css';

export default function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('civilian'); // 'civilian' | 'admin'
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const result = await loginUser(formData.email, formData.password);

        if (!result || result.error) {
          setError(result?.error || 'Login failed. Please check your credentials.');
          setLoading(false);
          return;
        }

        // Enforce role check: if user selected admin but their DB role is civilian, deny
        if (role === 'admin' && result.user.role !== 'admin') {
          setError('Access denied. Only admin accounts can access the admin dashboard.');
          setLoading(false);
          return;
        }

        onLogin({
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          phone: result.user.phone,
        });

      } else {
        // Register – always civilian
        if (role === 'admin') {
          setError('Admin accounts cannot be registered. Contact your administrator.');
          setLoading(false);
          return;
        }

        const result = await registerUser(formData.name, formData.email, formData.password, formData.phone);

        if (!result || result.error) {
          setError(result?.error || 'Registration failed. Please try again.');
          setLoading(false);
          return;
        }

        onLogin({
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          phone: result.user.phone,
        });
      }
    } catch (err) {
      setError('Server unavailable. Please try again later.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      {/* Background Graphic */}
      <div className="auth-bg">
        <div className="auth-orb orb-1" />
        <div className="auth-orb orb-2" />
        <div className="auth-grid" />
      </div>

      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="auth-header">
          <div className="auth-logo-box">
            <Activity size={24} color="#3b6ef8" />
          </div>
          <h1 className="auth-title">SERA</h1>
          <p className="auth-subtitle">Civilian Safety Zone Monitor</p>
        </div>

        <div className="auth-role-selector">
          <button 
            className={`role-btn ${role === 'civilian' ? 'active' : ''}`}
            onClick={() => setRole('civilian')}
            type="button"
          >
            <User size={16} />
            Civilian
          </button>
          <button 
            className={`role-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => { setRole('admin'); setIsLogin(true); }}
            type="button"
          >
            <Shield size={16} />
            Admin
          </button>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="auth-error"
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form className="auth-form" onSubmit={handleSubmit}>
          <AnimatePresence mode="popLayout">
            {!isLogin && role !== 'admin' && (
              <motion.div 
                className="input-group"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <User className="input-icon" size={16} />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required={!isLogin}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="input-group">
            <Mail className="input-icon" size={16} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={16} />
            <input 
              type="password" 
              placeholder="Password" 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          {/* Phone number for civilian registration */}
          <AnimatePresence mode="popLayout">
            {!isLogin && role !== 'admin' && (
              <motion.div 
                className="input-group"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Phone className="input-icon" size={16} />
                <input 
                  type="tel" 
                  placeholder="Phone Number (e.g. +91...)" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            className={`auth-submit-btn ${role}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ChevronRight size={16} />}
          </motion.button>
        </form>

        {/* Toggle login/register – only show for civilians */}
        {role !== 'admin' && (
          <div className="auth-footer">
            <span className="auth-toggle-text">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button 
              className="auth-toggle-btn"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              type="button"
            >
              {isLogin ? 'Register here' : 'Sign in'}
            </button>
          </div>
        )}

        {/* Admin hint */}
        {role === 'admin' && (
          <div className="auth-footer">
            <span className="auth-toggle-text" style={{ fontSize: 10, color: '#94a3b8' }}>
              Admin login only. Contact administrator for credentials.
            </span>
          </div>
        )}
      </motion.div>

      <div className="auth-watermark">
        <Globe size={12} />
        <span>SERA PLATFORM • BREAKING ENIGMA</span>
      </div>
    </div>
  );
}
