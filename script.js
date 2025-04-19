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
  const newPoll = { question, options, votes: Array(options.length).fill(0), createdAt };

  const docRef = await db.collection("polls").add(newPoll);
  pollId = docRef.id;

  window.history.replaceState({}, "", `?poll=${pollId}`);
  showVoteSection(newPoll);
  alert("🎉 Poll Created Successfully! Scroll down to vote and share it!");
}

// Load Poll
async function loadPoll(id) {
  try {
    const doc = await db.collection("polls").doc(id).get();
    if (doc.exists) {
      const data = doc.data();
      const expired = Date.now() > (data.createdAt + 48 * 60 * 60 * 1000);
      if (expired) {
        showExpired();
      } else {
        pollData = data;
        showVoteSection(data);
      }
    } else {
      showNotFound();
    }
  } catch (error) {
    console.error(error);
    showNotFound();
  }
}

// Show Vote Section
function showVoteSection(data) {
  document.getElementById("pollCreation").style.display = "none";
  const voteSection = document.getElementById("voteSection");
  voteSection.classList.remove("hidden");
  voteSection.scrollIntoView({ behavior: "smooth" });

  const voteOptions = document.getElementById("voteOptions");
  voteOptions.innerHTML = "";

  data.options.forEach((opt, index) => {
    const label = document.createElement("label");
    label.className = "block bg-white p-2 rounded border flex items-center space-x-2";
    label.innerHTML = `
      <input type="radio" name="voteOption" value="${index}" class="form-radio text-blue-500">
      <span>${opt}</span>
    `;
    voteOptions.appendChild(label);
  });
}

// Submit Vote
async function submitVote() {
  const selected = document.querySelector('input[name="voteOption"]:checked');
  if (!selected) {
    alert("Please select an option before voting.");
    return;
  }
  const index = parseInt(selected.value);
  pollData.votes[index]++;
  await db.collection("polls").doc(pollId).update({ votes: pollData.votes });
  showResults();
}

// Show Results
function showResults() {
  document.getElementById("voteSection").style.display = "none";
  const resultSection = document.getElementById("resultSection");
  resultSection.classList.remove("hidden");

  const ctx = document.getElementById('pollChart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: pollData.options.map((_, i) => `Option ${i + 1}`),
      datasets: [{
        label: "Votes",
        data: pollData.votes,
        backgroundColor: pollData.votes.map(() => '#3B82F6'),
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  const optionLabels = document.getElementById("optionLabels");
  optionLabels.innerHTML = pollData.options.map((opt, i) => `${i + 1}. ${opt}`).join('<br>');
}

// Share Site
function shareSite() {
  const options = document.getElementById("shareOptions");
  options.classList.toggle("hidden");

  const url = window.location.href.split('?')[0];
  document.getElementById("shareWhatsApp").href = `https://wa.me/?text=Vote anonymously at FreeFastPoll! ${url}`;
  document.getElementById("shareFacebook").href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  document.getElementById("shareMessenger").href = `fb-messenger://share?link=${url}`;
  document.getElementById("shareEmail").href = `mailto:?subject=Vote in a Poll&body=Join the poll: ${url}`;
}

// Support Us Modal
function redirectSupport() {
  window.open("YOUR_SUPPORT_LINK_HERE", "_blank");
}

// Submit Feedback
async function submitFeedback() {
  const feedback = document.getElementById("feedbackInput").value.trim();
  if (!feedback) {
    alert("Please enter some feedback!");
    return;
  }
  await db.collection("feedbacks").add({ feedback, createdAt: Date.now() });
  document.getElementById("feedbackInput").value = "";
  loadFeedbacks();
}

// Load Feedbacks
async function loadFeedbacks() {
  const feedbackWall = document.getElementById("feedbackWall");
  feedbackWall.innerHTML = "";

  const snapshot = await db.collection("feedbacks").orderBy("createdAt", "desc").limit(20).get();
  snapshot.forEach(doc => {
    const p = document.createElement("p");
    p.textContent = doc.data().feedback;
    feedbackWall.appendChild(p);
  });
}

// Show Poll Expired Message
function showExpired() {
  document.body.innerHTML = `
    <div id="expiredMessage">
      <h1 class="text-2xl font-bold">⏰ Poll Expired</h1>
      <p class="mt-4">This poll has expired. Please <a href="/" class="text-blue-500 underline">create a new poll</a>.</p>
    </div>
  `;
}

// Show Poll Not Found
function showNotFound() {
  document.body.innerHTML = `
    <div id="expiredMessage">
      <h1 class="text-2xl font-bold">🚫 Poll Not Found</h1>
      <p class="mt-4">The poll you are trying to access does not exist. <a href="/" class="text-blue-500 underline">Create a new one</a>!</p>
    </div>
  `;
}
