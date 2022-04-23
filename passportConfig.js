const LocalStrategy = require('passport-local').Strategy;
const {pool} = require('./connection');
const bcrypt = require('bcrypt');

function initialize(passport){

const authenticateUser = (email,password,done) => {
  pool.query(`SELECT * FROM fb_user WHERE email = '${email}'`,(err,results) => {
    if(err) throw err;
    console.log(results.rows);

    if(results.rows.length > 0){
      const user = results.rows[0];
      bcrypt.compare(password,user.password,(err,isMatch) => {
        if(err) throw err;
        if(isMatch){
          return done(null,user);
        } else {
          return done(null,false,{message: "Password is not currect"});
        }
      })
    } else {
      return done(null,false,{message: "Email is not registered"});
    }
  })
}

  passport.use(new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
  }, authenticateUser));

  passport.serializeUser((user,done) => done(null,user.id));
  passport.deserializeUser((id,done) => {
    pool.query(`SELECT * FROM fb_user WHERE id = '${id}'`,(err,results) => {
      if(err) throw err;
      return done(null,results.rows[0]);
    })
  })
}

module.exports = initialize;
