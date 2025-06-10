import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const InstructorResults = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  // State for leaderboard and loading
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch leaderboard on mount or when sessionId changes
  useEffect(() => {
    fetchLeaderboard();
  }, [sessionId]);

  // Fetch leaderboard data from API
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/live-sessions/${sessionId}/results`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      // Optionally show error to user
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while fetching results
  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading results...</p>
          </div>
        </div>
      </section>
    );
  }

  // Show leaderboard and session info
  return (
    <section className="section">
      <div className="container">
        <div className="results-header">
          <h2>📊 Session Complete</h2>
          <div className="session-info">
            <p><strong>Session ID:</strong> {sessionId}</p>
          </div>
        </div>

        <div className="instructor-leaderboard-container">
          <h3>Final Leaderboard</h3>
          {leaderboard.length === 0 ? (
            <p>No participants found</p>
          ) : (
            leaderboard.map(participant => {
              let rankClass = '';
              if (participant.rank === 1) rankClass = 'first-place';
              else if (participant.rank === 2) rankClass = 'second-place';
              else if (participant.rank === 3) rankClass = 'third-place';

              return (
                <div key={participant.username} className="leaderboard-item">
                  <div className={`rank ${rankClass}`}>{participant.rank}</div>
                  <div className="participant-info">
                    <span className="username">{participant.username}</span>
                    <span className="score">
                      {participant.score}/{participant.totalQuestions} ({participant.percentage}%)
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="results-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            <i className="fas fa-home"></i>
            Back to Dashboard
          </button>
        </div>
      </div>
    </section>
  );
};

export default InstructorResults;