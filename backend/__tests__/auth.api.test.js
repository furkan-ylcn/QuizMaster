const request = require('supertest');
const mongoose = require('mongoose');
const { app, serverInstance } = require('../server');
const UserModel = require('../models/Users');

describe('Auth API Endpoints', () => {
    let testUser;
    let authToken;

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
        await UserModel.deleteMany({});

        testUser = {
            username: 'testuser_auth',
            email: 'auth@example.com',
            password: 'password123',
            role: 'player'
        };
        const user = new UserModel(testUser);
        await user.save();
    });

    afterAll(async () => {
        await UserModel.deleteMany({});
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
        });
    });

    describe('POST /login', () => {
        it('should login an existing user and return a token', async () => {
            const res = await request(app)
                .post('/login')
                .send({
                    username: 'logintestuser',
                    password: 'password123'
                });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('username', 'logintestuser');
            authToken = res.body.token;
        });

        it('should fail to login with incorrect password', async () => {
            const res = await request(app)
                .post('/login')
                .send({
                    username: 'logintestuser',
                    password: 'wrongpassword'
                });
            expect(res.statusCode).toEqual(401);
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
            expect(authToken).toBeDefined();
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