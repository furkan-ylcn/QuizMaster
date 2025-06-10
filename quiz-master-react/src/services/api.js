import axios from 'axios';

// Create axios instance with base URL and JSON headers
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authorization token to request headers if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 Unauthorized responses by clearing token and redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials) => api.post('/login', credentials),
  register: (userData) => api.post('/createUser', userData),
  getProfile: () => api.get('/profile'),
};

// User API endpoints
export const userAPI = {
  getUsers: () => api.get('/getUsers'),
  updateUser: (userId, userData) => api.put(`/updateUser/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/deleteUser/${userId}`),
};

// Quiz API endpoints
export const quizAPI = {
  createQuiz: (quizData) => api.post('/quizzes', quizData),
  getQuizzes: () => api.get('/quizzes'),
  getAvailableQuizzes: () => api.get('/quizzes/available'),
  getQuiz: (quizId) => api.get(`/quizzes/${quizId}`),
  updateQuiz: (quizId, quizData) => api.put(`/quizzes/${quizId}`, quizData),
  deleteQuiz: (quizId) => api.delete(`/quizzes/${quizId}`),
};

// Quiz Session API endpoints
export const quizSessionAPI = {
  startSession: (quizId) => api.post(`/quiz-sessions/${quizId}/start`),
  getQuestion: (quizId, questionIndex) => api.get(`/quiz-sessions/${quizId}/question/${questionIndex}`),
  submitAnswer: (quizId, answerData) => api.post(`/quiz-sessions/${quizId}/answer`, answerData),
};

// Live Session API endpoints
export const liveSessionAPI = {
  createSession: (sessionData) => api.post('/live-sessions', sessionData),
  getSessions: () => api.get('/live-sessions'),
  getMyActiveSession: () => api.get('/live-sessions/my-active'),
  getSession: (sessionId) => api.get(`/live-sessions/${sessionId}`),
  joinSession: (sessionId) => api.post(`/live-sessions/${sessionId}/join`),
  submitAnswer: (sessionId, answerData) => api.post(`/live-sessions/${sessionId}/submit-answer`, answerData),
  startQuestion: (sessionId) => api.post(`/live-sessions/${sessionId}/start-question`),
  nextQuestion: (sessionId) => api.post(`/live-sessions/${sessionId}/next-question`),
  endQuestion: (sessionId) => api.post(`/live-sessions/${sessionId}/end-question`),
  endSession: (sessionId) => api.put(`/live-sessions/${sessionId}/end`),
  getResults: (sessionId) => api.get(`/live-sessions/${sessionId}/results`),
};

export default api;