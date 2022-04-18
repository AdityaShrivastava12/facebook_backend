const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const pool = require('./connection');
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function (req, res, next) {
  const corsWhiteList = [
    "http://localhost:3000",
    "https://facebook-backend-aditya.herokuapp.com/"
  ]

  if (corsWhiteList.indexOf(req.headers.origin) !== -1) {
    // Website you wish to allow to connect
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin)

    // Request methods you wish to allow
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")

    // Request headers you wish to allow
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-Requested-With,content-type"
    )

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    //res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
  }
  next()
})

// add a user in database
app.post('/users', async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      dob,
      password,
      email,
      phone,
      age,
      gender,
      about
    } = req.body;
    console.log(req.body);
    const newUser = await pool.query(`INSERT INTO fb_user (firstname,lastname,dob,password,email,phone,age,gender,about) VALUES ('${firstname}','${lastname}','${dob}','${password}','${email}','${phone}','${age}','${gender}','${about}') RETURNING *`);
    console.log(newUser.rows);
    res.json(newUser.rows);
  } catch (e) {
    console.log(e)
    res.json(e);
  }
})

//add a post
app.post('/users/:id/post', async(req,res) => {
  let imageorvideo = null;
  let likes = 0;
  const {title} = req.body;
  const id = req.params.id;
  try{
    const post = await pool.query(`INSERT INTO post (title,imageorvideo,createdby,likes,time) VALUES('${title}','${imageorvideo}',${id},${likes},current_timestamp) RETURNING *`);
    console.log(post.rows);
    res.send(post.rows);
  } catch (e) {
    console.log(e)
    res.send(e)
    console.log(e);
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
    const feed = await pool.query(`SELECT post.id, post.title, post.imageorvideo, post.createdby, post.likes,(fb_user.firstname ||' '|| fb_user.lastname) AS fullname FROM post JOIN (SELECT person2 FROM friends WHERE person1 = ${userId} AND flag = true) AS friends ON post.createdby = friends.person2 JOIN fb_user ON friends.person2 = fb_user.id ORDER BY post.time DESC;`);
    console.log(feed.rows);
    res.json(feed.rows);
  } catch (e) {
    console.log(e);
    res.json(e)
  }
})
app.listen(port, () => console.log(`listening on ${port}`));

// get information about a particular user
app.get('/users/:id', async(req,res) => {
  try {
    const id = req.params.id;
    const user = await pool.query(`SELECT * FROM fb_user WHERE id = ${id};`);
    res.json(user.rows);
  } catch (e) {
    res.json(e)
  }
})

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
    const friends = await pool.query(`SELECT friends.person2 AS id, (fb_user.firstname ||' '|| fb_user.lastname) AS fullname FROM friends JOIN fb_user ON friends.person2 = fb_user.id WHERE person1 = ${id} AND flag = true;`);
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
    const friends = await pool.query(`INSERT INTO friends VALUES(${sender_id},${reciever_id},false,current_timestamp),(${reciever_id},${sender_id},false,current_timestamp) RETURNING *`);
    res.send(friends);
  } catch (e) {
    res.send(e)
  }
})

pool.connect();
