const mongoose = require('mongoose');
const { app, serverInstance } = require('../server');

describe('MongoDB Connection', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
    });

    test('should connect to MongoDB and have readyState of 1', () => {
        expect(mongoose.connection.readyState).toBe(1);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await new Promise(resolve => serverInstance.close(resolve));
    });
});