import React, { useState } from 'react';
import { registerUser, loginUser, extractErrorMessage } from '../api/service';

const Login = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      if (isLoginMode) {
        await loginUser(cleanEmail, password);
        const storedRole = localStorage.getItem('role') || 'candidate';
        // Redirect to recruiter/candidate dashboard based on role
        if (storedRole === 'hr') {
          window.location.href = '/recruiter';
        } else {
          window.location.href = '/candidate';
        }
      } else {
        await registerUser(cleanEmail, password, role);
        // Auto-login after successful registration
        await loginUser(cleanEmail, password);
        const storedRole = localStorage.getItem('role') || 'candidate';
        if (storedRole === 'hr') {
          window.location.href = '/recruiter';
        } else {
          window.location.href = '/candidate';
        }
      }
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Beautiful ambient design elements */}
      <div className="bg-decor-circle circle-1"></div>
      <div className="bg-decor-circle circle-2"></div>

      <div className="login-card">
        <div className="logo-section">
          <h2>Resume <span>RMS</span></h2>
          <p>AI-Powered Resume Matching System</p>
        </div>

        <h3 className="form-title">{isLoginMode ? 'Sign In' : 'Create Account'}</h3>

        {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label>Select Role</label>
              <div className="role-selector">
                <label className={`role-option ${role === 'candidate' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="candidate"
                    checked={role === 'candidate'}
                    onChange={() => setRole('candidate')}
                  />
                  <span>Candidate</span>
                </label>
                <label className={`role-option ${role === 'hr' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="hr"
                    checked={role === 'hr'}
                    onChange={() => setRole('hr')}
                  />
                  <span>HR / Recruiter</span>
                </label>
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Processing...' : isLoginMode ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            {isLoginMode ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              {isLoginMode ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        .login-container {
          position: relative;
          min-height: 100vh;
          width: 100vw;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #09090b;
          font-family: 'Outfit', sans-serif;
          overflow: hidden;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .login-container * {
          box-sizing: border-box;
        }

        .bg-decor-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.12;
          z-index: 1;
        }

        .circle-1 {
          top: 10%;
          left: 15%;
          width: 300px;
          height: 300px;
          background: #6366f1;
        }

        .circle-2 {
          bottom: 15%;
          right: 15%;
          width: 400px;
          height: 400px;
          background: #a855f7;
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          padding: 40px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          backdrop-filter: blur(16px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          animation: cardFloat 6s ease-in-out infinite alternate;
        }

        @keyframes cardFloat {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-8px); }
        }

        .logo-section {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-section h2 {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .logo-section h2 span {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logo-section p {
          color: #a1a1aa;
          font-size: 14px;
          margin: 6px 0 0 0;
          font-weight: 300;
        }

        .form-title {
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 20px;
          text-align: center;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          color: #d4d4d8;
          font-size: 13px;
          font-weight: 500;
        }

        .form-group input[type="email"],
        .form-group input[type="password"] {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.3s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          background: rgba(255, 255, 255, 0.07);
        }

        .role-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 4px;
        }

        .role-option {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .role-option input[type="radio"] {
          display: none;
        }

        .role-option span {
          color: #a1a1aa;
          font-size: 14px;
          font-weight: 500;
        }

        .role-option.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: #6366f1;
        }

        .role-option.active span {
          color: #ffffff;
        }

        .submit-btn {
          margin-top: 10px;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .toggle-mode {
          margin-top: 24px;
          text-align: center;
        }

        .toggle-mode p {
          color: #a1a1aa;
          font-size: 14px;
          margin: 0;
        }

        .toggle-mode button {
          background: none;
          border: none;
          color: #6366f1;
          font-weight: 600;
          cursor: pointer;
          margin-left: 6px;
          padding: 0;
          font-family: inherit;
          transition: color 0.2s ease;
        }

        .toggle-mode button:hover {
          color: #a855f7;
          text-decoration: underline;
        }
      `}} />
    </div>
  );
};

export default Login;
