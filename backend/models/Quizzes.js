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
        ref : "Users",
        required : true
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
