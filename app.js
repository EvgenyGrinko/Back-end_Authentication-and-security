
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');//It automatically encryptes specified fields
//when we call "save()" method and decryptes when we call "find()". 

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect('mongodb://localhost:27017/usersDB', {useNewUrlParser: true, useUnifiedTopology: true});

//Remember: encryption should be done for the Schema before you will create based on it collection (bofore "mongoose.model()")

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const secretSequence = process.env.SECRETSEQUENCE; //A key for encryption/decryption
//File "process.env" object is created automatically by "dotenv" module from ".env" file and keeps all our environment variables 

//There is no need to encrypt all data, as we will look for certain files in DB using unencrypted field "email"
userSchema.plugin(encrypt, { secret: secretSequence, encryptedFields: ['password'] });

const User = new mongoose.model('User', userSchema);
 
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save(function(err){
        if(err) {
            console.log(err);
        } else {
            res.render('secrets');
        }
    });

});

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({email: username}, function(err, foundUser){
        if (err) {
            console.log(err);
        } 
        if (foundUser){
            if(foundUser.password === password){
                res.render('secrets');
            }
        }
    });
});

app.listen(3000, () => {
    console.log('Server started on port 3000.');
})