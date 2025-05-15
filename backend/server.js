const express = require('express');
const mongoose = require('mongoose');
const UserModel = require('./models/Users');
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

// Existing routes (now protected)
app.get('/getUsers',  async (req, res) => {
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
        const token = generateToken(newUser);
        res.status(201).json({ token, user: newUser });
    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err.message });
    }
});

app.put('/updateUser', requireAuth, async (req, res) => {
    try {
        const request = req.body;
        const user = await UserModel.findOne({ username: request.username });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Only allow users to update their own password unless admin
        if (req.user._id.toString() !== user._id.toString() && req.user.role !== 'instructor') {
            return res.status(403).json({ message: 'Not authorized to update this user' });
        }

        user.password = request.password;
        await user.save();
        res.json(user);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/deleteUser', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const request = req.body;
        await UserModel.deleteOne({ username: request.username });
        const allUsers = await UserModel.find({});
        res.send(allUsers);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('Running');
});

app.listen('3000', () => {
    console.log('Server is running on port 3000');
});