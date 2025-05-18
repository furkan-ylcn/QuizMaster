const request = require('supertest');
const mongoose = require('mongoose');
const { app, serverInstance } = require('../server');
const UserModel = require('../models/Users');
const { generateToken } = require('../config/passport');

describe('Users API Endpoints', () => {
    let playerUser, instructorUser, adminUser;
    let playerToken, instructorToken;

    const createTestUser = async (userData) => {
        const user = new UserModel(userData);
        await user.save();
        return user;
    };

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
        await UserModel.deleteMany({});

        playerUser = await createTestUser({
            username: 'testplayer_users',
            email: 'player_users@example.com',
            password: 'password123',
            role: 'player'
        });
        instructorUser = await createTestUser({
            username: 'testinstructor_users',
            email: 'instructor_users@example.com',
            password: 'password123',
            role: 'instructor'
        });

        playerToken = generateToken(playerUser);
        instructorToken = generateToken(instructorUser);
    });

    afterAll(async () => {
        await UserModel.deleteMany({});
        await mongoose.disconnect();
        await new Promise(resolve => serverInstance.close(resolve));
    });

    describe('POST /createUser', () => {
        it('should create a new user successfully', async () => {
            const newUser = {
                username: 'newuniqueuser',
                email: 'newunique@example.com',
                password: 'password123'
            };
            const res = await request(app)
                .post('/createUser')
                .send(newUser);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('username', newUser.username);
            expect(res.body).not.toHaveProperty('password');
        });

        it('should fail to create a user with an existing username', async () => {
            const res = await request(app)
                .post('/createUser')
                .send({
                    username: 'testplayer_users',
                    email: 'another_email@example.com',
                    password: 'password123'
                });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should fail to create a user with an existing email', async () => {
            const res = await request(app)
                .post('/createUser')
                .send({
                    username: 'another_username',
                    email: 'player_users@example.com',
                    password: 'password123'
                });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should fail to create a user without required fields (e.g., username)', async () => {
            const res = await request(app)
                .post('/createUser')
                .send({
                    email: 'missingusername@example.com',
                    password: 'password123'
                });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('GET /getUsers', () => {
        it('should get all users if authenticated (e.g., as instructor)', async () => {
            const res = await request(app)
                .get('/getUsers')
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
        });

        it('should get all users if authenticated (e.g., as player - server.js de requireAuth var)', async () => {
            const res = await request(app)
                .get('/getUsers')
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should fail to get users if not authenticated', async () => {
            const res = await request(app)
                .get('/getUsers');
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('PUT /updateUser/:userId', () => {
        let tempUserId;

        beforeAll(async () => {
            const tempUser = await createTestUser({
                username: 'tempuser_update',
                email: 'temp_update@example.com',
                password: 'password123',
                role: 'player'
            });
            tempUserId = tempUser._id.toString();
        });

        it('should allow a user to update their own information (e.g., email)', async () => {
            const res = await request(app)
                .put(`/updateUser/${playerUser._id}`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ email: 'updated_player_email@example.com' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('email', 'updated_player_email@example.com');
        });

        it('should allow an instructor to update another user\'s information', async () => {
            const res = await request(app)
                .put(`/updateUser/${tempUserId}`)
                .set('Authorization', `Bearer ${instructorToken}`)
                .send({ username: 'updated_by_instructor', role: 'player' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('username', 'updated_by_instructor');
        });

        it('should allow an instructor to update another user\'s role', async () => {
            const res = await request(app)
                .put(`/updateUser/${tempUserId}`)
                .set('Authorization', `Bearer ${instructorToken}`)
                .send({ role: 'instructor' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('role', 'instructor');
        });

        it('should not allow a player to update another user\'s information', async () => {
            const res = await request(app)
                .put(`/updateUser/${instructorUser._id}`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ email: 'hacker_attempt@example.com' });
            expect(res.statusCode).toEqual(403);
        });

        it('should return 404 if user to update is not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .put(`/updateUser/${nonExistentId}`)
                .set('Authorization', `Bearer ${instructorToken}`)
                .send({ email: 'doesnotmatter@example.com' });
            expect(res.statusCode).toEqual(404);
        });

        it('should not allow updating password directly without proper handling (password should be hashed by pre-save hook)', async () => {
            const newPassword = "newpassword123";
            const res = await request(app)
                .put(`/updateUser/${playerUser._id}`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ password: newPassword });
            expect(res.statusCode).toEqual(200);

            const updatedUserFromDB = await UserModel.findById(playerUser._id);
            expect(updatedUserFromDB.password).not.toEqual(newPassword);
            const isMatch = await updatedUserFromDB.comparePassword(newPassword);
            expect(isMatch).toBe(true);
        });
    });

    describe('DELETE /deleteUser/:userId', () => {
        let userToDeleteId;
        let uniqueCounter = 0;

        beforeEach(async () => {
            uniqueCounter++;
            const uniqueUsername = `user_to_delete_${uniqueCounter}`;
            const uniqueEmail = `delete_${uniqueCounter}@example.com`;

            await UserModel.deleteOne({ username: uniqueUsername });
            await UserModel.deleteOne({ email: uniqueEmail });

            const userToDelete = await createTestUser({
                username: uniqueUsername,
                email: uniqueEmail,
                password: 'password123'
            });
            userToDeleteId = userToDelete._id.toString();
        });

        it('should allow an instructor to delete a user', async () => {
            const res = await request(app)
                .delete(`/deleteUser/${userToDeleteId}`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'User deleted successfully');

            const deletedUser = await UserModel.findById(userToDeleteId);
            expect(deletedUser).toBeNull();
        });

        it('should not allow a player to delete a user', async () => {
            const res = await request(app)
                .delete(`/deleteUser/${userToDeleteId}`)
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should return 404 if user to delete is not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .delete(`/deleteUser/${nonExistentId}`)
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should fail to delete user if not authenticated', async () => {
            const res = await request(app)
                .delete(`/deleteUser/${userToDeleteId}`);
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /instructor-dashboard', () => {
        it('should allow an instructor to access the instructor dashboard', async () => {
            const res = await request(app)
                .get('/instructor-dashboard')
                .set('Authorization', `Bearer ${instructorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Welcome to the instructor dashboard');
        });

        it('should not allow a player to access the instructor dashboard', async () => {
            const res = await request(app)
                .get('/instructor-dashboard')
                .set('Authorization', `Bearer ${playerToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should fail to access instructor dashboard if not authenticated', async () => {
            const res = await request(app)
                .get('/instructor-dashboard');
            expect(res.statusCode).toEqual(401);
        });
    });
});