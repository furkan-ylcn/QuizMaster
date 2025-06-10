import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useForm, useLoading } from '../../hooks/hooks';

const CreateQuiz = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { loading, withLoading } = useLoading();
  const [questions, setQuestions] = useState([]);

  // Form state for quiz title and type
  const { values, handleChange, reset } = useForm({
    title: '',
    isLiveOnly: false
  });

  // Add a new question to the quiz
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      timeLimit: 30
    };
    setQuestions([...questions, newQuestion]);
  };

  // Remove a question by its ID
  const removeQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  // Update a field of a question
  const updateQuestion = (questionId, field, value) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  // Update a specific option of a question
  const updateOption = (questionId, optionIndex, value) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map((opt, idx) => idx === optionIndex ? value : opt) }
        : q
    ));
  };

  // Handle quiz form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!values.title.trim()) {
      addToast('Please enter a quiz title', 'error');
      return;
    }

    if (questions.length === 0) {
      addToast('Please add at least one question', 'error');
      return;
    }

    // Validate all questions and options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        addToast(`Question ${i + 1} text is required`, 'error');
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        addToast(`All options for question ${i + 1} are required`, 'error');
        return;
      }
    }

    const quizData = {
      title: values.title,
      isLiveOnly: values.isLiveOnly === 'true',
      questions: questions.map(q => ({
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        timeLimit: q.timeLimit
      }))
    };

    try {
      await withLoading(async () => {
        await quizAPI.createQuiz(quizData);
        addToast('Quiz created successfully!', 'success');
        setQuestions([]);
        navigate('/dashboard');
      });
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create quiz', 'error');
    }
  };

  // Add first question on component mount
  React.useEffect(() => {
    if (questions.length === 0) {
      addQuestion();
    }
    // eslint-disable-next-line
  }, []);

  // Show quiz creation form
  return (
    <section className="section">
      <div className="container">
        <h2>
          <i className="fas fa-plus-circle"></i>
          Create New Quiz
        </h2>

        <form onSubmit={handleSubmit} className="quiz-form">
          <div className="form-group">
            <label htmlFor="title">Quiz Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={values.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="isLiveOnly">Quiz Type</label>
            <select
              id="isLiveOnly"
              name="isLiveOnly"
              value={values.isLiveOnly}
              onChange={handleChange}
            >
              <option value={false}>Available Anytime</option>
              <option value={true}>Live Sessions Only</option>
            </select>
          </div>

          <div className="questions-container">
            <h3>Questions</h3>
            {questions.map((question, index) => (
              <div key={question.id} className="question-item">
                <div className="question-header">
                  <span className="question-number">Question {index + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="remove-question"
                      onClick={() => removeQuestion(question.id)}
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
                    onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                    required
                  />
                </div>

                <div className="options-container">
                  <label>Options (select the correct answer)</label>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="option-item">
                      <input
                        type="radio"
                        name={`correct-answer-${question.id}`}
                        value={optionIndex}
                        checked={question.correctAnswer === optionIndex}
                        onChange={() => updateQuestion(question.id, 'correctAnswer', optionIndex)}
                        required
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
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
                    onChange={(e) => updateQuestion(question.id, 'timeLimit', parseInt(e.target.value))}
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
              <i className="fas fa-save"></i> Create Quiz
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/dashboard')}
            >
              <i className="fas fa-times"></i> Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default CreateQuiz;