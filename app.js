var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var passport = require('passport');
var session = require('express-session');
var fs = require('fs');

var SamlStrategy = require('passport-saml').Strategy;
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});
passport.use(new SamlStrategy(
  {
    // 部署到了 https://aad-saml.glitch.me/
    // 需要加上这句 protocol
    // protocol: 'https',
    path: '/pdms-saml',
    // 登录多个账号时，不加 prompt=select_account 会报 AADSTS16000 错误
    // 只登录了一个账号时，加 prompt=select_account 也没用
    entryPoint: 'https://login.microsoftonline.com/f074dbeb-1cc3-4857-a3ba-17253091f5d3/saml2?prompt=select_account',
    // forceAuthn: false, // 这个参数有用
    // IsPassive: false, // 没用
    // passive: false, // 没有用
    issuer: 'pdms-saml',
    cert: fs.readFileSync('PDMS-SAML.cer', 'utf-8'),
    // additionalParams: {'IsPassive':'true'}, // 这个是加到 entryPoint 的 query string 里面
    signatureAlgorithm: 'sha256'
  },
  function (profile, done) {
    return done(null,
      {
        id: profile['nameID'],
        email: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        displayName: profile['http://schemas.microsoft.com/identity/claims/displayname'],
        firstName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
        lastName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']
      });
  })
);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session(
  {
    resave: true,
    saveUninitialized: true,
    secret: 'this shit hits'
  }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/login',
  passport.authenticate('saml', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);
app.post('/pdms-saml',
  passport.authenticate('saml', {
    failureRedirect: '/',
    failureFlash: true
  }),
  function (req, res) {
    // console.log(req);
    res.redirect('/');
  }
);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
