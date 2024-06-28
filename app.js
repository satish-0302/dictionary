const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
const serviceAccount = require('./key.json');
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
  res.render('index', { definition: null });
});

app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    await db.collection('users').doc(email).set({
      email,
      password
    });
    res.redirect('/signin');
  } catch (error) {
    res.render('signup', { error: 'Error creating user: ' + error.message });
  }
});

app.get('/signin', (req, res) => {
  res.render('signin', { error: null });
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userDoc = await db.collection('users').doc(email).get();
    if (!userDoc.exists) {
      throw new Error('User does not exist');
    }

    const user = userDoc.data();
    if (user.password !== password) {
      throw new Error('Invalid password');
    }

    res.redirect('/');
  } catch (error) {
    res.render('signin', { error: 'Error signing in: ' + error.message });
  }
});

app.get('/dictionary', (req, res) => {
  const { word } = req.query;
  if (!word) {
    return res.render('index', { definition: null });
  }

  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
  request(url, { json: true }, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.render('index', { definition: 'Word not found' });
    }
    const definition = body[0]?.meanings[0]?.definitions[0]?.definition || 'Definition not found';
    res.render('index', { definition });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
