import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/Layout/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import CreateQuiz from './components/Quiz/CreateQuiz';
import MyQuizzes from './components/Quiz/MyQuizzes';
import AvailableQuizzes from './components/Quiz/AvailableQuizzes';
import QuizTaking from './components/Quiz/QuizTaking';
import LiveSessions from './components/LiveSession/LiveSessions';
import LiveSessionPlayer from './components/LiveSession/LiveSessionPlayer';
import LiveSessionInstructor from './components/LiveSession/LiveSessionInstructor';
import Results from './components/Results/Results';
import SessionResults from './components/Results/SessionResults';
import InstructorResults from './components/Results/InstructorResults';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoadingOverlay from './components/UI/LoadingOverlay';
import ToastContainer from './components/UI/ToastContainer';
import './App.css';
import EditQuiz from './components/Quiz/EditQuiz';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="App">
            <Navbar />
            <LoadingOverlay />
            <ToastContainer />

            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* Instructor-only routes */}
              <Route path="/create-quiz" element={
                <ProtectedRoute requiredRole="instructor">
                  <CreateQuiz />
                </ProtectedRoute>
              } />

              <Route path="/edit-quiz/:quizId" element={
                <ProtectedRoute requiredRole="instructor">
                  <EditQuiz />
                </ProtectedRoute>
              } />

              <Route path="/my-quizzes" element={
                <ProtectedRoute requiredRole="instructor">
                  <MyQuizzes />
                </ProtectedRoute>
              } />

              {/* Other protected routes */}
              <Route path="/available-quizzes" element={
                <ProtectedRoute>
                  <AvailableQuizzes />
                </ProtectedRoute>
              } />

              <Route path="/quiz/:quizId" element={
                <ProtectedRoute>
                  <QuizTaking />
                </ProtectedRoute>
              } />

              <Route path="/live-sessions" element={
                <ProtectedRoute>
                  <LiveSessions />
                </ProtectedRoute>
              } />

              <Route path="/live-session/:sessionId" element={
                <ProtectedRoute>
                  <LiveSessionPlayer />
                </ProtectedRoute>
              } />

              {/* Instructor control panel for live session */}
              <Route path="/live-session-instructor/:sessionId" element={
                <ProtectedRoute requiredRole="instructor">
                  <LiveSessionInstructor />
                </ProtectedRoute>
              } />

              <Route path="/results" element={
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              } />

              <Route path="/session-results/:sessionId" element={
                <ProtectedRoute>
                  <SessionResults />
                </ProtectedRoute>
              } />

              <Route path="/instructor-results/:sessionId" element={
                <ProtectedRoute requiredRole="instructor">
                  <InstructorResults />
                </ProtectedRoute>
              } />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;