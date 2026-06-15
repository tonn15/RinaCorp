const openButtons = document.querySelectorAll(".openVideo");
const videoModal = document.getElementById("videoModal");
const closeVideo = document.getElementById("closeVideo");
const promoVideo = document.getElementById("promoVideo");

openButtons.forEach(button => {
  button.addEventListener("click", () => {
    videoModal.classList.add("active");
    promoVideo.play();
  });
});

closeVideo.addEventListener("click", () => {
  videoModal.classList.remove("active");
  promoVideo.pause();
  promoVideo.currentTime = 0;
});

document.querySelector(".video-overlay").addEventListener("click", () => {
  videoModal.classList.remove("active");
  promoVideo.pause();
  promoVideo.currentTime = 0;
});