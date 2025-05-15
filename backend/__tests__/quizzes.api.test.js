// __tests__/quizzes.api.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { app, serverInstance } = require('../server');
const UserModel = require('../models/Users');
const { QuizModel } = require('../models/Quizzes');
const { generateToken } = require('../config/passport');

describe('Quizzes API Endpoints', () => {
    let playerUser, instructorUser;
    let playerToken, instructorToken;
    let testQuizId; // Oluşturulan ana quiz'in ID'sini saklamak için

    const createTestUser = async (userData) => {
        await UserModel.deleteOne({ username: userData.username });
        await UserModel.deleteOne({ email: userData.email });
        const user = new UserModel(userData);
        await user.save();
        return user;
    };

    beforeAll(async () => {
        // Veritabanı bağlantısını bekle veya kur
        // Not: server.js zaten bağlantıyı kuruyorsa ve testler server başladıktan sonra çalışıyorsa
        // buradaki mongoose.connect çağrısı gereksiz olabilir veya çatışmaya yol açabilir.
        // Sadece bağlantının açık olduğundan emin olmak yeterli olabilir.
        // Örnek olarak MONGO_URI_TEST kullanıldı, kendi konfigürasyonunuza göre ayarlayın.
        // Eğer server.js'deki bağlantı yeterliyse, bu kısmı yorumlayabilir veya silebilirsiniz.
        if (mongoose.connection.readyState === 0) {
            // Test veritabanı için farklı bir URI kullanmak iyi bir pratiktir.
            // Örneğin: process.env.MONGO_URI_TEST veya sabit bir test URI'si
            // Şimdilik server.js'deki bağlantıyı kullandığını varsayalım ve sadece state kontrolü yapalım.
            // await mongoose.connect('mongodb+srv://furkanyalcin07:FGP5hnZV0kHbqqEU@quizdb.rqihj3o.mongodb.net/quizDB_test?retryWrites=true&w=majority&appName=QuizDB');
        }
        // Bağlantının kurulmasını bekle
        while (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Bağlantı kurulana kadar bekle
        }
        
        await UserModel.deleteMany({});
        await QuizModel.deleteMany({});

        playerUser = await createTestUser({
            username: 'testplayer_quizzes',
            email: 'player_quizzes@example.com',
            password: 'password123',
            role: 'player'
        });
        instructorUser = await createTestUser({
            username: 'testinstructor_quizzes',
            email: 'instructor_quizzes@example.com',
            password: 'password123',
            role: 'instructor'
        });

        playerToken = generateToken(playerUser);
        instructorToken = generateToken(instructorUser);
    });

    afterAll(async () => {
        await UserModel.deleteMany({});
        await QuizModel.deleteMany({});
        // Eğer beforeAll'da yeni bir bağlantı açtıysanız burada kapatın.
        // Eğer server.js'deki bağlantıyı kullanıyorsanız, mongoose.disconnect() server'ı da etkileyebilir.
        // Genellikle serverInstance.close() mongoose bağlantısını da kapatır (uygulamaya bağlı).
        // await mongoose.disconnect(); 
        if (serverInstance) {
            await new Promise(resolve => serverInstance.close(resolve));
        }
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    });

    describe('POST /quizzes', () => {
        it('should create a new quiz if user is an instructor', async () => {
            const newQuizData = {
                title: 'My First Test Quiz',
                questions: [
                    {
                        text: 'What is 2+2?',
                        options: ['3', '4', '5'],
                        correctAnswer: 1 // Index of '4'
                    }
                ]
            };
            const res = await request(app)
                .post('/quizzes')
                .set('Authorization', `Bearer ${instructorToken}`)
                .send(newQuizData);
            
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('title', newQuizData.title);
            expect(res.body).toHaveProperty('createdBy', instructorUser._id.toString());
            expect(res.body.questions.length).toBe(1);
            testQuizId = res.body._id; 
        });

        it('should NOT create a quiz if user is a player', async () => {
            const newQuizData = { title: 'Player Quiz Attempt' };
            const res = await request(app)
                .post('/quizzes')
                .set('Authorization', `Bearer ${playerToken}`)
                .send(newQuizData);
            expect(res.statusCode).toEqual(403);
        });

        it('should NOT create a quiz if no token is provided', async () => {
            const newQuizData = { title: 'No Token Quiz' };
            const res = await request(app)
                .post('/quizzes')
                .send(newQuizData);
            expect(res.statusCode).toEqual(401);
        });

        it('should NOT create a quiz with missing title (Bad Request)', async () => {
            const newQuizData = { 
                questions: [{ text: 'Q?', options: ['A', 'B'], correctAnswer: 0 }]
            };
            const res = await request(app)
                .post('/quizzes')
                .set('Authorization', `Bearer ${instructorToken}`)
                .send(newQuizData);
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message');
        });
    });

    describe('GET /quizzes', () => {
        it('should get all quizzes if authenticated (instructor)', async () => {
            const res = await request(app)
                .get('/quizzes')
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            if (testQuizId) {
                expect(res.body.some(quiz => quiz._id === testQuizId)).toBe(true);
            }
        });

        it('should get all quizzes if authenticated (player)', async () => {
            const res = await request(app)
                .get('/quizzes')
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should NOT get quizzes if not authenticated', async () => {
            const res = await request(app)
                .get('/quizzes');
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /quizzes/:quizId', () => {
        it('should get a specific quiz by ID if authenticated', async () => {
            if (!testQuizId) {
                // Bu testin çalışması için POST testinde bir quiz oluşturulmuş olmalı.
                // Eğer testQuizId yoksa, bu testi atla.
                // Jest'te testleri atlamak için it.skip kullanabilirsiniz veya pending()
                console.warn("Skipping GET /quizzes/:quizId test as testQuizId is not set. Ensure POST test creates a quiz.");
                return; 
            }

            const res = await request(app)
                .get(`/quizzes/${testQuizId}`)
                .set('Authorization', `Bearer ${playerToken}`); 
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('_id', testQuizId);
            expect(res.body).toHaveProperty('title', 'My First Test Quiz');
        });

        it('should return 404 if quiz ID does not exist', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .get(`/quizzes/${nonExistentId}`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should NOT get a specific quiz if not authenticated', async () => {
            if (!testQuizId) return; 
            const res = await request(app)
                .get(`/quizzes/${testQuizId}`);
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('PUT /quizzes/:quizId', () => {
        const updatedQuizData = {
            title: 'Updated Test Quiz Title',
            questions: [
                {
                    text: 'What is 3+3?',
                    options: ['5', '6', '7'],
                    correctAnswer: 1 
                }
            ]
        };

        it('should update a quiz if user is an instructor', async () => {
            if (!testQuizId) {
                console.warn("Skipping PUT /quizzes/:quizId test as testQuizId is not set.");
                return;
            }
            const res = await request(app)
                .put(`/quizzes/${testQuizId}`)
                .set('Authorization', `Bearer ${instructorToken}`)
                .send(updatedQuizData);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('title', updatedQuizData.title);
            expect(res.body.questions[0].questionText).toEqual(updatedQuizData.questions[0].questionText);
        });

        it('should NOT update a quiz if user is a player', async () => {
            if (!testQuizId) return;
            const res = await request(app)
                .put(`/quizzes/${testQuizId}`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send(updatedQuizData);
            expect(res.statusCode).toEqual(403);
        });

        it('should NOT update a quiz if no token is provided', async () => {
            if (!testQuizId) return;
            const res = await request(app)
                .put(`/quizzes/${testQuizId}`)
                .send(updatedQuizData);
            expect(res.statusCode).toEqual(401);
        });

        it('should return 404 if quiz ID to update does not exist', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .put(`/quizzes/${nonExistentId}`)
                .set('Authorization', `Bearer ${instructorToken}`)
                .send(updatedQuizData);
            expect(res.statusCode).toEqual(404);
        });
    });

    describe('DELETE /quizzes/:quizId', () => {
        let tempQuizIdToDelete;

        beforeEach(async () => {
            const tempQuiz = new QuizModel({
                title: 'Quiz to be deleted',
                questions: [{ text: 'Delete Q?', options: ['Yes', 'No'], correctAnswer: 0 }],
                createdBy: instructorUser._id 
            });
            await tempQuiz.save();
            tempQuizIdToDelete = tempQuiz._id.toString();
        });

        afterEach(async () => {
            // Oluşturulan geçici quiz'i temizle, eğer testte silinmediyse
            if (tempQuizIdToDelete) {
                await QuizModel.findByIdAndDelete(tempQuizIdToDelete);
            }
        });

        it('should delete a quiz if user is an instructor', async () => {
            const res = await request(app)
                .delete(`/quizzes/${tempQuizIdToDelete}`)
                .set('Authorization', `Bearer ${instructorToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Quiz deleted successfully');

            const deletedQuiz = await QuizModel.findById(tempQuizIdToDelete);
            expect(deletedQuiz).toBeNull();
            tempQuizIdToDelete = null; // Silindiği için null yap, afterEach'te tekrar silmeye çalışmasın
        });

        it('should NOT delete a quiz if user is a player', async () => {
            const res = await request(app)
                .delete(`/quizzes/${tempQuizIdToDelete}`)
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should NOT delete a quiz if no token is provided', async () => {
            const res = await request(app)
                .delete(`/quizzes/${tempQuizIdToDelete}`);
            expect(res.statusCode).toEqual(401);
        });

        it('should return 404 if quiz ID to delete does not exist', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .delete(`/quizzes/${nonExistentId}`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(404);
        });
    });

});