// ====================================
// CURIOSITYLAB USER SYSTEM
// ====================================

class UserSystem {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.getCurrentUser();
        this.publicPosts = this.loadPublicPosts();
        this.init();
    }

    // Initialize the system
    init() {
        this.updateUI();
        this.loadPublicFeed();
        this.setupEventListeners();
    }

    // ===== USER MANAGEMENT =====

    // Load all users from localStorage
    loadUsers() {
        const users = localStorage.getItem('curiosity_users');
        return users ? JSON.parse(users) : [];
    }

    // Save users to localStorage
    saveUsers() {
        localStorage.setItem('curiosity_users', JSON.stringify(this.users));
    }

    // Create unique user ID from email + username + password + timestamp
    createUserId(email, username) {
        const timestamp = Date.now();
        const uniqueString = `${email}_${username}_${timestamp}`;
        return 'user_' + btoa(uniqueString).substring(0, 15).replace(/[^a-zA-Z0-9]/g, '');
    }

    // Hash password (simple - for demo only, in production use bcrypt)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'pwd_' + Math.abs(hash).toString(36);
    }

    // Register new user
    register(email, username, password) {
        // Check if email already exists
        if (this.users.find(u => u.email === email)) {
            return { success: false, message: 'Email already registered' };
        }

        // Check if username taken
        if (this.users.find(u => u.username === username)) {
            return { success: false, message: 'Username already taken' };
        }

        // Create unique user ID
        const userId = this.createUserId(email, username);
        
        // Create user object
        const user = {
            userId: userId,
            email: email,
            username: username,
            password: this.hashPassword(password),
            joined: new Date().toISOString(),
            avatar: username.charAt(0).toUpperCase(),
            privateNotes: [],
            publicPosts: []
        };

        // Save user
        this.users.push(user);
        this.saveUsers();
        
        // Create user's private storage
        this.initUserStorage(userId);

        return { success: true, message: 'Registration successful!', userId: userId };
    }

    // Initialize private storage for user
    initUserStorage(userId) {
        const userNotesKey = `${userId}_notes`;
        if (!localStorage.getItem(userNotesKey)) {
            localStorage.setItem(userNotesKey, JSON.stringify([]));
        }
    }

    // Login user
    login(email, password) {
        const hashedPassword = this.hashPassword(password);
        const user = this.users.find(u => u.email === email && u.password === hashedPassword);

        if (user) {
            this.setCurrentUser(user);
            return { success: true, message: 'Login successful!', user: user };
        }

        return { success: false, message: 'Invalid email or password' };
    }

    // Set current logged in user
    setCurrentUser(user) {
        localStorage.setItem('curiosity_current_user', JSON.stringify(user));
        this.currentUser = user;
        this.updateUI();
    }

    // Get current user
    getCurrentUser() {
        const user = localStorage.getItem('curiosity_current_user');
        return user ? JSON.parse(user) : null;
    }

    // Logout
    logout() {
        localStorage.removeItem('curiosity_current_user');
        this.currentUser = null;
        this.updateUI();
        window.location.href = 'index.html';
    }

    // ===== PRIVATE NOTES =====

    // Get user's private notes
    getPrivateNotes(userId) {
        const notesKey = `${userId}_notes`;
        const notes = localStorage.getItem(notesKey);
        return notes ? JSON.parse(notes) : [];
    }

    // Add private note
    addPrivateNote(userId, content, category = 'general') {
        const notesKey = `${userId}_notes`;
        const notes = this.getPrivateNotes(userId);
        
        const note = {
            id: 'note_' + Date.now(),
            content: content,
            category: category,
            date: new Date().toISOString(),
            isPublic: false
        };

        notes.push(note);
        localStorage.setItem(notesKey, JSON.stringify(notes));
        
        return note;
    }

    // Delete private note
    deletePrivateNote(userId, noteId) {
        const notesKey = `${userId}_notes`;
        let notes = this.getPrivateNotes(userId);
        notes = notes.filter(n => n.id !== noteId);
        localStorage.setItem(notesKey, JSON.stringify(notes));
    }

    // ===== PUBLIC POSTS =====

    // Load all public posts
    loadPublicPosts() {
        const posts = localStorage.getItem('curiosity_public_posts');
        return posts ? JSON.parse(posts) : [];
    }

    // Save all public posts
    savePublicPosts(posts) {
        localStorage.setItem('curiosity_public_posts', JSON.stringify(posts));
    }

    // Create public post from private note
    shareToPublic(userId, noteId, content) {
        const user = this.users.find(u => u.userId === userId);
        if (!user) return null;

        const publicPosts = this.loadPublicPosts();
        
        const post = {
            id: 'post_' + Date.now(),
            userId: userId,
            username: user.username,
            avatar: user.username.charAt(0).toUpperCase(),
            content: content,
            date: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: []
        };

        publicPosts.unshift(post); // Add to beginning
        this.savePublicPosts(publicPosts);
        
        // Remove from private notes if it was a note
        if (noteId) {
            this.deletePrivateNote(userId, noteId);
        }

        return post;
    }

    // Create new public post directly
    createPublicPost(userId, content) {
        const user = this.users.find(u => u.userId === userId);
        if (!user) return null;

        const publicPosts = this.loadPublicPosts();
        
        const post = {
            id: 'post_' + Date.now(),
            userId: userId,
            username: user.username,
            avatar: user.username.charAt(0).toUpperCase(),
            content: content,
            date: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: []
        };

        publicPosts.unshift(post);
        this.savePublicPosts(publicPosts);
        
        return post;
    }

    // Like/unlike post
    toggleLike(postId, userId) {
        const publicPosts = this.loadPublicPosts();
        const post = publicPosts.find(p => p.id === postId);
        
        if (!post) return;

        const likedIndex = post.likedBy.indexOf(userId);
        
        if (likedIndex === -1) {
            // Like
            post.likes++;
            post.likedBy.push(userId);
        } else {
            // Unlike
            post.likes--;
            post.likedBy.splice(likedIndex, 1);
        }

        this.savePublicPosts(publicPosts);
        return post;
    }

    // Get posts sorted by latest
    getLatestPosts() {
        const posts = this.loadPublicPosts();
        return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Get posts sorted by popular (most likes)
    getPopularPosts() {
        const posts = this.loadPublicPosts();
        return posts.sort((a, b) => b.likes - a.likes);
    }

    // Get user's public posts
    getUserPublicPosts(userId) {
        const posts = this.loadPublicPosts();
        return posts.filter(p => p.userId === userId);
    }

    // ===== UI UPDATES =====

    // Update navigation based on login state
    updateUI() {
        const loginLink = document.getElementById('loginLink');
        const signupLink = document.getElementById('signupLink');
        const dashboardLink = document.getElementById('dashboardLink');
        const logoutLink = document.getElementById('logoutLink');

        if (!loginLink || !signupLink) return;

        if (this.currentUser) {
            // User is logged in
            loginLink.style.display = 'none';
            signupLink.style.display = 'none';
            dashboardLink.style.display = 'block';
            logoutLink.style.display = 'block';
            
            // Update dashboard link text
            const dashboardLink = document.getElementById('dashboardLink');
            if (dashboardLink) {
                dashboardLink.innerHTML = `<i class="fas fa-user"></i> ${this.currentUser.username}'s Notebook`;
            }
        } else {
            // User is logged out
            loginLink.style.display = 'block';
            signupLink.style.display = 'block';
            dashboardLink.style.display = 'none';
            logoutLink.style.display = 'none';
        }
    }

    // Load public feed on homepage
    loadPublicFeed(filter = 'latest') {
        const feedContainer = document.getElementById('publicFeed');
        if (!feedContainer) return;

        let posts = filter === 'latest' ? this.getLatestPosts() : this.getPopularPosts();

        if (posts.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-feed">
                    <span style="font-size: 3rem;">🔬</span>
                    <h3>No discoveries yet</h3>
                    <p>Be the first to share a scientific observation!</p>
                    ${this.currentUser ? 
                        '<button class="btn-primary" onclick="window.location.href=\'dashboard.html\'">Share Now</button>' : 
                        '<a href="login.html" class="btn-primary">Login to Share</a>'
                    }
                </div>
            `;
            return;
        }

        let html = '';
        posts.forEach(post => {
            const postDate = new Date(post.date).toLocaleDateString();
            const isLiked = this.currentUser && post.likedBy.includes(this.currentUser.userId);
            
            html += `
                <div class="post-card animate-slide-up" data-post-id="${post.id}">
                    <div class="post-header">
                        <div class="user-avatar">${post.avatar}</div>
                        <div class="user-info">
                            <span class="username">@${post.username}</span>
                            <span class="post-date">${postDate}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        ${this.linkify(post.content)}
                    </div>
                    <div class="post-actions">
                        <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="userSystem.handleLike('${post.id}')">
                            <i class="fas fa-heart"></i> <span class="likes-count">${post.likes}</span>
                        </button>
                        <button class="action-btn" onclick="window.location.href='profile.html?user=${post.userId}'">
                            <i class="fas fa-user"></i> Profile
                        </button>
                    </div>
                </div>
            `;
        });

        feedContainer.innerHTML = html;
    }

    // Handle like button click
    handleLike(postId) {
        if (!this.currentUser) {
            this.showModal('login-prompt', 'Login to like posts', 'Please login to interact with posts');
            return;
        }

        const updatedPost = this.toggleLike(postId, this.currentUser.userId);
        if (updatedPost) {
            this.loadPublicFeed();
        }
    }

    // Convert URLs in text to links
    linkify(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    }

    // Show modal
    showModal(id, title, message) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'block';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 3000);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Logout link
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Filter buttons on homepage
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                this.loadPublicFeed(filter);
            });
        });

        // Daily trigger button
        const newTriggerBtn = document.getElementById('newTriggerBtn');
        if (newTriggerBtn) {
            newTriggerBtn.addEventListener('click', () => {
                const triggers = [
                    "If you could travel at light speed and turn on a flashlight, what happens?",
                    "Is your brain reading this, or is 'you' something the brain creates?",
                    "If the universe began 13.8 billion years ago, what was 'before' that?",
                    "Are there colors we can't see? Mantis shrimp see 12 primary colors, we see 3.",
                    "If you're made of atoms that were once in stars, are you the star experiencing itself?",
                    "Does time exist, or is it just how we measure change?",
                    "Why is there something rather than nothing?"
                ];
                const randomIndex = Math.floor(Math.random() * triggers.length);
                document.getElementById('dailyQuestion').textContent = triggers[randomIndex];
            });
        }

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }
    }
}

// Initialize the user system
const userSystem = new UserSystem();

// Make available globally
window.userSystem = userSystem;
