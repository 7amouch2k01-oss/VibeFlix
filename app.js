/**
 * MosMa - Premium Movie App
 * Core Logic & UI Interactions
 */

const CONFIG = {
    API_KEY: '8baba8ab6b8bbe247645bcae7df63d0d',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
    BACKDROP_BASE_URL: 'https://image.tmdb.org/t/p/w1280',
    DEFAULT_LANGUAGE: 'en-US',
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
const backToTopBtn = document.getElementById('back-to-top');

// State
let allMovies = [];
let watchlist = JSON.parse(localStorage.getItem('mosmaWatchlist')) || [];
let currentGenre = 'all';
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
    // Smart Search (Debounced)
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            searchTimeout = setTimeout(() => {
                if (query.length > 2) {
                    searchMovies(query);
                } else if (query.length === 0) {
                    loadTrending();
                }
            }, CONFIG.DEBOUNCE_DELAY);
        });
    }

    // Sorting
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            renderMovies(sortMovies(allMovies, sortSelect.value));
        });
    }

    // Watchlist Toggle
    if (watchlistBtn) {
        watchlistBtn.addEventListener('click', () => {
            const isShowing = watchlistContainer.style.display === 'block';
            watchlistContainer.style.display = isShowing ? 'none' : 'block';
            document.querySelector('main').style.display = isShowing ? 'block' : 'none';
            if (!isShowing) renderWatchlist();
        });
    }

    // Modal Close
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            movieModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }

    // Back to Top
    window.addEventListener('scroll', () => {
        if (backToTopBtn) {
            backToTopBtn.style.display = window.scrollY > 500 ? 'flex' : 'none';
        }
    });
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
}

// API Calls
async function loadTrending() {
    showLoading(true);
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/trending/movie/week?api_key=${CONFIG.API_KEY}`);
        const data = await res.json();
        allMovies = data.results || [];
        renderMovies(allMovies);
    } catch (err) {
        console.error("Trending load failed", err);
        showError("Failed to load trending movies.");
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
        console.error("Search failed", err);
        showError("Search failed.");
    } finally {
        showLoading(false);
    }
}

async function loadHero() {
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/movie/now_playing?api_key=${CONFIG.API_KEY}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const movie = data.results[0];
            
            const heroBackdrop = document.getElementById('hero-backdrop');
            if (heroBackdrop) heroBackdrop.style.backgroundImage = `url(${CONFIG.BACKDROP_BASE_URL}${movie.backdrop_path})`;
            
            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) heroTitle.textContent = movie.title;
            
            const heroRating = document.getElementById('hero-rating');
            if (heroRating) heroRating.textContent = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
            
            const heroYear = document.getElementById('hero-year');
            if (heroYear) heroYear.textContent = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
            
            const heroOverview = document.getElementById('hero-overview');
            if (heroOverview) heroOverview.textContent = movie.overview.length > 200 ? movie.overview.substring(0, 200) + '...' : movie.overview;
            
            const heroTrailerBtn = document.getElementById('hero-trailer-btn');
            if (heroTrailerBtn) heroTrailerBtn.onclick = () => openDetails(movie.id);
            
            const heroWatchlistBtn = document.getElementById('hero-watchlist-btn');
            if (heroWatchlistBtn) heroWatchlistBtn.onclick = () => toggleWatchlist(movie);
        }
    } catch (err) {
        console.error("Hero load failed", err);
    }
}

async function openDetails(movieId) {
    showLoading(true);
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/movie/${movieId}?api_key=${CONFIG.API_KEY}&append_to_response=videos,credits,similar`);
        const movie = await res.json();
        
        const trailer = movie.videos?.results?.find(v => v.type === 'Trailer') || movie.videos?.results?.[0];
        const cast = movie.credits?.cast?.slice(0, 10).map(c => `
            <div class="cast-item" onclick="event.stopPropagation(); loadActorMovies(${c.id}, '${c.name.replace(/'/g, "\\'")}')" style="cursor:pointer; min-width:100px; text-align:center;">
                <img src="${c.profile_path ? CONFIG.IMAGE_BASE_URL + c.profile_path : 'https://via.placeholder.com/100x150'}" alt="${c.name}" style="width:80px; height:120px; object-fit:cover; border-radius:10px; margin-bottom:5px; border:1px solid var(--glass-border);">
                <p style="font-size:0.8rem;"><strong>${c.name}</strong></p>
            </div>
        `).join('') || 'No cast information available.';

        const similar = movie.similar?.results?.slice(0, 6).map(m => `
            <div class="similar-item" onclick="openDetails(${m.id})" style="cursor:pointer; min-width:120px;">
                <img src="${m.poster_path ? CONFIG.IMAGE_BASE_URL + m.poster_path : 'https://via.placeholder.com/500x750'}" alt="${m.title}" style="width:100%; border-radius:10px; border:1px solid var(--glass-border);">
                <p style="font-size:0.7rem; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.title}</p>
            </div>
        `).join('') || 'No similar movies found.';

        const detailsContent = document.getElementById('modal-details-content');
        if (detailsContent) {
            detailsContent.innerHTML = `
                <div style="position:relative; height:400px;">
                    <img src="${movie.backdrop_path ? CONFIG.BACKDROP_BASE_URL + movie.backdrop_path : 'https://via.placeholder.com/1280x720'}" style="width:100%; height:100%; object-fit:cover;">
                    <div style="position:absolute; inset:0; background:linear-gradient(to top, #111, transparent); padding:40px; display:flex; align-items:flex-end;">
                        <h2 style="font-size:3rem;">${movie.title}</h2>
                    </div>
                </div>
                <div style="padding:40px; display:grid; grid-template-columns: 2fr 1fr; gap:40px;">
                    <div>
                        <div style="display:flex; gap:20px; margin-bottom:20px;">
                            <span class="genre-btn active">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</span>
                            <span class="genre-btn active">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                            <span class="genre-btn active">${movie.runtime || 'N/A'} min</span>
                        </div>
                        <p style="font-size:1.2rem; line-height:1.6; margin-bottom:30px;">${movie.overview || 'No overview available.'}</p>
                        
                        <h3 style="margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:10px;">Top Cast</h3>
                        <div style="display:flex; gap:15px; overflow-x:auto; padding-bottom:20px; scrollbar-width:thin;">${cast}</div>

                        <h3 style="margin-top:30px; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:10px;">Similar Movies</h3>
                        <div style="display:flex; gap:15px; overflow-x:auto; padding-bottom:20px;">${similar}</div>
                    </div>
                    <div>
                        ${trailer ? `
                            <h3 style="margin-bottom:20px;">Trailer</h3>
                            <div style="position:relative; padding-bottom:56.25%; height:0; border-radius:15px; overflow:hidden; border:1px solid var(--glass-border);">
                                <iframe style="position:absolute; top:0; left:0; width:100%; height:100%;" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>
                            </div>
                        ` : ''}
                        <button class="btn btn-primary" style="width:100%; margin-top:25px;" onclick="toggleWatchlistById(${movie.id}); this.textContent = isInWatchlist(${movie.id}) ? 'Remove from Watchlist' : 'Add to Watchlist'">
                            ${isInWatchlist(movie.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        </button>
                        <div style="margin-top:30px; background:rgba(255,255,255,0.05); padding:20px; border-radius:15px; border:1px solid var(--glass-border);">
                            <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:10px;"><strong>Status:</strong> ${movie.status || 'N/A'}</p>
                            <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:10px;"><strong>Budget:</strong> ${movie.budget ? '$' + movie.budget.toLocaleString() : 'N/A'}</p>
                            <p style="color:var(--text-secondary); font-size:0.9rem;"><strong>Revenue:</strong> ${movie.revenue ? '$' + movie.revenue.toLocaleString() : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (movieModal) {
            movieModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    } catch (err) {
        console.error("Details load failed", err);
        showError("Failed to load movie details.");
    } finally {
        showLoading(false);
    }
}

// UI Rendering
function renderMovies(movies) {
    if (!movieGrid) return;
    movieGrid.innerHTML = '';
    if (!movies || movies.length === 0) {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = 'none';

    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        const inWatchlist = isInWatchlist(movie.id);
        
        card.innerHTML = `
            <div class="poster-container">
                <div class="rating-badge">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</div>
                <button class="watchlist-btn-card ${inWatchlist ? 'added' : ''}" onclick="event.stopPropagation(); toggleWatchlistById(${movie.id})">
                    ${inWatchlist ? '♥' : '♡'}
                </button>
                <img src="${movie.poster_path ? CONFIG.IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/500x750'}" alt="${movie.title}" loading="lazy">
                <div class="card-overlay">
                    <button class="btn btn-primary" style="padding:8px 15px; font-size:0.8rem;">Details</button>
                </div>
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</span>
                    <span>${movie.genre_ids && movie.genre_ids.length > 0 ? GENRES[movie.genre_ids[0]] || 'Movie' : 'Movie'}</span>
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
        const res = await fetch(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.API_KEY}&with_genres=${id}`);
        const data = await res.json();
        allMovies = data.results || [];
        renderMovies(allMovies);
    } catch (err) {
        console.error("Filter failed", err);
        showError("Filter failed.");
    } finally {
        showLoading(false);
    }
}

// Watchlist Logic
function toggleWatchlistById(id) {
    const movie = allMovies.find(m => m.id === id) || watchlist.find(m => m.id === id);
    if (movie) toggleWatchlist(movie);
}

function toggleWatchlist(movie) {
    const index = watchlist.findIndex(m => m.id === movie.id);
    if (index > -1) {
        watchlist.splice(index, 1);
    } else {
        watchlist.push(movie);
    }
    localStorage.setItem('mosmaWatchlist', JSON.stringify(watchlist));
    updateWatchlistUI();
    renderMovies(allMovies); // Refresh main grid icons
    if (watchlistContainer && watchlistContainer.style.display === 'block') renderWatchlist();
}

function isInWatchlist(id) {
    return watchlist.some(m => m.id === id);
}

function updateWatchlistUI() {
    const counts = document.querySelectorAll('.watchlist-count');
    counts.forEach(c => c.textContent = watchlist.length);
}

function renderWatchlist() {
    if (!watchlistGrid) return;
    watchlistGrid.innerHTML = '';
    if (watchlist.length === 0) {
        watchlistGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:50px;">Your watchlist is empty.</p>';
        return;
    }
    watchlist.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <div class="poster-container">
                <button class="watchlist-btn-card added" onclick="event.stopPropagation(); toggleWatchlistById(${movie.id})">♥</button>
                <img src="${movie.poster_path ? CONFIG.IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/500x750'}" alt="${movie.title}">
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
            </div>
        `;
        card.onclick = () => openDetails(movie.id);
        watchlistGrid.appendChild(card);
    });
}

// Helpers
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = show ? 'block' : 'none';
}

function showError(msg) {
    const err = document.getElementById('error-message');
    if (err) {
        err.textContent = msg;
        err.style.display = 'block';
        setTimeout(() => err.style.display = 'none', 3000);
    }
}

function sortMovies(movies, method) {
    if (!movies) return [];
    const sorted = [...movies];
    if (method === 'rating') return sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    if (method === 'release-date') return sorted.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
    return sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

async function loadActorMovies(actorId, actorName) {
    showLoading(true);
    if (movieModal) movieModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/person/${actorId}/movie_credits?api_key=${CONFIG.API_KEY}`);
        const data = await res.json();
        allMovies = (data.cast || []).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 20);
        renderMovies(allMovies);
        
        const mainTitle = document.getElementById('main-title');
        if (mainTitle) mainTitle.textContent = actorName;
        
        const subtitle = document.querySelector('.subtitle');
        if (subtitle) subtitle.textContent = `Filmography`;
        
        window.scrollTo({ top: 500, behavior: 'smooth' });
    } catch (err) {
        console.error("Actor movies load failed", err);
        showError("Failed to load actor's movies.");
    } finally {
        showLoading(false);
    }
}
