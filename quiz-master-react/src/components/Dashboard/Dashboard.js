import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  // Get current user from auth context
  const { user } = useAuth();

  // Dashboard for instructors
  const InstructorDashboard = () => (
    <div className="dashboard-cards">
      <Link to="/create-quiz" className="card">
        <i className="fas fa-plus-circle"></i>
        <h3>Create Quiz</h3>
        <p>Create new quizzes with custom questions</p>
      </Link>

      <Link to="/my-quizzes" className="card">
        <i className="fas fa-list"></i>
        <h3>My Quizzes</h3>
        <p>Manage your created quizzes</p>
      </Link>

      <Link to="/live-sessions" className="card">
        <i className="fas fa-broadcast-tower"></i>
        <h3>Live Sessions</h3>
        <p>Start and manage live quiz sessions</p>
      </Link>
    </div>
  );

  // Dashboard for players
  const PlayerDashboard = () => (
    <div className="dashboard-cards">
      <Link to="/available-quizzes" className="card">
        <i className="fas fa-play-circle"></i>
        <h3>Take Quiz</h3>
        <p>Browse and take available quizzes</p>
      </Link>

      <Link to="/live-sessions" className="card">
        <i className="fas fa-users"></i>
        <h3>Join Live Session</h3>
        <p>Join live quiz sessions</p>
      </Link>
    </div>
  );

  return (
    <section className="section">
      <div className="container">
        <div className="dashboard">
          <h1>Welcome to QuizMaster</h1>

          {/* Show user info */}
          <div className="user-info">
            <p>Welcome, <span>{user?.username}</span>!</p>
            <p>Role: <span>{user?.role}</span></p>
          </div>

          {/* Show dashboard based on user role */}
          {user?.role === 'instructor' ? <InstructorDashboard /> : <PlayerDashboard />}
        </div>
      </div>
    </section>
  );
};

export default Dashboard;