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

// Serve static files from public directory
app.use(express.static('public'));

mongoose.connect('mongodb+srv://furkanyalcin07:FGP5hnZV0kHbqqEU@quizdb.rqihj3o.mongodb.net/quizDB?retryWrites=true&w=majority&appName=QuizDB')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect MongoDB : ', err));

// Authentication routes
app.post('/login', requireSignIn, (req, res) => {
    const token = generateToken(req.user);
    res.json({ token, user: { id: req.user._id, username: req.user.username, role: req.user.role } });
});

app.get('/profile', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

app.get('/instructor-dashboard', requireAuth, requireRole('instructor'), (req, res) => {
    res.json({ message: 'Welcome to the instructor dashboard' });
});

// User management routes
app.get('/getUsers', requireAuth, async (req, res) => {
    try {
        const allUsers = await UserModel.find({});
        res.send(allUsers);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

app.post('/createUser', async (req, res) => {
    try {
        const newUser = await UserModel.create(req.body);
        res.status(201).json(newUser);
    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err.message });
    }
});

app.put('/updateUser/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        if (req.user.role !== 'instructor' && req.user._id.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to update this user' });
        }

        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        }

        const updatedUser = await UserModel.findByIdAndUpdate(userId, updates, { new: true });
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        
        res.json(updatedUser);
    } catch (err) {
        console.log(err);
        if (err.name === 'MongoServerError' && err.code === 11000) {
            return res.status(400).json({ error: 'Username or email already exists.' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

app.delete('/deleteUser/:userId', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { userId } = req.params;
        const deletedUser = await UserModel.findByIdAndDelete(userId);
        if (!deletedUser) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

// Quiz management routes
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

app.get('/quizzes', requireAuth, async (req, res) => {
    try {
        const quizzes = await QuizModel.find().populate('createdBy', 'username');
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get available quizzes for players (non-live only)
app.get('/quizzes/available', requireAuth, async (req, res) => {
    try {
        const quizzes = await QuizModel.find({ isLiveOnly: false }).populate('createdBy', 'username');
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/quizzes/:quizId', requireAuth, async (req, res) => {
    try {
        const quiz = await QuizModel.findById(req.params.quizId).populate('createdBy', 'username');
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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

// Standalone quiz session routes
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

        res.json({
            message: 'Quiz session started',
            session: sessionData,
            quiz: {
                _id: quiz._id,
                title: quiz.title,
                totalQuestions: quiz.questions.length
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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

app.post('/quiz-sessions/:quizId/answer', requireAuth, async (req, res) => {
    try {
        const { quizId } = req.params;
        const { questionIndex, answerIndex, timeSpent } = req.body;
        
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

// Live session routes (existing)
app.post('/live-sessions', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { quizId, sessionid } = req.body;
        const quiz = await QuizModel.findById(quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found for this session' });

        const newLiveSession = new LiveSessionModel({
            sessionid: sessionid || new mongoose.Types.ObjectId().toString(),
            quizId,
        });
        await newLiveSession.save();
        res.status(201).json(newLiveSession);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/live-sessions', requireAuth, async (req, res) => {
    try {
        const liveSessions = await LiveSessionModel.find({ isActive: true }).populate('quizId', 'title');
        res.json(liveSessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/live-sessions/:sessionId', requireAuth, async (req, res) => {
    try {
        const liveSession = await LiveSessionModel.findOne({ sessionid: req.params.sessionId }).populate('quizId');
        if (!liveSession) return res.status(404).json({ message: 'Live session not found' });
        res.json(liveSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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

app.post('/live-sessions/:sessionId/answer', requireAuth, async (req, res) => {
    try {
        const { questionIndex, answerIndex } = req.body;
        const { sessionId } = req.params;
        const userId = req.user._id;

        if (questionIndex === undefined || answerIndex === undefined) {
            return res.status(400).json({ message: 'Question index and answer index are required.' });
        }

        const liveSession = await LiveSessionModel.findOne({ sessionid: sessionId }).populate({
            path: 'quizId',
            model: QuizModel
        });

        if (!liveSession) {
            return res.status(404).json({ message: 'Live session not found' });
        }
        if (!liveSession.isActive) {
            return res.status(400).json({ message: 'Session is not active' });
        }
        if (liveSession.currentQuestionIndex !== questionIndex) {
            return res.status(400).json({ message: 'This is not the current question' });
        }

        const participant = liveSession.participants.find(p => p.userId.equals(userId));
        if (!participant) {
            return res.status(403).json({ message: 'You are not a participant in this session' });
        }

        const alreadyAnswered = participant.answers.find(ans => ans.questionIndex === questionIndex);
        if (alreadyAnswered) {
            return res.status(400).json({ message: 'You have already answered this question' });
        }

        const quiz = liveSession.quizId;
        if (!quiz || !quiz.questions || questionIndex >= quiz.questions.length) {
            return res.status(400).json({ message: 'Invalid question index or quiz data missing' });
        }

        const question = quiz.questions[questionIndex];
        if (answerIndex < 0 || answerIndex >= question.options.length) {
            return res.status(400).json({ message: 'Invalid answer index' });
        }

        const isCorrect = question.correctAnswer === answerIndex;
        if (isCorrect) {
            participant.score += 1;
        }

        participant.answers.push({
            questionIndex,
            answerIndex,
            isCorrect
        });

        await liveSession.save();
        res.json({
            message: 'Answer submitted',
            score: participant.score,
            isCorrect,
            sessionId: liveSession.sessionid
        });

    } catch (error) {
        console.error("Error in /answer:", error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/live-sessions/:sessionId/next-question', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const liveSession = await LiveSessionModel.findOne({ sessionid: req.params.sessionId }).populate({
            path: 'quizId',
            model: QuizModel
        });
        if (!liveSession) return res.status(404).json({ message: 'Live session not found' });
        if (!liveSession.isActive) return res.status(400).json({ message: 'Session is not active' });
        
        const quiz = liveSession.quizId;
        if (!quiz || !quiz.questions) {
            return res.status(400).json({ message: 'Quiz data missing for this session' });
        }
        if (liveSession.currentQuestionIndex < quiz.questions.length - 1) {
            liveSession.currentQuestionIndex += 1;
            await liveSession.save();
            res.json({ message: 'Moved to next question', currentQuestionIndex: liveSession.currentQuestionIndex, session: liveSession });
        } else {
            res.status(400).json({ message: 'This is the last question', session: liveSession });
        }
    } catch (error) {
        console.error("Error in /next-question:", error);
        res.status(500).json({ message: error.message });
    }
});

app.put('/live-sessions/:sessionId/end', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const liveSession = await LiveSessionModel.findOneAndUpdate(
            { sessionid: req.params.sessionId },
            { isActive: false },
            { new: true }
        );
        if (!liveSession) return res.status(404).json({ message: 'Live session not found' });
        
        res.json({ message: 'Live session ended', session: liveSession });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const port = process.env.PORT || 3000;
const serverInstance = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = { app, serverInstance };