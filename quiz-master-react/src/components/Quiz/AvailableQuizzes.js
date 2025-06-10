import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../hooks/hooks';

const AvailableQuizzes = () => {
  // State for quizzes and navigation
  const [quizzes, setQuizzes] = useState([]);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { loading, withLoading } = useLoading();

  // Load quizzes on component mount
  useEffect(() => {
    loadQuizzes();
  }, []);

  // Fetch available quizzes from API
  const loadQuizzes = async () => {
    try {
      await withLoading(async () => {
        const response = await quizAPI.getAvailableQuizzes();
        setQuizzes(response.data);
      });
    } catch (error) {
      addToast('Failed to load quizzes', 'error');
    }
  };

  // Navigate to quiz start page
  const startQuiz = (quizId) => {
    navigate(`/quiz/${quizId}`);
  };

  // Show loading spinner while fetching quizzes
  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading quizzes...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <h2>
          <i className="fas fa-list"></i>
          Available Quizzes
        </h2>

        <div className="quizzes-grid">
          {quizzes.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'white', fontSize: '1.2rem', gridColumn: '1 / -1' }}>
              No quizzes available
            </p>
          ) : (
            quizzes.map(quiz => (
              <div key={quiz._id} className="quiz-card">
                <h3>{quiz.title}</h3>
                <p>
                  <i className="fas fa-question-circle"></i>
                  {quiz.questions.length} questions
                </p>
                <p>
                  <i className="fas fa-user"></i>
                  Created by: {quiz.createdBy.username}
                </p>
                <p>
                  <i className="fas fa-calendar"></i>
                  {new Date(quiz.createdAt).toLocaleDateString()}
                </p>

                <div className="quiz-meta">
                  <span className={`quiz-type ${quiz.isLiveOnly ? 'live-only' : ''}`}>
                    {quiz.isLiveOnly ? 'Live Only' : 'Available Anytime'}
                  </span>
                  <button 
                    className="btn btn-primary"
                    onClick={() => startQuiz(quiz._id)}
                  >
                    <i className="fas fa-play"></i>
                    Take Quiz
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default AvailableQuizzes;