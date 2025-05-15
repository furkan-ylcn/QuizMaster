const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserModel = require('./models/Users');
const { QuizModel } = require('./models/Quizzes'); // <<< GÜNCELLENDİ: QuizModel objeden destruct edilerek import edildi
const LiveSessionModel = require('./models/LiveSessions'); // LiveSessionModel import edildi
const { passport, generateToken } = require('./config/passport');
const { requireAuth, requireSignIn, requireRole } = require('./middleware/auth');

const app = express();
app.use(express.json());
app.use(passport.initialize());

mongoose.connect('mongodb+srv://furkanyalcin07:FGP5hnZV0kHbqqEU@quizdb.rqihj3o.mongodb.net/quizDB?retryWrites=true&w=majority&appName=QuizDB')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect MongoDB : ', err));

// Auth routes
app.post('/login', requireSignIn, (req, res) => {
    const token = generateToken(req.user);
    res.json({ token, user: { id: req.user._id, username: req.user.username, role: req.user.role } });
});

// Protected routes
app.get('/profile', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// Instructor-only route example
app.get('/instructor-dashboard', requireAuth, requireRole('instructor'), (req, res) => {
    res.json({ message: 'Welcome to the instructor dashboard' });
});

// User routes (önceden var olanlar)
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

        // Yetkilendirme kontrolü
        if (req.user.role !== 'instructor' && req.user._id.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to update this user' });
        }

        // Eğer şifre güncelleniyorsa, hash'le
        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        }

        const updatedUser = await UserModel.findByIdAndUpdate(userId, updates, { new: true });
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        
        res.json(updatedUser); // UserModel'deki toJSON metodu sayesinde şifre burada da dönmeyecek
    } catch (err) {
        console.log(err);
        // Mongoose validation error (örn: unique constraint) için daha spesifik hata yönetimi eklenebilir
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


// --- Quiz Routes ---

app.post('/quizzes', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { title, questions } = req.body;
        const newQuiz = new QuizModel({ // QuizModel burada kullanılıyor
            title,
            questions,
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
        const { title, questions } = req.body;
        const quiz = await QuizModel.findById(req.params.quizId);

        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        quiz.title = title || quiz.title;
        quiz.questions = questions || quiz.questions;
        
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


// --- Live Session Routes ---

app.post('/live-sessions', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const { quizId, sessionid } = req.body;
        const quiz = await QuizModel.findById(quizId); // QuizModel burada da kullanılıyor
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
        const { sessionId } = req.params; // sessionId'yi req.params'tan alalım
        const userId = req.user._id;

        // Gerekli parametrelerin varlığını kontrol et
        if (questionIndex === undefined || answerIndex === undefined) {
            return res.status(400).json({ message: 'Question index and answer index are required.' });
        }

        const liveSession = await LiveSessionModel.findOne({ sessionid: sessionId }).populate({
            path: 'quizId',
            model: QuizModel // QuizModel'in doğru import edildiğinden emin olun
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

        // --- YENİ EKLENEN KONTROLLER ---
        // 1. Aynı soruya daha önce cevap verilip verilmediğini kontrol et
        const alreadyAnswered = participant.answers.find(ans => ans.questionIndex === questionIndex);
        if (alreadyAnswered) {
            return res.status(400).json({ message: 'You have already answered this question' });
        }

        const quiz = liveSession.quizId;
        if (!quiz || !quiz.questions || questionIndex >= quiz.questions.length) {
            return res.status(400).json({ message: 'Invalid question index or quiz data missing' });
        }

        const question = quiz.questions[questionIndex];
        // 2. answerIndex'in geçerli aralıkta olup olmadığını kontrol et
        if (answerIndex < 0 || answerIndex >= question.options.length) {
            return res.status(400).json({ message: 'Invalid answer index' });
        }
        // --- KONTROLLER SONU ---

        const isCorrect = question.correctAnswer === answerIndex;
        if (isCorrect) {
            participant.score += 1;
        }

        // 3. Katılımcının cevabını kaydet
        participant.answers.push({
            questionIndex,
            answerIndex,
            isCorrect
            // answeredAt otomatik olarak eklenecek (modelde default değeri var)
        });

        await liveSession.save();
        res.json({
            message: 'Answer submitted',
            score: participant.score,
            isCorrect, // Cevabın doğru olup olmadığını da dönebiliriz
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
        console.error("Error in /next-question:", error); // Hata loglaması eklendi
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
    res.send('Quiz App API is Running');
});

const port = process.env.PORT || 3000;
const serverInstance = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = { app, serverInstance };