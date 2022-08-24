const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcryptjs = require('bcryptjs');
// Uso de NCONF
let nconf = require('nconf');
nconf.argv().env().file({file: './config.json'});

// Se establecen las variables en NCONF
nconf.set('database:user', 'Arturo');
nconf.set('database:pwd', 'Houser');
nconf.set('database:collection', 'Authentication');

console.log(nconf.get('databse'));

// Guardar el bojecto de configuración en el disco (disk)
nconf.save(function(err){
    require('fs').readFile('./config.json', function(err, data){
        console.dir(JSON.parse(data.toString()))
    })
    if(err){
        console.log(err.message);
        return;
    }
    console.log('Configuration saved successfully.');
})

const mongoDB = 'mongodb+srv://Arturo:Houser@cluster0.pkcuhf2.mongodb.net/Authentication?retryWrites=true&w=majority';
mongoose.connect(mongoDB, {useUnifiedTopology: true, useNewUrlParser: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongo connection error'));

const User = mongoose.model(
    'User',
    new Schema({
        username: {type: String, required: true},
        password: {type: String, required: true}
    })
);

// passport.use(function(req, res, next){
//     res.locals.currentUser = req.user;
//     next();
// })

passport.use(
    new LocalStrategy((username, password, done) => {
        User.findOne({username: username}, (err, user) => {
            if(err) return done(err);
            if(!user) return done(null, false, {message: 'Incorrect username'});
            bcryptjs.compare(password, user.password, (err, res) => {
                if(res) {
                    return done(null, user)
                } else {
                    return done(null, false, {message: 'Incorrect password'})
                };
            })
        });
    })
);

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

const app = express();
app.set('views', __dirname);
app.set('view engine', "ejs");

app.use(session({secret: 'cats', resave: false, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({extended: false}));

app.get('/', (req, res) => res.render('./views/index', {
    user: req.user,
}));
app.get('/sign-up', (req, res) => res.render('./views/sign-up-form'));
app.get('/log-out', (req, res) => {
    req.logout(function(err){
        if(err) return next(err);
        res.redirect('/');
    });  
});

app.post('/sign-up', (req, res, next) => {
    bcryptjs.hash(req.body.password, 10, (err, hashedPassword) => {
        if(err) return next(err);
        const user = new User({
            username: req.body.username,
            password: hashedPassword,
        }).save(err => {
            if(err) return next(err);
            res.redirect('/');
        });
    })
});

app.post('/log-in', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/'
}))

app.listen(3000, () => console.log('app listening on port 3000!'));

