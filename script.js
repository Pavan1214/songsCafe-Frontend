let songs = [];
let currentIndex = null;
let isShuffling = false;
let isLooping = false;
let likedSongs = JSON.parse(localStorage.getItem('likedSongs')) || [];

const audio = new Audio();
const songList = document.getElementById("song-list");
const playBtn = document.getElementById("play");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const shuffleBtn = document.getElementById("shuffle");
const loopBtn = document.getElementById("loop");
const seekbar = document.getElementById("seekbar");
const volume = document.getElementById("volume");
const currentTimeText = document.getElementById("current-time");
const durationText = document.getElementById("duration");
const playerCover = document.getElementById("player-cover");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");
const playerContainer = document.querySelector(".player-container");
const playerLike = document.getElementById("player-like");
const favoritesList = document.getElementById("favorites-list");
const visualizer = document.getElementById("visualizer");

function initVisualizer() {
  visualizer.innerHTML = '';
  for (let i = 0; i < 32; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.random() * 30 + 10}%`;
    bar.style.animation = `barAnimation ${0.5 + Math.random()}s infinite ease-in-out`;
    visualizer.appendChild(bar);
  }
}
function updateVisualizer() {
  document.querySelectorAll('.bar').forEach(bar => {
    bar.style.height = `${Math.random() * 80 + 10}%`;
  });
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" + s : s}`;
}

function createCard(song, i) {
  const isLiked = likedSongs.includes(i);
  const card = document.createElement("div");
  card.className = "song-card";
  card.innerHTML = `
    <div class="card-image">
      <img src="${song.cover}" alt="${song.title}">
      <div class="play-overlay"><i class="fas fa-play"></i></div>
    </div>
    <div class="card-content">
      <div class="title">${song.title}</div>
      <div class="artist">${song.artist}</div>
      <div class="card-footer">
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-index="${i}">
          <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <span class="duration">${song.duration || "--:--"}</span>
      </div>
    </div>
  `;
  card.onclick = () => loadAndPlay(i);

  const likeBtn = card.querySelector('.like-btn');
  likeBtn.onclick = (e) => {
    e.stopPropagation();
    toggleLike(i);
    likeBtn.classList.toggle('liked');
    const icon = likeBtn.querySelector('i');
    icon.classList.replace(icon.classList.contains('fas') ? 'fas' : 'far', likedSongs.includes(i) ? 'fas' : 'far');
    renderFavorites();
  };

  return card;
}

function toggleLike(index) {
  if (likedSongs.includes(index)) {
    likedSongs = likedSongs.filter(i => i !== index);
  } else {
    likedSongs.push(index);
  }
  localStorage.setItem('likedSongs', JSON.stringify(likedSongs));

  if (currentIndex === index) {
    playerLike.classList.toggle('liked', likedSongs.includes(index));
    const icon = playerLike.querySelector('i');
    icon.classList.replace(icon.classList.contains('fas') ? 'fas' : 'far', likedSongs.includes(index) ? 'fas' : 'far');
  }
}

function loadSongs() {
  songList.innerHTML = "";
  songs.forEach((song, i) => {
    const card = createCard(song, i);
    songList.appendChild(card);
  });
}

function loadAndPlay(index) {
  document.querySelectorAll('.song-card').forEach(card => card.classList.remove('active'));
  const card = songList.children[index];
  if (card) card.classList.add('active');

  currentIndex = index;
  const song = songs[index];
  audio.src = song.url;
  audio.load();
  audio.play();

  updatePlayerUI(song);
  playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  playerContainer.style.display = "flex";

  playerLike.classList.toggle('liked', likedSongs.includes(index));
  const icon = playerLike.querySelector('i');
  icon.classList.replace(icon.classList.contains('fas') ? 'fas' : 'far', likedSongs.includes(index) ? 'fas' : 'far');

  // already preloaded, just use it
  durationText.textContent = song.duration || "--:--";
}

function updatePlayerUI(song) {
  playerCover.src = song.cover;
  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;
  durationText.textContent = song.duration || "--:--";
}

function renderFavorites() {
  favoritesList.innerHTML = "";
  if (likedSongs.length === 0) {
    favoritesList.innerHTML = "<p style='text-align:center;color:#aaa;'>No favorites yet.</p>";
    return;
  }
  likedSongs.filter(i => songs[i]).forEach(i => {
    const song = songs[i];
    const div = document.createElement('div');
    div.className = 'fav-song-item';
    div.innerHTML = `
      <img src="${song.cover}" alt="${song.title}">
      <div class="title">${song.title}</div>
      <div class="artist">${song.artist}</div>
    `;
    div.onclick = () => loadAndPlay(i);
    favoritesList.appendChild(div);
  });
  localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
}

function createTrendingSection() {
  const container = document.querySelector('.top-songs');
  container.innerHTML = "";
  const top = [...songs].sort(() => 0.5 - Math.random()).slice(0, 3);
  top.forEach((song, i) => {
    const div = document.createElement('div');
    div.className = "top-song-item";
    div.innerHTML = `
      <div class="number">${i + 1}</div>
      <img src="${song.cover}" alt="${song.title}">
      <div class="top-song-info">
        <div class="title">${song.title}</div>
        <div class="artist">${song.artist}</div>
      </div>
    `;
    div.onclick = () => {
      const idx = songs.findIndex(s => s.title === song.title && s.artist === song.artist);
      if (idx !== -1) loadAndPlay(idx);
    };
    container.appendChild(div);
  });
}

// ✅ PRELOAD ACTUAL DURATIONS BEFORE RENDERING
async function fetchSongs() {
  try {
    const res = await fetch("https://songscafe-backend2-0.onrender.com/songs");
    const data = await res.json();

    // preload durations
    songs = await Promise.all(
      data.map(song => {
        return new Promise(resolve => {
          const tempAudio = new Audio();
          tempAudio.src = song.url;
          tempAudio.addEventListener("loadedmetadata", () => {
            song.duration = formatTime(tempAudio.duration);
            resolve(song);
          });
          tempAudio.addEventListener("error", () => {
            song.duration = "--:--";
            resolve(song);
          });
        });
      })
    );

    loadSongs();
    renderFavorites();
    createTrendingSection();
  } catch {
    songList.innerHTML = "<p style='text-align:center;color:#aaa;'>Failed to load songs. Server down?</p>";
  }
}

async function init() {
  await fetchSongs();
  initVisualizer();

  const vol = parseFloat(localStorage.getItem("volume") || 0.8);
  audio.volume = vol;
  volume.value = vol;
  playerContainer.style.display = "none";

  playBtn.onclick = togglePlay;
  nextBtn.onclick = nextSong;
  prevBtn.onclick = prevSong;

  shuffleBtn.onclick = () => {
    isShuffling = !isShuffling;
    shuffleBtn.style.color = isShuffling ? "var(--secondary)" : "var(--light)";
  };

  loopBtn.onclick = () => {
    isLooping = !isLooping;
    loopBtn.style.color = isLooping ? "var(--secondary)" : "var(--light)";
  };

  seekbar.oninput = () => {
    if (audio.duration) {
      audio.currentTime = (seekbar.value / 100) * audio.duration;
    }
  };

  audio.ontimeupdate = () => {
    if (audio.duration) {
      seekbar.value = (audio.currentTime / audio.duration) * 100;
      currentTimeText.textContent = formatTime(audio.currentTime);
    }
  };

  audio.onended = () => {
    isLooping ? audio.play() : nextSong();
  };

  volume.oninput = () => {
    audio.volume = volume.value;
    localStorage.setItem("volume", audio.volume);
  };

  document.getElementById("search").oninput = function () {
    const q = this.value.toLowerCase();
    songList.innerHTML = "";
    songs.forEach((song, i) => {
      if (song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q)) {
        const card = createCard(song, i);
        songList.appendChild(card);
      }
    });
  };

  playerLike.onclick = () => {
    if (currentIndex !== null) toggleLike(currentIndex);
    renderFavorites();
  };

  document.addEventListener("keydown", e => {
    const t = document.activeElement.tagName;
    if (t === "INPUT") return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    }
    if (e.code === "ArrowRight") nextSong();
    if (e.code === "ArrowLeft") prevSong();
    if (e.code === "ArrowUp") {
      audio.volume = Math.min(1, audio.volume + 0.1);
      volume.value = audio.volume;
    }
    if (e.code === "ArrowDown") {
      audio.volume = Math.max(0, audio.volume - 0.1);
      volume.value = audio.volume;
    }
  });

  setInterval(updateVisualizer, 200);
}

function togglePlay() {
  if (!audio.src) return;
  if (audio.paused) {
    audio.play();
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  } else {
    audio.pause();
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
  }
}
function nextSong() {
  if (songs.length === 0 || currentIndex === null) return;
  currentIndex = isShuffling ? Math.floor(Math.random() * songs.length) : (currentIndex + 1) % songs.length;
  loadAndPlay(currentIndex);
}
function prevSong() {
  if (songs.length === 0 || currentIndex === null) return;
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  loadAndPlay(currentIndex);
}

window.addEventListener("load", init);