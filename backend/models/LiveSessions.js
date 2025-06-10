const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionIndex: { type: Number, required: true },
    answerIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    answeredAt: { type: Date, default: Date.now }
}, { _id: false });

const participantSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    score: { type: Number, default: 0 },
    answers: {
        type: [answerSchema],
        default: []
    }
}, { _id: false });

const liveSessionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    sessionid: { type: String, required: true, unique: true, default: () => new mongoose.Types.ObjectId().toString() },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    isActive: { type: Boolean, default: true },
    currentQuestionIndex: { type: Number, default: 0 },
    participants: [participantSchema],
    questionStarted: {
    type: Boolean,
    default: false
    },
    questionStartTime: {
        type: Date,
        default: null
    },
    createdAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null }
});

const LiveSessionModel = mongoose.model('LiveSession', liveSessionSchema);

module.exports = mongoose.models.LiveSession || mongoose.model('LiveSession', liveSessionSchema);