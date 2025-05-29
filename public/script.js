let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let currentSession = null;
let timer = null;
let timeRemaining = 0;
let selectedAnswer = null;
let quizScore = 0;
let totalQuestions = 0;

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
    document.getElementById('join-session-form').addEventListener('submit', handleJoinSession);
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
            
            quizzes.forEach(quiz => {
                const option = document.createElement('option');
                option.value = quiz._id;
                option.textContent = quiz.title;
                select.appendChild(option);
            });
        }
    } catch (error) {
        showToast('Failed to load quizzes', 'error');
    }
}

async function handleStartLiveSession(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const sessionData = {
        quizId: formData.get('quizId'),
        sessionid: formData.get('sessionId') || undefined
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
            showToast('Live session started!', 'success');
            displayActiveSession(data);
        } else {
            showToast(data.message || 'Failed to start live session', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayActiveSession(session) {
    document.getElementById('active-session').style.display = 'block';
    document.getElementById('active-session-id').textContent = session.sessionid;
    // Additional session display logic would go here
}

async function loadAvailableLiveSessions() {
    try {
        const response = await fetch('/live-sessions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const sessions = await response.json();
        
        if (response.ok) {
            displayLiveSessions(sessions);
        }
    } catch (error) {
        showToast('Failed to load live sessions', 'error');
    }
}

function displayLiveSessions(sessions) {
    const container = document.getElementById('live-sessions-list');
    container.innerHTML = '';
    
    if (sessions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No active live sessions</p>';
        return;
    }
    
    sessions.forEach(session => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'quiz-card';
        sessionDiv.innerHTML = `
            <h3>${session.quizId.title}</h3>
            <p><i class="fas fa-id-card"></i> Session ID: ${session.sessionid}</p>
            <p><i class="fas fa-users"></i> Participants: ${session.participants.length}</p>
            <button class="btn btn-primary" onclick="joinLiveSession('${session.sessionid}')">
                <i class="fas fa-sign-in-alt"></i> Join Session
            </button>
        `;
        container.appendChild(sessionDiv);
    });
}

async function handleJoinSession(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const sessionId = formData.get('sessionId');
    await joinLiveSession(sessionId);
}

async function handleJoinLiveSession(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const sessionId = formData.get('sessionId');
    await joinLiveSession(sessionId);
}

async function joinLiveSession(sessionId) {
    showLoading(true);
    
    try {
        const response = await fetch(`/live-sessions/${sessionId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Joined live session!', 'success');
            // Handle live session UI
        } else {
            showToast(data.message || 'Failed to join session', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
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