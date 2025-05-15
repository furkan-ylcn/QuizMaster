// __tests__/auth.api.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { app, serverInstance } = require('../server'); // server.js'den app ve serverInstance
const UserModel = require('../models/Users');

// Test veritabanı için ayrı bir bağlantı dizesi kullanmak en iyisidir.
// Şimdilik server.js'deki bağlantıyı kullanıyoruz.
// Testlerden önce ve sonra veritabanını temizlemek önemlidir.

describe('Auth API Endpoints', () => {
    let testUser;
    let authToken;

    // Tüm testlerden önce bir kere çalışır
    beforeAll(async () => {
        // Mongoose bağlantısının hazır olduğundan emin ol
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
        // Testler için veritabanını temizle (özellikle Users koleksiyonunu)
        await UserModel.deleteMany({});

        // Test için bir kullanıcı oluştur
        testUser = {
            username: 'testuser_auth',
            email: 'auth@example.com',
            password: 'password123',
            role: 'player'
        };
        // Kullanıcıyı doğrudan DB'ye kaydet (şifre hash'lenecek)
        const user = new UserModel(testUser);
        await user.save();
    });

    // Tüm testlerden sonra bir kere çalışır
    afterAll(async () => {
        // Test verilerini temizle
        await UserModel.deleteMany({});
        // Bağlantıları kapat
        await mongoose.disconnect();
        await new Promise(resolve => serverInstance.close(resolve));
    });

    describe('POST /createUser (Prerequisite for login)', () => {
        it('should create a new user for testing login', async () => {
            const newUserForLogin = {
                username: 'logintestuser',
                email: 'login@example.com',
                password: 'password123'
            };
            const res = await request(app)
                .post('/createUser')
                .send(newUserForLogin);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('username', newUserForLogin.username);
            // Bu kullanıcıyı login testinde kullanacağız
        });
    });

    describe('POST /login', () => {
        it('should login an existing user and return a token', async () => {
            const res = await request(app)
                .post('/login')
                .send({
                    username: 'logintestuser', // createUser testinde oluşturulan kullanıcı
                    password: 'password123'
                });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('username', 'logintestuser');
            authToken = res.body.token; // Sonraki testler için token'ı sakla
        });

        it('should fail to login with incorrect password', async () => {
            const res = await request(app)
                .post('/login')
                .send({
                    username: 'logintestuser',
                    password: 'wrongpassword'
                });
            expect(res.statusCode).toEqual(401); // passport-local varsayılan olarak 401 döner
        });

        it('should fail to login with a non-existent username', async () => {
            const res = await request(app)
                .post('/login')
                .send({
                    username: 'nonexistentuser',
                    password: 'password123'
                });
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /profile (Protected Route)', () => {
        it('should access profile with a valid token', async () => {
            // Önceki login testinden alınan authToken'u kullan
            expect(authToken).toBeDefined(); // Token'ın alındığından emin ol
            const res = await request(app)
                .get('/profile')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('username', 'logintestuser');
        });

        it('should not access profile with an invalid token', async () => {
            const res = await request(app)
                .get('/profile')
                .set('Authorization', 'Bearer invalidtoken123');
            expect(res.statusCode).toEqual(401);
        });

        it('should not access profile without a token', async () => {
            const res = await request(app)
                .get('/profile');
            expect(res.statusCode).toEqual(401);
        });
    });
});