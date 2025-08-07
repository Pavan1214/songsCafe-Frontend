
// Main application state
let allSongs = [];
let currentSongs = [];
let currentIndex = null;
let isShuffling = false;
let isLooping = false;
let likedSongs = JSON.parse(localStorage.getItem('likedSongs')) || [];
let currentGenre = 'All';
let currentLanguage = 'All';

// DOM elements
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
const searchInput = document.getElementById("search");
const topSongsContainer = document.getElementById("top-songs");

// Full player elements
const fullPlayer = document.getElementById('full-player');
const closePlayerBtn = document.getElementById('close-player');
const fullPlayerCover = document.getElementById('full-player-cover');
const fullPlayerTitle = document.getElementById('full-player-title');
const fullPlayerArtist = document.getElementById('full-player-artist');
const fullPlayBtn = document.getElementById('full-play');
const fullPrevBtn = document.getElementById('full-prev');
const fullNextBtn = document.getElementById('full-next');
const fullShuffleBtn = document.getElementById('full-shuffle');
const fullLoopBtn = document.getElementById('full-loop');
const fullSeekbar = document.getElementById('full-seekbar');
const fullCurrentTime = document.getElementById('full-current-time');
const fullDuration = document.getElementById('full-duration');
const similarSongsContainer = document.getElementById('similar-songs');
const recentUploadsContainer = document.getElementById('recent-uploads');

// Utility functions
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" + s : s}`;
}

// Create a song card
function createCard(song, originalIndex) {
  const isLiked = likedSongs.includes(originalIndex);
  const card = document.createElement("div");
  card.className = "song-card";
  card.dataset.originalIndex = originalIndex;
  card.innerHTML = `
        <div class="card-image">
          <img src="${song.cover}" alt="${song.title}" onerror="this.src='https://placehold.co/180x180/0a1929/fff?text=${song.title.charAt(0)}'">
          <div class="play-overlay"><i class="fas fa-play"></i></div>
        </div>
        <div class="card-content">
          <div class="title">${song.title}</div>
          <div class="artist">${song.artist}</div>
          <div class="card-footer">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-index="${originalIndex}">
              <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
            </button>
            <span class="duration">${song.duration || "--:--"}</span>
          </div>
        </div>
      `;
  card.onclick = () => {
    const currentListIndex = currentSongs.findIndex(s => s._id === song._id);
    if (currentIndex === currentListIndex) {
      openFullPlayer();
      return;
    }
    loadAndPlay(currentListIndex);
  };


  const likeBtn = card.querySelector('.like-btn');
  likeBtn.onclick = (e) => {
    e.stopPropagation();
    toggleLike(originalIndex);
  };

  return card;
}

// Load songs into the view
function renderSongList(songsToRender) {
  songList.innerHTML = "";
  if (songsToRender.length === 0) {
    songList.innerHTML = "<p style='text-align:center;color:#aaa;'>No songs match your filter.</p>";
    return;
  }
  songsToRender.forEach(song => {
    const originalIndex = allSongs.findIndex(s => s._id === song._id);
    const card = createCard(song, originalIndex);
    songList.appendChild(card);
  });
}

// Load and play a song with history management
function loadAndPlay(index, updateHistory = true) {
  if (index < 0 || index >= currentSongs.length) return;

  document.querySelectorAll('.song-card').forEach(card => card.classList.remove('active'));
  const songToPlay = currentSongs[index];
  const originalIndex = allSongs.findIndex(s => s._id === songToPlay._id);

  const cardInUI = songList.querySelector(`.song-card[data-original-index='${originalIndex}']`);
  if (cardInUI) cardInUI.classList.add('active');

  currentIndex = index;
  const song = currentSongs[currentIndex];
  audio.src = song.url;
  audio.load();
  audio.play();

  updatePlayerUI(song);
  playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  playerContainer.style.display = "flex";

  const isLiked = likedSongs.includes(originalIndex);
  playerLike.classList.toggle('liked', isLiked);
  const icon = playerLike.querySelector('i');
  icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';

  // Update history
  if (updateHistory) {
    const state = { songId: song._id, index: index };
    const title = `${song.title} by ${song.artist}`;
    const url = `?song=${song._id}`;
    history.pushState(state, title, url);
  }

  const currentSong = currentSongs[index];
  populateSimilarSongs(currentSong);      // 🔁 Updates Similar Songs
  populateRecentUploads(currentSong);     // 🔁 Updates Recent Uploads


}

// Update the player UI
function updatePlayerUI(song) {
  playerCover.src = song.cover;
  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;
  durationText.textContent = song.duration || "--:--";

  // Update full player if open
  if (fullPlayer.classList.contains('active')) {
    fullPlayerCover.src = song.cover;
    fullPlayerTitle.textContent = song.title;
    fullPlayerArtist.textContent = song.artist;
    fullDuration.textContent = song.duration || "--:--";
  }
}

// Toggle like status
function toggleLike(originalIndex) {
  const songId = allSongs[originalIndex]._id;
  if (likedSongs.includes(originalIndex)) {
    likedSongs = likedSongs.filter(i => i !== originalIndex);
  } else {
    likedSongs.push(originalIndex);
  }
  localStorage.setItem('likedSongs', JSON.stringify(likedSongs));

  // Update card in the main list
  const card = songList.querySelector(`.song-card[data-original-index='${originalIndex}'] .like-btn`);
  if (card) {
    card.classList.toggle('liked', likedSongs.includes(originalIndex));
    card.querySelector('i').className = likedSongs.includes(originalIndex) ? 'fas fa-heart' : 'far fa-heart';
  }

  // Update player like button if it's the current song
  if (currentIndex !== null && allSongs[originalIndex]._id === currentSongs[currentIndex]._id) {
    playerLike.classList.toggle('liked', likedSongs.includes(originalIndex));
    playerLike.querySelector('i').className = likedSongs.includes(originalIndex) ? 'fas fa-heart' : 'far fa-heart';
  }

  renderFavorites();
}

// Render the list of favorite songs
function renderFavorites() {
  favoritesList.innerHTML = "";
  if (likedSongs.length === 0) {
    favoritesList.innerHTML = "<p style='text-align:center;color:#aaa;'>No favorites yet.</p>";
    return;
  }
  likedSongs.map(index => allSongs[index]).filter(Boolean).forEach(song => {
    const originalIndex = allSongs.findIndex(s => s._id === song._id);
    const div = document.createElement('div');
    div.className = 'fav-song-item';
    div.innerHTML = `
          <img src="${song.cover}" alt="${song.title}" onerror="this.src='https://placehold.co/100x100/0a1929/fff?text=${song.title.charAt(0)}'">
          <div class="title">${song.title}</div>
          <div class="artist">${song.artist}</div>
        `;
    div.onclick = () => {
      // To play a favorite, we need to switch the current list to all songs temporarily
      currentSongs = [...allSongs];
      const indexToPlay = currentSongs.findIndex(s => s._id === song._id);
      filterAndRenderSongs();
      loadAndPlay(indexToPlay);
    };
    favoritesList.appendChild(div);
  });
}

// Create the top songs/recent uploads section
function createTrendingSection() {
  topSongsContainer.innerHTML = "";
  const top = [...allSongs].sort(() => 0.5 - Math.random()).slice(0, 3);
  top.forEach((song, i) => {
    const div = document.createElement('div');
    div.className = "top-song-item";
    div.innerHTML = `
          <div class="number">${i + 1}</div>
          <img src="${song.cover}" alt="${song.title}" onerror="this.src='https://placehold.co/50x50/0a1929/fff?text=${song.title.charAt(0)}'">
          <div class="top-song-info">
            <div class="title">${song.title}</div>
            <div class="artist">${song.artist}</div>
          </div>
        `;
    div.onclick = () => {
      currentSongs = [...allSongs];
      const idx = allSongs.findIndex(s => s._id === song._id);
      filterAndRenderSongs();
      loadAndPlay(idx);
    };
    topSongsContainer.appendChild(div);
  });
}

// Populate filter buttons dynamically
function populateFilters() {
  const genres = [...new Set(allSongs.map(song => song.genre).filter(Boolean))];
  const languages = [...new Set(allSongs.map(song => song.language).filter(Boolean))];

  const filterContainer = document.getElementById("filter-container");
  filterContainer.innerHTML = "";

  // HOME BUTTON
  const homeBtn = document.createElement("button");
  homeBtn.className = "filter-btn home-btn active";
  homeBtn.id = "home-filter";
  homeBtn.textContent = "Home";
  homeBtn.onclick = () => {
    currentGenre = 'All';
    currentLanguage = 'All';
    document.getElementById("genreDropdownBtn").textContent = "Genres ▼";
    document.getElementById("languageDropdownBtn").textContent = "Languages ▼";
    document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.filter-btn').forEach(i => i.classList.remove('active'));
    homeBtn.classList.add("active");
    filterAndRenderSongs();
  };

  // GENRE DROPDOWN
  const genreDropdown = document.createElement("div");
  genreDropdown.className = "dropdown";
  genreDropdown.innerHTML = `
        <button class="dropdown-btn" id="genreDropdownBtn">Genres ▼</button>
        <div class="dropdown-content" id="genreDropdownList">
          ${genres.map(g => `<div class="dropdown-item" data-type="genre">${g}</div>`).join('')}
        </div>
      `;

  // LANGUAGE DROPDOWN
  const languageDropdown = document.createElement("div");
  languageDropdown.className = "dropdown";
  languageDropdown.innerHTML = `
        <button class="dropdown-btn" id="languageDropdownBtn">Languages ▼</button>
        <div class="dropdown-content" id="languageDropdownList">
          ${languages.map(l => `<div class="dropdown-item" data-type="language">${l}</div>`).join('')}
        </div>
      `;

  // Append all to filter container
  filterContainer.appendChild(homeBtn);
  filterContainer.appendChild(genreDropdown);
  filterContainer.appendChild(languageDropdown);

  // Dropdown toggle logic
  document.querySelectorAll(".dropdown-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      closeAllDropdowns();
      this.nextElementSibling.classList.toggle("show");
    });
  });

  // Selection handler
  document.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", function () {
      const type = this.dataset.type;
      const value = this.textContent;

      if (type === "genre") {
        currentGenre = value;
        document.getElementById("genreDropdownBtn").textContent = `${value} ▼`;
      } else if (type === "language") {
        currentLanguage = value;
        document.getElementById("languageDropdownBtn").textContent = `${value} ▼`;
      }

      // Style: deactivate Home
      document.querySelectorAll('.filter-btn').forEach(i => i.classList.remove('active'));

      closeAllDropdowns();
      filterAndRenderSongs();
    });
  });

  function closeAllDropdowns() {
    document.querySelectorAll(".dropdown-content").forEach(el => el.classList.remove("show"));
  }
}
// Filter and render songs based on current filters and search
function filterAndRenderSongs() {
  let filtered = [...allSongs];

  // Genre filter
  if (currentGenre !== 'All') {
    filtered = filtered.filter(song => song.genre && song.genre.includes(currentGenre));
  }

  // Language filter
  if (currentLanguage !== 'All') {
    filtered = filtered.filter(song => song.language === currentLanguage);
  }

  // Search filter
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(song =>
      song.title.toLowerCase().includes(searchTerm) ||
      song.artist.toLowerCase().includes(searchTerm)
    );
  }

  currentSongs = filtered;
  renderSongList(currentSongs);
}

// Fetch songs from the server
async function fetchSongs() {
  try {
    // Using a placeholder API
    const res = await fetch("https://songscafe-backend2-0.onrender.com/songs");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    allSongs = await Promise.all(
      data.map(song => new Promise(resolve => {
        const tempAudio = new Audio(song.url);
        tempAudio.addEventListener("loadedmetadata", () => {
          song.duration = formatTime(tempAudio.duration);
          resolve(song);
        });
        tempAudio.addEventListener("error", () => {
          song.duration = song.duration || "--:--";
          resolve(song);
        });
      }))
    );

    currentSongs = [...allSongs];
    populateFilters();
    renderSongList(currentSongs);
    renderFavorites();
    createTrendingSection();

    // Check if URL has a song parameter
    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('song');
    if (songId) {
      const index = currentSongs.findIndex(s => s._id === songId);
      if (index !== -1) {
        // Only load song, do not auto-play
        currentIndex = index;
        const song = currentSongs[currentIndex];

        // Update UI but don't play
        updatePlayerUI(song);
        playerCover.src = song.cover;
        playerTitle.textContent = song.title;
        playerArtist.textContent = song.artist;
        durationText.textContent = song.duration || "--:--";
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playerContainer.style.display = "flex";

        // Set audio.src but DO NOT call audio.play()
        audio.src = song.url;
        audio.load();

        // Ensure like button matches state
        const originalIndex = allSongs.findIndex(s => s._id === song._id);
        const isLiked = likedSongs.includes(originalIndex);
        playerLike.classList.toggle('liked', isLiked);
        playerLike.querySelector('i').className = isLiked ? 'fas fa-heart' : 'far fa-heart';
      }
    }


  } catch (error) {
    console.error("Fetch Error:", error);
    songList.innerHTML = "<p style='text-align:center;color:#aaa;'>Failed to load songs. Server might be down.</p>";
  }
}

// Full player functionality
function openFullPlayer() {
  if (currentIndex === null) return;

  const song = currentSongs[currentIndex];
  fullPlayerCover.src = song.cover;
  fullPlayerTitle.textContent = song.title;
  fullPlayerArtist.textContent = song.artist;
  fullDuration.textContent = song.duration || "--:--";

  fullPlayBtn.innerHTML = audio.paused ?
    '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';

  fullShuffleBtn.style.color = isShuffling ? "var(--secondary)" : "var(--light)";
  fullLoopBtn.style.color = isLooping ? "var(--secondary)" : "var(--light)";

  populateSimilarSongs(song);
  populateRecentUploads();

  fullPlayer.classList.add('active');
  document.body.style.overflow = 'hidden';

  // ⭐ Push new state to history for back button support
  history.pushState({ fullPlayerOpen: true }, '', location.href);
}


function closeFullPlayer() {
  fullPlayer.classList.remove('active');
  document.body.style.overflow = 'auto';

  // ✅ Replace state without reloading song
  if (history.state && history.state.fullPlayerOpen) {
    history.replaceState({}, '', window.location.pathname + window.location.search);
  }
}

function populateSimilarSongs(song) {
  const container = document.getElementById("similar-songs");
  container.innerHTML = "";

  if (!song.artist && !song.language) {
    container.innerHTML = "<p>No similar songs found.</p>";
    return;
  }

  const lowerArtist = song.artist?.toLowerCase();
  const lowerLang = song.language?.toLowerCase();

  const matchesBoth = [];
  const matchesArtist = [];
  const matchesLanguage = [];

  allSongs.forEach(s => {
    if (s._id === song._id) return;

    const a = s.artist?.toLowerCase();
    const l = s.language?.toLowerCase();

    if (a === lowerArtist && l === lowerLang) {
      matchesBoth.push(s);
    } else if (a === lowerArtist) {
      matchesArtist.push(s);
    } else if (l === lowerLang) {
      matchesLanguage.push(s);
    }
  });

  const similarSongs = [...matchesBoth, ...matchesArtist, ...matchesLanguage].slice(0, 12);

  if (similarSongs.length === 0) {
    container.innerHTML = "<p style='font-size:10px;'>No similar songs found.</p>";
    return;
  }

  similarSongs.forEach((s) => {
    const card = createRecommendationCard(s);
    container.appendChild(card);
  });
}


function populateRecentUploads() {
  recentUploadsContainer.innerHTML = "";

  const recentSongs = allSongs.slice(-6).reverse(); // 🆕 Last 6 songs, newest first

  if (recentSongs.length === 0) {
    recentUploadsContainer.innerHTML = "<p>No recent uploads</p>";
    return;
  }

  recentSongs.forEach((song) => {
    const card = createRecommendationCard(song);
    recentUploadsContainer.appendChild(card);
  });
}


function createRecommendationCard(song) {
  const card = document.createElement('div');
  card.className = 'recommendation-card';
  card.innerHTML = `
        <div class="recommendation-image">
          <img src="${song.cover}" alt="${song.title}" 
            onerror="this.src='https://placehold.co/180x180/0a1929/fff?text=${song.title.charAt(0)}'">
        </div>
        <div class="recommendation-content">
          <div class="title">${song.title}</div>
          <div class="artist">${song.artist}</div>
        </div>
      `;

  card.onclick = () => {
    const index = currentSongs.findIndex(s => s._id === song._id);
    if (index !== -1) {
      loadAndPlay(index);
      updatePlayerUI(currentSongs[index]);
    }
  };

  return card;
}

// Initialize the application
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
      fullSeekbar.value = (audio.currentTime / audio.duration) * 100;
      fullCurrentTime.textContent = formatTime(audio.currentTime);
    }
  };

  audio.onended = () => {
    if (isLooping) {
      audio.currentTime = 0;
      audio.play();
    } else {
      nextSong();
    }
  };

  volume.oninput = () => {
    audio.volume = volume.value;
    localStorage.setItem("volume", audio.volume);
  };

  searchInput.oninput = filterAndRenderSongs;

  playerLike.onclick = () => {
    if (currentIndex !== null) {
      const songId = currentSongs[currentIndex]._id;
      const originalIndex = allSongs.findIndex(s => s._id === songId);
      toggleLike(originalIndex);
    }
  };

  // Keyboard controls
  document.addEventListener("keydown", e => {
    if (document.activeElement.tagName === "INPUT") return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    if (e.code === "ArrowRight") nextSong();
    if (e.code === "ArrowLeft") prevSong();
  });

  // Visualizer setup
  setInterval(updateVisualizer, 200);

  document.getElementById("close-mini-player").addEventListener("click", () => {
    audio.pause();
    audio.src = "";
    playerContainer.style.display = "none";
    currentIndex = null;

    // Optionally reset UI
    playerTitle.textContent = "No Song";
    playerArtist.textContent = "---";
    playerCover.src = "https://placehold.co/60x60/0a1929/fff?text=...";
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
  });


  // Full player event listeners
  closePlayerBtn.addEventListener('click', closeFullPlayer);

  // Add event to open full player when clicking on the mini player
  const playerContainerEl = document.querySelector('.player-container');
  const playerControls = document.querySelector('.player-center');

  playerContainerEl.addEventListener('click', (e) => {
    // Don't open full player if clicking on any controls or inputs
    if (
      e.target.closest('.controls') ||
      e.target.closest('input') ||
      e.target.closest('#volume') ||
      e.target.closest('#seekbar') ||
      e.target.closest('#play') ||
      e.target.closest('#shuffle') ||
      e.target.closest('#prev') ||
      e.target.closest('#next') ||
      e.target.closest('#loop') ||
      e.target.closest('#player-like')
    ) {
      return; // Do nothing
    }

    openFullPlayer();
  });



  // Full player controls
  fullPlayBtn.addEventListener('click', togglePlay);
  fullPrevBtn.addEventListener('click', prevSong);
  fullNextBtn.addEventListener('click', nextSong);

  fullShuffleBtn.addEventListener('click', () => {
    isShuffling = !isShuffling;
    fullShuffleBtn.style.color = isShuffling ? "var(--secondary)" : "var(--light)";
    shuffleBtn.style.color = isShuffling ? "var(--secondary)" : "var(--light)";
  });

  fullLoopBtn.addEventListener('click', () => {
    isLooping = !isLooping;
    fullLoopBtn.style.color = isLooping ? "var(--secondary)" : "var(--light)";
    loopBtn.style.color = isLooping ? "var(--secondary)" : "var(--light)";
  });

  fullSeekbar.addEventListener('input', () => {
    if (audio.duration) {
      audio.currentTime = (fullSeekbar.value / 100) * audio.duration;
    }
  });

  // Update play button in both players
  audio.addEventListener('play', () => {
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    fullPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
  });

  audio.addEventListener('pause', () => {
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    fullPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
  });

  // Handle browser history navigation
  window.addEventListener('popstate', (event) => {
    // If full player is open, close it instead of navigating back
    if (fullPlayer.classList.contains('active')) {
      closeFullPlayer();
      return;
    }

    // Handle song playback history
    if (event.state && event.state.songId) {
      const songId = event.state.songId;
      const index = currentSongs.findIndex(s => s._id === songId);
      if (index !== -1) {
        loadAndPlay(index, false);
      }
    }
  });


  playBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // This blocks click bubbling to .player-container
  });

}

document.addEventListener("click", function (event) {
  const isDropdownButton = event.target.matches(".dropdown-btn");
  const isDropdownItem = event.target.matches(".dropdown-item");
  const isInsideDropdown = event.target.closest(".dropdown");

  if (!isDropdownButton && !isDropdownItem && !isInsideDropdown) {
    document.querySelectorAll(".dropdown-content").forEach(el => el.classList.remove("show"));
  }
});


function togglePlay() {
  if (!audio.src || currentSongs.length === 0) {
    if (allSongs.length > 0) loadAndPlay(0);
    return;
  };
  if (audio.paused) {
    audio.play();
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  } else {
    audio.pause();
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
  }
}

function nextSong() {
  if (currentSongs.length === 0) return;
  let nextIndex;
  if (isShuffling) {
    nextIndex = Math.floor(Math.random() * currentSongs.length);
  } else {
    nextIndex = (currentIndex + 1) % currentSongs.length;
  }
  loadAndPlay(nextIndex);
}

function prevSong() {
  if (currentSongs.length === 0) return;
  let prevIndex = (currentIndex - 1 + currentSongs.length) % currentSongs.length;
  loadAndPlay(prevIndex);
}

// Visualizer functions
function initVisualizer() {
  visualizer.innerHTML = '';
  for (let i = 0; i < 32; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    visualizer.appendChild(bar);
  }
}
function updateVisualizer() {
  if (audio.paused) return;
  document.querySelectorAll('.bar').forEach(bar => {
    bar.style.height = `${Math.random() * 80 + 10}%`;
  });
}

window.addEventListener("load", init);

