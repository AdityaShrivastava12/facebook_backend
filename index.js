const express = require('express');
// const session = require('express-session');
const flash = require('express-flash');
const {v4:uuidv4} = require('uuid');
const app = express();
const bodyParser = require('body-parser');
const pool = require('./connection');
const bcrypt = require('bcrypt');
// const passport = require('passport');
// const initializePassport = require('./passportConfig');

const port = process.env.PORT || 3001;

const jwt = require('jsonwebtoken');
require('dotenv').config();
const path = require('path');

// initializePassport(passport);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(session({
//   genid: function(req){
//     return uuidv4();
//   },
//   secret: 'somelongsecret',
//   resave: false,
//   saveUninitialized: true,
//   cookie: {maxAge: 180 * 60 * 1000}
// }));

// app.use(passport.initialize());
// app.use(passport.session());

app.use(flash());

app.use(function (req, res, next) {
  const corsWhiteList = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3001/signup",
    "http://facebook-backend-aditya.herokuapp.com/register",
    "https://facebook-backend-aditya.herokuapp.com/register"
  ]

  if (corsWhiteList.indexOf(req.headers.origin) !== -1) {
    // Website you wish to allow to connect
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin)

    // Request methods you wish to allow
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")

    // Request headers you wish to allow
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-Requested-With,content-type",
    )

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    //res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
  }
  next()
})


// app.get('/', (req,res) => {
//   res.send(req.sessionID);
// })

// app.post('/login', (req,res) => {
//   req.session.email = req.body.email;
//   req.session.password = req.body.password;
//   res.send({email: req.session.email, password: req.session.password, sessionId: req.sessionID});
// })

// add a user in database
app.post('/register', async (req, res) => {
    const {firstname,lastname,dob,password,email,gender} = req.body;
    console.log({firstname,lastname,dob,password,email,gender});

    let errors = [];

    if(!firstname || !lastname || !dob || !password || !email || !gender){
      errors.push({message: 'All fields are required'});
    }

    if (password.length < 6){
      errors.push({message: 'Password length should be more than 6 characters'});
    }

    if(!email.includes('@') && !(email.includes('.com') || email.includes('.in'))){
      errors.push({message: 'Enter a valid email'})
    }

    if(errors.length > 0){
      res.json({failure: errors});
    } else {
      // check if user already exists
      pool.query(`SELECT * FROM fb_user WHERE email = '${email}'`, async (err,result) => {
        if(err) throw err;
        else {
          if(result.rows.length > 0){
            res.json({alreadyExists: 'User already exists'});
          } else {
            // encrypt password
            const hashedPassword = await bcrypt.hash(password,10);
            // insert user into data base
            pool.query(`INSERT INTO fb_user (firstname,lastname,dob,password,email,gender) VALUES ('${firstname}','${lastname}','${dob}','${hashedPassword}','${email}','${gender}')`, (err,result) => {
              if(err){
                throw err;
              }
              else {
                res.json({success: 'Successfully resgistered'});
              }
            })
          }
        }
      })
    }

    // const newUser = await pool.query(`INSERT INTO fb_user (firstname,lastname,dob,password,email,gender) VALUES ('${firstname}','${lastname}','${dob}','${password}','${email}','${gender}') RETURNING *`);
    // console.log(newUser.rows);
    // res.json(newUser.rows);
})

// app.post('/',passport.authenticate('local',{
//   failureRedirect: '/',
//   failureFlash: true
// }),(req,res) => {
//   res.redirect(`/users/${req.user.id}`)
// })

//add a post
app.post('/users/:id/post', async(req,res) => {
  let imageorvideo = null;
  const {title} = req.body;
  const id = req.params.id;
  try{
    const post = await pool.query(`INSERT INTO post (title,imageorvideo,createdby,likes,time) VALUES('${title}','${imageorvideo}',${id},ARRAY[]::integer[],current_timestamp) RETURNING id,title,imageorvideo,createdby,likes`);
    console.log(post.rows);
    const names = await pool.query(`SELECT firstname,lastname FROM fb_user WHERE id = ${id}`);
    post.rows[0].firstname = names.rows[0].firstname;
    post.rows[0].lastname = names.rows[0].lastname;
    res.send(post.rows[0]);
  } catch (e) {
    console.log(e)
    res.send(e)
    console.log(e);
  }
})

// login
app.post('/login', async(req,res) => {
  const {email,password} = req.body;
  console.log({email,password});
  if(!email || !password){
     res.json({error: 'Email and Password are required'});
     return res.redirect('/signup');
  }
  const response = await pool.query(`SELECT * FROM fb_user WHERE email = '${email}'`);
  let foundUser = response.rows[0];
  console.log(foundUser);
  if(!foundUser){
    return res.json({error: 'User not found'});
  }
  const match = await bcrypt.compare(password,foundUser.password);
  if(match){
    // create JWTs

    const accessToken = jwt.sign(
      {"email": foundUser.email},
      process.env.ACCESS_TOKEN_SECRET,
      {expiresIn: '500000s'}
    );

    const refreshToken = jwt.sign(
      {"email": foundUser.email},
      process.env.REFRESH_TOKEN_SECRET,
      {expiresIn: '10d'}
    );
    res.json({success: 'successfully logged in', user: foundUser});
  } else {
    res.json({error: 'Wrong password'});
  }
})

// get information about a particular user
app.get(`/users/:id`, async (req,res) => {
  const userId = req.params.id;
  try{
    const user = await pool.query(`SELECT * FROM fb_user WHERE id = ${userId}`);
    res.json(user.rows[0]);
  } catch (e){
    res.json(e)
  }
})

//delete a post
app.delete('/users/post/:id', async(req,res) => {
  const postId = req.params.id;
  try{
    const deletedPost = await pool.query(`DELETE FROM post WHERE id = ${postId} RETURNING *`);
    res.json(deletedPost.rows);
  } catch (e) {
    res.json(e);
  }
})

//edit a post
app.put('/users/post/:id', async(req,res) => {
  const postId = req.params.id;
  const {title} = req.body;
  try{
    const editedPost = await pool.query(`UPDATE post SET title = '${title}', time = current_timestamp WHERE id = ${postId} RETURNING *`);
    res.json(editedPost.rows)
  } catch (e) {
    res.json(e)
  }
})

// get feed of a user
app.get('/users/:id/feed', async(req,res) => {
  try {
    const userId = req.params.id;
    const responseFriends = await pool.query(`SELECT post.id, post.title, post.imageorvideo, post.createdby, post.likes, fb_user.firstname, fb_user.lastname FROM post JOIN (SELECT person2 FROM friends WHERE person1 = ${userId} AND flag = true) AS friends ON post.createdby = friends.person2 JOIN fb_user ON friends.person2 = fb_user.id ORDER BY post.time DESC;`);
    const feedFriends = responseFriends.rows;
    const response = await pool.query(`SELECT post.id,post.title,post.imageorvideo,post.createdby,post.likes,fb_user.firstname,fb_user.lastname FROM post JOIN fb_user ON post.createdby = fb_user.id WHERE fb_user.id = ${userId}`);
    const postsOfUser = response.rows;
    const finalFeed = [...feedFriends,...postsOfUser];
    res.json(finalFeed);
  } catch (e) {
    console.log(e);
    res.json(e)
  }
})
app.listen(port, () => console.log(`listening on ${port}`));


// app.get('/users/:id', async(req,res) => {
//   try {
//     const id = req.params.id;
//     const user = await pool.query(`SELECT * FROM fb_user WHERE id = ${id};`);
//     res.json(user.rows);
//   } catch (e) {
//     res.json(e)
//   }
// })

//get all the users
app.get('/users', async(req,res) => {
  try{
    const users = await pool.query(`SELECT * FROM fb_user;`);
    res.json(users.rows);
  } catch (e) {
    res.json(e);
  }
})

//get all the posts
app.get('/posts',async(req,res) => {
  try {
    const posts = await pool.query(`SELECT * FROM post ORDER BY time DESC;`)
    res.json(posts.rows);
  } catch (e) {
    res.json(e);
  }
})

app.get('/', (req,res) => {
  res.send('connected');
})

//get all the posts of a user
app.get('/users/:id/posts', async(req,res) => {
  const id = req.params.id;
  try{
    const userPosts = await pool.query(`SELECT * FROM post WHERE createdby = ${id} ORDER BY time DESC;`);
    res.json(userPosts.rows);
  } catch (e) {
    res.json(e);
  }
})

//get all the friends of a user
app.get('/users/:id/friends', async(req,res) => {
  const id = req.params.id;
  try{
    const friends = await pool.query(`SELECT friends.person2 AS id, fb_user.firstname, fb_user.lastname FROM friends JOIN fb_user ON friends.person2 = fb_user.id WHERE person1 = ${id} AND flag = true;`);
    res.json(friends.rows);
  } catch(e) {
    res.json(e);
  }
})

// send friend request
app.post('/friends/:sender_id/:reciever_id', async(req,res) => {
  const sender_id = req.params.sender_id;
  const reciever_id = req.params.reciever_id;
  try{
    const friends = await pool.query(`INSERT INTO friends (person1,person2,flag,time) VALUES(${sender_id},${reciever_id},false,current_timestamp),(${reciever_id},${sender_id},false,current_timestamp) RETURNING *`);
    res.send(friends.rows);
  } catch (e) {
    console.log(e);
    res.send(e);
  }
})

// accept a friend request
app.put('/friends/:sender_id/:reciever_id', async(req,res) => {
  console.log(req.params)
  const sender_id = req.params.sender_id;
  const reciever_id = req.params.reciever_id;
  try{
    const friends = await pool.query(`UPDATE friends SET flag = true WHERE person1 = ${sender_id} AND person2 = ${reciever_id} OR person1 = ${reciever_id} AND person2 = ${sender_id} RETURNING *`);
    res.send(friends.rows);
  } catch (e) {
    console.log(e);
    res.send(e);
  }
})

// update likes
app.put('/post/:id/updatelikes', async (req,res) => {
  const {userId} = req.body
  const postId = req.params.id;
  const response = await pool.query(`SELECT likes FROM post WHERE id = ${postId}`);
  let likesArray = response.rows[0].likes;
  const checkResponse = await pool.query(`Select ${userId} = ANY(ARRAY[${likesArray}]::integer[]) AS check`);
  let isPresent = checkResponse.rows[0].check;
  let resultArray;
  if(isPresent){
    resultArray = await pool.query(`UPDATE post SET likes = array_remove(likes,${userId}) WHERE id = ${postId} RETURNING *`);
  } else {
    resultArray = await pool.query(`UPDATE post SET likes = array_append(likes,${userId}) WHERE id = ${postId} RETURNING *`);
  }
  let updatedArray = await pool.query(`SELECT likes FROM post WHERE id = ${postId}`);
  res.json(updatedArray.rows[0].likes);
})

//get all the comments
app.get('/comments', async (req,res) => {
  try{
    let response = await pool.query(`SELECT comments.id, comments.content,comments.postid, comments.userid, fb_user.firstname, fb_user.lastname FROM comments INNER JOIN fb_user ON comments.userid = fb_user.id ORDER BY comments.time ASC`);
    res.json(response.rows);
  } catch(e){
    console.log(e);
    res.json(e);
  }
})

pool.connect();
