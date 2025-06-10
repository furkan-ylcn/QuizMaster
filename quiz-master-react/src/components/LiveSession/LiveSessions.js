import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const LiveSessions = () => {
  // State for sessions, quizzes, form fields, and UI
  const [sessions, setSessions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const { user } = useAuth();

  // Load sessions and quizzes on mount or when user changes
  useEffect(() => {
    loadSessions();
    loadQuizzes();
    if (user?.role === 'instructor') {
      loadActiveSession();
    }
  }, [user]);

  // Show a temporary message
  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // Load instructor's active session
  const loadActiveSession = async () => {
    try {
      const response = await fetch('/live-sessions/my-active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data);
      } else if (response.status !== 404) {
        // No active session is not an error
        console.error('Failed to load active session');
      }
    } catch (error) {
      console.error('Error loading active session:', error);
    }
  };

  // Load all sessions
  const loadSessions = async () => {
    try {
      const response = await fetch('/live-sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        console.error('Failed to load sessions');
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Load all quizzes for instructor
  const loadQuizzes = async () => {
    try {
      const response = await fetch('/quizzes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data);
      } else {
        console.error('Failed to load quizzes');
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
    }
  };

  // Create a new live session for selected quiz
  const createSession = async () => {
    if (!selectedQuiz) {
      showMessage('Please select a quiz', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/live-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ quizId: selectedQuiz })
      });
      if (response.ok) {
        const newSession = await response.json();
        setActiveSession(newSession);
        setSessions([...sessions, newSession]);
        setSelectedQuiz('');
        showMessage('Live session created successfully! Redirecting to control panel...', 'success');
        setTimeout(() => {
          window.location.href = `/live-session-instructor/${newSession.sessionid}`;
        }, 2000);
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to create session', 'error');
      }
    } catch (error) {
      showMessage('Error creating session', 'error');
      console.error('Create session error:', error);
    } finally {
      setLoading(false);
    }
  };

  // End a live session by ID
  const endSession = async (sessionId) => {
    setLoading(true);
    try {
      const response = await fetch(`/live-sessions/${sessionId}/end`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        setActiveSession(null);
        loadSessions();
        showMessage('Session ended successfully!', 'success');
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to end session', 'error');
      }
    } catch (error) {
      showMessage('Error ending session', 'error');
      console.error('End session error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Join a session by code (for players)
  const joinSessionByCode = async () => {
    if (!sessionCode.trim()) {
      showMessage('Please enter a session code', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/live-sessions/${sessionCode}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        window.location.href = `/live-session/${sessionCode}`;
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to join session', 'error');
      }
    } catch (error) {
      showMessage('Error joining session', 'error');
      console.error('Join session error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Join a session directly from the list (for players)
  const joinSessionDirect = async (sessionId) => {
    setLoading(true);
    try {
      const response = await fetch(`/live-sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        showMessage('Joined session successfully!', 'success');
        setTimeout(() => {
          window.location.href = `/live-session/${sessionId}`;
        }, 1000);
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to join session', 'error');
      }
    } catch (error) {
      showMessage('Error joining session', 'error');
      console.error('Join session error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Go to instructor control panel for a session
  const goToControlPanel = (sessionId) => {
    window.location.href = `/live-session-instructor/${sessionId}`;
  };

  // Role checks
  const isPlayer = user?.role === 'player' || user?.role === 'student';
  const isInstructor = user?.role === 'instructor';

  // Show loading overlay while waiting for API
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="live-sessions">
      <h2>Live Sessions</h2>
      
      {/* Show alert messages */}
      {message && (
        <div className={`alert alert-${messageType === 'error' ? 'danger' : messageType === 'success' ? 'success' : 'info'}`}>
          {message}
        </div>
      )}
      
      {/* Instructor: create or manage session */}
      {isInstructor && (
        <div className="create-session">
          <h3>Create New Live Session</h3>
          {activeSession && (
            <div className="active-session-alert">
              <div className="alert alert-info">
                <h4>Active Session</h4>
                <p><strong>Quiz:</strong> {activeSession.quizId?.title}</p>
                <p><strong>Session Code:</strong> {activeSession.sessionid}</p>
                <div className="session-actions">
                  <button 
                    onClick={() => goToControlPanel(activeSession.sessionid)}
                    className="btn btn-primary"
                    style={{marginRight: '10px'}}
                  >
                    Go to Control Panel
                  </button>
                  <button 
                    onClick={() => endSession(activeSession.sessionid)}
                    className="btn btn-danger"
                    disabled={loading}
                  >
                    End Current Session
                  </button>
                </div>
              </div>
            </div>
          )}
          {!activeSession && (
            <>
              <div className="form-group">
                <select 
                  value={selectedQuiz} 
                  onChange={(e) => setSelectedQuiz(e.target.value)}
                  className="form-control"
                  disabled={loading}
                >
                  <option value="">Select a quiz</option>
                  {quizzes.map(quiz => (
                    <option key={quiz._id} value={quiz._id}>
                      {quiz.title}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={createSession} 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Live Session'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Player: join session by code */}
      {isPlayer && (
        <div className="join-session">
          <h3>Join Live Session</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Enter session code"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              className="form-control"
              disabled={loading}
            />
          </div>
          <button 
            onClick={joinSessionByCode} 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Session'}
          </button>
        </div>
      )}

      {/* List of sessions */}
      <div className="sessions-list">
        <h3>{isInstructor ? 'My Sessions' : 'Available Sessions'}</h3>
        {sessions.length === 0 ? (
          <p>No active sessions available</p>
        ) : (
          <div className="sessions-grid">
            {sessions.map(session => (
              <div key={session._id} className="session-card">
                <h4>{session.quizId?.title || 'Quiz'}</h4>
                <p><strong>Code:</strong> {session.sessionid}</p>
                <p><strong>Status:</strong> <span className={session.isActive ? 'status-active' : 'status-ended'}>{session.isActive ? 'Active' : 'Ended'}</span></p>
                <p><strong>Participants:</strong> {session.participants?.length || 0}</p>
                <p><strong>Created:</strong> {new Date(session.createdAt).toLocaleString()}</p>
                {/* Player: join active session */}
                {isPlayer && session.isActive && (
                  <button 
                    onClick={() => joinSessionDirect(session.sessionid)}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Joining...' : 'Join Session'}
                  </button>
                )}
                {/* Instructor: control panel and end session */}
                {isInstructor && session.isActive && (
                  <div className="instructor-actions">
                    <button 
                      onClick={() => goToControlPanel(session.sessionid)}
                      className="btn btn-primary"
                      style={{marginRight: '10px', marginBottom: '10px'}}
                    >
                      Control Panel
                    </button>
                    <button 
                      onClick={() => endSession(session.sessionid)}
                      className="btn btn-danger"
                      disabled={loading}
                    >
                      {loading ? 'Ending...' : 'End Session'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveSessions;