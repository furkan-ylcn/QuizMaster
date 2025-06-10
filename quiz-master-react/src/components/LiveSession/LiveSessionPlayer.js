import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { liveSessionAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { usePolling } from '../../hooks/hooks';

const LiveSessionPlayer = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // State for session, question, timer, and score
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isQuestionActive, setIsQuestionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [playerScore, setPlayerScore] = useState({ correct: 0, total: 0 });
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  
  const timerRef = useRef(null);
  const lastSyncTime = useRef(null);

  // Poll for session updates
  const { data: sessionData, startPolling, stopPolling } = usePolling(
    async () => {
      const response = await liveSessionAPI.getSession(sessionId);
      return response.data;
    },
    2000
  );

  // Start polling and fetch initial score
  useEffect(() => {
    startPolling();
    fetchPlayerScore();
    return () => {
      stopPolling();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Update session state when new data arrives
  useEffect(() => {
    if (sessionData) {
      updateSessionState(sessionData);
    }
  }, [sessionData]);

  // Timer for question countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isQuestionActive && timeRemaining > 0 && !hasAnswered) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isQuestionActive, hasAnswered, currentQuestionId]);

  // Fetch player's score from API
  const fetchPlayerScore = async () => {
    try {
      const response = await liveSessionAPI.getPlayerScore(sessionId);
      if (response.data) {
        setPlayerScore({
          correct: response.data.correct || 0,
          total: response.data.total || 0
        });
      }
    } catch (error) {
      setPlayerScore({ correct: 0, total: 0 });
    }
  };

  // Update local state based on session data from server
  const updateSessionState = (newSessionData) => {
    // If session ended, redirect to results
    if (!newSessionData.isActive) {
      addToast('Session has ended! Loading results...', 'info');
      stopPolling();
      navigate(`/session-results/${sessionId}`);
      return;
    }

    setSession(newSessionData);

    // Handle question state and timer
    if (newSessionData.questionStarted && newSessionData.currentQuestion) {
      const questionId = newSessionData.currentQuestion._id;

      // New question started
      if (currentQuestionId !== questionId) {
        setCurrentQuestion(newSessionData.currentQuestion);
        setCurrentQuestionId(questionId);
        setSelectedAnswer(null);
        setHasAnswered(false);
        setIsQuestionActive(true);
        
        // Calculate time remaining
        if (newSessionData.questionStartTime) {
          const startTime = new Date(newSessionData.questionStartTime).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const timeLimit = newSessionData.currentQuestion.timeLimit || 30;
          const remaining = Math.max(0, timeLimit - elapsed);
          
          setTimeRemaining(remaining);
          setQuestionStartTime(startTime);
          lastSyncTime.current = now;
        } else {
          setTimeRemaining(newSessionData.currentQuestion.timeLimit || 30);
          setQuestionStartTime(Date.now());
          lastSyncTime.current = Date.now();
        }
      } else if (newSessionData.questionStartTime && questionStartTime && !hasAnswered) {
        // Sync timer if drifted
        const now = Date.now();
        if (!lastSyncTime.current || (now - lastSyncTime.current) > 10000) {
          const startTime = new Date(newSessionData.questionStartTime).getTime();
          const elapsed = Math.floor((now - startTime) / 1000);
          const timeLimit = newSessionData.currentQuestion.timeLimit || 30;
          const serverTimeRemaining = Math.max(0, timeLimit - elapsed);
          if (Math.abs(serverTimeRemaining - timeRemaining) > 3) {
            setTimeRemaining(serverTimeRemaining);
            lastSyncTime.current = now;
          }
        }
      }
    } else {
      // No active question
      if (isQuestionActive) {
        setIsQuestionActive(false);
        setCurrentQuestion(null);
        setCurrentQuestionId(null);
        setTimeRemaining(0);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  };

  // Select an answer option
  const selectAnswer = (optionIndex) => {
    if (hasAnswered) return;
    setSelectedAnswer(optionIndex);
  };

  // Submit answer to server
  const submitAnswer = async () => {
    if (hasAnswered || selectedAnswer === null) return;

    try {
      const response = await liveSessionAPI.submitAnswer(sessionId, {
        questionIndex: session.currentQuestionIndex,
        selectedOption: selectedAnswer
      });

      setHasAnswered(true);
      // Update score after submitting answer
      if (response.data.isCorrect) {
        setPlayerScore(prev => ({
          correct: prev.correct + 1,
          total: prev.total + 1
        }));
      } else {
        setPlayerScore(prev => ({
          correct: prev.correct,
          total: prev.total + 1
        }));
      }

      addToast(
        `Answer submitted! ${response.data.isCorrect ? 'Correct!' : 'Incorrect'}`,
        response.data.isCorrect ? 'success' : 'error'
      );
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to submit answer', 'error');
    }
  };

  // Handle timer running out
  function handleTimeUp() {
    if (!hasAnswered) {
      addToast('Time is up!', 'warning');
      setHasAnswered(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setPlayerScore(prev => ({
        correct: prev.correct,
        total: prev.total + 1
      }));
      if (selectedAnswer !== null) {
        submitAnswer();
      }
    }
  }

  // Leave the session and clean up
  const leaveSession = () => {
    stopPolling();
    if (timerRef.current) clearInterval(timerRef.current);
    navigate('/dashboard');
    addToast('Left live session', 'success');
  };

  // Timer color based on time left
  const getTimerColor = () => {
    if (timeRemaining <= 5) return '#dc3545';
    if (timeRemaining <= 10) return '#ffc107';
    return '#28a745';
  };

  // Format seconds as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate score percentage
  const getScorePercentage = () => {
    if (playerScore.total === 0) return 0;
    return Math.round((playerScore.correct / playerScore.total) * 100);
  };

  // Show loading spinner while fetching session
  if (!session) {
    return (
      <section className="section">
        <div className="container">
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading session...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="live-session-header">
          <h2>
            <i className="fas fa-broadcast-tower"></i>
            Live Session
          </h2>

          {/* Session info bar */}
          <div className="session-info-bar">
            <div className="session-detail">
              <span className="label">Session ID</span>
              <span className="value">{session.sessionid}</span>
            </div>
            <div className="session-detail">
              <span className="label">Quiz</span>
              <span className="value">{session.quizId?.title || 'Loading...'}</span>
            </div>
            <div className="session-detail">
              <span className="label">Question</span>
              <span className="value">{(session.currentQuestionIndex || 0) + 1}</span>
            </div>
          </div>
        </div>

        {/* Player Score Display */}
        <div className="score-container">
          <div className="score-card">
            <div className="score-item">
              <div className="score-number">{playerScore.correct}</div>
              <div className="score-label">Correct</div>
            </div>
            <div className="score-divider"></div>
            <div className="score-item">
              <div className="score-number">{playerScore.total}</div>
              <div className="score-label">Total</div>
            </div>
            <div className="score-divider"></div>
            <div className="score-item">
              <div className="score-number">{getScorePercentage()}%</div>
              <div className="score-label">Accuracy</div>
            </div>
          </div>
        </div>

        {/* Timer Display */}
        {isQuestionActive && currentQuestion && timeRemaining > 0 && (
          <div className="timer-container">
            <div className="timer-display">
              <div 
                className="timer-circle" 
                style={{ borderColor: getTimerColor() }}
              >
                <span 
                  className="timer-text" 
                  style={{ color: getTimerColor() }}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <p className="timer-label">Time Remaining</p>
            </div>
            <div className="timer-bar">
              <div 
                className="timer-fill"
                style={{
                  width: `${(timeRemaining / (currentQuestion.timeLimit || 30)) * 100}%`,
                  backgroundColor: getTimerColor()
                }}
              ></div>
            </div>
          </div>
        )}

        <div className="live-session-content">
          {/* Show waiting area if no active question */}
          {!isQuestionActive || !currentQuestion ? (
            <div className="waiting-area">
              <div className="waiting-message">
                <i className="fas fa-clock fa-3x"></i>
                <h3>Waiting for next question...</h3>
                <p>The instructor will start the next question shortly.</p>
              </div>
            </div>
          ) : (
            <div className="live-question-container">
              <div className="question-header">
                <h3>Question {(session.currentQuestionIndex || 0) + 1}</h3>
              </div>

              <div className="question-text">
                <h2>{currentQuestion.text}</h2>
              </div>

              <div className="answer-options">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    className={`answer-option ${selectedAnswer === index ? 'selected' : ''}`}
                    onClick={() => selectAnswer(index)}
                    disabled={hasAnswered || timeRemaining <= 0}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="option-text">{option}</span>
                  </button>
                ))}
              </div>

              {selectedAnswer !== null && !hasAnswered && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={submitAnswer}
                    disabled={timeRemaining <= 0}
                  >
                    <i className="fas fa-check"></i>
                    Submit Answer
                  </button>
                </div>
              )}

              {hasAnswered && (
                <div className="answer-status">
                  <p>✅ Answer submitted! Waiting for next question...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leave session button */}
        <div className="live-session-actions">
          <button className="btn btn-danger" onClick={leaveSession}>
            <i className="fas fa-sign-out-alt"></i>
            Leave Session
          </button>
        </div>
      </div>
    </section>
  );
};

export default LiveSessionPlayer;