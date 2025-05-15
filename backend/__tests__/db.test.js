// __tests__/db.test.js
const mongoose = require('mongoose');
// server.js'den app ve serverInstance'ı import et
const { app, serverInstance } = require('../server');

describe('MongoDB Connection', () => {
    beforeAll(async () => {
        // Mongoose bağlantısının tamamlanmasını bekle
        // Genellikle server.js import edildiğinde bağlantı başlar.
        // Bağlantının hazır olmasını beklemek için kısa bir gecikme veya
        // mongoose.connection.on('connected', ...) gibi bir event listener kullanılabilir.
        // Şimdilik, bağlantının bir sonraki tick'e kadar kurulacağını varsayalım
        // veya daha sağlam bir bekleme mekanizması ekleyelim.

        // Mongoose 'open' event'ini dinle
        if (mongoose.connection.readyState !== 1) { // Eğer zaten bağlı değilse
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
    });

    test('should connect to MongoDB and have readyState of 1', () => {
        expect(mongoose.connection.readyState).toBe(1); // 1 ise connected
    });

    afterAll(async () => {
        // Önce Mongoose bağlantısını kapat
        await mongoose.disconnect();
        // Sonra HTTP sunucusunu kapat
        await new Promise(resolve => serverInstance.close(resolve));
    });
});