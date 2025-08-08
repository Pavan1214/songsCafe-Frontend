

let allSongs = [];
let currentSongs = [];
let currentIndex = null;
let isShuffling = false;
let isLooping = false;
let likedSongs = JSON.parse(localStorage.getItem('likedSongs')) || [];
let currentGenre = 'All';
let currentLanguage = 'All';

// New persistent storages
let playlists = JSON.parse(localStorage.getItem('playlists')) || []; // { name: 'My List', songs: ['songId1','songId2'] }
let queue = JSON.parse(localStorage.getItem('queue')) || []; // array of song objects (keeps snapshot)

// DOM elements (existing)
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
const favoritesList = document.getElementById("favorites-list") || document.getElementById("favoritesList"); // support both ids
const visualizer = document.getElementById("visualizer");
const searchInput = document.getElementById("search");
const topSongsContainer = document.getElementById("top-songs");

// Full player DOM (existing)
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

// New DOM hooks (may be absent in some HTML versions — we check safely)
const playlistsContainer = document.getElementById('playlistsList') || document.getElementById('playlists') || document.getElementById('playlistsList');
const createPlaylistBtn = document.getElementById('createPlaylistBtn') || document.getElementById('new-playlist-btn') || null;
const queueListEl = document.getElementById('queueList') || document.getElementById('queue-list') || null;
const clearQueueBtn = document.getElementById('clearQueueBtn') || document.getElementById('clear-queue') || null;
const playQueueBtn = document.getElementById('playQueueBtn') || document.getElementById('play-queue') || document.getElementById('playQueueBtn') || null;

// Utility functions
function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" + s : s}`;
}
function showToast(msg) {
  // simple non-intrusive message using alert fallback if toast not present
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2000);
  } else {
    // eslint-disable-next-line no-alert
    // alert(msg);
    console.log('Toast:', msg);
  }
}

// ---------------------- Song Card (updated to include playlist/queue buttons) ----------------------
function createCard(song, originalIndex) {
  const isLiked = likedSongs.includes(originalIndex);
  const card = document.createElement("div");
  card.className = "song-card";
  card.dataset.originalIndex = originalIndex;

  // Add "Add to Playlist" & "Add to Queue" buttons in card footer
  card.innerHTML = `
    <div class="card-image">
      <img src="${song.cover}" alt="${song.title}"
        onerror="this.src='https://placehold.co/180x180/0a1929/fff?text=${encodeURIComponent(song.title.charAt(0))}'">
      <div class="play-overlay"><i class="fas fa-play"></i></div>
    </div>
    <div class="card-content">
      <div class="title">${song.title}</div>
      <div class="artist">${song.artist}</div>
      <div class="card-footer">
        <div style="display:flex;gap:8px;align-items:center">
          <button class="like-btn ${isLiked ? 'liked' : ''}" data-index="${originalIndex}" title="Like">
            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
          </button>
          <button class="add-queue" data-index="${originalIndex}" title="Add to Queue">
            <i class="fas fa-plus"></i>
          </button>
          <button class="add-playlist" data-index="${originalIndex}" title="Add to Playlist">
            <i class="fas fa-folder-plus"></i>
          </button>
        </div>
        <span class="duration">${song.duration || "--:--"}</span>
      </div>
    </div>
  `;

  // card click -> play/open full player (same as before)
  card.onclick = () => {
    const currentListIndex = currentSongs.findIndex(s => s._id === song._id);
    if (currentIndex === currentListIndex) {
      openFullPlayer();
      return;
    }
    loadAndPlay(currentListIndex);
  };

  // like button
  const likeBtn = card.querySelector('.like-btn');
  likeBtn.onclick = (e) => {
    e.stopPropagation();
    toggleLike(originalIndex);
  };

  // add to queue button
  const addQueueBtn = card.querySelector('.add-queue');
  addQueueBtn.onclick = (e) => {
    e.stopPropagation();
    addToQueueByOriginalIndex(originalIndex);
  };

  // add to playlist button — show small chooser (prompt fallback)
  const addPlBtn = card.querySelector('.add-playlist');
  addPlBtn.onclick = (e) => {
    e.stopPropagation();
    handleAddToPlaylistUI(originalIndex);
  };

  return card;
}

// ---------------------- Render list ----------------------
function renderSongList(songsToRender) {
  songList.innerHTML = "";
  if (!songsToRender || songsToRender.length === 0) {
    songList.innerHTML = "<p style='text-align:center;color:#aaa;'>No songs match your filter.</p>";
    return;
  }
  songsToRender.forEach(song => {
    const originalIndex = allSongs.findIndex(s => s._id === song._id);
    const card = createCard(song, originalIndex);
    songList.appendChild(card);
  });
}

// ---------------------- Player core (unchanged behavior) ----------------------
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

  audio.play().catch(() => {/* ignore autoplay blocking */ });

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
  populateSimilarSongs(currentSong);
  populateRecentUploads(currentSong);
}

function updatePlayerUI(song) {
  playerCover.src = song.cover;
  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;
  durationText.textContent = song.duration || "--:--";

  if (fullPlayer.classList.contains('active')) {
    fullPlayerCover.src = song.cover;
    fullPlayerTitle.textContent = song.title;
    fullPlayerArtist.textContent = song.artist;
    fullDuration.textContent = song.duration || "--:--";
  }
}

// ---------------------- Favorites (unchanged) ----------------------
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

function renderFavorites() {
  const container = favoritesList;
  if (!container) return;
  container.innerHTML = "";
  if (likedSongs.length === 0) {
    container.innerHTML = "<p style='text-align:center;color:#aaa;'>No favorites yet.</p>";
    return;
  }
  likedSongs.map(index => allSongs[index]).filter(Boolean).forEach(song => {
    const originalIndex = allSongs.findIndex(s => s._id === song._id);
    const div = document.createElement('div');
    div.className = 'fav-song-item';
    div.innerHTML = `
      <img src="${song.cover}" alt="${song.title}" onerror="this.src='https://placehold.co/100x100/0a1929/fff?text=${encodeURIComponent(song.title.charAt(0))}'">
      <div class="title">${song.title}</div>
      <div class="artist">${song.artist}</div>
    `;
    div.onclick = () => {
      currentSongs = [...allSongs];
      const indexToPlay = currentSongs.findIndex(s => s._id === song._id);
      filterAndRenderSongs();
      loadAndPlay(indexToPlay);
    };
    container.appendChild(div);
  });
}

// Play favorites (unchanged)
function playFavorites() {
  const songsToPlay = likedSongs.map(i => allSongs[i]).filter(Boolean);
  if (songsToPlay.length === 0) {
    alert("No favorite songs to play.");
    return;
  }

  currentSongs = songsToPlay;
  renderSongList(currentSongs);
  loadAndPlay(0);
  isLooping = false;
  isShuffling = false;
}

// ---------------------- Filters, fetch etc (unchanged) ----------------------
// Create the top songs / recent uploads section (updated to show true recent uploads + Play All Recent)
function createTrendingSection() {
  topSongsContainer.innerHTML = "";

  // Use the last 6 songs (newest last) and show newest first
  const recentSongs = allSongs.slice(-6).reverse();

  // If there are no songs, show fallback
  if (!recentSongs || recentSongs.length === 0) {
    topSongsContainer.innerHTML = "<p style='text-align:center;color:#aaa;'>No recent uploads.</p>";
    return;
  }

  // Add "Play All Recent" button at the top of the section
  const playAllBtn = document.createElement('div');
  playAllBtn.style.display = 'flex';
  playAllBtn.style.justifyContent = 'flex-end';
  playAllBtn.style.marginBottom = '8px';

  const btn = document.createElement('button');
  btn.className = 'play-favorites-btn'; // reuse existing style
  btn.style.padding = '6px 10px';
  btn.style.fontSize = '0.9rem';
  btn.innerHTML = '<i class="fas fa-play"></i> Play All Recent';
  btn.title = 'Play all recent uploads';
  btn.onclick = () => {
    // Play these recent songs in order
    currentSongs = recentSongs.slice(); // set current list to these songs
    renderSongList(currentSongs);       // display them in main list
    loadAndPlay(0);                     // play first
    isLooping = false;
    isShuffling = false;
  };

  playAllBtn.appendChild(btn);
  topSongsContainer.appendChild(playAllBtn);

  // Render each recent song item
  recentSongs.forEach((song, i) => {
    const div = document.createElement('div');
    div.className = "top-song-item";
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.padding = '8px';
    div.style.borderRadius = '8px';
    div.style.cursor = 'pointer';
    div.style.gap = '10px';

    div.innerHTML = `
      <div class="number" style="font-weight:700;color:var(--secondary);width:28px">${i + 1}</div>
      <img src="${song.cover}" alt="${song.title}" style="width:50px;height:50px;border-radius:8px;object-fit:cover" 
           onerror="this.src='https://placehold.co/50x50/0a1929/fff?text=${encodeURIComponent(song.title.charAt(0))}'">
      <div class="top-song-info" style="flex:1">
        <div class="title" style="font-weight:600">${song.title}</div>
        <div class="artist" style="font-size:0.85rem;color:#aaa">${song.artist}</div>
      </div>
    `;

    // Clicking a sidebar item should play that song (switch to full library so index matches)
    div.onclick = () => {
      currentSongs = [...allSongs];
      filterAndRenderSongs(); // re-render main list with filters applied
      const idx = currentSongs.findIndex(s => s._id === song._id);
      if (idx !== -1) {
        loadAndPlay(idx);
      } else {
        // As fallback, play from recentSongs array
        currentSongs = recentSongs.slice();
        renderSongList(currentSongs);
        loadAndPlay(i);
      }
    };

    topSongsContainer.appendChild(div);
  });
}


function populateFilters() {
  const genres = [...new Set(allSongs.map(song => song.genre).filter(Boolean))];
  const languages = [...new Set(allSongs.map(song => song.language).filter(Boolean))];

  const filterContainer = document.getElementById("filter-container");
  filterContainer.innerHTML = "";

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

  const genreDropdown = document.createElement("div");
  genreDropdown.className = "dropdown";
  genreDropdown.innerHTML = `
        <button class="dropdown-btn" id="genreDropdownBtn">Genres ▼</button>
        <div class="dropdown-content" id="genreDropdownList">
          ${genres.map(g => `<div class="dropdown-item" data-type="genre">${g}</div>`).join('')}
        </div>
      `;

  const languageDropdown = document.createElement("div");
  languageDropdown.className = "dropdown";
  languageDropdown.innerHTML = `
        <button class="dropdown-btn" id="languageDropdownBtn">Languages ▼</button>
        <div class="dropdown-content" id="languageDropdownList">
          ${languages.map(l => `<div class="dropdown-item" data-type="language">${l}</div>`).join('')}
        </div>
      `;

  filterContainer.appendChild(homeBtn);
  filterContainer.appendChild(genreDropdown);
  filterContainer.appendChild(languageDropdown);

  document.querySelectorAll(".dropdown-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      closeAllDropdowns();
      this.nextElementSibling.classList.toggle("show");
    });
  });

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
      document.querySelectorAll('.filter-btn').forEach(i => i.classList.remove('active'));
      closeAllDropdowns();
      filterAndRenderSongs();
    });
  });

  function closeAllDropdowns() {
    document.querySelectorAll(".dropdown-content").forEach(el => el.classList.remove("show"));
  }
}

function filterAndRenderSongs() {
  let filtered = [...allSongs];
  if (currentGenre !== 'All') {
    filtered = filtered.filter(song => song.genre && song.genre.includes(currentGenre));
  }
  if (currentLanguage !== 'All') {
    filtered = filtered.filter(song => song.language === currentLanguage);
  }
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

// ---------------------- Fetch songs (unchanged) ----------------------
async function fetchSongs() {
  try {
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
    // If playlists exist, render them
    renderPlaylistsUI();
    renderQueueUI();

    // handle ?song= in url
    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('song');
    if (songId) {
      const index = currentSongs.findIndex(s => s._id === songId);
      if (index !== -1) {
        currentIndex = index;
        const song = currentSongs[currentIndex];
        updatePlayerUI(song);
        playerCover.src = song.cover;
        playerTitle.textContent = song.title;
        playerArtist.textContent = song.artist;
        durationText.textContent = song.duration || "--:--";
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playerContainer.style.display = "flex";
        audio.src = song.url;
        audio.load();
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

// ---------------------- Full player (unchanged) ----------------------
function openFullPlayer() {
  if (currentIndex === null) return;
  const song = currentSongs[currentIndex];
  fullPlayerCover.src = song.cover;
  fullPlayerTitle.textContent = song.title;
  fullPlayerArtist.textContent = song.artist;
  fullDuration.textContent = song.duration || "--:--";
  fullPlayBtn.innerHTML = audio.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
  fullShuffleBtn.style.color = isShuffling ? "var(--secondary)" : "var(--light)";
  fullLoopBtn.style.color = isLooping ? "var(--secondary)" : "var(--light)";
  populateSimilarSongs(song);
  populateRecentUploads();
  fullPlayer.classList.add('active');
  document.body.style.overflow = 'hidden';
  history.pushState({ fullPlayerOpen: true }, '', location.href);
}
function closeFullPlayer() {
  fullPlayer.classList.remove('active');
  document.body.style.overflow = 'auto';
  if (history.state && history.state.fullPlayerOpen) {
    history.replaceState({}, '', window.location.pathname + window.location.search);
  }
}

// ---------------------- Similar & Recent (unchanged) ----------------------
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
    if (a === lowerArtist && l === lowerLang) matchesBoth.push(s);
    else if (a === lowerArtist) matchesArtist.push(s);
    else if (l === lowerLang) matchesLanguage.push(s);
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
  const recentSongs = allSongs.slice(-6).reverse();
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
            onerror="this.src='https://placehold.co/180x180/0a1929/fff?text=${encodeURIComponent(song.title.charAt(0))}'">
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

// ---------------------- Visualizer & Player init (unchanged) ----------------------
function initVisualizer() {
  if (!visualizer) return;
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

// ---------------------- Queue feature ----------------------
// ---- Paste/replace these functions in your script.js ----

// Ensure queue items are unique (by _id/url/title+artist)
function sanitizeQueue() {
  if (!Array.isArray(queue)) queue = [];
  queue = queue.filter((item, index, self) => {
    return index === self.findIndex(s => {
      if (s._id && item._id) return s._id === item._id;
      if (s.url && item.url) return s.url === item.url;
      return s.title === item.title && s.artist === item.artist;
    });
  });
  localStorage.setItem('queue', JSON.stringify(queue));
}

/**
 * Add a song object to queue, preventing duplicates.
 * Song should be an object with at least one of: _id, url, (title+artist)
 */
function addToQueue(song) {
  if (!song) return;
  // Check for duplicates robustly
  const exists = queue.some(q => {
    if (q._id && song._id) return q._id === song._id;
    if (q.url && song.url) return q.url === song.url;
    return q.title === song.title && q.artist === song.artist;
  });

  if (exists) {
    showToast(`"${song.title}" is already in the queue`);
    return;
  }

  // Add and persist
  queue.push({
    _id: song._id,
    url: song.url,
    title: song.title,
    artist: song.artist,
    cover: song.cover,
    duration: song.duration
  });
  localStorage.setItem('queue', JSON.stringify(queue));
  renderQueueUI();
  showToast(`Added "${song.title}" to queue`);
}

function addToQueueByOriginalIndex(originalIndex) {
  const s = allSongs[originalIndex];
  if (!s) return;
  addToQueue({ _id: s._id, title: s.title, artist: s.artist, cover: s.cover, url: s.url, duration: s.duration });
}

// Updated renderQueueUI: sanitize queue before rendering
function renderQueueUI() {
  if (!queueListEl) return;
  // clean duplicates from storage first (one-time cleanup)
  sanitizeQueue();

  queueListEl.innerHTML = '';
  if (!queue.length) {
    queueListEl.innerHTML = "<div style='color:#aaa'>No queue yet.</div>";
    return;
  }

  queue.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.innerHTML = `
      <img src="${s.cover || 'https://placehold.co/46x46/0a1929/fff?text=?'}" onerror="this.src='https://placehold.co/46x46/0a1929/fff?text=?'">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title}</div>
        <div style="font-size:12px;color:#9aa6b2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.artist || ''}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn small" data-i="${i}" title="Play this"><i class="fas fa-play"></i></button>
        <button class="btn small" data-rem="${i}" title="Remove"><i class="fas fa-trash"></i></button>
      </div>
    `;

    // play specific queue item
    div.querySelector('[data-i]')?.addEventListener('click', () => {
      const idx = allSongs.findIndex(a => a._id === s._id);
      if (idx !== -1) {
        currentSongs = [...allSongs];
        filterAndRenderSongs();
        loadAndPlay(currentSongs.findIndex(a => a._id === s._id));
      } else {
        // fallback: play from queue snapshot
        const snapshotList = queue.map(q => allSongs.find(a => a._id === q._id) || q).filter(Boolean);
        currentSongs = snapshotList;
        renderSongList(currentSongs);
        loadAndPlay(Math.min(i, currentSongs.length - 1));
      }
    });

    // remove from queue
    div.querySelector('[data-rem]')?.addEventListener('click', (e) => {
      const remIdx = parseInt(e.currentTarget.dataset.rem);
      queue.splice(remIdx, 1);
      localStorage.setItem('queue', JSON.stringify(queue));
      renderQueueUI();
    });

    queueListEl.appendChild(div);
  });
}

if (clearQueueBtn) {
  clearQueueBtn.addEventListener('click', () => {
    queue = [];
    localStorage.setItem('queue', JSON.stringify(queue));
    renderQueueUI();
    showToast('Queue cleared');
  });
}
if (playQueueBtn) {
  playQueueBtn.addEventListener('click', () => {
    if (!queue.length) {
      showToast('Queue is empty');
      return;
    }
    // Convert queue items to full song objects from allSongs where possible; otherwise use queue snapshot
    const playlistSongs = queue.map(q => allSongs.find(s => s._id === q._id) || q).filter(Boolean);
    currentSongs = playlistSongs;
    renderSongList(currentSongs);
    loadAndPlay(0);
    // clear queue after sending to player, since now it's playing
    queue = [];
    localStorage.setItem('queue', JSON.stringify(queue));
    renderQueueUI();
  });
}

// ---------------------- Playlists feature ----------------------
function renderPlaylistsUI() {
  if (!playlistsContainer) return;
  playlistsContainer.innerHTML = '';
  if (!playlists.length) {
    playlistsContainer.innerHTML = "<div style='color:#aaa'>No playlists</div>";
    return;
  }
  playlists.forEach((pl, idx) => {
    const div = document.createElement('div');
    div.className = 'playlist-item';
    div.innerHTML = `<span>${pl.name} <small style="color:#9aa6b2">(${pl.songs?.length || 0})</small></span>
      <div style="display:flex;gap:6px">
        <button class="btn small" data-play="${idx}" title="Play Playlist"><i class="fas fa-play"></i></button>
        <button class="btn small" data-edit="${idx}" title="Edit Name"><i class="fas fa-edit"></i></button>
        <button class="btn small" data-del="${idx}" title="Delete"><i class="fas fa-trash"></i></button>
      </div>`;
    // play
    div.querySelector('[data-play]')?.addEventListener('click', () => {
      playPlaylist(idx);
    });
    // edit name
    div.querySelector('[data-edit]')?.addEventListener('click', () => {
      const newName = prompt("Edit playlist name", pl.name);
      if (newName && newName.trim()) {
        playlists[idx].name = newName.trim();
        localStorage.setItem('playlists', JSON.stringify(playlists));
        renderPlaylistsUI();
        showToast('Playlist renamed');
      }
    });
    // delete
    div.querySelector('[data-del]')?.addEventListener('click', () => {
      if (!confirm(`Delete playlist "${pl.name}"?`)) return;
      playlists.splice(idx, 1);
      localStorage.setItem('playlists', JSON.stringify(playlists));
      renderPlaylistsUI();
      showToast('Playlist deleted');
    });
    playlistsContainer.appendChild(div);
  });
}
if (createPlaylistBtn) {
  createPlaylistBtn.addEventListener('click', () => {
    const name = prompt("Playlist name");
    if (!name || !name.trim()) {
      showToast("Playlist name required");
      return;
    }
    playlists.push({ name: name.trim(), songs: [] });
    localStorage.setItem('playlists', JSON.stringify(playlists));
    renderPlaylistsUI();
  });
}

function handleAddToPlaylistUI(originalIndex) {
  // If no playlists exist, ask to create one
  if (!playlists || playlists.length === 0) {
    const want = confirm("No playlists found. Create new playlist?");
    if (!want) return;
    const name = prompt("Playlist name");
    if (!name || !name.trim()) return;
    playlists.push({ name: name.trim(), songs: [] });
    localStorage.setItem('playlists', JSON.stringify(playlists));
    renderPlaylistsUI();
    showToast('Playlist created');
    // proceed to add song to this new playlist
  }
  // If only one playlist, add directly
  if (playlists.length === 1) {
    addSongToPlaylist(originalIndex, 0);
    return;
  }
  // If multiple playlists, prompt a simple chooser by number
  let listText = 'Choose playlist number:\n';
  playlists.forEach((p, i) => listText += `${i + 1}. ${p.name} (${p.songs?.length || 0})\n`);
  const choice = prompt(listText);
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= playlists.length) {
    showToast('Invalid playlist choice');
    return;
  }
  addSongToPlaylist(originalIndex, idx);
}

function addSongToPlaylist(originalIndex, playlistIndex) {
  const target = playlists[playlistIndex];
  if (!target) return;
  const songId = allSongs[originalIndex]._id;
  if (!target.songs) target.songs = [];
  if (target.songs.includes(songId)) {
    showToast('Song already in playlist');
    return;
  }
  target.songs.push(songId);
  localStorage.setItem('playlists', JSON.stringify(playlists));
  renderPlaylistsUI();
  showToast(`Added to "${target.name}"`);
}

function playPlaylist(playlistIndex) {
  const pl = playlists[playlistIndex];
  if (!pl || !pl.songs || !pl.songs.length) {
    showToast('Playlist is empty');
    return;
  }
  // Map song IDs to actual song objects (if missing, filter out)
  const toPlay = pl.songs.map(id => allSongs.find(s => s._id === id)).filter(Boolean);
  if (!toPlay.length) {
    showToast('Playlist songs not available');
    return;
  }
  currentSongs = toPlay;
  renderSongList(currentSongs);
  loadAndPlay(0);
  showToast(`Playing playlist: ${pl.name}`);
}

// ---------------------- Other UI hookups & init ----------------------
// Existing init and wiring kept, but we add rendering for playlists/queue to init
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
      fullSeekbar.value = (audio.currentTime / audio.duration) * 100;
      currentTimeText.textContent = formatTime(audio.currentTime);
      fullCurrentTime.textContent = formatTime(audio.currentTime);
    }
  };

audio.onended = () => {
  if (isLooping) {
    audio.currentTime = 0;
    audio.play();
  } else {
    if (currentIndex < currentSongs.length - 1) {
      nextSong();
    } else {
      // Restart from first song
      loadAndPlay(0);
    }
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

  const pf = document.getElementById("play-favorites-btn");
  if (pf) pf.addEventListener("click", playFavorites);

  // Keyboard controls
  document.addEventListener("keydown", e => {
    if (document.activeElement.tagName === "INPUT") return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    if (e.code === "ArrowRight") nextSong();
    if (e.code === "ArrowLeft") prevSong();
  });

  // Visualizer setup
  setInterval(updateVisualizer, 200);

  const closeMini = document.getElementById("close-mini-player");
  if (closeMini) {
    closeMini.addEventListener("click", () => {
      audio.pause();
      audio.src = "";
      if (playerContainer) playerContainer.style.display = "none";
      currentIndex = null;
      playerTitle.textContent = "No Song";
      playerArtist.textContent = "---";
      playerCover.src = "https://placehold.co/60x60/0a1929/fff?text=...";
      playBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
  }

  // Full player event listeners (unchanged)
  closePlayerBtn.addEventListener('click', closeFullPlayer);

  const playerContainerEl = document.querySelector('.player-container');
  playerContainerEl.addEventListener('click', (e) => {
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
      return;
    }
    openFullPlayer();
  });

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

  audio.addEventListener('play', () => {
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    fullPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
  });

  audio.addEventListener('pause', () => {
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    fullPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
  });

  // History popstate handling (unchanged)
  window.addEventListener('popstate', (event) => {
    if (fullPlayer.classList.contains('active')) {
      closeFullPlayer();
      return;
    }
    if (event.state && event.state.songId) {
      const songId = event.state.songId;
      const index = currentSongs.findIndex(s => s._id === songId);
      if (index !== -1) {
        loadAndPlay(index, false);
      }
    }
  });

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Render playlist/queue initial UI
  renderPlaylistsUI();
  renderQueueUI();
}

// ---------------------- Playback control helpers (unchanged) ----------------------
function togglePlay() {
  if (!audio.src || currentSongs.length === 0) {
    if (allSongs.length > 0) loadAndPlay(0);
    return;
  }
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

// ---------------------- Small helpers ----------------------
document.addEventListener("click", function (event) {
  const isDropdownButton = event.target.matches(".dropdown-btn");
  const isDropdownItem = event.target.matches(".dropdown-item");
  const isInsideDropdown = event.target.closest(".dropdown");
  if (!isDropdownButton && !isDropdownItem && !isInsideDropdown) {
    document.querySelectorAll(".dropdown-content").forEach(el => el.classList.remove("show"));
  }
});

// ---------------------- Start ----------------------
window.addEventListener("load", init);
