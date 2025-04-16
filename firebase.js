// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBaYtVWWHSjcJWpkRfSlmKDAA1jF8exOVY",
    authDomain: "quick-vote-tally.firebaseapp.com",
    projectId: "quick-vote-tally",
    storageBucket: "quick-vote-tally.appspot.com",
    messagingSenderId: "42570695803",
    appId: "1:42570695803:web:597ff9601da5d3e29dcede"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();