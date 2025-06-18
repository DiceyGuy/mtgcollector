// AlphaUserSystem.js - FIXED: Real Alpha Tester Registration & Collection Management
class AlphaUserSystem {
    constructor() {
        this.maxAlphaUsers = 500;
        this.initializeSystem();
    }

    initializeSystem() {
        console.log('🔧 AlphaUserSystem initialized');
        
        // Initialize alpha users array if not exists
        if (!localStorage.getItem('alpha_users')) {
            localStorage.setItem('alpha_users', JSON.stringify([]));
        }
        
        // Initialize current user if not exists
        if (!localStorage.getItem('current_alpha_user')) {
            this.registerNewUser();
        }
    }

    // 🎯 REGISTER NEW ALPHA TESTER
    registerNewUser() {
        const users = this.getAlphaUsers();
        
        // Check if we're at capacity
        if (users.length >= this.maxAlphaUsers) {
            console.warn('⚠️ Alpha testing at capacity');
            return {
                success: false,
                message: 'Alpha testing is currently at capacity (500/500 testers)',
                userNumber: null
            };
        }

        // Generate unique alpha tester number
        const userNumber = users.length + 1;
        const userId = `alpha_${userNumber}`;
        
        // Create new alpha user
        const newUser = {
            id: userId,
            alphaNumber: userNumber,
            username: this.generateUsername(),
            registeredAt: new Date().toISOString(),
            totalScans: 0,
            successfulScans: 0, // NEW: Track only successful scans
            lastActive: new Date().toISOString(),
            feedback: [],
            collection: [],
            preferences: {
                scanMode: 'auto',
                notifications: true
            }
        };

        // Add to users array
        users.push(newUser);
        localStorage.setItem('alpha_users', JSON.stringify(users));
        
        // Set as current user
        localStorage.setItem('current_alpha_user', JSON.stringify(newUser));
        
        console.log(`🎉 Registered Alpha Tester #${userNumber}: ${newUser.username}`);
        
        return {
            success: true,
            user: newUser,
            userNumber: userNumber,
            message: `Welcome Alpha Tester #${userNumber}!`
        };
    }

    // 🎮 GET CURRENT USER
    getCurrentUser() {
        const userData = localStorage.getItem('current_alpha_user');
        if (!userData) {
            return this.registerNewUser().user;
        }
        
        try {
            const user = JSON.parse(userData);
            
            // Update last active ONLY (don't trigger scan counter)
            user.lastActive = new Date().toISOString();
            localStorage.setItem('current_alpha_user', JSON.stringify(user));
            
            return user;
        } catch (error) {
            console.error('❌ Error loading user data:', error);
            return this.registerNewUser().user;
        }
    }

    // 🎯 FIXED: Update stats ONLY for successful scans
    recordSuccessfulScan(cardName, confidence, scanMode) {
        const user = this.getCurrentUser();
        if (!user || !cardName) {
            console.warn('⚠️ Cannot record scan: invalid user or card name');
            return user;
        }

        console.log(`📊 Recording successful scan: ${cardName} (${confidence}%)`);
        
        // FIXED: Only increment on actual successful scans
        user.totalScans += 1;
        user.successfulScans += 1;
        user.lastActive = new Date().toISOString();
        
        // Add to collection or update count
        this.addToCollection(user, cardName, confidence, scanMode);
        
        // Update in localStorage
        localStorage.setItem('current_alpha_user', JSON.stringify(user));
        
        // Update in users array
        this.updateUserInArray(user);

        console.log(`✅ Scan recorded. Total: ${user.totalScans}, Collection: ${user.collection.length} unique cards`);
        
        return user;
    }

    // 🗃️ COLLECTION MANAGEMENT
    addToCollection(user, cardName, confidence, scanMode) {
        const existingCard = user.collection.find(card => 
            card.name.toLowerCase() === cardName.toLowerCase()
        );
        
        if (existingCard) {
            existingCard.count += 1;
            existingCard.lastScanned = new Date().toISOString();
            existingCard.totalConfidence += confidence;
            existingCard.avgConfidence = Math.round(existingCard.totalConfidence / existingCard.count);
            console.log(`📈 Updated existing card: ${cardName} (now ${existingCard.count}x)`);
        } else {
            user.collection.push({
                id: Date.now(),
                name: cardName,
                count: 1,
                avgConfidence: confidence,
                totalConfidence: confidence,
                scanMode: scanMode,
                firstScanned: new Date().toISOString(),
                lastScanned: new Date().toISOString()
            });
            console.log(`✨ Added new card to collection: ${cardName}`);
        }
    }

    // 🗑️ REMOVE CARD FROM COLLECTION
    removeFromCollection(cardId) {
        const user = this.getCurrentUser();
        if (!user) return null;

        const cardIndex = user.collection.findIndex(card => card.id === cardId);
        if (cardIndex === -1) {
            console.warn('⚠️ Card not found in collection');
            return user;
        }

        const removedCard = user.collection[cardIndex];
        user.collection.splice(cardIndex, 1);
        
        // Update localStorage
        localStorage.setItem('current_alpha_user', JSON.stringify(user));
        this.updateUserInArray(user);
        
        console.log(`🗑️ Removed card from collection: ${removedCard.name}`);
        return user;
    }

    // 📝 UPDATE CARD COUNT
    updateCardCount(cardId, newCount) {
        const user = this.getCurrentUser();
        if (!user) return null;

        const card = user.collection.find(c => c.id === cardId);
        if (!card) {
            console.warn('⚠️ Card not found in collection');
            return user;
        }

        if (newCount <= 0) {
            return this.removeFromCollection(cardId);
        }

        card.count = newCount;
        card.lastScanned = new Date().toISOString();
        
        // Update localStorage
        localStorage.setItem('current_alpha_user', JSON.stringify(user));
        this.updateUserInArray(user);
        
        console.log(`📝 Updated card count: ${card.name} = ${newCount}x`);
        return user;
    }

    // 🔄 GET COLLECTION WITH SORTING
    getCollection(sortBy = 'lastScanned') {
        const user = this.getCurrentUser();
        if (!user || !user.collection) return [];

        const collection = [...user.collection];
        
        switch (sortBy) {
            case 'name':
                return collection.sort((a, b) => a.name.localeCompare(b.name));
            case 'count':
                return collection.sort((a, b) => b.count - a.count);
            case 'confidence':
                return collection.sort((a, b) => b.avgConfidence - a.avgConfidence);
            case 'firstScanned':
                return collection.sort((a, b) => new Date(a.firstScanned) - new Date(b.firstScanned));
            case 'lastScanned':
            default:
                return collection.sort((a, b) => new Date(b.lastScanned) - new Date(a.lastScanned));
        }
    }

    // 🔄 UPDATE USER IN ARRAY
    updateUserInArray(user) {
        const users = this.getAlphaUsers();
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex] = user;
            localStorage.setItem('alpha_users', JSON.stringify(users));
        }
    }

    // 💬 ADD USER FEEDBACK
    addFeedback(rating, comment, context = {}) {
        const user = this.getCurrentUser();
        if (!user) return;

        const feedback = {
            id: Date.now(),
            rating: rating,
            comment: comment,
            timestamp: new Date().toISOString(),
            context: context,
            userNumber: user.alphaNumber,
            scanCount: user.totalScans
        };

        user.feedback.push(feedback);
        localStorage.setItem('current_alpha_user', JSON.stringify(user));

        // Also save to global feedback array
        const allFeedback = JSON.parse(localStorage.getItem('alpha_feedback') || '[]');
        allFeedback.push({
            ...feedback,
            userHash: this.hashUserId(user.id),
            email: user.email || 'not_provided'
        });
        localStorage.setItem('alpha_feedback', JSON.stringify(allFeedback));

        console.log(`💬 Feedback added: ${rating}/5 stars`);
        return feedback;
    }

    // 🎲 GENERATE UNIQUE USERNAME
    generateUsername() {
        const adjectives = [
            'swift', 'clever', 'brave', 'wise', 'keen', 'bold', 'quick', 'sharp',
            'bright', 'fierce', 'mighty', 'noble', 'agile', 'crafty', 'steady'
        ];
        
        const mtgTerms = [
            'mage', 'wizard', 'planeswalker', 'scholar', 'seeker', 'guardian',
            'champion', 'explorer', 'mystic', 'artificer', 'summoner', 'spellcaster',
            'wanderer', 'collector', 'strategist'
        ];

        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const term = mtgTerms[Math.floor(Math.random() * mtgTerms.length)];
        const number = Math.floor(Math.random() * 999) + 1;

        return `${adjective}${term}${number}`;
    }

    // 🗃️ HELPER FUNCTIONS
    getAlphaUsers() {
        try {
            return JSON.parse(localStorage.getItem('alpha_users') || '[]');
        } catch (error) {
            console.error('❌ Error loading alpha users:', error);
            return [];
        }
    }

    getAllStats() {
        const users = this.getAlphaUsers();
        const currentUser = this.getCurrentUser();
        
        return {
            totalUsers: users.length,
            maxUsers: this.maxAlphaUsers,
            currentUser: currentUser,
            spotsRemaining: this.maxAlphaUsers - users.length,
            registrationRate: this.getRegistrationRate(users),
            activeUsers: this.getActiveUsers(users).length
        };
    }

    getRegistrationRate(users) {
        const last24h = users.filter(user => {
            const regTime = new Date(user.registeredAt);
            const now = new Date();
            return (now - regTime) < 24 * 60 * 60 * 1000;
        });
        return last24h.length;
    }

    getActiveUsers(users) {
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return users.filter(user => {
            const lastActive = new Date(user.lastActive);
            return lastActive > lastWeek;
        });
    }

    hashUserId(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `user_${Math.abs(hash)}`;
    }

    // 🧹 RESET USER (FOR TESTING)
    resetCurrentUser() {
        localStorage.removeItem('current_alpha_user');
        const result = this.registerNewUser();
        console.log('🔄 User reset and re-registered:', result);
        return result;
    }

    // 🔧 DEBUG: Reset scan counter
    resetScanCounter() {
        const user = this.getCurrentUser();
        if (user) {
            user.totalScans = 0;
            user.successfulScans = 0;
            localStorage.setItem('current_alpha_user', JSON.stringify(user));
            this.updateUserInArray(user);
            console.log('🔄 Scan counter reset to 0');
        }
        return user;
    }

    // 👑 CHECK IF USER IS ADMIN
    isAdmin() {
        const user = this.getCurrentUser();
        return user && (
            user.alphaNumber === 1 || // First alpha tester
            user.username === 'mightysummoner784' || // Your specific username
            user.id === 'admin_override'
        );
    }
}

export default AlphaUserSystem;