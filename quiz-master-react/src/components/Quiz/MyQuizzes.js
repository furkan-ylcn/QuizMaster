import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const MyQuizzes = () => {
  // State for quizzes and loading
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Fetch quizzes on mount
  useEffect(() => {
    fetchMyQuizzes();
  }, []);

  // Fetch quizzes created by the current user
  const fetchMyQuizzes = async () => {
    try {
      const response = await fetch('/quizzes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter quizzes created by current user
        const myQuizzes = data.filter(quiz => 
          quiz.createdBy && quiz.createdBy._id === user.id
        );
        setQuizzes(myQuizzes);
      } else {
        addToast('Failed to fetch your quizzes', 'error');
      }
    } catch (error) {
      addToast('Error loading quizzes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete a quiz by its ID
  const handleDeleteQuiz = async (quizId) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const response = await fetch(`/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setQuizzes(quizzes.filter(quiz => quiz._id !== quizId));
        addToast('Quiz deleted successfully', 'success');
      } else {
        addToast('Failed to delete quiz', 'error');
      }
    } catch (error) {
      addToast('Error deleting quiz', 'error');
    }
  };

  // Navigate to edit quiz page
  const handleEditQuiz = (quizId) => {
    navigate(`/edit-quiz/${quizId}`);
  };

  // Show loading spinner while fetching quizzes
  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading your quizzes...</p>
          </div>
        </div>
      </section>
    );
  }

  // Show quizzes list
  return (
    <section className="section">
      <div className="container">
        <div className="page-header">
          <h2>📚 My Quizzes</h2>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/create-quiz')}
          >
            <i className="fas fa-plus"></i>
            Create New Quiz
          </button>
        </div>

        <div className="quizzes-grid">
          {quizzes.map(quiz => (
            <div key={quiz._id} className="quiz-card">
              <div className="quiz-card-header">
                <h3>{quiz.title}</h3>
                <div className="quiz-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handleEditQuiz(quiz._id)}
                    title="Edit Quiz"
                  >
                    <i className="fas fa-edit"></i>
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteQuiz(quiz._id)}
                    title="Delete Quiz"
                  >
                    <i className="fas fa-trash"></i>
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="quiz-card-body">
                <div className="quiz-stats">
                  <div className="stat">
                    <i className="fas fa-question-circle"></i>
                    <span>{quiz.questions?.length || 0} Questions</span>
                  </div>
                  <div className="stat">
                    <i className="fas fa-eye"></i>
                    <span>{quiz.isLiveOnly ? 'Live Only' : 'Available'}</span>
                  </div>
                  <div className="stat">
                    <i className="fas fa-calendar"></i>
                    <span>Created: {new Date(quiz.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
};

export default MyQuizzes;