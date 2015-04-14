// app/models/face.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var FaceSchema   = new Schema({
    firstname: String,
    lastname: String,
    accountname: String,
    number: { type: Number, min: 1, max: 1000000 },
    picture: String
});

module.exports = mongoose.model('Face', FaceSchema);
