const mongoose = require('mongoose')

const Schema = mongoose.Schema;
// const ObjectId = Schema.ObjectId;

const questionSchema = new Schema ({
    text : {
        type : String,
        required : true
    },
    options : {
        type : [String],
        required : true
    },
    correctAnswer : {
        type : Number,
        required : true
    }
})

const quizSchema = new Schema ({
    title : {
        type : String,
        required : true
    },
    questions : [questionSchema],
    createdBy : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    createdAt : {
        type : Date,
        default : Date.now()
    }
})

const QuestionModel = mongoose.model('QuestionModel', questionSchema)
const QuizModel = mongoose.model('QuizModel', quizSchema)

module.exports = QuestionModel
module.exports = QuizModel
