import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  // Get user and auth state from context
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Handle user logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Hide navbar if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/dashboard" className="nav-logo">
          <i className="fas fa-brain"></i>
          QuizMaster
        </Link>

        {/* Navigation links */}
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>
            Dashboard
          </Link>

          {/* Player-specific link */}
          {user?.role === 'player' && (
            <Link to="/available-quizzes" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Available Quizzes
            </Link>
          )}

          {/* Instructor-specific links */}
          {user?.role === 'instructor' && (
            <>
              <Link to="/create-quiz" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                Create Quiz
              </Link>
              <Link to="/live-sessions" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                Live Sessions
              </Link>
            </>
          )}

          <button 
            className="nav-link" 
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>

        {/* Hamburger menu for mobile */}
        <div className="hamburger" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;