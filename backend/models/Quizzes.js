const mongoose = require('mongoose')

const Schema = mongoose.Schema;

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
    },
    timeLimit : {
        type : Number,
        default : 30, // seconds
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
        ref : "Users",
        required : true
    },
    isLiveOnly : {
        type : Boolean,
        default : false // false means it can be taken anytime, true means only in live sessions
    },
    createdAt : {
        type : Date,
        default : Date.now()
    }
})

const QuestionModel = mongoose.models.Question || mongoose.model('Question', questionSchema);
const QuizModel = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);

module.exports = {
    QuestionModel,
    QuizModel
};