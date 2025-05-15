// models/LiveSessions.js
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionIndex: { type: Number, required: true },
    answerIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    answeredAt: { type: Date, default: Date.now }
}, { _id: false }); // Cevaplar için ayrı _id oluşturma

const participantSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    score: { type: Number, default: 0 },
    answers: {
        type: [answerSchema], // answerSchema'yı burada kullanıyoruz
        default: [] // Varsayılan olarak boş bir dizi ata
    }
}, { _id: false }); // Katılımcılar için ayrı _id oluşturma

const liveSessionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    sessionid: { type: String, required: true, unique: true, default: () => new mongoose.Types.ObjectId().toString() },
    isActive: { type: Boolean, default: true },
    currentQuestionIndex: { type: Number, default: 0 },
    participants: [participantSchema], // participantSchema'yı burada kullanıyoruz
    createdAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null }
});

const LiveSessionModel = mongoose.model('LiveSession', liveSessionSchema);

module.exports = mongoose.models.LiveSession || mongoose.model('LiveSession', liveSessionSchema);