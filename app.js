/**
 * MosMa - Premium Movie App
 * Optimized Logic & UI Interactions
 */

const CONFIG = {
    API_KEY: '8baba8ab6b8bbe247645bcae7df63d0d',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
    BACKDROP_BASE_URL: 'https://image.tmdb.org/t/p/w1280',
    DEBOUNCE_DELAY: 400
};

const GENRES = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

// DOM Elements
const searchInput = document.getElementById('movie-search');
const movieGrid = document.getElementById('movie-display-area');
const genreFilter = document.getElementById('genre-filter');
const movieModal = document.getElementById('movie-modal');
const modalClose = document.getElementById('modal-close');
const sortSelect = document.getElementById('sort-select');
const watchlistBtn = document.getElementById('watchlist-btn');
const watchlistContainer = document.getElementById('watchlist-container');
const watchlistGrid = document.getElementById('watchlist-grid');

// State
let allMovies = [];
let watchlist = JSON.parse(localStorage.getItem('mosmaWatchlist')) || [];
let searchTimeout;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initGenres();
    loadTrending();
    loadHero();
    updateWatchlistUI();
    setupEventListeners();
});

function setupEventListeners() {
    // Smart Search
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            if (query.length > 2) searchMovies(query);
            else if (query.length === 0) loadTrending();
        }, CONFIG.DEBOUNCE_DELAY);
    });

    // Sorting
    sortSelect?.addEventListener('change', () => {
        renderMovies(sortMovies(allMovies, sortSelect.value));
    });

    // Watchlist View Toggle
    watchlistBtn?.addEventListener('click', () => {
        const isShowing = watchlistContainer.style.display === 'block';
        watchlistContainer.style.display = isShowing ? 'none' : 'block';
        document.querySelector('main').style.display = isShowing ? 'block' : 'none';
        if (!isShowing) renderWatchlist();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Modal Interactions
    modalClose?.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === movieModal) closeModal(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

function closeModal() {
    movieModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// API Functions
async function loadTrending() {
    showLoading(true);
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/trending/movie/week?api_key=${CONFIG.API_KEY}`);
        const data = await res.json();
        allMovies = data.results || [];
        renderMovies(allMovies);
    } catch (err) {
        showError("Failed to load movies.");
    } finally {
        showLoading(false);
    }
}

async function searchMovies(query) {
    showLoading(true);
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/search/movie?api_key=${CONFIG.API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        allMovies = data.results || [];
        renderMovies(allMovies);
    } catch (err) {
        showError("Search failed.");
    } finally {
        showLoading(false);
    }
}

async function loadHero() {
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/movie/now_playing?api_key=${CONFIG.API_KEY}`);
        const data = await res.json();
        if (data.results?.length) {
            const movie = data.results[0];
            document.getElementById('hero-backdrop').style.backgroundImage = `url(${CONFIG.BACKDROP_BASE_URL}${movie.backdrop_path})`;
            document.getElementById('hero-title').textContent = movie.title;
            document.getElementById('hero-rating').textContent = movie.vote_average.toFixed(1);
            document.getElementById('hero-year').textContent = movie.release_date.split('-')[0];
            document.getElementById('hero-overview').textContent = movie.overview;
            document.getElementById('hero-trailer-btn').onclick = () => openDetails(movie.id);
            document.getElementById('hero-watchlist-btn').onclick = () => toggleWatchlist(movie);
        }
    } catch (err) { console.error(err); }
}

async function openDetails(movieId) {
    showLoading(true);
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/movie/${movieId}?api_key=${CONFIG.API_KEY}&append_to_response=videos,credits,similar`);
        const movie = await res.json();
        
        const trailer = movie.videos?.results?.find(v => v.type === 'Trailer') || movie.videos?.results?.[0];
        const cast = movie.credits?.cast?.slice(0, 10).map(c => `
            <div class="cast-item" onclick="event.stopPropagation(); loadActorMovies(${c.id}, '${c.name.replace(/'/g, "\\'")}')" style="cursor:pointer; min-width:90px; text-align:center;">
                <img src="${c.profile_path ? CONFIG.IMAGE_BASE_URL + c.profile_path : 'https://via.placeholder.com/100x150'}" style="width:80px; height:80px; object-fit:cover; border-radius:50%; margin-bottom:8px; border:2px solid var(--glass-border);">
                <p style="font-size:0.75rem; font-weight:700; color:white;">${c.name}</p>
            </div>
        `).join('');

        const similar = movie.similar?.results?.slice(0, 6).map(m => `
            <div class="similar-item" onclick="openDetails(${m.id})" style="cursor:pointer; min-width:140px;">
                <img src="${m.poster_path ? CONFIG.IMAGE_BASE_URL + m.poster_path : 'https://via.placeholder.com/500x750'}" style="width:100%; border-radius:10px; border:1px solid var(--glass-border);">
                <p style="font-size:0.75rem; margin-top:8px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.title}</p>
            </div>
        `).join('');

        document.getElementById('modal-details-content').innerHTML = `
            <div style="position:relative; height:450px;">
                <img src="${movie.backdrop_path ? CONFIG.BACKDROP_BASE_URL + movie.backdrop_path : 'https://via.placeholder.com/1280x720'}" style="width:100%; height:100%; object-fit:cover;">
                <div style="position:absolute; inset:0; background:linear-gradient(to top, #0a0a0a, transparent); padding:40px; display:flex; flex-direction:column; justify-content:flex-end;">
                    <h2 style="font-size: clamp(2rem, 4vw, 3.5rem); font-weight:900; letter-spacing:-1px;">${movie.title}</h2>
                    <div style="display:flex; gap:15px; margin-top:15px;">
                        <span style="background:var(--accent-color); padding:4px 12px; border-radius:6px; font-weight:800; font-size:0.8rem;">${movie.release_date.split('-')[0]}</span>
                        <span style="background:rgba(255,255,255,0.1); padding:4px 12px; border-radius:6px; font-weight:800; font-size:0.8rem;">★ ${movie.vote_average.toFixed(1)}</span>
                        <span style="background:rgba(255,255,255,0.1); padding:4px 12px; border-radius:6px; font-weight:800; font-size:0.8rem;">${movie.runtime} MIN</span>
                    </div>
                </div>
            </div>
            <div style="padding:40px; display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:50px;">
                <div>
                    <h3 style="color:var(--accent-color); text-transform:uppercase; font-size:0.8rem; letter-spacing:2px; margin-bottom:15px;">Storyline</h3>
                    <p style="font-size:1.1rem; color:var(--text-secondary); line-height:1.7; margin-bottom:40px;">${movie.overview}</p>
                    
                    <h3 style="color:var(--accent-color); text-transform:uppercase; font-size:0.8rem; letter-spacing:2px; margin-bottom:20px;">Top Cast</h3>
                    <div style="display:flex; gap:20px; overflow-x:auto; padding-bottom:15px; scrollbar-width:none;">${cast}</div>
                </div>
                <div>
                    ${trailer ? `
                        <h3 style="color:var(--accent-color); text-transform:uppercase; font-size:0.8rem; letter-spacing:2px; margin-bottom:20px;">Trailer</h3>
                        <div style="position:relative; padding-bottom:56.25%; height:0; border-radius:12px; overflow:hidden; border:1px solid var(--glass-border); margin-bottom:30px;">
                            <iframe style="position:absolute; inset:0; width:100%; height:100%;" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>
                        </div>
                    ` : ''}
                    <button class="btn btn-primary" style="width:100%; justify-content:center;" onclick="toggleWatchlistById(${movie.id}); this.textContent = isInWatchlist(${movie.id}) ? 'Remove from Watchlist' : 'Add to Watchlist'">
                        ${isInWatchlist(movie.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    </button>
                    
                    <h3 style="color:var(--accent-color); text-transform:uppercase; font-size:0.8rem; letter-spacing:2px; margin-top:40px; margin-bottom:20px;">Similar Movies</h3>
                    <div style="display:flex; gap:15px; overflow-x:auto; padding-bottom:10px; scrollbar-width:none;">${similar}</div>
                </div>
            </div>
        `;
        movieModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (err) { showError("Failed to load details."); } finally { showLoading(false); }
}

// Rendering Logic
function renderMovies(movies) {
    if (!movieGrid) return;
    movieGrid.innerHTML = '';
    const emptyState = document.getElementById('empty-state');
    if (!movies?.length) { if (emptyState) emptyState.style.display = 'block'; return; }
    if (emptyState) emptyState.style.display = 'none';

    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        const inWatchlist = isInWatchlist(movie.id);
        card.innerHTML = `
            <div class="poster-container">
                <div class="rating-tag">★ ${movie.vote_average.toFixed(1)}</div>
                <img src="${movie.poster_path ? CONFIG.IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/500x750'}" alt="${movie.title}" loading="lazy">
            </div>
            <div class="movie-info">
                <h3 class="movie-card-title">${movie.title}</h3>
                <div class="movie-card-meta">
                    <span>${movie.release_date?.split('-')[0] || 'N/A'}</span>
                    <span style="color:var(--accent-color); font-weight:700;">${inWatchlist ? 'IN WATCHLIST' : ''}</span>
                </div>
            </div>
        `;
        card.onclick = () => openDetails(movie.id);
        movieGrid.appendChild(card);
    });
}

function initGenres() {
    if (!genreFilter) return;
    Object.entries(GENRES).forEach(([id, name]) => {
        const btn = document.createElement('button');
        btn.className = 'genre-btn';
        btn.textContent = name;
        btn.onclick = () => {
            document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterByGenre(id);
        };
        genreFilter.appendChild(btn);
    });
}

async function filterByGenre(id) {
    showLoading(true);
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.API_KEY}&with_genres=${id}&sort_by=popularity.desc`);
        const data = await res.json();
        allMovies = data.results || [];
        renderMovies(allMovies);
    } catch (err) { showError("Filter failed."); } finally { showLoading(false); }
}

// Watchlist Logic
function toggleWatchlist(movie) {
    const idx = watchlist.findIndex(m => m.id === movie.id);
    if (idx > -1) watchlist.splice(idx, 1);
    else watchlist.push(movie);
    localStorage.setItem('mosmaWatchlist', JSON.stringify(watchlist));
    updateWatchlistUI();
    renderMovies(allMovies);
}

function toggleWatchlistById(id) {
    const movie = allMovies.find(m => m.id === id) || watchlist.find(m => m.id === id);
    if (movie) toggleWatchlist(movie);
}

function isInWatchlist(id) { return watchlist.some(m => m.id === id); }

function updateWatchlistUI() {
    document.querySelectorAll('.watchlist-count').forEach(c => c.textContent = watchlist.length);
}

function renderWatchlist() {
    if (!watchlistGrid) return;
    watchlistGrid.innerHTML = '';
    if (!watchlist.length) { watchlistGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-secondary); padding:100px;">Your watchlist is empty.</p>'; return; }
    watchlist.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <div class="poster-container">
                <img src="${movie.poster_path ? CONFIG.IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/500x750'}" alt="${movie.title}">
            </div>
            <div class="movie-info"><h3 class="movie-card-title">${movie.title}</h3></div>
        `;
        card.onclick = () => openDetails(movie.id);
        watchlistGrid.appendChild(card);
    });
}

// Helpers
function showLoading(show) { document.getElementById('loading-spinner').style.display = show ? 'block' : 'none'; }
function showError(msg) { 
    const err = document.getElementById('error-message');
    if (err) { err.textContent = msg; err.style.display = 'block'; setTimeout(() => err.style.display = 'none', 3000); }
}

function sortMovies(movies, method) {
    const sorted = [...movies];
    if (method === 'rating') return sorted.sort((a, b) => b.vote_average - a.vote_average);
    if (method === 'release-date') return sorted.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    return sorted.sort((a, b) => b.popularity - a.popularity);
}

async function loadActorMovies(actorId, actorName) {
    showLoading(true);
    closeModal();
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/person/${actorId}/movie_credits?api_key=${CONFIG.API_KEY}`);
        const data = await res.json();
        allMovies = (data.cast || []).sort((a, b) => b.popularity - a.popularity).slice(0, 20);
        renderMovies(allMovies);
        document.getElementById('main-title').textContent = actorName;
        document.querySelector('.subtitle').textContent = `Filmography`;
        window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (err) { showError("Failed to load filmography."); } finally { showLoading(false); }
}
