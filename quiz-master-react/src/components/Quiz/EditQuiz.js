import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const EditQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // State for quiz data and loading
  const [quiz, setQuiz] = useState({
    title: '',
    questions: [],
    isLiveOnly: false
  });
  const [loading, setLoading] = useState(true);

  // Fetch quiz data on mount or when quizId changes
  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  // Fetch quiz details from API
  const fetchQuiz = async () => {
    try {
      const response = await fetch(`/quizzes/${quizId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
      } else {
        addToast('Failed to fetch quiz', 'error');
        navigate('/my-quizzes');
      }
    } catch (error) {
      addToast('Error loading quiz', 'error');
      navigate('/my-quizzes');
    } finally {
      setLoading(false);
    }
  };

  // Handle quiz update form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!quiz.title.trim()) {
      addToast('Please enter a quiz title', 'error');
      return;
    }

    if (quiz.questions.length === 0) {
      addToast('Please add at least one question', 'error');
      return;
    }

    // Validate all questions and options
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      if (!q.text.trim()) {
        addToast(`Question ${i + 1} text is required`, 'error');
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        addToast(`All options for question ${i + 1} are required`, 'error');
        return;
      }
    }

    try {
      const response = await fetch(`/quizzes/${quizId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(quiz)
      });

      if (response.ok) {
        addToast('Quiz updated successfully!', 'success');
        navigate('/my-quizzes');
      } else {
        const error = await response.json();
        addToast(error.message || 'Failed to update quiz', 'error');
      }
    } catch (error) {
      addToast('Error updating quiz', 'error');
    }
  };

  // Add a new question to the quiz
  const addQuestion = () => {
    setQuiz({
      ...quiz,
      questions: [
        ...quiz.questions,
        {
          text: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          timeLimit: 30
        }
      ]
    });
  };

  // Update a field of a question
  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  // Update a specific option of a question
  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  // Remove a question by its index
  const removeQuestion = (index) => {
    const updatedQuestions = quiz.questions.filter((_, i) => i !== index);
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  // Show loading spinner while fetching quiz
  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading quiz...</p>
          </div>
        </div>
      </section>
    );
  }

  // Show quiz edit form
  return (
    <section className="section">
      <div className="container">
        <h2>
          <i className="fas fa-edit"></i>
          Edit Quiz
        </h2>

        <form onSubmit={handleSubmit} className="quiz-form">
          <div className="form-group">
            <label htmlFor="title">Quiz Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="isLiveOnly">Quiz Type</label>
            <select
              id="isLiveOnly"
              name="isLiveOnly"
              value={quiz.isLiveOnly}
              onChange={(e) => setQuiz({ ...quiz, isLiveOnly: e.target.value === 'true' })}
            >
              <option value={false}>Available Anytime</option>
              <option value={true}>Live Sessions Only</option>
            </select>
          </div>

          <div className="questions-container">
            <h3>Questions</h3>
            {quiz.questions.map((question, index) => (
              <div key={index} className="question-item">
                <div className="question-header">
                  <span className="question-number">Question {index + 1}</span>
                  {quiz.questions.length > 1 && (
                    <button
                      type="button"
                      className="remove-question"
                      onClick={() => removeQuestion(index)}
                    >
                      <i className="fas fa-trash"></i> Remove
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label>Question Text</label>
                  <input
                    type="text"
                    value={question.text}
                    onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                    required
                  />
                </div>

                <div className="options-container">
                  <label>Options (select the correct answer)</label>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="option-item">
                      <input
                        type="radio"
                        name={`correct-answer-${index}`}
                        value={optionIndex}
                        checked={question.correctAnswer === optionIndex}
                        onChange={() => updateQuestion(index, 'correctAnswer', optionIndex)}
                        required
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="time-limit-group">
                  <label>Time Limit:</label>
                  <input
                    type="number"
                    value={question.timeLimit}
                    onChange={(e) => updateQuestion(index, 'timeLimit', parseInt(e.target.value))}
                    min="10"
                    max="300"
                    required
                  />
                  <span>seconds</span>
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-secondary" onClick={addQuestion}>
              <i className="fas fa-plus"></i> Add Question
            </button>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fas fa-save"></i> Update Quiz
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/my-quizzes')}
            >
              <i className="fas fa-times"></i> Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default EditQuiz;