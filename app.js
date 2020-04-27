
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const passport = require('passport');//An authentication middleware for Node.js
const session = require('express-session');//A session middleware
const passportLocalMongoose = require('passport-local-mongoose');//a Mongoose plugin that simplifies building username and password login with "Passport"
const GoogleStrategy = require('passport-google-oauth20').Strategy;//Passport strategy for authenticating with Google using the OAuth 2.0 API.
const GitHubStrategy = require('passport-github').Strategy;//Passport strategy for authenticating with GitHub using the OAuth 2.0 API.
const findOrCreate = require('mongoose-findorcreate');//This plugin for Mongoose adds a "findOrCreate" method to models. Useful for Passport to shorten code.

//Plugin is a stand-alone module which is dynamically connected to the main application. It can either
//add some new, or/and to use current functionalities of this app

const app = express();

//Remember: whenever you update your code and save it "Nodemon" will restart you server
//And whenever your server gets restarted, your cookies gets deleted and your session gets restarted

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));

//We wight use "session()" before "passport.session()" to ensure that the login session is restored in the correct order
//Set initial parameters for the session:
app.use(session({
    secret: 'Simple text',//This value is used to sign the session ID cookie.
    resave: false,//If true, it forces the session to be saved back to the session store, even if the session was never modified during the request
    saveUninitialized: false//If true, it forces a session that is "uninitialized" to be saved to the store. A session is uninitialized when it is new but not modified.
  }));

//To use "Passport" with "Express" it's required to initialize "passport":
app.use(passport.initialize());

//As we will use persistent login sessions, "passport.session()" middleware must also be used.
//The persistent session data is stored in a cookie in the user's browser
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/usersDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);//To handle deprecation warning from Mongoose

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    githubId: String
});

//plugins to the schema of User model
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

//The "createStrategy()" is from "passport-local-mongoose". 
//It sets "passport-local" LocalStrategy with the correct options.
passport.use(User.createStrategy());
//The Local strategy used to authenticate user by Username and password

//To serialize and deserialize our User is only needed when we use Sessions. What it does: when we tell to
//the Passport to serialize our User it creates a cookie and add in it the information about authentication.
//To deserialize means to get out the information that Passport puts into the cookie about who the User is and
//all other authentication stuff. With that data we will be able to authenticate the User on our server.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
//These methods alllow to transmit information about authentication only during the login request. If autentication
//succedes, a session will be initialized and will be maintained until the cookie has been set in the user's browser.
//All subsequent requests will contain only the unique cookie that indentifies the session.
//"Passport" will serialize and deserialize User to and from the session.
 

//The Google authentication strategy authenticates users using a Google account and OAuth 2.0 tokens. The "client ID" and 
//"secret", which obtained during the creation of an application, are supplied as options to the strategy. The strategy also requires 
//a verify callback, which receives the "access token" and optional "refresh token", as well as "profile" - it contains the 
//authenticated user's Google profile. The verify callback must call "cb" providing a user to complete authentication.
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/secrets'
},
function(accessToken, refreshToken, profile, cb) {
  // console.log(profile)
  //"findOrCreate" method comes from "mongoose-findorcreate" plugin
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

//The GitHub authentication strategy authenticates users using a GitHub account and OAuth 2.0 tokens.
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/github/secrets'
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ githubId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
//-----Alternative code to examine, whether this user has already registered and added to database or not. 
//-----If yes - return "done" method to supply Passport with the user that authenticated.
//-----If not - add him to the database and also invoke "done" method to supply Passport with the authenticated user.
// function(accessToken, refreshToken, profile, done) {
//   User.findOne({ githubId: profile.id }, function (err, user) {
//     if (err) { return done(err); } 
//     if (!user) {
//       user = new User({
//           username: profile.username,
//           //now in the future searching on User.findOne({'githubId': profile.id } will match because of this next line
//           githubId: profile._json.id
//       });
//       user.save(function(err) {
//           if (err) console.log(err);
//           return done(null, user);
//       });
//   } else {
//       //return found user
//       return done(null, user);
//   }
// });
// }
));


app.get('/', (req, res) => {
    res.render('home');
});

//In the "passport.authenticate()" we must specify the strategy ('google'/'github' etc.) to authenticate requests.
//The corresponding strategy was set up earlier and we receive back (from google/github etc.) user's "profile". It includes 
//among other things, user's email and user ID on Google which we will be able to use in the future to identify him. 
//The next two lines of code provide redirection to the google's sign in page.
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

// In case of successful authentication we must redirect the user from Google "sign in" page to the route where we can locally
//authenticate him and save the session and cookies. That route we defiend earlier in the "Authorized redirect URIs" section 
//(we specified it when a new project had been created in the "Google Developers Console") ("http://localhost:3000/auth/google/secrets" in that case).
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to the secrets page.
    res.redirect('/secrets');
});

app.get('/auth/github',
  passport.authenticate('github'));

app.get('/auth/github/secrets', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });


app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/secrets', (req, res) => {
    //"isAuthenticated()" from the Passport library and it returns "true" is the user is already authenticated
    if (req.isAuthenticated()){
      res.render("secrets");
    } else {
      res.redirect("/login");
    }
  });

app.get('/logout', (req, res) => {
    req.logout();//"logout()" from the Passport library and it allows to deauthenticate the User
    res.redirect("/");
  });

app.post('/register', (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    //"register()" is a method from the "passport-local-mongoose" and it's used to register a new user instance with a given password
      User.register({username: username}, password, (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          //"authenticate()" allows to authenticate current User using "local" strategy
          passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");//now if the User passes authentication he will be able to visit "secrets" page any time during Session (if he is still logged in)
          });
        }
      });
    });

app.post('/login', (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  //"login()" from the Passport library. It allows to establish a login session
  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      })
    }
  })
});

app.listen(3000, () => {
    console.log('Server started on port 3000.');
})