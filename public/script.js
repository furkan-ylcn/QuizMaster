let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let currentSession = null;
let timer = null;
let timeRemaining = 0;
let selectedAnswer = null;
let quizScore = 0;
let totalQuestions = 0;
let sessionPollInterval = null;
let questionTimerInterval = null;
let currentDisplayedQuestionId = null;
let isQuestionActive = false;

// API Base URL
const API_BASE = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

// Check if user is already logged in
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token with server
        fetch('/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Invalid token');
        })
        .then(data => {
            currentUser = data.user;
            showDashboard();
        })
        .catch(error => {
            localStorage.removeItem('token');
            showLogin();
        });
    } else {
        showLogin();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Create quiz form
    document.getElementById('create-quiz-form').addEventListener('submit', handleCreateQuiz);
    
    // Start live session form
    document.getElementById('start-live-session-form').addEventListener('submit', handleStartLiveSession);
    
    // Join session forms
    document.getElementById('join-live-form').addEventListener('submit', handleJoinLiveSession);
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showToast('Login successful!', 'success');
            showDashboard();
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role')
    };
    
    try {
        const response = await fetch('/createUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            showLogin();
            document.getElementById('register-form').reset();
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    currentQuiz = null;
    currentSession = null;
    showLogin();
    showToast('Logged out successfully', 'success');
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');
    
    // Load section-specific data
    switch(sectionName) {
        case 'available-quizzes':
            loadAvailableQuizzes();
            break;
        case 'my-quizzes':
            loadMyQuizzes();
            break;
        case 'live-sessions':
            loadLiveSessions();
            break;
        case 'join-live':
            loadAvailableLiveSessions();
            break;
    }
}

function showLogin() {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('login-section').classList.add('active');
    
    // Hide navigation items
    document.querySelectorAll('.nav-link').forEach(link => {
        link.style.display = 'none';
    });
}

function showRegister() {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('register-section').classList.add('active');
}

function showDashboard() {
    showSection('dashboard');
    
    // Show navigation items
    document.querySelectorAll('.nav-link').forEach(link => {
        link.style.display = 'block';
    });
    
    // Update user info
    document.getElementById('user-name').textContent = currentUser.username;
    document.getElementById('user-role').textContent = currentUser.role;
    
    // Show role-specific dashboard
    if (currentUser.role === 'instructor') {
        document.getElementById('instructor-dashboard').style.display = 'block';
        document.getElementById('player-dashboard').style.display = 'none';
        document.getElementById('create-quiz-link').style.display = 'block';
        document.getElementById('live-sessions-link').style.display = 'block';
        document.getElementById('available-quizzes-link').style.display = 'none';
    } else {
        document.getElementById('instructor-dashboard').style.display = 'none';
        document.getElementById('player-dashboard').style.display = 'block';
        document.getElementById('create-quiz-link').style.display = 'none';
        document.getElementById('live-sessions-link').style.display = 'none';
        document.getElementById('available-quizzes-link').style.display = 'block';
    }
}

// Quiz creation functions
let questionCount = 0;

function addQuestion() {
    questionCount++;
    const questionsList = document.getElementById('questions-list');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.innerHTML = `
        <div class="question-header">
            <span class="question-number">Question ${questionCount}</span>
            <button type="button" class="remove-question" onclick="removeQuestion(this)">
                <i class="fas fa-trash"></i> Remove
            </button>
        </div>
        <div class="form-group">
            <label>Question Text</label>
            <input type="text" name="question-text" required>
        </div>
        <div class="options-container">
            <label>Options (select the correct answer)</label>
            <div class="option-item">
                <input type="radio" name="correct-answer-${questionCount}" value="0" required>
                <input type="text" name="option" placeholder="Option 1" required>
            </div>
            <div class="option-item">
                <input type="radio" name="correct-answer-${questionCount}" value="1" required>
                <input type="text" name="option" placeholder="Option 2" required>
            </div>
            <div class="option-item">
                <input type="radio" name="correct-answer-${questionCount}" value="2" required>
                <input type="text" name="option" placeholder="Option 3" required>
            </div>
            <div class="option-item">
                <input type="radio" name="correct-answer-${questionCount}" value="3" required>
                <input type="text" name="option" placeholder="Option 4" required>
            </div>
        </div>
        <div class="time-limit-group">
            <label>Time Limit:</label>
            <input type="number" name="time-limit" value="30" min="10" max="300" required>
            <span>seconds</span>
        </div>
    `;
    
    questionsList.appendChild(questionDiv);
}

function removeQuestion(button) {
    button.closest('.question-item').remove();
    updateQuestionNumbers();
}

function updateQuestionNumbers() {
    const questions = document.querySelectorAll('.question-item');
    questions.forEach((question, index) => {
        const questionNumber = question.querySelector('.question-number');
        questionNumber.textContent = `Question ${index + 1}`;
        
        // Update radio button names
        const radioButtons = question.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.name = `correct-answer-${index + 1}`;
        });
    });
    questionCount = questions.length;
}

async function handleCreateQuiz(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const isLiveOnly = formData.get('isLiveOnly') === 'true';
    
    // Collect questions
    const questions = [];
    const questionItems = document.querySelectorAll('.question-item');
    
    questionItems.forEach((item, index) => {
        const questionText = item.querySelector('input[name="question-text"]').value;
        const options = Array.from(item.querySelectorAll('input[name="option"]')).map(input => input.value);
        const correctAnswer = parseInt(item.querySelector(`input[name="correct-answer-${index + 1}"]:checked`).value);
        const timeLimit = parseInt(item.querySelector('input[name="time-limit"]').value);
        
        questions.push({
            text: questionText,
            options: options,
            correctAnswer: correctAnswer,
            timeLimit: timeLimit
        });
    });
    
    const quizData = {
        title: title,
        questions: questions,
        isLiveOnly: isLiveOnly
    };
    
    try {
        const response = await fetch('/quizzes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(quizData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Quiz created successfully!', 'success');
            document.getElementById('create-quiz-form').reset();
            document.getElementById('questions-list').innerHTML = '';
            questionCount = 0;
            showSection('dashboard');
        } else {
            showToast(data.message || 'Failed to create quiz', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Quiz loading functions
async function loadAvailableQuizzes() {
    showLoading(true);
    
    try {
        const response = await fetch('/quizzes/available', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const quizzes = await response.json();
        
        if (response.ok) {
            displayQuizzes(quizzes, 'quizzes-list', true);
        } else {
            showToast('Failed to load quizzes', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadMyQuizzes() {
    showLoading(true);
    
    try {
        const response = await fetch('/quizzes', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const quizzes = await response.json();
        
        if (response.ok) {
            // Filter quizzes created by current user
            const myQuizzes = quizzes.filter(quiz => quiz.createdBy._id === currentUser.id);
            displayQuizzes(myQuizzes, 'my-quizzes-list', false);
        } else {
            showToast('Failed to load quizzes', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayQuizzes(quizzes, containerId, showTakeButton) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: white; font-size: 1.2rem;">No quizzes available</p>';
        return;
    }
    
    quizzes.forEach(quiz => {
        const quizCard = document.createElement('div');
        quizCard.className = 'quiz-card';
        quizCard.innerHTML = `
            <h3>${quiz.title}</h3>
            <p><i class="fas fa-question-circle"></i> ${quiz.questions.length} questions</p>
            <p><i class="fas fa-user"></i> Created by: ${quiz.createdBy.username}</p>
            <p><i class="fas fa-calendar"></i> ${new Date(quiz.createdAt).toLocaleDateString()}</p>
            <div class="quiz-meta">
                <span class="quiz-type ${quiz.isLiveOnly ? 'live-only' : ''}">
                    ${quiz.isLiveOnly ? 'Live Only' : 'Available Anytime'}
                </span>
                ${showTakeButton ? `<button class="btn btn-primary" onclick="startQuiz('${quiz._id}')">
                    <i class="fas fa-play"></i> Take Quiz
                </button>` : `<button class="btn btn-secondary" onclick="editQuiz('${quiz._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>`}
            </div>
        `;
        container.appendChild(quizCard);
    });
}

// Quiz taking functions
async function startQuiz(quizId) {
    showLoading(true);
    
    try {
        const response = await fetch(`/quiz-sessions/${quizId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentQuiz = data.quiz;
            currentSession = data.session;
            currentQuestionIndex = 0;
            quizScore = 0;
            totalQuestions = currentQuiz.totalQuestions;
            
            showSection('quiz-taking');
            loadQuestion(0);
        } else {
            showToast(data.message || 'Failed to start quiz', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadQuestion(questionIndex) {
    showLoading(true);
    
    try {
        const response = await fetch(`/quiz-sessions/${currentQuiz._id}/question/${questionIndex}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayQuestion(data);
            startTimer(data.question.timeLimit);
        } else {
            showToast(data.message || 'Failed to load question', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayQuestion(questionData) {
    document.getElementById('quiz-title-display').textContent = questionData.quizTitle;
    document.getElementById('question-counter').textContent = 
        `Question ${questionData.questionIndex + 1} of ${questionData.totalQuestions}`;
    document.getElementById('question-text').textContent = questionData.question.text;
    
    const optionsContainer = document.getElementById('question-options');
    optionsContainer.innerHTML = '';
    
    questionData.question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.innerHTML = `
            <input type="radio" name="answer" value="${index}" id="option-${index}">
            <label for="option-${index}">${option}</label>
        `;
        optionDiv.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(optionDiv);
    });
    
    selectedAnswer = null;
    document.getElementById('submit-answer').disabled = true;
}

function selectOption(index) {
    // Remove previous selection
    document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selection to clicked option
    document.querySelectorAll('.option')[index].classList.add('selected');
    document.getElementById(`option-${index}`).checked = true;
    
    selectedAnswer = index;
    document.getElementById('submit-answer').disabled = false;
}

function startTimer(duration) {
    timeRemaining = duration;
    updateTimerDisplay();
    
    timer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timer);
            submitAnswer(); // Auto-submit when time runs out
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById('time-remaining').textContent = timeRemaining;
    
    // Change color based on remaining time
    const timerElement = document.getElementById('timer');
    if (timeRemaining <= 10) {
        timerElement.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
    } else if (timeRemaining <= 20) {
        timerElement.style.background = 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)';
    } else {
        timerElement.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
    }
}

async function submitAnswer() {
    if (timer) {
        clearInterval(timer);
    }
    
    const answerIndex = selectedAnswer !== null ? selectedAnswer : -1; // -1 for no answer
    
    showLoading(true);
    
    try {
        const response = await fetch(`/quiz-sessions/${currentQuiz._id}/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                questionIndex: currentQuestionIndex,
                answerIndex: answerIndex,
                timeSpent: timeRemaining
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.isCorrect) {
                quizScore++;
                showToast('Correct!', 'success');
            } else {
                showToast(data.explanation, 'error');
            }
            
            // Move to next question or show results
            setTimeout(() => {
                if (data.nextQuestionIndex !== null) {
                    currentQuestionIndex = data.nextQuestionIndex;
                    loadQuestion(currentQuestionIndex);
                } else {
                    showQuizResults();
                }
            }, 2000);
        } else {
            showToast(data.message || 'Failed to submit answer', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function nextQuestion() {
    if (!currentSession) {
        showToast('No active session found', 'error');
        return;
    }
    
    if (currentSession.questionStarted) {
        showToast('Please end current question first', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/live-sessions/${currentSession.sessionid}/next-question`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Moved to next question', 'success');
            currentSession.currentQuestionIndex = data.currentQuestionIndex;
            currentSession.questionStarted = false;
            document.getElementById('current-question-num').textContent = (data.currentQuestionIndex + 1);
            updateInstructorControls(currentSession);
        } else {
            showToast(data.message || 'Failed to move to next question', 'error');
        }
    } catch (error) {
        console.error('Error moving to next question:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Update the endSession function for instructors
async function endSession() {
    if (!currentSession) {
        showToast('No active session found', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to end this session?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/live-sessions/${currentSession.sessionid}/end`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Session ended successfully', 'success');
            document.getElementById('active-session').style.display = 'none';
            
            // Show instructor leaderboard
            displayInstructorResults(data.leaderboard, currentSession.sessionid);
            currentSession = null;
        } else {
            showToast(data.message || 'Failed to end session', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// New function to show instructor results
function displayInstructorResults(leaderboard, sessionId) {
    showSection('instructor-results');
    
    document.getElementById('instructor-session-id').textContent = sessionId;
    
    const container = document.getElementById('instructor-leaderboard');
    container.innerHTML = '';
    
    if (leaderboard.length === 0) {
        container.innerHTML = '<p>No participants found</p>';
        return;
    }
    
    leaderboard.forEach(participant => {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'leaderboard-item';
        
        let rankClass = '';
        if (participant.rank === 1) rankClass = 'first-place';
        else if (participant.rank === 2) rankClass = 'second-place';
        else if (participant.rank === 3) rankClass = 'third-place';
        
        participantDiv.innerHTML = `
            <div class="rank ${rankClass}">${participant.rank}</div>
            <div class="participant-info">
                <span class="username">${participant.username}</span>
                <span class="score">${participant.score}/${participant.totalQuestions} (${participant.percentage}%)</span>
            </div>
        `;
        
        container.appendChild(participantDiv);
    });
}

function showQuizResults() {
    showSection('results');
    
    document.getElementById('final-score').textContent = quizScore;
    document.getElementById('total-questions').textContent = totalQuestions;
    
    const percentage = Math.round((quizScore / totalQuestions) * 100);
    document.getElementById('score-percentage').textContent = percentage + '%';
    
    // Reset quiz state
    currentQuiz = null;
    currentSession = null;
    currentQuestionIndex = 0;
    selectedAnswer = null;
}

// Live session functions
async function loadLiveSessions() {
    if (currentUser.role === 'instructor') {
        document.getElementById('instructor-live-controls').style.display = 'block';
        document.getElementById('player-live-controls').style.display = 'none';
        await loadQuizzesForLiveSession();
    } else {
        document.getElementById('instructor-live-controls').style.display = 'none';
        document.getElementById('player-live-controls').style.display = 'block';
        await loadAvailableLiveSessions();
    }
}

async function loadQuizzesForLiveSession() {
    try {
        const response = await fetch('/quizzes', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const quizzes = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('live-quiz-select');
            select.innerHTML = '<option value="">Choose a quiz...</option>';
            
            // Filter to show only quizzes created by current instructor
            const myQuizzes = quizzes.filter(quiz => quiz.createdBy._id === currentUser.id);
            
            myQuizzes.forEach(quiz => {
                const option = document.createElement('option');
                option.value = quiz._id;
                option.textContent = `${quiz.title} (${quiz.questions.length} questions)`;
                select.appendChild(option);
            });
            
            if (myQuizzes.length === 0) {
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "No quizzes available - Create a quiz first";
                option.disabled = true;
                select.appendChild(option);
            }
        }
    } catch (error) {
        console.error('Error loading quizzes:', error);
        showToast('Failed to load quizzes', 'error');
    }
}

async function handleStartLiveSession(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const quizId = formData.get('quizId'); // This should match the select name
    const sessionId = formData.get('sessionId');
    
    console.log('Starting live session with quizId:', quizId); // Debug log
    
    if (!quizId) {
        showToast('Please select a quiz first', 'error');
        showLoading(false);
        return;
    }
    
    const sessionData = {
        quizId: quizId,
        sessionid: sessionId || undefined
    };
    
    try {
        const response = await fetch('/live-sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(sessionData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Live session started successfully!', 'success');
            displayActiveSession(data);
            document.getElementById('start-live-session-form').reset();
        } else {
            console.error('Server error:', data);
            showToast(data.message || 'Failed to start live session', 'error');
        }
    } catch (error) {
        console.error('Network error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayActiveSession(session) {
    document.getElementById('active-session').style.display = 'block';
    document.getElementById('active-session-id').textContent = session.sessionid;
    
    if (session.quizId && session.quizId.title) {
        document.getElementById('active-quiz-title').textContent = session.quizId.title;
    }
    
    document.getElementById('current-question-num').textContent = (session.currentQuestionIndex + 1);
    document.getElementById('participants-count').textContent = session.participants.length;
    
    // Store current session
    currentSession = session;
    
    // Update control buttons based on question state
    updateInstructorControls(session);
}

function updateInstructorControls(session) {
    const controlsContainer = document.querySelector('.session-controls');
    if (!controlsContainer) return;
    
    const questionStarted = session.questionStarted || false;
    const totalQuestions = session.quizId?.questions?.length || 0;
    const currentIndex = session.currentQuestionIndex || 0;
    const hasMoreQuestions = currentIndex < totalQuestions - 1;
    
    controlsContainer.innerHTML = `
        ${!questionStarted ? `
            <button class="btn btn-success" onclick="startCurrentQuestion()">
                <i class="fas fa-play"></i> Start Question ${currentIndex + 1}
            </button>
        ` : `
            <button class="btn btn-warning" onclick="endCurrentQuestion()">
                <i class="fas fa-pause"></i> End Current Question
            </button>
        `}
        
        ${hasMoreQuestions ? `
            <button class="btn btn-primary" onclick="nextQuestion()" ${questionStarted ? 'disabled' : ''}>
                <i class="fas fa-forward"></i> Next Question
            </button>
        ` : ''}
        
        <button class="btn btn-danger" onclick="endSession()">
            <i class="fas fa-stop"></i> End Session
        </button>
        
        <div class="session-status">
            <p><strong>Status:</strong> ${questionStarted ? 'Question Active' : 'Waiting to Start'}</p>
            <p><strong>Progress:</strong> ${currentIndex + 1} / ${totalQuestions}</p>
        </div>
    `;
}

async function loadAvailableLiveSessions() {
    showLoading(true);
    
    try {
        const response = await fetch('/live-sessions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const sessions = await response.json();
        console.log('Loaded live sessions:', sessions); // Debug log
        
        if (response.ok) {
            displayLiveSessions(sessions);
        } else {
            console.error('Failed to load sessions:', sessions);
            showToast('Failed to load live sessions', 'error');
        }
    } catch (error) {
        console.error('Network error loading sessions:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayLiveSessions(sessions) {
    const container = document.getElementById('live-sessions-grid');
    if (!container) {
        console.error('live-sessions-grid container not found');
        return;
    }
    
    container.innerHTML = '';
    
    console.log('Displaying sessions:', sessions.length); // Debug log
    
    if (sessions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: white; font-size: 1.2rem;">No active live sessions available</p>';
        return;
    }
    
    sessions.forEach(session => {
        console.log('Session data:', session); // Debug log
        
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'quiz-card';
        sessionDiv.innerHTML = `
            <h3>${session.quizId ? session.quizId.title : 'Unknown Quiz'}</h3>
            <p><i class="fas fa-id-card"></i> Session ID: <strong>${session.sessionid}</strong></p>
            <p><i class="fas fa-users"></i> Participants: ${session.participants ? session.participants.length : 0}</p>
            <p><i class="fas fa-question-circle"></i> Current Question: ${(session.currentQuestionIndex || 0) + 1}</p>
            <button class="btn btn-primary" onclick="joinLiveSession('${session.sessionid}')">
                <i class="fas fa-sign-in-alt"></i> Join Session
            </button>
        `;
        container.appendChild(sessionDiv);
    });
}

async function handleJoinLiveSession(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const sessionId = formData.get('sessionId');
    
    if (!sessionId || sessionId.trim() === '') {
        showToast('Please enter a Session ID', 'error');
        return;
    }
    
    await joinLiveSession(sessionId.trim());
}

async function joinLiveSession(sessionId) {
    if (!sessionId) {
        showToast('Session ID is required', 'error');
        return;
    }
    
    console.log('Attempting to join session:', sessionId); // Debug log
    showLoading(true);
    
    try {
        const response = await fetch(`/live-sessions/${sessionId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        console.log('Join session response:', data); // Debug log
        
        if (response.ok) {
            showToast('Successfully joined live session!', 'success');
            currentSession = data;
            
            // Show live session interface for player
            showLiveSessionPlayer(data);
        } else {
            console.error('Join session error:', data);
            showToast(data.message || 'Failed to join session', 'error');
        }
    } catch (error) {
        console.error('Network error joining session:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function showLiveSessionPlayer(sessionData) {
    console.log('Showing live session player with data:', sessionData);
    
    showSection('live-session-player');
    
    // Update session info
    const sessionIdElement = document.getElementById('player-session-id');
    const quizTitleElement = document.getElementById('player-quiz-title');
    const currentQuestionElement = document.getElementById('player-current-question');
    
    if (sessionIdElement) {
        sessionIdElement.textContent = sessionData.sessionid || 'Unknown';
    }
    
    if (quizTitleElement) {
        quizTitleElement.textContent = sessionData.quizId?.title || 'Loading...';
    }
    
    if (currentQuestionElement) {
        currentQuestionElement.textContent = (sessionData.currentQuestionIndex || 0) + 1;
    }
    
    currentSession = sessionData;
    
    // Only show question if it's marked as started
    if (sessionData.questionStarted && sessionData.currentQuestion) {
        const questionId = sessionData.currentQuestion._id;
        if (currentDisplayedQuestionId !== questionId) {
            displayLiveQuestion(sessionData.currentQuestion, sessionData.currentQuestionIndex);
            currentDisplayedQuestionId = questionId;
            isQuestionActive = true;
        }
    } else {
        showWaitingScreen();
        isQuestionActive = false;
        currentDisplayedQuestionId = null;
    }
    
    pollSessionUpdates(sessionData.sessionid);
}

function showWaitingScreen() {
    const waitingArea = document.getElementById('waiting-for-question');
    const questionArea = document.getElementById('live-question-display');
    
    if (waitingArea) waitingArea.style.display = 'block';
    if (questionArea) questionArea.style.display = 'none';
    
    // Clear timer when showing waiting screen
    if (questionTimerInterval) {
        clearInterval(questionTimerInterval);
        questionTimerInterval = null;
    }
}

function displayLiveQuestion(question, questionIndex) {
    console.log('Displaying live question:', question);
    
    const waitingArea = document.getElementById('waiting-for-question');
    const questionArea = document.getElementById('live-question-display');
    
    if (waitingArea) waitingArea.style.display = 'none';
    if (questionArea) {
        questionArea.style.display = 'block';
        
        questionArea.innerHTML = `
            <div class="live-question-container">
                <div class="question-header">
                    <h3>Question ${questionIndex + 1}</h3>
                    ${question.timeLimit ? `<div class="timer" id="question-timer">${question.timeLimit}s</div>` : ''}
                </div>
                
                <div class="question-text">
                    <h2>${question.text}</h2>
                </div>
                
                <div class="answer-options">
                    ${question.options.map((option, index) => `
                        <button class="answer-option" onclick="submitLiveAnswer(${index})" data-option="${index}">
                            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                            <span class="option-text">${option}</span>
                        </button>
                    `).join('')}
                </div>
                
                <div class="answer-status" id="answer-status" style="display: none;">
                    <p>Answer submitted! Waiting for next question...</p>
                </div>
            </div>
        `;
        
        // Start timer only once
        if (question.timeLimit) {
            startQuestionTimer(question.timeLimit);
        }
    }
}

function startQuestionTimer(timeLimit) {
    // Clear any existing timer first
    if (questionTimerInterval) {
        clearInterval(questionTimerInterval);
    }
    
    let timeLeft = timeLimit;
    const timerElement = document.getElementById('question-timer');
    
    if (!timerElement) return;
    
    questionTimerInterval = setInterval(() => {
        timeLeft--;
        if (timerElement) {
            timerElement.textContent = `${timeLeft}s`;
            
            if (timeLeft <= 5) {
                timerElement.style.color = '#ff4757';
                timerElement.style.animation = 'pulse 1s infinite';
            }
        }
        
        if (timeLeft <= 0) {
            clearInterval(questionTimerInterval);
            questionTimerInterval = null;
            
            // Auto-disable answers when time is up
            const answerButtons = document.querySelectorAll('.answer-option');
            answerButtons.forEach(btn => btn.disabled = true);
            showToast('Time is up!', 'warning');
        }
    }, 1000);
}

// Fix 6: Enhanced session polling with question updates
// function pollSessionUpdates(sessionId) {
//     if (sessionPollInterval) {
//         clearInterval(sessionPollInterval);
//     }
    
//     sessionPollInterval = setInterval(async () => {
//         try {
//             const response = await fetch(`/live-sessions/${sessionId}`, {
//                 headers: {
//                     'Authorization': `Bearer ${localStorage.getItem('token')}`
//                 }
//             });
            
//             if (response.ok) {
//                 const sessionData = await response.json();
                
//                 // Check if session has ended
//                 if (!sessionData.isActive) {
//                     console.log('Session ended, loading results...');
//                     showToast('Session has ended! Loading results...', 'info');
//                     stopSessionPolling();
//                     await showSessionResults(sessionId);
//                     return;
//                 }
                
//                 updatePlayerSessionUI(sessionData);
//             } else if (response.status === 404) {
//                 console.log('Session not found, loading results...');
//                 showToast('Session has ended', 'info');
//                 stopSessionPolling();
//                 await showSessionResults(sessionId);
//             }
//         } catch (error) {
//             console.error('Error polling session updates:', error);
//             // Don't stop polling on network errors, just log them
//         }
//     }, 2000);
// }

async function showSessionResults(sessionId) {
    showLoading(true);
    
    try {
        const response = await fetch(`/live-sessions/${sessionId}/results`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const resultsData = await response.json();
            displaySessionResults(resultsData);
        } else {
            console.error('Failed to load session results');
            showToast('Failed to load session results', 'error');
            showSection('dashboard');
        }
    } catch (error) {
        console.error('Error loading session results:', error);
        showToast('Network error loading results', 'error');
        showSection('dashboard');
    } finally {
        showLoading(false);
    }
}

// New function to display session results
function displaySessionResults(resultsData) {
    showSection('session-results');
    
    const { session, leaderboard, userResults, allQuestions } = resultsData;
    
    // Update session info
    document.getElementById('results-session-id').textContent = session.sessionId;
    document.getElementById('results-quiz-title').textContent = session.quizTitle;
    
    // Show user's performance
    if (userResults) {
        document.getElementById('user-final-score').textContent = userResults.score;
        document.getElementById('user-total-questions').textContent = userResults.totalQuestions;
        document.getElementById('user-percentage').textContent = userResults.percentage + '%';
        
        // Show detailed answers
        displayDetailedAnswers(userResults.answers);
    }
    
    // Show leaderboard
    displayLeaderboard(leaderboard);
    
    // Reset session state
    currentSession = null;
    currentDisplayedQuestionId = null;
    isQuestionActive = false;
}

// New function to display detailed answers
function displayDetailedAnswers(answers) {
    const container = document.getElementById('detailed-answers');
    container.innerHTML = '';
    
    answers.forEach((answer, index) => {
        const answerDiv = document.createElement('div');
        answerDiv.className = `answer-review ${answer.isCorrect ? 'correct' : 'incorrect'}`;
        
        answerDiv.innerHTML = `
            <div class="question-review-header">
                <h4>Question ${answer.questionIndex + 1}</h4>
                <span class="result-badge ${answer.isCorrect ? 'correct' : 'incorrect'}">
                    ${answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
            </div>
            <p class="question-text">${answer.questionText}</p>
            <div class="options-review">
                ${answer.options.map((option, optionIndex) => {
                    let className = 'option-review';
                    if (optionIndex === answer.correctAnswer) {
                        className += ' correct-answer';
                    }
                    if (optionIndex === answer.selectedAnswer && !answer.isCorrect) {
                        className += ' wrong-answer';
                    }
                    if (optionIndex === answer.selectedAnswer) {
                        className += ' selected';
                    }
                    
                    return `
                        <div class="${className}">
                            <span class="option-letter">${String.fromCharCode(65 + optionIndex)}</span>
                            <span class="option-text">${option}</span>
                            ${optionIndex === answer.selectedAnswer ? '<span class="selection-indicator">Your Answer</span>' : ''}
                            ${optionIndex === answer.correctAnswer ? '<span class="correct-indicator">Correct Answer</span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        container.appendChild(answerDiv);
    });
}

// New function to display leaderboard
function displayLeaderboard(leaderboard) {
    const container = document.getElementById('session-leaderboard');
    container.innerHTML = '';
    
    if (leaderboard.length === 0) {
        container.innerHTML = '<p>No participants found</p>';
        return;
    }
    
    leaderboard.forEach(participant => {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'leaderboard-item';
        
        let rankClass = '';
        if (participant.rank === 1) rankClass = 'first-place';
        else if (participant.rank === 2) rankClass = 'second-place';
        else if (participant.rank === 3) rankClass = 'third-place';
        
        participantDiv.innerHTML = `
            <div class="rank ${rankClass}">${participant.rank}</div>
            <div class="participant-info">
                <span class="username">${participant.username}</span>
                <span class="score">${participant.score}/${participant.totalQuestions} (${participant.percentage}%)</span>
            </div>
        `;
        
        container.appendChild(participantDiv);
    });
}

function showResultsTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

async function startCurrentQuestion() {
    if (!currentSession) {
        showToast('No active session found', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/live-sessions/${currentSession.sessionid}/start-question`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Question started!', 'success');
            currentSession = data.session;
            updateInstructorControls(currentSession);
        } else {
            showToast(data.message || 'Failed to start question', 'error');
        }
    } catch (error) {
        console.error('Error starting question:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function endCurrentQuestion() {
    if (!currentSession) {
        showToast('No active session found', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/live-sessions/${currentSession.sessionid}/end-question`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Question ended', 'success');
            currentSession.questionStarted = false;
            updateInstructorControls(currentSession);
        } else {
            showToast(data.message || 'Failed to end question', 'error');
        }
    } catch (error) {
        console.error('Error ending question:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function leaveLiveSession() {
    stopSessionPolling();
    
    // Clear all timers and state
    if (questionTimerInterval) {
        clearInterval(questionTimerInterval);
        questionTimerInterval = null;
    }
    
    // Reset state variables
    currentDisplayedQuestionId = null;
    isQuestionActive = false;
    currentSession = null;
    
    showSection('dashboard');
    showToast('Left live session', 'success');
}

function stopSessionPolling() {
    if (sessionPollInterval) {
        clearInterval(sessionPollInterval);
        sessionPollInterval = null;
    }
}

async function submitLiveAnswer(optionIndex) {
    if (!currentSession) {
        showToast('No active session found', 'error');
        return;
    }
    
    // Disable all answer buttons
    const answerButtons = document.querySelectorAll('.answer-option');
    answerButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.option == optionIndex) {
            btn.classList.add('selected');
        }
    });
    
    try {
        const response = await fetch(`/live-sessions/${currentSession.sessionid}/submit-answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                questionIndex: currentSession.currentQuestionIndex,
                selectedOption: optionIndex
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('answer-status').style.display = 'block';
            showToast(`Answer submitted! ${data.isCorrect ? 'Correct!' : 'Incorrect'}`, data.isCorrect ? 'success' : 'error');
        } else {
            showToast(data.message || 'Failed to submit answer', 'error');
            // Re-enable buttons if submission failed
            answerButtons.forEach(btn => btn.disabled = false);
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        showToast('Network error. Please try again.', 'error');
        // Re-enable buttons if submission failed
        answerButtons.forEach(btn => btn.disabled = false);
    }
}

function pollSessionUpdates(sessionId) {
    if (sessionPollInterval) {
        clearInterval(sessionPollInterval);
    }
    
    sessionPollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/live-sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const sessionData = await response.json();
                
                // Check if session has ended
                if (!sessionData.isActive) {
                    console.log('Session ended, loading results...');
                    showToast('Session has ended! Loading results...', 'info');
                    stopSessionPolling();
                    await showSessionResults(sessionId);
                    return;
                }
                
                updatePlayerSessionUI(sessionData);
            } else if (response.status === 404) {
                console.log('Session not found, loading results...');
                showToast('Session has ended', 'info');
                stopSessionPolling();
                await showSessionResults(sessionId);
            }
        } catch (error) {
            console.error('Error polling session updates:', error);
            // Don't stop polling on network errors, just log them
        }
    }, 2000);
}

function stopSessionPolling() {
    if (sessionPollInterval) {
        clearInterval(sessionPollInterval);
        sessionPollInterval = null;
    }
}

function updatePlayerSessionUI(sessionData) {
    console.log('Updating player UI with session data:', sessionData);
    
    // Update question number
    const currentQuestionElement = document.getElementById('player-current-question');
    if (currentQuestionElement) {
        currentQuestionElement.textContent = (sessionData.currentQuestionIndex || 0) + 1;
    }
    
    // Update quiz title if needed
    const quizTitleElement = document.getElementById('player-quiz-title');
    if (quizTitleElement && sessionData.quizId?.title) {
        quizTitleElement.textContent = sessionData.quizId.title;
    }
    
    // Check if we should show/hide question based on questionStarted flag
    if (sessionData.questionStarted && sessionData.currentQuestion) {
        const questionId = sessionData.currentQuestion._id;
        
        // Only display if it's a new question or question wasn't active before
        if (currentDisplayedQuestionId !== questionId || !isQuestionActive) {
            console.log('Displaying new question:', questionId);
            displayLiveQuestion(sessionData.currentQuestion, sessionData.currentQuestionIndex);
            currentDisplayedQuestionId = questionId;
            isQuestionActive = true;
        }
    } else {
        // Question not started or no current question - show waiting screen
        if (isQuestionActive) {
            console.log('Question ended, showing waiting screen');
            showWaitingScreen();
            isQuestionActive = false;
            currentDisplayedQuestionId = null;
        }
    }
    
    currentSession = sessionData;
}

// Utility functions
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('active');
}

// Initialize with first question when creating quiz
document.addEventListener('DOMContentLoaded', function() {
    // Add first question by default when create quiz section is shown
    const createQuizSection = document.getElementById('create-quiz-section');
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (createQuizSection.classList.contains('active') && questionCount === 0) {
                    addQuestion();
                }
            }
        });
    });
    observer.observe(createQuizSection, { attributes: true });
});