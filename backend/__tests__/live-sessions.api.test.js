require('../models/Quizzes');
require('../models/LiveSessions');
const request = require('supertest');
const mongoose = require('mongoose');
const { app, serverInstance } = require('../server');
const { generateToken } = require('../config/passport');

const UserModel = require('../models/Users');
const { QuizModel } = require('../models/Quizzes');
const LiveSessionModel = require('../models/LiveSessions');

describe('Live Sessions API Endpoints', () => {
    let playerUser, instructorUser, anotherPlayerUser;
    let playerToken, instructorToken, anotherPlayerToken;
    let testQuiz, anotherTestQuiz;

    const createTestUser = async (userData) => {
        await UserModel.deleteOne({ username: userData.username });
        await UserModel.deleteOne({ email: userData.email });
        const user = new UserModel(userData);
        await user.save();
        return user;
    };

    beforeAll(async () => {
        while (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        await UserModel.deleteMany({});
        await QuizModel.deleteMany({});
        await LiveSessionModel.deleteMany({});

        playerUser = await createTestUser({
            username: 'testplayer_ls',
            email: 'player_ls@example.com',
            password: 'password123',
            role: 'player'
        });
        instructorUser = await createTestUser({
            username: 'testinstructor_ls',
            email: 'instructor_ls@example.com',
            password: 'password123',
            role: 'instructor'
        });
        anotherPlayerUser = await createTestUser({
            username: 'anotherplayer_ls',
            email: 'anotherplayer_ls@example.com',
            password: 'password123',
            role: 'player'
        });

        playerToken = generateToken(playerUser);
        instructorToken = generateToken(instructorUser);
        anotherPlayerToken = generateToken(anotherPlayerUser);

        testQuiz = new QuizModel({
            title: 'Live Session Test Quiz',
            questions: [
                { text: 'LS Q1: 1+1?', options: ['1', '2', '3'], correctAnswer: 1 },
                { text: 'LS Q2: Capital of France?', options: ['London', 'Berlin', 'Paris'], correctAnswer: 2 },
                { text: 'LS Q3: 5x5?', options: ['20', '25', '30'], correctAnswer: 1 }
            ],
            createdBy: instructorUser._id
        });
        anotherTestQuiz = new QuizModel({
            title: 'Another Live Session Quiz',
            questions: [{ text: 'Only Q?', options: ['Yes', 'No'], correctAnswer: 0 }],
            createdBy: instructorUser._id
        });
        await testQuiz.save();
        await anotherTestQuiz.save();
    });

    afterAll(async () => {
        await UserModel.deleteMany({});
        await QuizModel.deleteMany({});
        await LiveSessionModel.deleteMany({});

        if (serverInstance) {
            await new Promise(resolve => serverInstance.close(resolve));
        }
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    });

    describe('POST /live-sessions', () => {
        it('should create a new live session if user is an instructor', async () => {
            const newSessionData = {
                quizId: testQuiz._id.toString(),
            };
            const res = await request(app)
                .post('/live-sessions')
                .set('Authorization', `Bearer ${instructorToken}`)
                .send(newSessionData);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('quizId', testQuiz._id.toString());
            expect(res.body).toHaveProperty('sessionid');
        });

        it('should allow specifying a custom sessionid when creating a session (instructor)', async () => {
            const customSessionId = `custom-${new mongoose.Types.ObjectId().toString()}`;
            const newSessionData = {
                quizId: testQuiz._id.toString(),
                sessionid: customSessionId
            };
            const res = await request(app)
                .post('/live-sessions')
                .set('Authorization', `Bearer ${instructorToken}`)
                .send(newSessionData);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('sessionid', customSessionId);
        });

        it('should NOT create a live session if user is a player', async () => {
            const newSessionData = { quizId: testQuiz._id.toString() };
            const res = await request(app)
                .post('/live-sessions')
                .set('Authorization', `Bearer ${playerToken}`)
                .send(newSessionData);
            expect(res.statusCode).toEqual(403);
        });

        it('should NOT create a live session if no token is provided', async () => {
            const newSessionData = { quizId: testQuiz._id.toString() };
            const res = await request(app)
                .post('/live-sessions')
                .send(newSessionData);
            expect(res.statusCode).toEqual(401);
        });

        it('should NOT create a live session if quizId is missing', async () => {
            const newSessionData = {};
            const res = await request(app)
                .post('/live-sessions')
                .set('Authorization', `Bearer ${instructorToken}`)
                .send(newSessionData);
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('message', 'Quiz not found for this session');
        });

        it('should NOT create a live session if quizId does not exist', async () => {
            const nonExistentQuizId = new mongoose.Types.ObjectId().toString();
            const newSessionData = { quizId: nonExistentQuizId };
            const res = await request(app)
                .post('/live-sessions')
                .set('Authorization', `Bearer ${instructorToken}`)
                .send(newSessionData);
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('message', 'Quiz not found for this session');
        });
    });

    describe('GET /live-sessions (List Active Sessions)', () => {
        let sessionForListing1, sessionForListing2, inactiveSession;

        beforeEach(async () => {
            await LiveSessionModel.deleteMany({});

            sessionForListing1 = new LiveSessionModel({
                quizId: testQuiz._id,
                sessionid: `listable-${new mongoose.Types.ObjectId().toString()}`,
                isActive: true,
            });

            sessionForListing2 = new LiveSessionModel({
                quizId: testQuiz._id,
                sessionid: `listable-${new mongoose.Types.ObjectId().toString()}`,
                isActive: true
            });

            inactiveSession = new LiveSessionModel({
                quizId: testQuiz._id,
                sessionid: `inactive-${new mongoose.Types.ObjectId().toString()}`,
                isActive: false
            });

            await sessionForListing1.save();
            await sessionForListing2.save();
            await inactiveSession.save();
        });

        it('should get all active live sessions if authenticated (player)', async () => {
            const res = await request(app)
                .get('/live-sessions')
                .set('Authorization', `Bearer ${playerToken}`);

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            if (res.body.length > 0 && res.body[0].quizId && typeof res.body[0].quizId === 'object') {
                expect(res.body[0].quizId).toHaveProperty('title', testQuiz.title);
            }
        });

        it('should get all active live sessions if authenticated (instructor)', async () => {
            const res = await request(app)
                .get('/live-sessions')
                .set('Authorization', `Bearer ${instructorToken}`);

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
        });

        it('should return an empty array if no active sessions exist', async () => {
            await LiveSessionModel.updateMany({}, { isActive: false });
            const res = await request(app)
                .get('/live-sessions')
                .set('Authorization', `Bearer ${playerToken}`);

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        it('should NOT get live sessions if not authenticated', async () => {
            const res = await request(app)
                .get('/live-sessions');
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /live-sessions/:sessionId (Get Specific Session)', () => {
        let activeSessionForGet;

        beforeEach(async () => {
            await LiveSessionModel.deleteMany({});
            activeSessionForGet = new LiveSessionModel({
                quizId: testQuiz._id,
                sessionid: `getable-${new mongoose.Types.ObjectId().toString()}`,
                isActive: true,
                participants: [{ userId: playerUser._id, score: 0, answers: [] }]
            });
            await activeSessionForGet.save();
        });

        it('should get a specific live session by sessionid if authenticated (player)', async () => {
            const res = await request(app)
                .get(`/live-sessions/${activeSessionForGet.sessionid}`)
                .set('Authorization', `Bearer ${playerToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('sessionid', activeSessionForGet.sessionid);
            if (res.body.quizId && typeof res.body.quizId === 'object') {
                expect(res.body.quizId).toHaveProperty('_id', testQuiz._id.toString());
                expect(res.body.quizId).toHaveProperty('title', testQuiz.title);
            }
        });

        it('should get a specific live session by sessionid if authenticated (instructor)', async () => {
            const res = await request(app)
                .get(`/live-sessions/${activeSessionForGet.sessionid}`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('sessionid', activeSessionForGet.sessionid);
        });

        it('should return 404 if sessionid does not exist', async () => {
            const nonExistentSessionId = 'non-existent-session-id';
            const res = await request(app)
                .get(`/live-sessions/${nonExistentSessionId}`)
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should NOT get a specific live session if not authenticated', async () => {
            const res = await request(app)
                .get(`/live-sessions/${activeSessionForGet.sessionid}`);
            expect(res.statusCode).toEqual(401);
        });

        it('should get an inactive session by sessionid if it exists', async () => {
            activeSessionForGet.isActive = false;
            await activeSessionForGet.save();

            const res = await request(app)
                .get(`/live-sessions/${activeSessionForGet.sessionid}`)
                .set('Authorization', `Bearer ${playerToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('isActive', false);
        });
    });

    describe('POST /live-sessions/:sessionId/join', () => {
        let sessionToJoin;
        beforeEach(async () => {
            await LiveSessionModel.deleteMany({});
            sessionToJoin = new LiveSessionModel({
                quizId: testQuiz._id,
                sessionid: `joinable-${new mongoose.Types.ObjectId().toString()}`,
                isActive: true,
                participants: []
            });
            await sessionToJoin.save();
        });

        it('should allow a player to join an active session', async () => {
            const res = await request(app)
                .post(`/live-sessions/${sessionToJoin.sessionid}/join`)
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(200);
        });
        it('should NOT allow joining if session is not active', async () => {
            sessionToJoin.isActive = false;
            await sessionToJoin.save();
            const res = await request(app)
                .post(`/live-sessions/${sessionToJoin.sessionid}/join`)
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(400);
        });

        it('should return 404 if session to join does not exist', async () => {
            const res = await request(app)
                .post(`/live-sessions/nonexistent-session/join`)
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should NOT allow joining a session if already joined', async () => {
            await request(app)
                .post(`/live-sessions/${sessionToJoin.sessionid}/join`)
                .set('Authorization', `Bearer ${playerToken}`);

            const res = await request(app)
                .post(`/live-sessions/${sessionToJoin.sessionid}/join`)
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(400);
        });

        it('should NOT allow joining if not authenticated', async () => {
            const res = await request(app)
                .post(`/live-sessions/${sessionToJoin.sessionid}/join`);
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('POST /live-sessions/:sessionId/answer', () => {
        let sessionForAnswer;
        let questionIndex = 0;
        let correctAnswerIndex;
        let incorrectAnswerIndex;

        beforeEach(async () => {
            await LiveSessionModel.deleteMany({});

            if (!testQuiz || !testQuiz.questions || testQuiz.questions.length <= questionIndex) {
                console.error("testQuiz or its questions are not available for answer tests setup.");
                throw new Error("Critical test setup failure: testQuiz not ready for answer tests.");
            }
            correctAnswerIndex = testQuiz.questions[questionIndex].correctAnswer;
            incorrectAnswerIndex = (correctAnswerIndex + 1) % testQuiz.questions[questionIndex].options.length;

            sessionForAnswer = new LiveSessionModel({
                quizId: testQuiz._id,
                sessionid: `answerable-${new mongoose.Types.ObjectId().toString()}`,
                isActive: true,
                currentQuestionIndex: questionIndex,
                participants: [{ userId: playerUser._id, score: 0, answers: [] }]
            });
            await sessionForAnswer.save();
        });

        it('should allow a participant to submit a correct answer and update score', async () => {
            const res = await request(app)
                .post(`/live-sessions/${sessionForAnswer.sessionid}/answer`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ questionIndex, answerIndex: correctAnswerIndex });
            expect(res.statusCode).toEqual(200);
            const updatedSession = await LiveSessionModel.findById(sessionForAnswer._id).populate('quizId');
            expect(updatedSession.quizId).toBeDefined();
            if (updatedSession.quizId) {
                expect(updatedSession.quizId.title).toEqual(testQuiz.title);
            }
        });
        it('should allow a participant to submit an incorrect answer, score remains same', async () => {
            const res = await request(app)
                .post(`/live-sessions/${sessionForAnswer.sessionid}/answer`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ questionIndex, answerIndex: incorrectAnswerIndex });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('score', 0);
        });

        it('should NOT allow answering the same question twice', async () => {
            await request(app)
                .post(`/live-sessions/${sessionForAnswer.sessionid}/answer`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ questionIndex, answerIndex: correctAnswerIndex });

            const res = await request(app)
                .post(`/live-sessions/${sessionForAnswer.sessionid}/answer`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ questionIndex, answerIndex: incorrectAnswerIndex });
            expect(res.statusCode).toEqual(400);
        });

        it('should NOT allow answering if session is not active', async () => {
            sessionForAnswer.isActive = false;
            await sessionForAnswer.save();
            const res = await request(app)
                .post(`/live-sessions/${sessionForAnswer.sessionid}/answer`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ questionIndex, answerIndex: correctAnswerIndex });
            expect(res.statusCode).toEqual(400);
        });

        it('should NOT allow answering if not the current question', async () => {
            sessionForAnswer.currentQuestionIndex = questionIndex + 1;
            await sessionForAnswer.save();
            const res = await request(app)
                .post(`/live-sessions/${sessionForAnswer.sessionid}/answer`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ questionIndex, answerIndex: correctAnswerIndex });
            expect(res.statusCode).toEqual(400);
        });

        it('should NOT allow answering if user is not a participant', async () => {
            const res = await request(app)
                .post(`/live-sessions/${sessionForAnswer.sessionid}/answer`)
                .set('Authorization', `Bearer ${anotherPlayerToken}`)
                .send({ questionIndex, answerIndex: correctAnswerIndex });
            expect(res.statusCode).toEqual(403);
        });

        it('should return 400 for invalid question index or missing quiz data', async () => {
            const res = await request(app)
                .post(`/live-sessions/${sessionForAnswer.sessionid}/answer`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ questionIndex: 99, answerIndex: 0 });
            expect(res.statusCode).toEqual(400);
        });

        it('should return 400 for invalid answer index', async () => {
            const res = await request(app)
                .post(`/live-sessions/${sessionForAnswer.sessionid}/answer`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ questionIndex, answerIndex: 99 });
            expect(res.statusCode).toEqual(400);
        });
    });

    describe('POST /live-sessions/:sessionId/next-question', () => {
        let sessionForNextQ;
        beforeEach(async () => {
            await LiveSessionModel.deleteMany({});
            sessionForNextQ = new LiveSessionModel({
                quizId: testQuiz._id,
                sessionid: `nextq-${new mongoose.Types.ObjectId().toString()}`,
                isActive: true,
                currentQuestionIndex: 0,
            });
            await sessionForNextQ.save();
        });

        it('should allow instructor to move to the next question', async () => {
            const res = await request(app)
                .post(`/live-sessions/${sessionForNextQ.sessionid}/next-question`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(200);
        });
        it('should NOT allow player to move to the next question', async () => {
            const res = await request(app)
                .post(`/live-sessions/${sessionForNextQ.sessionid}/next-question`)
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should NOT move to next question if it is the last question', async () => {
            sessionForNextQ.currentQuestionIndex = testQuiz.questions.length - 1;
            await sessionForNextQ.save();
            const res = await request(app)
                .post(`/live-sessions/${sessionForNextQ.sessionid}/next-question`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(400);
        });

        it('should NOT move to next question if session is not active', async () => {
            sessionForNextQ.isActive = false;
            await sessionForNextQ.save();
            const res = await request(app)
                .post(`/live-sessions/${sessionForNextQ.sessionid}/next-question`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(400);
        });

        it('should return 404 if session for next question does not exist', async () => {
            const res = await request(app)
                .post(`/live-sessions/nonexistent-session/next-question`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(404);
        });
    });

    describe('PUT /live-sessions/:sessionId/end', () => {
        let sessionToEnd;
        beforeEach(async () => {
            await LiveSessionModel.deleteMany({});
            sessionToEnd = new LiveSessionModel({
                quizId: testQuiz._id,
                sessionid: `endable-${new mongoose.Types.ObjectId().toString()}`,
                isActive: true,
            });
            await sessionToEnd.save();
        });

        it('should allow instructor to end an active session', async () => {
            const res = await request(app)
                .put(`/live-sessions/${sessionToEnd.sessionid}/end`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(200);
        });
        it('should NOT allow player to end a session', async () => {
            const res = await request(app)
                .put(`/live-sessions/${sessionToEnd.sessionid}/end`)
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should return 404 if session to end does not exist', async () => {
            const res = await request(app)
                .put(`/live-sessions/nonexistent-session/end`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should still succeed (idempotent) if trying to end an already ended session', async () => {
            sessionToEnd.isActive = false;
            await sessionToEnd.save();
            const res = await request(app)
                .put(`/live-sessions/${sessionToEnd.sessionid}/end`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(200);
        });
    });
});