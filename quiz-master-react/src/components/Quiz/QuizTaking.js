import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../App.css';
import { quizSessionAPI } from '../../services/api';

const QuizTaking = ({ onQuizComplete }) => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  // State for quiz, session, progress, and UI
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [quizSession, setQuizSession] = useState(null);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Show a temporary message
  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  // Go back to quiz list
  const handleBack = () => {
    navigate('/available-quizzes');
  };

  // Start quiz on mount or when quizId changes
  useEffect(() => {
    if (quizId) {
      startQuiz();
    }
  }, [quizId]);

  // Timer effect for each question
  useEffect(() => {
    let timer;
    if (timeRemaining > 0 && !showResults) {
      timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
    } else if (timeRemaining === 0 && quiz && quiz.questions[currentQuestionIndex] && !showResults) {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [timeRemaining, currentQuestionIndex, quiz, showResults]);

  // Start a new quiz session
  const startQuiz = async () => {
    try {
      const response = await quizSessionAPI.startSession(quizId);
      if (response.data && response.data.quiz && response.data.quiz.questions) {
        setQuiz(response.data.quiz);
        setQuizSession(response.data.session);
        setCurrentQuestionIndex(0);
        setShowResults(false);
        setMessage('');
        const firstQuestion = response.data.quiz.questions[0];
        setTimeRemaining(firstQuestion.timeLimit || 30);
      } else {
        setMessage('Failed to load quiz - no questions found');
      }
    } catch (error) {
      setMessage('Failed to load quiz');
    }
  };

  // Load a question (used when moving to next)
  const loadQuestion = async (questionIndex, quizData = quiz) => {
    setLoading(true);
    try {
      const response = await fetch(`/quiz-sessions/${quizId}/question/${questionIndex}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedAnswer(null);
        setTimeRemaining(data.question.timeLimit || 30);
      } else {
        showMessage(data.message || 'Failed to load question', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // When time is up, auto-submit answer
  const handleTimeUp = () => {
    handleSubmitAnswer();
  };

  // Submit answer for current question
  const handleSubmitAnswer = async () => {
    if (showResults || loading) return;
    const answerIndex = selectedAnswer !== null ? selectedAnswer : -1;
    setLoading(true);

    try {
      const response = await fetch(`/quiz-sessions/${quizId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          questionIndex: currentQuestionIndex,
          answerIndex: answerIndex,
          timeSpent: quiz.questions[currentQuestionIndex].timeLimit - timeRemaining
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.isCorrect) {
          setScore(score + 1);
          showMessage('Correct!', 'success');
        } else {
          let wrongMessage = 'Wrong answer!';
          if (data.explanation) {
            wrongMessage = data.explanation;
          } else if (quiz.questions[currentQuestionIndex].correctAnswer !== undefined) {
            const correctOption = quiz.questions[currentQuestionIndex].options[quiz.questions[currentQuestionIndex].correctAnswer];
            wrongMessage = `Wrong! The correct answer was: ${correctOption}`;
          }
          showMessage(wrongMessage, 'error');
        }

        // Move to next question or show results
        setTimeout(() => {
          if (data.nextQuestionIndex !== null && !showResults) {
            setCurrentQuestionIndex(data.nextQuestionIndex);
            loadQuestion(data.nextQuestionIndex);
          } else {
            showQuizResults();
          }
        }, 2000);
      } else {
        showMessage(data.message || 'Failed to submit answer', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show quiz results and stop timer
  const showQuizResults = () => {
    setTimeRemaining(0);
    setShowResults(true);
    setMessage('');
    setMessageType('');
  };

  if (loading && !quiz) {
    return (
      <div className="quiz-taking-container">
        <div className="loading-spinner">Loading quiz...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="quiz-taking-container">
        <div className="error-message">Failed to load quiz</div>
        <button onClick={handleBack} className="btn btn-secondary">Go Back</button>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Main quiz UI
  return (
    <div className="quiz-taking-container">
      {message && (
        <div className={`message-banner ${messageType}`}>
          {message}
        </div>
      )}
      
      <div className="quiz-header">
        <h2>{quiz.title}</h2>
        <div className="quiz-progress">
          <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
          <div className="timer">
            <i className="fas fa-clock"></i>
            <span id="time-remaining">{timeRemaining}s</span>
          </div>
        </div>
      </div>

      <div className="question-container">
        <div className="question-text">
          <h3>{currentQuestion.text}</h3>
        </div>

        <div className="options-container">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className={`option ${selectedAnswer === index ? 'selected' : ''}`}
              onClick={() => setSelectedAnswer(index)}
            >
              <input
                type="radio"
                name="answer"
                value={index}
                checked={selectedAnswer === index}
                onChange={() => setSelectedAnswer(index)}
              />
              <label>{option}</label>
            </div>
          ))}
        </div>

        <div className="quiz-actions">
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null || loading}
            className="btn btn-primary"
            id="submit-answer"
          >
            {loading ? 'Submitting...' : 'Submit Answer'}
          </button>
          <button onClick={handleBack} className="btn btn-secondary">
            Exit Quiz
          </button>
        </div>
      </div>

      {showResults && (
        <div className="quiz-results-overlay">
          <div className="quiz-results-container">
            <div className="results-header">
              <h2>Quiz Completed!</h2>
              <div className="results-icon">
                {score / quiz.questions.length >= 0.7 ? (
                  <i className="fas fa-trophy" style={{color: '#ffd700'}}></i>
                ) : (
                  <i className="fas fa-medal" style={{color: '#c0c0c0'}}></i>
                )}
              </div>
            </div>
            
            <div className="results-stats">
              <div className="stat-item">
                <div className="stat-value">{score}</div>
                <div className="stat-label">Correct Answers</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{quiz.questions.length}</div>
                <div className="stat-label">Total Questions</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{Math.round((score / quiz.questions.length) * 100)}%</div>
                <div className="stat-label">Score</div>
              </div>
            </div>
            
            <div className="results-message">
              {score / quiz.questions.length >= 0.8 ? (
                <p className="excellent">Excellent work! 🎉</p>
              ) : score / quiz.questions.length >= 0.6 ? (
                <p className="good">Good job! 👍</p>
              ) : (
                <p className="needs-improvement">Keep practicing! 📚</p>
              )}
            </div>
            
            <div className="results-actions">
              <button 
                onClick={() => navigate('/available-quizzes')} 
                className="btn btn-primary"
              >
                Back to Quizzes
              </button>
              <button 
                onClick={() => {
                  setShowResults(false);
                  setCurrentQuestionIndex(0);
                  setScore(0);
                  setSelectedAnswer(null);
                  startQuiz();
                }} 
                className="btn btn-secondary"
              >
                Retake Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizTaking;