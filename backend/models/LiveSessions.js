const mongoose = require('mongoose')

const Schema = mongoose.Schema;
// const ObjectId = Schema.ObjectId;

const liveSessionSchema = new Schema ({
    sessionid : {
        type : String,
        required : true,
        unique : true
    },
    quizId : {
        type : Schema.Types.ObjectId,
        ref : "Quiz",
        required : true
    },
    participants : [{
        userId : {
            type : Schema.Types.ObjectId,
            ref : "User"
        },
        score : {
            type : Number,
            default : 0
        }
    }],
    currentQuestionIndex : {
        type : Number,
        default : 0
    },
    isActive : {
        type : Boolean,
        default : true
    },
    createdAt : {
        type : Date,
        default : Date.now()
    }
})

const LiveSessionModel = mongoose.model('LiveSessionModel', liveSessionSchema)

module.exports = LiveSessionModel