// ===== FreeFastPoll Script =====

// Cloudinary Configuration
const CLOUD_NAME = "dlrqoa4mx";
const UPLOAD_PRESET = "freefastpoll_upload";
const SUPPORT_LINK = "https://ko-fi.com/YOUR_KOFI_USERNAME"; // Replace with your real link

let pollId = null;
let pollData = null;
let chart = null;

// On page load
window.onload = () => {
  pollId = new URLSearchParams(window.location.search).get("poll");
  if (pollId) {
    loadPoll(pollId);
  } else {
    addOption();
    addOption();
    loadFeedbacks();
  }
};

// Scroll to Create Poll
function scrollToCreate() {
  document.getElementById('pollCreation').scrollIntoView({ behavior: "smooth" });
}

// Add Option (Text + Optional Image)
function addOption() {
  const optionsDiv = document.getElementById("options");
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-center gap-2 option-preview";
  wrapper.innerHTML = `
    <input type="text" placeholder="Option ${optionsDiv.children.length + 1}" class="w-full p-2 border rounded" />
    <input type="file" accept="image/*" onchange="previewImage(this)" />
    <button class="delete-button" onclick="removeOption(this)">❌</button>
  `;
  optionsDiv.appendChild(wrapper);
}

// Preview Image
function previewImage(input) {
  const wrapper = input.parentElement;
  let img = wrapper.querySelector("img");
  if (!img) {
    img = document.createElement("img");
    wrapper.appendChild(img);
  }
  img.src = URL.createObjectURL(input.files[0]);
}

// Remove Option
function removeOption(button) {
  const optionsDiv = document.getElementById("options");
  if (optionsDiv.children.length > 2) {
    button.parentElement.remove();
  }
}

// Create Poll
async function createPoll() {
  const question = document.getElementById("question").value.trim();
  const maxVotes = parseInt(document.getElementById("maxVotes").value) || 1;
  const optionsElements = document.querySelectorAll("#options > div");

  if (!question || optionsElements.length < 2) {
    alert("Please enter a poll question and at least two options.");
    return;
  }

  const options = [];
  const optionImages = [];

  for (const optionDiv of optionsElements) {
    const text = optionDiv.querySelector("input[type='text']").value.trim();
    const fileInput = optionDiv.querySelector("input[type='file']");
    let imageUrl = "";

    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      try {
        const response = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, formData);
        imageUrl = response.data.secure_url;
      } catch (error) {
        console.error("Image upload failed", error);
        alert("Image upload failed. Please try again or remove image.");
        return;
      }
    }

    if (text || imageUrl) {
      options.push(text || "Image Only");
      optionImages.push(imageUrl);
    }
  }

  if (options.length < 2) {
    alert("Please enter at least two valid options.");
    return;
  }

  const newPoll = {
    question,
    options,
    optionImages,
    votes: Array(options.length).fill(0),
    createdAt: Date.now(),
    maxVotes,
  };

  const docRef = await firebase.firestore().collection("polls").add(newPoll);
  pollId = docRef.id;
  window.history.replaceState({}, "", `?poll=${pollId}`);

  alert("🎉 Poll created successfully! Scroll down to vote and share it!");
  loadPoll(pollId);
}
// Load Poll
async function loadPoll(id) {
  try {
    const doc = await firebase.firestore().collection("polls").doc(id).get();
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

  const voteForm = document.getElementById("voteForm");
  voteForm.innerHTML = "";

  data.options.forEach((option, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "flex items-center gap-2";
    wrapper.innerHTML = `
      <input type="${data.maxVotes > 1 ? "checkbox" : "radio"}" name="voteOption" value="${index}" class="form-radio text-blue-500" />
      <span>${option}</span>
      ${data.optionImages[index] ? `<img src="${data.optionImages[index]}" class="w-12 h-12 object-cover rounded">` : ""}
    `;
    voteForm.appendChild(wrapper);
  });
}

// Submit Vote
async function submitVote() {
  const selected = Array.from(document.querySelectorAll('input[name="voteOption"]:checked'));
  if (selected.length === 0) {
    alert("Please select at least one option before voting.");
    return;
  }
  if (selected.length > pollData.maxVotes) {
    alert(`You can select up to ${pollData.maxVotes} options only.`);
    return;
  }

  selected.forEach(input => {
    pollData.votes[parseInt(input.value)]++;
  });

  await firebase.firestore().collection("polls").doc(pollId).update({
    votes: pollData.votes
  });

  showResults();
}

// Show Results
function showResults() {
  document.getElementById("voteSection").style.display = "none";
  const resultSection = document.getElementById("resultSection");
  resultSection.classList.remove("hidden");

  document.getElementById("pollQuestionDisplay").textContent = pollData.question;

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

// Open Share Modal
function openShareModal() {
  const modal = document.getElementById("shareModal");
  modal.classList.add("active");

  const url = window.location.origin;
  document.getElementById("shareWhatsApp").href = `https://wa.me/?text=Vote anonymously at FreeFastPoll! ${url}`;
  document.getElementById("shareFacebook").href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  document.getElementById("shareMessenger").href = `fb-messenger://share?link=${url}`;
  document.getElementById("shareEmail").href = `mailto:?subject=Vote in a Poll&body=Join the poll: ${url}`;
}

// Close Share Modal
function closeShareModal() {
  document.getElementById("shareModal").classList.remove("active");
}

// Support Us Modal
function openSupportModal() {
  document.getElementById("supportModal").classList.add("active");
}
function closeSupportModal() {
  document.getElementById("supportModal").classList.remove("active");
}
function redirectSupport() {
  window.open(SUPPORT_LINK, "_blank");
}

// Submit Feedback
async function submitFeedback() {
  const feedback = document.getElementById("feedbackInput").value.trim();
  if (!feedback) {
    alert("Please enter some feedback!");
    return;
  }
  await firebase.firestore().collection("feedbacks").add({ feedback, createdAt: Date.now() });
  document.getElementById("feedbackInput").value = "";
  loadFeedbacks();
}

// Load Feedbacks
async function loadFeedbacks() {
  const feedbackWall = document.getElementById("feedbackWall");
  feedbackWall.innerHTML = "";

  const snapshot = await firebase.firestore().collection("feedbacks").orderBy("createdAt", "desc").limit(30).get();
  snapshot.forEach(doc => {
    const p = document.createElement("p");
    p.textContent = doc.data().feedback;
    feedbackWall.appendChild(p);
  });
}

// Show Expired Poll
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

// Access Poll Manually
function accessPoll() {
  const id = document.getElementById("accessPollId").value.trim();
  if (id) {
    window.location.href = `?poll=${id}`;
  }
}
