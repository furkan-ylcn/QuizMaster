const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserModel = require('./models/Users');
const { QuizModel } = require('./models/Quizzes');
const LiveSessionModel = require('./models/LiveSessions');
const { passport, generateToken } = require('./config/passport');
const { requireAuth, requireSignIn, requireRole } = require('./middleware/auth');

const app = express();
app.use(express.json());
app.use(passport.initialize());

// Serve static files (frontend)
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb+srv://furkanyalcin07:FGP5hnZV0kHbqqEU@quizdb.rqihj3o.mongodb.net/quizDB?retryWrites=true&w=majority&appName=QuizDB')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect MongoDB : ', err));

// Auth: login and profile
app.post('/login', requireSignIn, (req, res) => {
    const token = generateToken(req.user);
    res.json({ token, user: { id: req.user._id, username: req.user.username, role: req.user.role } });
});

app.get('/profile', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// Instructor dashboard (protected route)
app.get('/instructor-dashboard', requireAuth, requireRole('instructor'), (req, res) => {
    res.json({ message: 'Welcome to the instructor dashboard' });
});

// Get all users (protected)
app.get('/getUsers', requireAuth, async (req, res) => {
    try {
        const allUsers = await UserModel.find({});
        res.send(allUsers);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Create a new user
app.post('/createUser', async (req, res) => {
    try {
        const newUser = await UserModel.create(req.body);
        res.status(201).json(newUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update user info (user or instructor)
app.put('/updateUser/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        // Only instructor or the user themself can update
        if (req.user.role !== 'instructor' && req.user._id.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to update this user' });
        }

        // Hash password if updated
        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        }

        const updatedUser = await UserModel.findByIdAndUpdate(userId, updates, { new: true });
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });

        res.json(updatedUser);
    } catch (err) {
        if (err.name === 'MongoServerError' && err.code === 11000) {
            return res.status(400).json({ error: 'Username or email already exists.' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

// Delete user (instructor only)
app.delete('/deleteUser/:userId', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { userId } = req.params;
        const deletedUser = await UserModel.findByIdAndDelete(userId);
        if (!deletedUser) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new quiz (instructor only)
app.post('/quizzes', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { title, questions, isLiveOnly } = req.body;
        const newQuiz = new QuizModel({
            title,
            questions,
            isLiveOnly: isLiveOnly || false,
            createdBy: req.user._id 
        });
        await newQuiz.save();
        res.status(201).json(newQuiz);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all quizzes
app.get('/quizzes', requireAuth, async (req, res) => {
    try {
        const quizzes = await QuizModel.find().populate('createdBy', 'username');
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get available (non-live) quizzes for players
app.get('/quizzes/available', requireAuth, async (req, res) => {
    try {
        const quizzes = await QuizModel.find({ isLiveOnly: false }).populate('createdBy', 'username');
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific quiz
app.get('/quizzes/:quizId', requireAuth, async (req, res) => {
    try {
        const quiz = await QuizModel.findById(req.params.quizId).populate('createdBy', 'username');
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a quiz (instructor only)
app.put('/quizzes/:quizId', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { title, questions, isLiveOnly } = req.body;
        const quiz = await QuizModel.findById(req.params.quizId);

        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        quiz.title = title || quiz.title;
        quiz.questions = questions || quiz.questions;
        quiz.isLiveOnly = isLiveOnly !== undefined ? isLiveOnly : quiz.isLiveOnly;
        
        const updatedQuiz = await quiz.save();
        res.json(updatedQuiz);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a quiz (instructor only)
app.delete('/quizzes/:quizId', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const quiz = await QuizModel.findById(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        await QuizModel.findByIdAndDelete(req.params.quizId);
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Start a standalone quiz session (not live)
app.post('/quiz-sessions/:quizId/start', requireAuth, async (req, res) => {
    try {
        const quiz = await QuizModel.findById(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        if (quiz.isLiveOnly) return res.status(400).json({ message: 'This quiz is only available in live sessions' });

        const sessionData = {
            quizId: quiz._id,
            userId: req.user._id,
            startTime: new Date(),
            currentQuestionIndex: 0,
            answers: [],
            score: 0,
            isCompleted: false
        };

        const quizData = {
            _id: quiz._id.toString(),
            title: quiz.title,
            description: quiz.description,
            questions: quiz.questions,
            totalQuestions: quiz.questions ? quiz.questions.length : 0
        };

        res.json({
            message: 'Quiz session started',
            session: sessionData,
            quiz: quizData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific question in a quiz session
app.get('/quiz-sessions/:quizId/question/:questionIndex', requireAuth, async (req, res) => {
    try {
        const { quizId, questionIndex } = req.params;
        const quiz = await QuizModel.findById(quizId);
        
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        if (quiz.isLiveOnly) return res.status(400).json({ message: 'This quiz is only available in live sessions' });
        
        const qIndex = parseInt(questionIndex);
        if (qIndex < 0 || qIndex >= quiz.questions.length) {
            return res.status(400).json({ message: 'Invalid question index' });
        }

        const question = quiz.questions[qIndex];
        res.json({
            questionIndex: qIndex,
            question: {
                text: question.text,
                options: question.options,
                timeLimit: question.timeLimit
            },
            totalQuestions: quiz.questions.length,
            quizTitle: quiz.title
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Submit answer for a quiz session question
app.post('/quiz-sessions/:quizId/answer', requireAuth, async (req, res) => {
    try {
        const { quizId } = req.params;
        const { questionIndex, answerIndex } = req.body;
        
        const quiz = await QuizModel.findById(quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        if (quiz.isLiveOnly) return res.status(400).json({ message: 'This quiz is only available in live sessions' });

        const qIndex = parseInt(questionIndex);
        if (qIndex < 0 || qIndex >= quiz.questions.length) {
            return res.status(400).json({ message: 'Invalid question index' });
        }

        const question = quiz.questions[qIndex];
        const isCorrect = question.correctAnswer === parseInt(answerIndex);
        
        res.json({
            isCorrect,
            correctAnswer: question.correctAnswer,
            explanation: isCorrect ? 'Correct!' : `Correct answer was: ${question.options[question.correctAnswer]}`,
            nextQuestionIndex: qIndex + 1 < quiz.questions.length ? qIndex + 1 : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Live session routes (for instructors and players)
app.post('/live-sessions', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { quizId, sessionid } = req.body;

        if (!quizId) {
            return res.status(400).json({ message: 'Quiz ID is required' });
        }

        // Only one active session per instructor
        const existingActiveSession = await LiveSessionModel.findOne({ 
            instructorId: req.user._id, 
            isActive: true 
        });

        if (existingActiveSession) {
            return res.status(400).json({ 
                message: 'You already have an active live session. Please end it before starting a new one.',
                existingSessionId: existingActiveSession.sessionid
            });
        }

        const quiz = await QuizModel.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found for this session' });
        }

        const newLiveSession = new LiveSessionModel({
            sessionid: sessionid || new mongoose.Types.ObjectId().toString(),
            quizId,
            instructorId: req.user._id,
        });

        await newLiveSession.save();

        // Return session with quiz info
        const populatedSession = await LiveSessionModel.findById(newLiveSession._id).populate('quizId', 'title questions');
        res.status(201).json(populatedSession);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all active live sessions
app.get('/live-sessions', requireAuth, async (req, res) => {
    try {
        const liveSessions = await LiveSessionModel.find({ isActive: true }).populate('quizId', 'title');
        res.json(liveSessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get instructor's active live session
app.get('/live-sessions/my-active', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const activeSession = await LiveSessionModel.findOne({ 
            instructorId: req.user._id, 
            isActive: true 
        }).populate('quizId', 'title questions');

        if (!activeSession) {
            return res.status(404).json({ message: 'No active session found' });
        }

        res.json(activeSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific live session (with current question if started)
app.get('/live-sessions/:sessionId', requireAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await LiveSessionModel.findOne({ sessionid: sessionId })
            .populate({
                path: 'quizId',
                select: 'title questions'
            });

        if (!session) {
            return res.status(404).json({ message: 'Live session not found' });
        }

        let responseData = session.toObject();

        // Add current question if started
        if (session.questionStarted && session.quizId && session.quizId.questions && session.quizId.questions.length > 0) {
            const currentQuestionIndex = session.currentQuestionIndex || 0;
            if (currentQuestionIndex < session.quizId.questions.length) {
                responseData.currentQuestion = session.quizId.questions[currentQuestionIndex];
            }
        } else {
            responseData.currentQuestion = null;
        }

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Join a live session as participant
app.post('/live-sessions/:sessionId/join', requireAuth, async (req, res) => {
    try {
        const liveSession = await LiveSessionModel.findOne({ sessionid: req.params.sessionId });
        if (!liveSession) return res.status(404).json({ message: 'Live session not found' });
        if (!liveSession.isActive) return res.status(400).json({ message: 'This session is not active' });

        const alreadyJoined = liveSession.participants.some(p => p.userId.equals(req.user._id));
        if (alreadyJoined) {
            return res.status(400).json({ message: 'You have already joined this session', session: liveSession });
        }

        liveSession.participants.push({ userId: req.user._id, score: 0 });
        await liveSession.save();
        res.json(liveSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Submit answer in a live session
app.post('/live-sessions/:sessionId/submit-answer', requireAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questionIndex, selectedOption } = req.body;
        const userId = req.user._id;

        const session = await LiveSessionModel.findOne({ sessionid: sessionId })
            .populate({
                path: 'quizId',
                select: 'title questions'
            });

        if (!session) {
            return res.status(404).json({ message: 'Live session not found' });
        }

        if (!session.isActive) {
            return res.status(400).json({ message: 'Session is not active' });
        }

        // Find the participant
        const participant = session.participants.find(p => p.userId.equals(userId));
        if (!participant) {
            return res.status(403).json({ message: 'You are not a participant in this session' });
        }

        // Check if already answered
        const existingAnswer = participant.answers.find(
            answer => answer.questionIndex === questionIndex
        );

        if (existingAnswer) {
            return res.status(400).json({ message: 'Answer already submitted for this question' });
        }

        // Check answer correctness
        const quiz = session.quizId;
        if (!quiz || !quiz.questions || questionIndex >= quiz.questions.length) {
            return res.status(400).json({ message: 'Invalid question index or quiz data missing' });
        }

        const question = quiz.questions[questionIndex];
        const isCorrect = question.correctAnswer === selectedOption;

        // Save answer and update score
        participant.answers.push({
            questionIndex,
            answerIndex: selectedOption,
            isCorrect,
            answeredAt: new Date()
        });

        if (isCorrect) {
            participant.score += 1;
        }

        await session.save();

        res.json({ 
            message: 'Answer submitted successfully',
            isCorrect,
            score: participant.score
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Start a question in a live session (instructor only)
app.post('/live-sessions/:sessionId/start-question', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await LiveSessionModel.findOne({ sessionid: sessionId })
            .populate({
                path: 'quizId',
                select: 'title questions'
            });

        if (!session) {
            return res.status(404).json({ message: 'Live session not found' });
        }

        session.questionStarted = true;
        session.questionStartTime = new Date();
        await session.save();

        // Return session with current question
        const updatedSession = await LiveSessionModel.findOne({ sessionid: sessionId })
            .populate({
                path: 'quizId',
                select: 'title questions'
            });

        let responseData = updatedSession.toObject();

        if (updatedSession.quizId && updatedSession.quizId.questions && updatedSession.quizId.questions.length > 0) {
            const currentQuestionIndex = updatedSession.currentQuestionIndex || 0;
            if (currentQuestionIndex < updatedSession.quizId.questions.length) {
                responseData.currentQuestion = updatedSession.quizId.questions[currentQuestionIndex];
            }
        }

        res.json({ 
            message: 'Question started',
            session: responseData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Move to next question in live session (instructor only)
app.post('/live-sessions/:sessionId/next-question', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await LiveSessionModel.findOne({ sessionid: sessionId })
            .populate('quizId', 'questions');

        if (!session) {
            return res.status(404).json({ message: 'Live session not found' });
        }

        const totalQuestions = session.quizId.questions.length;
        const currentIndex = session.currentQuestionIndex || 0;

        if (currentIndex < totalQuestions - 1) {
            session.currentQuestionIndex = currentIndex + 1;
            session.questionStarted = false;
            session.questionStartTime = null;
            await session.save();

            res.json({ 
                message: 'Moved to next question. Use start-question to begin.',
                currentQuestionIndex: session.currentQuestionIndex
            });
        } else {
            res.status(400).json({ message: 'No more questions available' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// End current question in live session (instructor only)
app.post('/live-sessions/:sessionId/end-question', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await LiveSessionModel.findOne({ sessionid: sessionId });

        if (!session) {
            return res.status(404).json({ message: 'Live session not found' });
        }

        session.questionStarted = false;
        session.questionStartTime = null;
        await session.save();

        res.json({ message: 'Question ended' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get results for a live session (leaderboard, user results)
app.get('/live-sessions/:sessionId/results', requireAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await LiveSessionModel.findOne({ sessionid: sessionId })
            .populate({
                path: 'quizId',
                select: 'title questions'
            })
            .populate({
                path: 'participants.userId',
                select: 'username'
            });

        if (!session) {
            return res.status(404).json({ message: 'Live session not found' });
        }

        // Prepare leaderboard and user results
        const participantResults = session.participants.map(participant => {
            const userAnswers = participant.answers || [];
            const detailedAnswers = userAnswers.map(answer => {
                const question = session.quizId.questions[answer.questionIndex];
                return {
                    questionIndex: answer.questionIndex,
                    questionText: question.text,
                    selectedAnswer: answer.answerIndex,
                    correctAnswer: question.correctAnswer,
                    isCorrect: answer.isCorrect,
                    options: question.options
                };
            });

            return {
                userId: participant.userId._id,
                username: participant.userId.username,
                score: participant.score,
                totalQuestions: session.quizId.questions.length,
                percentage: Math.round((participant.score / session.quizId.questions.length) * 100),
                answers: detailedAnswers
            };
        });

        const leaderboard = participantResults
            .sort((a, b) => b.score - a.score)
            .map((participant, index) => ({
                rank: index + 1,
                username: participant.username,
                score: participant.score,
                totalQuestions: participant.totalQuestions,
                percentage: participant.percentage
            }));

        const currentUserResults = participantResults.find(
            p => p.userId.toString() === req.user._id.toString()
        );

        res.json({
            session: {
                sessionId: session.sessionid,
                quizTitle: session.quizId.title,
                totalQuestions: session.quizId.questions.length,
                isActive: session.isActive
            },
            leaderboard,
            userResults: currentUserResults,
            allQuestions: session.quizId.questions
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// End a live session (instructor only)
app.put('/live-sessions/:sessionId/end', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const liveSession = await LiveSessionModel.findOneAndUpdate(
            { sessionid: req.params.sessionId },
            { 
                isActive: false,
                endedAt: new Date()
            },
            { new: true }
        ).populate({
            path: 'participants.userId',
            select: 'username'
        }).populate({
            path: 'quizId',
            select: 'title questions'
        });

        if (!liveSession) return res.status(404).json({ message: 'Live session not found' });

        // Prepare leaderboard for instructor
        const leaderboard = liveSession.participants
            .map(participant => ({
                username: participant.userId.username,
                score: participant.score,
                totalQuestions: liveSession.quizId.questions.length,
                percentage: Math.round((participant.score / liveSession.quizId.questions.length) * 100)
            }))
            .sort((a, b) => b.score - a.score)
            .map((participant, index) => ({
                rank: index + 1,
                ...participant
            }));

        res.json({ 
            message: 'Live session ended', 
            session: liveSession,
            leaderboard 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Serve frontend index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start server
const port = process.env.PORT || 3001;
const serverInstance = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = { app, serverInstance };