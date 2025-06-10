import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const LiveSessionInstructor = () => {
  const { sessionId } = useParams();
  
  // State for session data, loading, messages, timer
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const timerRef = useRef(null);

  // Load session data on mount and poll every 5 seconds
  useEffect(() => {
    if (sessionId) {
      loadSessionData();
      const interval = setInterval(loadSessionData, 5000);
      return () => {
        clearInterval(interval);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [sessionId]);

  // Timer effect for question countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (session?.questionStarted && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.questionStarted, timeRemaining]);

  // Show a temporary message
  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // Fetch session data from API
  const loadSessionData = async () => {
    try {
      const sessionResponse = await fetch(`/live-sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSession(sessionData);

        // Update timer if question is active
        if (sessionData.questionStarted && sessionData.questionStartTime && sessionData.currentQuestion) {
          const startTime = new Date(sessionData.questionStartTime).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const timeLimit = sessionData.currentQuestion.timeLimit || 30;
          const remaining = Math.max(0, timeLimit - elapsed);

          setTimeRemaining(remaining);
          setQuestionStartTime(startTime);
        } else if (!sessionData.questionStarted) {
          setTimeRemaining(0);
          setQuestionStartTime(null);
        }
      } else {
        const errorData = await sessionResponse.json();
        setMessage(errorData.message || 'Session not found or access denied', 'error');
      }
    } catch (error) {
      setMessage('Error loading session data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Start the current question
  const startQuestion = async () => {
    try {
      const response = await fetch(`/live-sessions/${sessionId}/start-question`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showMessage('Question started!', 'success');
        loadSessionData();
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to start question', 'error');
      }
    } catch (error) {
      showMessage('Error starting question', 'error');
    }
  };

  // End the current question
  const endQuestion = async () => {
    try {
      const response = await fetch(`/live-sessions/${sessionId}/end-question`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showMessage('Question ended!', 'success');
        setTimeRemaining(0);
        if (timerRef.current) clearInterval(timerRef.current);
        loadSessionData();
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to end question', 'error');
      }
    } catch (error) {
      showMessage('Error ending question', 'error');
    }
  };

  // Move to next question
  const nextQuestion = async () => {
    try {
      const response = await fetch(`/live-sessions/${sessionId}/next-question`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        showMessage(result.message, 'success');
        setTimeRemaining(0);
        if (timerRef.current) clearInterval(timerRef.current);
        loadSessionData();
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to move to next question', 'error');
      }
    } catch (error) {
      showMessage('Error moving to next question', 'error');
    }
  };

  // End the session
  const endSession = async () => {
    if (!confirm('Are you sure you want to end this session?')) return;
    
    try {
      const response = await fetch(`/live-sessions/${sessionId}/end`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        showMessage('Session ended successfully!', 'success');
        setTimeout(() => {
          window.location.href = `/instructor-results/${sessionId}`;
        }, 2000);
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to end session', 'error');
      }
    } catch (error) {
      showMessage('Error ending session', 'error');
    }
  };

  // Timer color based on time left
  const getTimerColor = () => {
    if (timeRemaining <= 5) return '#dc3545'; // Red
    if (timeRemaining <= 10) return '#ffc107'; // Yellow
    return '#28a745'; // Green
  };

  // Format seconds as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner}></div>
          <p>Loading session data...</p>
        </div>
      </div>
    );
  }

  // Show error if session not found
  if (!session) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h2>❌ Session Not Found</h2>
          <p>The session could not be loaded. Please check the session ID and try again.</p>
          <button 
            onClick={() => window.location.href = '/live-sessions'}
            style={styles.primaryButton}
          >
            ← Back to Live Sessions
          </button>
        </div>
      </div>
    );
  }

  // Extract quiz and session info
  const quiz = session.quizId || {};
  const quizTitle = quiz.title || 'Unknown Quiz';
  const quizQuestions = quiz.questions || [];
  const totalQuestions = quizQuestions.length;
  const currentQuestionIndex = session.currentQuestionIndex || 0;
  const currentQuestion = quizQuestions[currentQuestionIndex];
  const participants = session.participants || [];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1>🎯 Instructor Control Panel</h1>
        <p style={styles.subtitle}>Manage your live quiz session</p>
      </div>

      {/* Alert Messages */}
      {message && (
        <div style={{
          ...styles.alert,
          ...(messageType === 'error' ? styles.alertError : 
            messageType === 'success' ? styles.alertSuccess : styles.alertInfo)
        }}>
          {message}
        </div>
      )}

      {/* Session Info Card */}
      <div style={styles.sessionCard}>
        <div style={styles.sessionHeader}>
          <h2>📋 Session Information</h2>
          <div style={styles.statusBadge}>
            {session.isActive ? '🟢 Active' : '🔴 Ended'}
          </div>
        </div>
        <div style={styles.sessionDetails}>
          <div style={styles.detailItem}>
            <strong>Session Code:</strong>
            <span style={styles.sessionCode}>{session.sessionid}</span>
          </div>
          <div style={styles.detailItem}>
            <strong>Quiz:</strong>
            <span>{quizTitle}</span>
          </div>
          <div style={styles.detailItem}>
            <strong>Participants:</strong>
            <span>{participants.length} joined</span>
          </div>
          <div style={styles.detailItem}>
            <strong>Progress:</strong>
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          </div>
        </div>
      </div>

      {/* Current Question Card */}
      {currentQuestion && (
        <div style={styles.questionCard}>
          <h3>❓ Current Question ({currentQuestionIndex + 1}/{totalQuestions})</h3>
          <div style={styles.questionContent}>
            <h4>{currentQuestion.text || currentQuestion.question}</h4>
            <div style={styles.optionsContainer}>
              {(currentQuestion.options || []).map((option, index) => (
                <div key={index} style={{
                  ...styles.option,
                  ...(index === currentQuestion.correctAnswer ? styles.correctOption : {})
                }}>
                  <span style={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
                  <span>{option}</span>
                  {index === currentQuestion.correctAnswer && <span style={styles.correctMark}>✓</span>}
                </div>
              ))}
            </div>
            {session.questionStarted && (
              <div style={styles.questionStatus}>
                <span style={styles.activeStatus}>🟢 Question is ACTIVE</span>
                <span>Started: {new Date(session.questionStartTime).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timer Display - Only show when question is active */}
      {session.questionStarted && currentQuestion && timeRemaining > 0 && (
        <div style={styles.timerContainer}>
          <div style={styles.timerDisplay}>
            <div 
              style={{
                ...styles.timerCircle,
                borderColor: getTimerColor()
              }}
            >
              <span 
                style={{
                  ...styles.timerText,
                  color: getTimerColor()
                }}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
            <p style={styles.timerLabel}>Time Remaining</p>
          </div>
          <div style={styles.timerBar}>
            <div 
              style={{
                ...styles.timerFill,
                width: `${(timeRemaining / (currentQuestion.timeLimit || 30)) * 100}%`,
                backgroundColor: getTimerColor()
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Question Controls */}
      <div style={styles.controlsCard}>
        <h3>🎮 Question Controls</h3>
        <div style={styles.controlButtons}>
          {!session.questionStarted ? (
            <button 
              onClick={startQuestion}
              style={styles.startButton}
              disabled={!currentQuestion}
            >
              ▶️ Start Current Question
            </button>
          ) : (
            <button 
              onClick={endQuestion}
              style={styles.endButton}
            >
              ⏹️ End Current Question
            </button>
          )}
          <button 
            onClick={nextQuestion}
            style={styles.nextButton}
            disabled={currentQuestionIndex >= totalQuestions - 1}
          >
            ⏭️ Next Question
          </button>
        </div>
      </div>

      {/* Participants List */}
      <div style={styles.participantsCard}>
        <h3>👥 Participants ({participants.length})</h3>
        {participants.length > 0 ? (
          <div style={styles.participantsList}>
            {participants.map((participant, index) => (
              <div key={index} style={styles.participantItem}>
                <div style={styles.participantInfo}>
                  <span style={styles.participantName}>
                    {participant.userId?.username || `Player ${index + 1}`}
                  </span>
                  <span style={styles.participantScore}>
                    Score: {participant.score || 0}/{totalQuestions}
                  </span>
                </div>
                <span style={styles.participantStatus}>🟢 Online</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>🔍 No participants have joined yet</p>
            <p style={styles.helpText}>Share the session code <strong>{session.sessionid}</strong> with your students</p>
          </div>
        )}
      </div>

      {/* Session Actions */}
      <div style={styles.actionsCard}>
        <h3>🛠️ Session Actions</h3>
        <div style={styles.actionButtons}>
          <button 
            onClick={() => window.location.reload()}
            style={styles.refreshButton}
          >
            🔄 Refresh Data
          </button>
          <button 
            onClick={() => window.location.href = '/live-sessions'}
            style={styles.backButton}
          >
            ← Back to Sessions
          </button>
          {session.isActive && (
            <button 
              onClick={endSession}
              style={styles.dangerButton}
            >
              🛑 End Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Updated styles with timer components
const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    background: '#f5f7fa',
    minHeight: '100vh',
    marginTop: '88px',
    borderRadius: '12px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    padding: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  subtitle: {
    margin: '10px 0 0 0',
    opacity: 0.9,
    fontSize: '16px'
  },
  // Timer styles
  timerContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    margin: '20px 0',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    border: '2px solid #e9ecef'
  },
  timerDisplay: {
    marginBottom: '20px'
  },
  timerCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px',
    background: 'white',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  timerText: {
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: "'Courier New', monospace"
  },
  timerLabel: {
    margin: 0,
    fontSize: '16px',
    color: '#6c757d',
    fontWeight: '500'
  },
  timerBar: {
    width: '100%',
    height: '10px',
    background: '#e9ecef',
    borderRadius: '5px',
    overflow: 'hidden'
  },
  timerFill: {
    height: '100%',
    transition: 'width 1s linear',
    borderRadius: '5px'
  },
  sessionCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  statusBadge: {
    padding: '8px 16px',
    borderRadius: '20px',
    background: '#e8f5e8',
    fontSize: '14px',
    fontWeight: '600'
  },
  sessionDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '6px'
  },
  sessionCode: {
    background: '#007bff',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  questionCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  questionContent: {
    marginTop: '15px'
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    margin: '20px 0'
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    position: 'relative'
  },
  correctOption: {
    background: '#d4edda',
    borderColor: '#28a745',
    color: '#155724'
  },
  optionLetter: {
    background: '#6c757d',
    color: 'white',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    marginRight: '12px'
  },
  correctMark: {
    marginLeft: 'auto',
    color: '#28a745',
    fontWeight: 'bold',
    fontSize: '18px'
  },
  questionStatus: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '6px',
    marginTop: '15px'
  },
  activeStatus: {
    color: '#28a745',
    fontWeight: '600'
  },
  controlsCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  controlButtons: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    marginTop: '15px'
  },
  startButton: {
    padding: '12px 24px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '16px'
  },
  endButton: {
    padding: '12px 24px',
    background: '#ffc107',
    color: '#212529',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '16px'
  },
  nextButton: {
    padding: '12px 24px',
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  participantsCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  participantsList: {
    maxHeight: '300px',
    overflowY: 'auto'
  },
  participantItem: {
    padding: '12px',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    marginBottom: '8px',
    background: '#f8f9fa',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  participantInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  participantName: {
    fontWeight: '500'
  },
  participantScore: {
    fontSize: '14px',
    color: '#6c757d'
  },
  participantStatus: {
    fontSize: '12px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6c757d'
  },
  helpText: {
    fontSize: '14px',
    marginTop: '10px'
  },
  actionsCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  actionButtons: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    marginTop: '15px'
  },
  refreshButton: {
    padding: '12px 24px',
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  backButton: {
    padding: '12px 24px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  dangerButton: {
    padding: '12px 24px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  alert: {
    padding: '15px 20px',
    marginBottom: '20px',
    borderRadius: '8px',
    fontWeight: '500'
  },
  alertInfo: {
    background: '#d1ecf1',
    color: '#0c5460',
    border: '1px solid #bee5eb'
  },
  alertSuccess: {
    background: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb'
  },
  alertError: {
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f5f7fa'
  },
  loadingSpinner: {
    textAlign: 'center',
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  errorCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  }
};

export default LiveSessionInstructor;