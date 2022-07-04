const express = require('express');
const router = express.Router();
const title = 'AAD SAML Demo';


router.get('/', function(req, res, next) {
  if(req.isAuthenticated())
    res.render('index', { title, username: req.user.displayName, mail: req.user.email });
  else
    res.render('index', { title, username: null});
});

module.exports = router;
