// ====== FreeFastPoll Main Script ======

// Firebase Config - Replace with your own if needed
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global variables
let pollData = null;
let chart = null;
let pollId = null;

// On Page Load
window.onload = () => {
  pollId = new URLSearchParams(window.location.search).get("poll");
  if (pollId) {
    loadPoll(pollId);
  } else {
    addOption();
    addOption();
  }
};

// Scroll to Create Poll section
function scrollToCreate() {
  document.getElementById('pollCreation').scrollIntoView({ behavior: "smooth" });
}

// Add Option input
function addOption() {
  const optionsDiv = document.getElementById("options");
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-center space-x-2";
  wrapper.innerHTML = `
    <input type="text" placeholder="Option ${optionsDiv.children.length + 1}" class="w-full p-2 border rounded">
    <button class="delete-button" onclick="removeOption(this)">❌</button>
  `;
  optionsDiv.appendChild(wrapper);
}

// Remove Option input
function removeOption(btn) {
  const optionsDiv = document.getElementById("options");
  if (optionsDiv.children.length > 2) {
    btn.parentElement.remove();
  }
}

// Create Poll
async function createPoll() {
  const question = document.getElementById("question").value.trim();
  const optionElements = document.querySelectorAll("#options input");
  const options = Array.from(optionElements).map(input => input.value.trim()).filter(opt => opt);

  if (!question || options.length < 2) {
    alert("Please enter a question and at least two options.");
    return;
  }

  const createdAt = Date.now();
  const newPoll = { question, options, votes: Array(options
