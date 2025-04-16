let pollData = null;
let chart = null;
let userId = localStorage.getItem("userId") || Math.random().toString(36).slice(2);
localStorage.setItem("userId", userId);
let activeChartType = 'bar';
let qrTimeout = null;

document.addEventListener("DOMContentLoaded", () => {
  try {
    const optionsDiv = document.getElementById("options");
    if (optionsDiv) {
      addOption();
      addOption();
    }
    document.getElementById("question")?.addEventListener("input", () => {
      const counter = document.getElementById("question-counter");
      if (counter) counter.textContent = document.getElementById("question").value.length;
    });
    document.getElementById("feedback")?.addEventListener("input", () => {
      const counter = document.getElementById("feedback-counter");
      if (counter) counter.textContent = document.getElementById("feedback").value.length;
    });

    const urlParams = new URLSearchParams(window.location.search);
    const pollId = urlParams.get("poll");
    if (pollId) loadPoll(pollId);

    updateChartButtons();
  } catch (err) {
    console.error("Error in DOMContentLoaded:", err);
    alert("Failed to initialize the page. Check the console for details.");
  }
});

function addOption() {
  const optionsDiv = document.getElementById("options");

  if (optionsDiv.children.length >= 10) {
    alert("Maximum 10 options allowed.");
    return;
  }

  const index = optionsDiv.children.length + 1;
  const wrapper = document.createElement("div");

  // Outer wrapper scrolls if it overflows on mobile
  wrapper.className = "w-full overflow-x-auto";

  wrapper.innerHTML = `
    <div class="flex items-center gap-2 w-[650px] max-w-full">
      <input type="text" placeholder="Option ${index}" class="flex-grow border p-2 rounded h-10 min-w-0" maxlength="50" aria-label="Option ${index}" required />
      <label class="bg-gray-200 text-gray-800 px-2 py-2 rounded text-center cursor-pointer hover:bg-gray-300 h-10 flex items-center justify-center text-xs whitespace-nowrap">
        Image (opt)
        <input type="file" accept="image/*" class="hidden" aria-label="Image for option ${index}" />
      </label>
      <button type="button" onclick="this.closest('div').parentElement.remove(); updateMaxVotes();" class="text-red-500 hover:text-red-700 h-10">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;

  optionsDiv.appendChild(wrapper);
  updateMaxVotes();
}




function updateMaxVotes() {
  const maxVotesInput = document.getElementById("max-votes");
  const optionsCount = document.getElementById("options").children.length;
  if (maxVotesInput) {
    maxVotesInput.max = optionsCount || 10;
    if (parseInt(maxVotesInput.value) > optionsCount) {
      maxVotesInput.value = optionsCount || 1;
    }
  }
}

function previewPoll() {
  const question = document.getElementById("question").value.trim();
  const options = Array.from(document.querySelectorAll("#options input[type='text']")).map(input => input.value.trim()).filter(Boolean);
  if (!question || options.length < 2) {
    document.getElementById("question-error").classList.remove("hidden");
    return;
  }
  document.getElementById("question-error").classList.add("hidden");
  alert(`Preview:\nQuestion: ${question}\nOptions:\n${options.join("\n")}`);
}

async function createPoll() {
  try {
    const question = document.getElementById("question").value.trim();
    const maxVotes = parseInt(document.getElementById("max-votes").value) || 1;
    const optionInputs = document.querySelectorAll("#options > div");
    const options = [];
    document.getElementById("question-error").classList.add("hidden");

    for (let row of optionInputs) {
      const text = row.querySelector("input[type='text']").value.trim();
      const fileInput = row.querySelector("input[type='file']");
      const file = fileInput.files[0];
      if (!text) continue;
      let imageUrl = null;
      if (file) {
        if (file.size > 2 * 1024 * 1024) throw new Error("Image must be under 2MB");
        if (!["image/jpeg", "image/png"].includes(file.type)) throw new Error("Only JPEG or PNG allowed");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "freefastpoll_upload");
        const res = await fetch("https://api.cloudinary.com/v1_1/dlrqoa4mx/image/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        imageUrl = data.secure_url;
      }
      options.push({ text, image: imageUrl, votes: 0 });
    }

    if (!question || options.length < 2) {
      document.getElementById("question-error").classList.remove("hidden");
      return;
    }

    const pollId = Math.random().toString(36).substring(2, 10);
    pollData = {
      id: pollId,
      question,
      options,
      maxVotes,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000))
    };

    await firebase.firestore().collection("polls").doc(pollId).set(pollData);
    window.history.pushState({}, "", `?poll=${pollId}`);
    displayPoll();
  } catch (err) {
    console.error("Error in createPoll:", err);
    alert("Failed to create poll. Check the console for details.");
  }
}

async function loadPoll(id) {
  try {
    const doc = await firebase.firestore().collection("polls").doc(id).get();
    if (!doc.exists) {
      alert("Poll not found");
      return;
    }
    pollData = doc.data();
    if (pollData.expiresAt && pollData.expiresAt.toDate() < new Date()) {
      alert("This poll has expired.");
      return;
    }
    displayPoll();
  } catch (err) {
    console.error("Error in loadPoll:", err);
    alert("Failed to load poll. Check the console for details.");
  }
}

async function displayPoll() {
  try {
    const votingBox = document.getElementById("voting-box");
    const resultBox = document.getElementById("result-box");
    const sharingBox = document.getElementById("sharing-box");
    const feedbackBox = document.getElementById("feedback-box");
    const questionElem = document.getElementById("poll-question");
    const voteOptions = document.getElementById("vote-options");
    const voteMessage = document.getElementById("vote-message");
    const submitVotesBtn = document.getElementById("submit-votes");
    if (!votingBox || !resultBox || !sharingBox || !feedbackBox || !questionElem || !voteOptions || !voteMessage || !submitVotesBtn) {
      throw new Error("Required DOM elements are missing.");
    }

    votingBox.classList.remove("hidden");
    resultBox.classList.remove("hidden");
    sharingBox.classList.remove("hidden");
    feedbackBox.classList.remove("hidden");
    questionElem.textContent = pollData.question;
    voteOptions.innerHTML = "";

    const voteCheck = await firebase.firestore().collection("votes")
      .where("pollId", "==", pollData.id)
      .where("userId", "==", userId).get();
    const hasVoted = !voteCheck.empty;

    const isMultiVote = pollData.maxVotes > 1;
    if (isMultiVote) submitVotesBtn.classList.remove("hidden");

    pollData.options.forEach((opt, i) => {
      const wrapper = document.createElement("div");
      wrapper.className = "flex items-center";
      if (isMultiVote) {
        const checkboxId = `vote-option-${i}`;
        wrapper.innerHTML = `
          <input type="checkbox" id="${checkboxId}" class="mr-2" value="${i}" ${hasVoted ? 'disabled' : ''} aria-label="Select ${opt.text}" />
          <label for="${checkboxId}" class="flex items-center">
            ${opt.image ? `<img src="${opt.image}" class="h-12 w-12 object-cover inline mr-3 rounded" alt="${opt.text}">` : ''}
            ${opt.text}
          </label>
        `;
      } else {
        const button = document.createElement("button");
        button.className = `w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:scale-105 transition ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`;
        button.disabled = hasVoted;
        button.setAttribute("aria-label", `Vote for ${opt.text}`);
        button.innerHTML = opt.image ? `<img src="${opt.image}" class="h-12 w-12 object-cover inline mr-3 rounded" alt="${opt.text}"> ${opt.text}` : opt.text;
        button.onclick = async () => {
          button.disabled = true;
          button.innerHTML += ` <i class="fas fa-spinner fa-spin ml-2"></i>`;
          await vote([i]);
        };
        wrapper.appendChild(button);
      }
      voteOptions.appendChild(wrapper);
    });

    if (hasVoted) voteMessage.classList.remove("hidden");

    const ctx = document.getElementById("poll-chart")?.getContext("2d");
    if (ctx) {
      if (chart) chart.destroy();
      chart = new Chart(ctx, {
        type: activeChartType,
        data: {
          labels: pollData.options.map((_, i) => `Option ${i + 1}`),
          datasets: [{
            label: 'Votes',
            data: pollData.options.map(opt => opt.votes),
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: value => Math.floor(value)
              },
              title: {
                display: true,
                text: 'Vote Count'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Options'
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: ctx => {
                  const total = pollData.options.reduce((sum, opt) => sum + opt.votes, 0);
                  return `${ctx.label}: ${ctx.raw} votes (${total ? ((ctx.raw / total) * 100).toFixed(1) : 0}%)`;
                }
              }
            }
          }
        }
      });
    }

    const summary = document.getElementById("result-summary");
    if (summary) {
      const total = pollData.options.reduce((sum, opt) => sum + opt.votes, 0);
      summary.innerHTML = pollData.options.map(opt => `<p>${opt.text}: ${opt.votes} votes (${total ? ((opt.votes / total) * 100).toFixed(1) : 0}%)</p>`).join("");
    }

    const shareLink = document.getElementById("share-link");
    if (shareLink) {
      shareLink.value = `${location.origin}/index.html?poll=${pollData.id}`;
    }

    const countdown = document.getElementById("countdown");
    if (countdown && pollData.expiresAt) {
      countdown.classList.remove("hidden");
      updateCountdown(pollData.expiresAt.toDate());
    }
  } catch (err) {
    console.error("Error in displayPoll:", err);
    alert("Failed to display poll. Check the console for details.");
  }
}

async function vote(indices) {
  try {
    for (const index of indices) {
      await firebase.firestore().collection("votes").add({
        pollId: pollData.id,
        userId,
        optionIndex: index,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      pollData.options[index].votes += 1;
    }
    await firebase.firestore().collection("polls").doc(pollData.id).update({ options: pollData.options });
    displayPoll();
    showVoteSuccessModal();
  } catch (err) {
    console.error("Error in vote:", err);
    alert("Failed to vote. Check the console for details.");
  }
}

async function submitVotes() {
  try {
    const selected = Array.from(document.querySelectorAll("#vote-options input:checked")).map(input => parseInt(input.value));
    if (selected.length === 0) {
      alert("Please select at least one option.");
      return;
    }
    if (selected.length > pollData.maxVotes) {
      alert(`You can select up to ${pollData.maxVotes} options.`);
      return;
    }
    await vote(selected);
  } catch (err) {
    console.error("Error in submitVotes:", err);
    alert("Failed to submit votes. Check the console for details.");
  }
}

function goToPoll() {
  const pollId = document.getElementById("poll-id-input").value.trim();
  if (!pollId) return;
  const cleanId = pollId.includes("=") ? pollId.split("=").pop() : pollId;
  loadPoll(cleanId);
}

function resetForm() {
  document.getElementById("question").value = "";
  document.getElementById("options").innerHTML = "";
  document.getElementById("max-votes").value = 1;
  addOption();
  addOption();
}

function copyLink() {
  const link = document.getElementById("share-link").value;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.querySelector("#sharing-box button[aria-label='Copy link']");
    btn.innerHTML = `<i class="fas fa-check text-green-500"></i>`;
    setTimeout(() => btn.innerHTML = `<i class="fas fa-copy text-lg"></i>`, 2000);
  }).catch(err => {
    console.error("Error in copyLink:", err);
    alert("Failed to copy link.");
  });
}

function copySiteLink() {
  const link = document.getElementById("site-share-link").value;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.querySelector("#share-site-box button[aria-label='Copy site link']");
    btn.innerHTML = `<i class="fas fa-check text-green-500"></i>`;
    setTimeout(() => btn.innerHTML = `<i class="fas fa-copy"></i>`, 2000);
  }).catch(err => {
    console.error("Error in copySiteLink:", err);
    alert("Failed to copy site link.");
  });
}

function toggleChart(type) {
  try {
    activeChartType = type;
    updateChartButtons();
    if (chart) {
      chart.config.type = type;
      chart.options.scales = type === 'bar' ? {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            callback: value => Math.floor(value)
          },
          title: {
            display: true,
            text: 'Vote Count'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Options'
          }
        }
      } : {
        x: { display: false },
        y: { display: false }
      };
      chart.update();
    }
  } catch (err) {
    console.error("Error in toggleChart:", err);
    alert("Failed to toggle chart. Check the console for details.");
  }
}

function updateChartButtons() {
  document.getElementById("bar-btn").className = `px-3 py-1 rounded-lg ${activeChartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`;
  document.getElementById("pie-btn").className = `px-3 py-1 rounded-lg ${activeChartType === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`;
}

function downloadCSV() {
  try {
    const total = pollData.options.reduce((sum, opt) => sum + opt.votes, 0);
    const rows = [
      ["Question", pollData.question],
      ["Option", "Votes", "Percentage"],
      ...pollData.options.map(opt => [opt.text, opt.votes, total ? ((opt.votes / total) * 100).toFixed(1) + '%' : '0%'])
    ];
    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poll_${pollData.id}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error in downloadCSV:", err);
    alert("Failed to download CSV. Check the console for details.");
  }
}

function updateCountdown(expiry) {
  const countdown = document.getElementById("countdown");
  if (!countdown) return;
  const interval = setInterval(() => {
    const now = new Date();
    const diff = expiry - now;
    if (diff <= 0) {
      countdown.textContent = "Poll has expired";
      clearInterval(interval);
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    countdown.textContent = `Poll expires in ${hours}h ${minutes}m ${seconds}s`;
  }, 1000);
}

function showVoteSuccessModal() {
  const modal = document.getElementById("vote-success-modal");
  if (modal) {
    modal.classList.remove("hidden");
    setTimeout(() => modal.classList.add("hidden"), 3000);
  }
}

function closeVoteModal() {
  document.getElementById("vote-success-modal")?.classList.add("hidden");
}

async function submitFeedback() {
  try {
    const rating = document.querySelector("#star-rating input:checked")?.value || 0;
    const feedback = document.getElementById("feedback").value.trim();
    if (!rating && !feedback) return;

    await firebase.firestore().collection("feedback").add({
      pollId: pollData.id,
      userId,
      rating: parseInt(rating),
      feedback,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("feedback").value = "";
    document.querySelectorAll("#star-rating input").forEach(input => input.checked = false);
    alert("Feedback submitted!");
  } catch (err) {
    console.error("Error in submitFeedback:", err);
    alert("Failed to submit feedback. Check the console for details.");
  }
}

function showQRCode() {
  const shareLink = document.getElementById("share-link");
  const qrCanvas = document.getElementById("qr-code");
  const qrContainer = document.querySelector(".qr-code-display");
  if (shareLink && qrCanvas && qrContainer) {
    QRCode.toCanvas(qrCanvas, shareLink.value, { width: 100, height: 100 }, (err) => {
      if (err) console.error("QR Code error:", err);
    });
    qrContainer.classList.remove("hidden");
    clearTimeout(qrTimeout);
  }
}

function hideQRCode() {
  const qrContainer = document.querySelector(".qr-code-display");
  if (qrContainer) {
    qrTimeout = setTimeout(() => {
      qrContainer.classList.add("hidden");
    }, 2000);
  }
}

function toggleShareSiteBox() {
  const shareSiteBox = document.getElementById("share-site-box");
  if (shareSiteBox) {
    shareSiteBox.classList.toggle("hidden");
  }
}

const shareLinks = {
  x: () => `https://x.com/share?url=${encodeURIComponent(document.getElementById("share-link").value)}&text=Check out this poll!`,
  fb: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(document.getElementById("share-link").value)}`,
  wa: () => `https://api.whatsapp.com/send?text=Check out this poll: ${encodeURIComponent(document.getElementById("share-link").value)}`,
  email: () => `mailto:?subject=Check out this poll&body=I found this poll: ${encodeURIComponent(document.getElementById("share-link").value)}`,
  reddit: () => `https://reddit.com/submit?url=${encodeURIComponent(document.getElementById("share-link").value)}&title=Check out this poll!`
};

const siteShareLinks = {
  x: () => `https://x.com/share?url=${encodeURIComponent(document.getElementById("site-share-link").value)}&text=Check out QuickVoteTally!`,
  fb: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(document.getElementById("site-share-link").value)}`,
  reddit: () => `https://reddit.com/submit?url=${encodeURIComponent(document.getElementById("site-share-link").value)}&title=Check out QuickVoteTally!`
};
