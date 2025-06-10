import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Get score, totalQuestions, and percentage from navigation state
  const { score, totalQuestions, percentage } = location.state || { score: 0, totalQuestions: 0, percentage: 0 };

  return (
    <section className="section">
      <div className="container">
        <div className="results-container">
          <h2>
            <i className="fas fa-trophy"></i>
            Quiz Results
          </h2>

          <div className="score-display">
            <div className="score-circle">
              <span>{score}</span>
              <span className="score-total">/ {totalQuestions}</span>
            </div>
            <p className="score-percentage">{percentage}%</p>
          </div>

          <div className="results-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/available-quizzes')}
            >
              <i className="fas fa-redo"></i>
              Take Another Quiz
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              <i className="fas fa-home"></i>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Results;