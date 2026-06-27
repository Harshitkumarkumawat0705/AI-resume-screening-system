import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Candidate from './pages/Candidate';
import Recruiter from './pages/Recruiter';

function App() {
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check credentials on layout mount
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    setUserToken(token);
    setUserRole(role);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    // Clear all credentials from localStorage
    localStorage.clear();
    
    // Reset state variables to trigger instant view update
    setUserToken(null);
    setUserRole(null);
    
    // Redirect to root
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="app-loader">
        <div className="loader-content">
          <h2>Resume <span>RMS</span></h2>
          <p>Initializing Session...</p>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          .app-loader {
            min-height: 100vh;
            background: #09090b;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
          }
          .loader-content {
            text-align: center;
          }
          .loader-content h2 {
            font-size: 28px;
            margin: 0 0 8px 0;
          }
          .loader-content h2 span {
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .loader-content p {
            color: #71717a;
            font-size: 14px;
            margin: 0;
          }
        `}} />
      </div>
    );
  }

  if (!userToken) {
    return <Login />;
  }

  return (
    <div className="app-container">
      {/* Persistent Outer Header Layout */}
      <header className="app-persistent-header">
        <div className="app-logo">
          Resume <span>RMS</span>
        </div>
        <div className="app-nav-meta">
          <span className={`role-badge ${userRole === 'hr' ? 'hr' : 'candidate'}`}>
            {userRole === 'hr' ? 'Recruiter Mode' : 'Candidate Mode'}
          </span>
          <button onClick={handleLogout} className="header-logout-btn">
            Log Out
          </button>
        </div>
      </header>

      <main className="app-content">
        {userRole === 'hr' ? <Recruiter /> : <Candidate />}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        .app-container {
          min-height: 100vh;
          background: #09090b;
          font-family: 'Outfit', sans-serif;
          color: #ffffff;
          display: flex;
          flex-direction: column;
        }

        .app-persistent-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 40px;
          background: rgba(9, 9, 11, 0.9);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .app-logo {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .app-logo span {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .app-nav-meta {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .role-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 99px;
        }

        .role-badge.candidate {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .role-badge.hr {
          background: rgba(168, 85, 247, 0.1);
          color: #d8b4fe;
          border: 1px solid rgba(168, 85, 247, 0.2);
        }

        .header-logout-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #d4d4d8;
          padding: 6px 14px;
          border-radius: 8px;
          font-family: inherit;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header-logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .app-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        /* Gracefully hide inner duplicate portal headers if rendered in the global app shell */
        .dashboard-header {
          display: none !important;
        }
      `}} />
    </div>
  );
}

export default App;
