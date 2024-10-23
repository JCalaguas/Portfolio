// Modal video functionality
var modal = document.getElementById("videoModal");
var btn = document.getElementById("seeMoreBtn");
var span = document.getElementsByClassName("close")[0];
var video = modal.querySelector("video");

btn.onclick = function() {
  modal.style.display = "block";
}

span.onclick = function() {
  modal.style.display = "none";
  video.pause();
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
    video.pause();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var hamburger = document.getElementById("hamburger");
  
  // Add click event for hamburger menu
  hamburger.onclick = function() {
    hamburger.classList.toggle("active"); // Toggle 'active' class on hamburger
  };
});
// form
function validateForm() {
    var firstName = document.getElementById('first-name').value;
    var lastName = document.getElementById('last-name').value;
    var email = document.getElementById('email').value;
    var phone = document.getElementById('phone').value;
    var message = document.getElementById('message').value;

    if (!firstName || !lastName || !email || !phone || !message) {
      alert('Please fill out all fields.');
      return false;
    }

    alert('Form submitted successfully!');
    return true;
  }
