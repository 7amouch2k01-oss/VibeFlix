// VibeFlix - Ultimate Premium Movie App
// =====================================

// Configuration
const CONFIG = {
    API_KEY: '8baba8ab6b8bbe247645bcae7df63d0d',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
    BACKDROP_BASE_URL: 'https://image.tmdb.org/t/p/w1280',
    DEFAULT_LANGUAGE: 'en-US',
    SKELETON_COUNT: 8,
    DEBOUNCE_DELAY: 500
};

// Genre mapping
const GENRES = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};

// DOM Elements
const searchInput = document.getElementById('movie-search');
const searchButton = document.getElementById('btn-search');
const movieGrid = document.getElementById('movie-display-area');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const genreFilter = document.getElementById('genre-filter');
const movieModal = document.getElementById('movie-modal');
const modalClose = document.getElementById('modal-close');
const sortSelect = document.getElementById('sort-select');
const watchlistBtn = document.getElementById('watchlist-btn');
const watchlistContainer = document.getElementById('watchlist-container');
const watchlistGrid = document.getElementById('watchlist-grid');
const backToTopBtn = document.getElementById('back-to-top');
const heroSection = document.getElementById('hero-section');

// State
let currentPage = 1;
let currentQuery = '';
let selectedGenre = null;
let isLoading = false;
let hasMoreResults = true;
let watchlist = [];
let allMovies = [];
let currentSortMethod = 'popularity';
let searchTimeout;
let isViewingWatchlist = false;

// ================================================
// LocalStorage Functions
// ================================================

function loadWatchlist() {
    const saved = localStorage.getItem('vibeflixWatchlist');
    watchlist = saved ? JSON.parse(saved) : [];
    updateWatchlistCount();
}

function saveWatchlist() {
    localStorage.setItem('vibeflixWatchlist', JSON.stringify(watchlist));
    updateWatchlistCount();
}

function addToWatchlist(movie) {
    if (!watchlist.find(m => m.id === movie.id)) {
        watchlist.push(movie);
        saveWatchlist();
        return true;
    }
    return false;
}

function removeFromWatchlist(movieId) {
    watchlist = watchlist.filter(m => m.id !== movieId);
    saveWatchlist();
}

function isInWatchlist(movieId) {
    return watchlist.some(m => m.id === movieId);
}

function updateWatchlistCount() {
    document.querySelector('.watchlist-count').textContent = watchlist.length;
    document.getElementById('watchlist-total').textContent = watchlist.length;
}

// ================================================
// API Functions
// ================================================

async function fetchMovies(query, page = 1) {
    try {
        const url = `${CONFIG.BASE_URL}/search/movie`;
        const params = new URLSearchParams({
            api_key: CONFIG.API_KEY,
            query: query,
            page: page,
            language: CONFIG.DEFAULT_LANGUAGE,
            include_adult: false
        });

        const response = await fetch(`${url}?${params}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error('Error fetching movies:', error);
        throw error;
    }
}

async function fetchTrendingMovies(page = 1) {
    try {
        const url = `${CONFIG.BASE_URL}/trending/movie/week`;
        const params = new URLSearchParams({
            api_key: CONFIG.API_KEY,
            language: CONFIG.DEFAULT_LANGUAGE,
            page: page
        });

        const response = await fetch(`${url}?${params}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error('Error fetching trending movies:', error);
        throw error;
    }
}

async function fetchMoviesByGenre(genreId, page = 1) {
    try {
        const url = `${CONFIG.BASE_URL}/discover/movie`;
        const params = new URLSearchParams({
            api_key: CONFIG.API_KEY,
            with_genres: genreId,
            language: CONFIG.DEFAULT_LANGUAGE,
            page: page,
            sort_by: 'popularity.desc'
        });

        const response = await fetch(`${url}?${params}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error('Error fetching movies by genre:', error);
        throw error;
    }
}

async function fetchMovieDetails(movieId) {
    try {
        const url = `${CONFIG.BASE_URL}/movie/${movieId}`;
        const params = new URLSearchParams({
            api_key: CONFIG.API_KEY,
            language: CONFIG.DEFAULT_LANGUAGE,
            append_to_response: 'credits,videos,similar'
        });

        const response = await fetch(`${url}?${params}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        throw error;
    }
}

// ================================================
// UI Functions
// ================================================

function showLoading() {
    loadingSpinner.classList.add('active');
    hideError();
}

function hideLoading() {
    loadingSpinner.classList.remove('active');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

function showEmptyState() {
    emptyState.classList.add('show');
}

function hideEmptyState() {
    emptyState.classList.remove('show');
}

function clearMovieGrid() {
    movieGrid.innerHTML = '';
}

function createSkeletonCards(count = CONFIG.SKELETON_COUNT) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton-poster"></div>
            <div class="skeleton-info">
                <div class="skeleton-title"></div>
                <div class="skeleton-rating"></div>
            </div>
        `;
        fragment.appendChild(skeleton);
    }
    return fragment;
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.id = `movie-${movie.id}`;

    const posterPath = movie.poster_path
        ? `${CONFIG.IMAGE_BASE_URL}${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Poster';

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const title = movie.title || 'Unknown Title';
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
    const inWatchlist = isInWatchlist(movie.id);

    card.innerHTML = `
        <div class="poster-container">
            <img src="${posterPath}" alt="${title} Poster" loading="lazy">
            <div class="rating-badge">★ ${rating}</div>
            <div class="watchlist-icon ${inWatchlist ? 'added' : ''}" data-movie-id="${movie.id}" role="button" tabindex="0" aria-label="Add to watchlist">♥</div>
        </div>
        <div class="movie-info">
            <div>
                <h2 class="movie-title" title="${title}">${title}</h2>
                <p class="movie-year">${year}</p>
            </div>
            <div class="movie-rating">
                <span>★</span>
                <span class="rating-value">${rating}/10</span>
            </div>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('watchlist-icon')) {
            openMovieModal(movie);
        }
    });

    const watchlistIcon = card.querySelector('.watchlist-icon');
    watchlistIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWatchlist(movie, watchlistIcon);
    });

    watchlistIcon.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleWatchlist(movie, watchlistIcon);
        }
    });

    return card;
}

function toggleWatchlist(movie, icon) {
    if (isInWatchlist(movie.id)) {
        removeFromWatchlist(movie.id);
        icon.classList.remove('added');
    } else {
        addToWatchlist(movie);
        icon.classList.add('added');
    }
}

function renderMovies(movies, append = false) {
    if (!append) {
        clearMovieGrid();
    }

    if (movies.length === 0 && !append) {
        showEmptyState();
        return;
    }

    hideEmptyState();
    const fragment = document.createDocumentFragment();
    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        fragment.appendChild(movieCard);
    });
    movieGrid.appendChild(fragment);
}

// ================================================
// Sorting Functions
// ================================================

function sortMovies(movies, method) {
    const sorted = [...movies];

    switch (method) {
        case 'popularity':
            sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            break;
        case 'rating':
            sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            break;
        case 'rating-asc':
            sorted.sort((a, b) => (a.vote_average || 0) - (b.vote_average || 0));
            break;
        case 'release-date':
            sorted.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
            break;
        case 'release-date-asc':
            sorted.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
            break;
    }

    return sorted;
}

// ================================================
// Hero Section Functions
// ================================================

async function loadHeroMovie() {
    try {
        const data = await fetchTrendingMovies(1);
        if (data.results && data.results.length > 0) {
            const movie = data.results[0];
            const details = await fetchMovieDetails(movie.id);

            const backdropPath = details.backdrop_path
                ? `${CONFIG.BACKDROP_BASE_URL}${details.backdrop_path}`
                : `${CONFIG.IMAGE_BASE_URL}${details.poster_path}`;

            document.getElementById('hero-backdrop').style.backgroundImage = `url('${backdropPath}')`;
            document.getElementById('hero-title').textContent = movie.title;
            document.getElementById('hero-rating').textContent = movie.vote_average.toFixed(1);
            document.getElementById('hero-year').textContent = new Date(movie.release_date).getFullYear();
            document.getElementById('hero-overview').textContent = movie.overview.substring(0, 200) + '...';

            document.getElementById('hero-watchlist-btn').addEventListener('click', () => {
                if (addToWatchlist(movie)) {
                    document.getElementById('hero-watchlist-btn').textContent = '✓ Added to Watchlist';
                    setTimeout(() => {
                        document.getElementById('hero-watchlist-btn').textContent = '+ Add to Watchlist';
                    }, 2000);
                }
            });

            document.getElementById('hero-trailer-btn').addEventListener('click', () => {
                openMovieModal(movie);
            });
        }
    } catch (error) {
        console.error('Error loading hero movie:', error);
    }
}

// ================================================
// Modal Functions
// ================================================

async function openMovieModal(movie) {
    try {
        showLoading();
        const details = await fetchMovieDetails(movie.id);

        const backdropPath = details.backdrop_path
            ? `${CONFIG.BACKDROP_BASE_URL}${details.backdrop_path}`
            : `${CONFIG.IMAGE_BASE_URL}${details.poster_path}`;

        document.getElementById('modal-backdrop').src = backdropPath;
        document.getElementById('modal-title').textContent = details.title;
        document.getElementById('modal-year').textContent = new Date(details.release_date).getFullYear();
        document.getElementById('modal-rating').textContent = details.vote_average.toFixed(1);
        document.getElementById('modal-overview').textContent = details.overview || 'No description available.';

        // Genres
        const genresContainer = document.getElementById('modal-genres');
        genresContainer.innerHTML = '';
        details.genres.forEach(genre => {
            const tag = document.createElement('span');
            tag.className = 'genre-tag';
            tag.textContent = genre.name;
            genresContainer.appendChild(tag);
        });

        // Trailer
        const trailerSection = document.getElementById('trailer-section');
        const trailerContainer = document.getElementById('trailer-container');
        const trailer = details.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');

        if (trailer) {
            trailerSection.style.display = 'block';
            trailerContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe>`;
        } else {
            trailerSection.style.display = 'none';
        }

        // Cast
        const castSection = document.getElementById('cast-section');
        const castList = document.getElementById('cast-list');
        if (details.credits?.cast && details.credits.cast.length > 0) {
            castSection.style.display = 'block';
            castList.innerHTML = '';
            details.credits.cast.slice(0, 10).forEach(actor => {
                const castMember = document.createElement('div');
                castMember.className = 'cast-member';
                const profilePath = actor.profile_path
                    ? `${CONFIG.IMAGE_BASE_URL}${actor.profile_path}`
                    : 'https://via.placeholder.com/100x150?text=No+Image';
                castMember.innerHTML = `
                    <div class="cast-image">
                        <img src="${profilePath}" alt="${actor.name}">
                    </div>
                    <p class="cast-name">${actor.name}</p>
                    <p class="cast-character">${actor.character}</p>
                `;
                castList.appendChild(castMember);
            });
        } else {
            castSection.style.display = 'none';
        }

        // Similar Movies
        const similarSection = document.getElementById('similar-section');
        const similarMovies = document.getElementById('similar-movies');
        if (details.similar?.results && details.similar.results.length > 0) {
            similarSection.style.display = 'block';
            similarMovies.innerHTML = '';
            details.similar.results.slice(0, 6).forEach(similar => {
                const posterPath = similar.poster_path
                    ? `${CONFIG.IMAGE_BASE_URL}${similar.poster_path}`
                    : 'https://via.placeholder.com/120x180?text=No+Poster';
                const similarCard = document.createElement('div');
                similarCard.className = 'similar-movie-card';
                similarCard.innerHTML = `<img src="${posterPath}" alt="${similar.title}" title="${similar.title}">`;
                similarCard.addEventListener('click', () => openMovieModal(similar));
                similarMovies.appendChild(similarCard);
            });
        } else {
            similarSection.style.display = 'none';
        }

        movieModal.classList.add('active');
        movieModal.setAttribute('aria-hidden', 'false');
        hideLoading();
    } catch (error) {
        showError('Failed to load movie details');
        hideLoading();
    }
}

function closeMovieModal() {
    movieModal.classList.remove('active');
    movieModal.setAttribute('aria-hidden', 'true');
}

// ================================================
// Genre Filter Functions
// ================================================

function initializeGenreFilter() {
    const fragment = document.createDocumentFragment();

    const allBtn = document.createElement('button');
    allBtn.className = 'genre-btn active';
    allBtn.textContent = 'All';
    allBtn.setAttribute('role', 'tab');
    allBtn.setAttribute('aria-selected', 'true');
    allBtn.addEventListener('click', () => handleGenreFilter(null));
    fragment.appendChild(allBtn);

    Object.entries(GENRES).forEach(([id, name]) => {
        const btn = document.createElement('button');
        btn.className = 'genre-btn';
        btn.textContent = name;
        btn.dataset.genreId = id;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', 'false');
        btn.addEventListener('click', () => handleGenreFilter(parseInt(id)));
        fragment.appendChild(btn);
    });

    genreFilter.appendChild(fragment);
}

async function handleGenreFilter(genreId) {
    selectedGenre = genreId;
    currentPage = 1;
    currentQuery = '';
    searchInput.value = '';

    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });

    if (genreId === null) {
        const allBtn = document.querySelector('.genre-btn');
        allBtn.classList.add('active');
        allBtn.setAttribute('aria-selected', 'true');
    } else {
        const btn = document.querySelector(`[data-genre-id="${genreId}"]`);
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
    }

    try {
        showLoading();
        hideError();

        let data;
        if (genreId === null) {
            data = await fetchTrendingMovies(currentPage);
        } else {
            data = await fetchMoviesByGenre(genreId, currentPage);
        }

        hasMoreResults = currentPage < data.total_pages;
        allMovies = data.results;
        const sortedMovies = sortMovies(allMovies, currentSortMethod);
        renderMovies(sortedMovies);
    } catch (error) {
        showError(`Error: ${error.message}`);
        clearMovieGrid();
    } finally {
        hideLoading();
    }
}

// ================================================
// Search Functions (with Debouncing)
// ================================================

function debounceSearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, CONFIG.DEBOUNCE_DELAY);
}

async function performSearch(query) {
    if (!query.trim()) {
        showError('Please enter a movie title to search');
        return;
    }

    currentQuery = query;
    currentPage = 1;
    selectedGenre = null;

    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    document.querySelector('.genre-btn').classList.add('active');
    document.querySelector('.genre-btn').setAttribute('aria-selected', 'true');

    try {
        showLoading();
        hideError();
        const data = await fetchMovies(query, currentPage);

        hasMoreResults = currentPage < data.total_pages;
        allMovies = data.results;
        const sortedMovies = sortMovies(allMovies, currentSortMethod);
        renderMovies(sortedMovies);
    } catch (error) {
        showError(`Error: ${error.message}`);
        clearMovieGrid();
    } finally {
        hideLoading();
    }
}

function handleSearch() {
    const query = searchInput.value.trim();
    if (query) {
        performSearch(query);
    }
}

// ================================================
// Sorting Handler
// ================================================

sortSelect.addEventListener('change', (e) => {
    currentSortMethod = e.target.value;
    const sortedMovies = sortMovies(allMovies, currentSortMethod);
    renderMovies(sortedMovies);
});

// ================================================
// Watchlist Page
// ================================================

watchlistBtn.addEventListener('click', () => {
    isViewingWatchlist = !isViewingWatchlist;

    if (isViewingWatchlist) {
        movieGrid.style.display = 'none';
        emptyState.style.display = 'none';
        watchlistContainer.classList.add('show');
        watchlistBtn.style.background = 'var(--accent-color)';
        watchlistBtn.style.color = 'white';

        if (watchlist.length === 0) {
            watchlistGrid.innerHTML = '<div class="empty-state show" style="grid-column: 1 / -1;"><h2>Your watchlist is empty</h2><p>Add movies to your watchlist to see them here</p></div>';
        } else {
            const sortedWatchlist = sortMovies(watchlist, currentSortMethod);
            watchlistGrid.innerHTML = '';
            const fragment = document.createDocumentFragment();
            sortedWatchlist.forEach(movie => {
                fragment.appendChild(createMovieCard(movie));
            });
            watchlistGrid.appendChild(fragment);
        }
    } else {
        movieGrid.style.display = 'grid';
        watchlistContainer.classList.remove('show');
        watchlistBtn.style.background = 'transparent';
        watchlistBtn.style.color = 'var(--accent-color)';

        if (movieGrid.children.length === 0) {
            showEmptyState();
        }
    }
});

// ================================================
// Infinite Scroll
// ================================================

async function loadMoreMovies() {
    if (isLoading || !hasMoreResults || isViewingWatchlist) return;

    isLoading = true;
    currentPage++;

    try {
        showLoading();
        let data;

        if (currentQuery) {
            data = await fetchMovies(currentQuery, currentPage);
        } else if (selectedGenre) {
            data = await fetchMoviesByGenre(selectedGenre, currentPage);
        } else {
            data = await fetchTrendingMovies(currentPage);
        }

        hasMoreResults = currentPage < data.total_pages;
        allMovies = [...allMovies, ...data.results];
        const sortedMovies = sortMovies(data.results, currentSortMethod);
        renderMovies(sortedMovies, true);
    } catch (error) {
        showError(`Error loading more movies: ${error.message}`);
    } finally {
        hideLoading();
        isLoading = false;
    }
}

function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMoreResults && !isLoading && !isViewingWatchlist) {
                loadMoreMovies();
            }
        });
    }, { rootMargin: '200px' });

    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    movieGrid.parentElement.appendChild(sentinel);
    observer.observe(sentinel);
}

// ================================================
// Back to Top Button
// ================================================

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ================================================
// Keyboard Accessibility
// ================================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeMovieModal();
    }
});

// ================================================
// Event Listeners
// ================================================

searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

searchInput.addEventListener('input', (e) => {
    debounceSearch(e.target.value);
});

modalClose.addEventListener('click', closeMovieModal);
movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) closeMovieModal();
});

// ================================================
// Initialization
// ================================================

async function initializeApp() {
    console.log('VibeFlix Ultimate App Initialized');

    if (CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
        showError('⚠️ TMDb API key not configured');
        return;
    }

    try {
        loadWatchlist();
        initializeGenreFilter();
        movieGrid.appendChild(createSkeletonCards());

        await loadHeroMovie();

        const data = await fetchTrendingMovies(currentPage);
        hasMoreResults = currentPage < data.total_pages;
        allMovies = data.results;
        const sortedMovies = sortMovies(allMovies, currentSortMethod);
        renderMovies(sortedMovies);

        setupInfiniteScroll();
    } catch (error) {
        showError(`Failed to initialize app: ${error.message}`);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
