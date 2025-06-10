import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { liveSessionAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../hooks/hooks';

const SessionResults = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { loading, withLoading } = useLoading();

  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('answers');

  // Load session results when sessionId changes
  useEffect(() => {
    loadResults();
  }, [sessionId]);

  // Fetch session results from API
  const loadResults = async () => {
    try {
      await withLoading(async () => {
        const response = await liveSessionAPI.getResults(sessionId);
        setResults(response.data);
      });
    } catch (error) {
      addToast('Failed to load session results', 'error');
      navigate('/dashboard');
    }
  };

  // Show loading spinner while fetching data
  if (loading || !results) {
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

  const { session, leaderboard, userResults } = results;

  return (
    <section className="section">
      <div className="container">
        {/* Session header info */}
        <div className="results-header">
          <h2>🎉 Session Results</h2>
          <div className="session-info">
            <p><strong>Session ID:</strong> {session.sessionId}</p>
            <p><strong>Quiz:</strong> {session.quizTitle}</p>
          </div>
        </div>

        {/* User performance summary */}
        {userResults && (
          <div className="user-performance">
            <h3>Your Performance</h3>
            <div className="score-display">
              <div className="score-item">
                <span className="score-value">{userResults.score}</span>
                <span className="score-label">Correct</span>
              </div>
              <div className="score-item">
                <span className="score-value">{userResults.totalQuestions}</span>
                <span className="score-label">Total</span>
              </div>
              <div className="score-item">
                <span className="score-value">{userResults.percentage}%</span>
                <span className="score-label">Score</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs to switch between answers and leaderboard */}
        <div className="results-tabs">
          <button 
            className={`tab-button ${activeTab === 'answers' ? 'active' : ''}`}
            onClick={() => setActiveTab('answers')}
          >
            Your Answers
          </button>
          <button 
            className={`tab-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
        </div>

        {/* Detailed review of user's answers */}
        <div className={`tab-content ${activeTab === 'answers' ? 'active' : ''}`}>
          <h3>Detailed Review</h3>
          {userResults?.answers?.map((answer, index) => (
            <div 
              key={index} 
              className={`answer-review ${answer.isCorrect ? 'correct' : 'incorrect'}`}
            >
              <div className="question-review-header">
                <h4>Question {answer.questionIndex + 1}</h4>
                <span className={`result-badge ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                  {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>
              <p className="question-text">{answer.questionText}</p>
              <div className="options-review">
                {answer.options.map((option, optionIndex) => {
                  let className = 'option-review';
                  if (optionIndex === answer.correctAnswer) {
                    className += ' correct-answer';
                  }
                  if (optionIndex === answer.selectedAnswer && !answer.isCorrect) {
                    className += ' wrong-answer';
                  }
                  if (optionIndex === answer.selectedAnswer) {
                    className += ' selected';
                  }

                  return (
                    <div key={optionIndex} className={className}>
                      <span className="option-letter">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="option-text">{option}</span>
                      {optionIndex === answer.selectedAnswer && (
                        <span className="selection-indicator">Your Answer</span>
                      )}
                      {optionIndex === answer.correctAnswer && (
                        <span className="correct-indicator">Correct Answer</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard showing top participants */}
        <div className={`tab-content ${activeTab === 'leaderboard' ? 'active' : ''}`}>
          <h3>Final Leaderboard</h3>
          {leaderboard.map(participant => {
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
          })}
        </div>

        {/* Button to go back to dashboard */}
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

export default SessionResults;