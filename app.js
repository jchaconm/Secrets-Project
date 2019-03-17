//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require("passport-twitter").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;



const app = express();


app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static("public"));
app.set("view engine", "ejs");


//initialize express-session

app.use(session({
    secret: 'thisisourlittlesecret',
    resave: false,
    saveUninitialized: false
}));

//initialize passport

app.use(passport.initialize());
app.use(passport.session());




mongoose.connect("mongodb://localhost:27017/secretsDB", {
    useNewUrlParser: true
});

mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId : String,
    twitterId : String,
    facebookId : String,
    secret : String
});

//initialize passport-local-mongoose

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



const User = mongoose.model("User", userSchema);

//passport local mongoose configuration with passport local

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,    
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {

    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CLIENT_ID,
    consumerSecret: process.env.TWITTER_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/twitter/secrets"
  },
  function(token, tokenSecret, profile, cb) {

    console.log(profile);

    User.findOrCreate({ twitterId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function (req, res) {
    res.render("home");
})




app.route("/register")
    .get(function (req, res) {
        res.render("register");
    })
    .post(function (req, res) {

        User.register({
            username: req.body.username
        }, req.body.password, function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");

                })
            }


        })





    });

app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })
    .post(function (req, res) {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        })

        req.login(user, function (err) {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                })
            }


        })


    });

 app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

  app.get("/auth/twitter",
  passport.authenticate('twitter'));


  app.get("/auth/twitter/secrets", 
  passport.authenticate('twitter', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  app.get("/auth/facebook",
  passport.authenticate('facebook'));


  app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });



app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");

});

app.route("/secrets")
    .get(function (req, res) {

        User.find({ "secret" : { $ne : null }},function(err,foundUsers){

            if(err){
                console.log(err);
            }else{
                res.render("secrets", {usersWithSecret : foundUsers});
            }



        })

    
        });
    


app.route("/submit")
    .get(function(req,res){

    
            if (req.isAuthenticated()) {
                res.render("submit");
            } else {
                res.redirect("/login");
            }
        })
    .post(function(req,res){

        const submittedSecret = req.body.secret;
        const userId = req.user._id;

        User.findById(userId , function(err,foundUser){

            if(err){
                console.log(err);
            }else{

                foundUser.secret = submittedSecret;

                foundUser.save();

                res.redirect("/secrets");

            }



        });

 

    });
    

        






app.listen(3000, function () {
    console.log("Server started on port 3000");
})