/* ===== FreeFastPoll Custom Styles ===== */

/* Delete Button Styling */
.delete-button {
  color: #3B82F6; /* Blue */
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s ease;
}
.delete-button:hover {
  color: #22C55E; /* Green hover */
}

/* Option Preview Wrapper */
.option-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* Text Input for Poll Options */
.option-preview input[type="text"] {
  flex: 1;
  min-width: 180px;
}

/* File Input for Poll Option Image */
.option-preview input[type="file"] {
  flex-shrink: 0;
}

/* Share Modal Styling */
#shareModal {
  display: none;
}
#shareModal.active {
  display: flex;
}

/* Support Modal Styling */
#supportModal {
  display: none;
}
#supportModal.active {
  display: flex;
}

/* Feedback Wall */
#feedbackWall {
  background-color: #fffaf0;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e0d6c5;
  max-height: 300px;
  overflow-y: auto;
}

/* Expired or Not Found Messages */
#expiredMessage {
  background-color: #fffaf0;
  color: #ef4444;
  padding: 1rem;
  border: 2px dashed #ef4444;
  border-radius: 0.5rem;
  text-align: center;
  margin-top: 2rem;
}

/* Smooth Scrolling */
html {
  scroll-behavior: smooth;
}

/* Footer Links */
footer a {
  white-space: nowrap;
}

/* Share Icons Animation */
#shareModal img {
  transition: transform 0.2s ease;
}
#shareModal img:hover {
  transform: scale(1.2);
}

/* Mobile Adjustments */
@media (max-width: 640px) {
  #shareOptions {
    flex-direction: column;
    align-items: center;
  }
}
