// SecurityService.js - ADMIN-ONLY ACCESS & DATA PROTECTION
class SecurityService {
    constructor() {
        this.ADMIN_KEY = 'MTG_SCANNER_ADMIN_2025_SECURE_KEY_ALPHA';
        this.adminAuthenticated = false;
        this.securityLog = [];
        this.initSecurity();
    }

    initSecurity() {
        console.log('🔒 SecurityService initialized - Alpha protection active');
        this.logSecurityEvent('SECURITY_INIT', 'Security service started');
        
        // Clear any potential admin keys from URL/storage on init
        this.clearPotentialLeaks();
    }

    // 🔐 ADMIN AUTHENTICATION (YOUR EYES ONLY)
    authenticateAdmin(inputKey) {
        if (inputKey === this.ADMIN_KEY) {
            this.adminAuthenticated = true;
            this.logSecurityEvent('ADMIN_AUTH_SUCCESS', 'Admin authenticated successfully');
            console.log('🔑 Admin access granted');
            return true;
        } else {
            this.logSecurityEvent('ADMIN_AUTH_FAILED', `Failed admin attempt: ${inputKey?.substring(0, 3)}...`);
            console.warn('❌ Invalid admin key');
            return false;
        }
    }

    // 🛡️ ADMIN DATA ACCESS (SECURE EXPORT)
    exportAlphaData() {
        if (!this.adminAuthenticated) {
            this.logSecurityEvent('UNAUTHORIZED_DATA_ACCESS', 'Non-admin tried to access data');
            console.error('❌ Unauthorized data access attempt');
            return null;
        }

        try {
            const alphaData = {
                // User data (anonymized)
                users: this.getAnonymizedUsers(),
                
                // Usage statistics
                statistics: this.getUsageStatistics(),
                
                // Feedback data
                feedback: this.getAllFeedback(),
                
                // Security log
                securityEvents: this.securityLog,
                
                // Export metadata
                exportedAt: new Date().toISOString(),
                exportedBy: 'ADMIN',
                totalUsers: this.getTotalUsers(),
                dataIntegrity: this.verifyDataIntegrity()
            };

            this.logSecurityEvent('ADMIN_DATA_EXPORT', 'Alpha data exported by admin');
            return alphaData;
        } catch (error) {
            this.logSecurityEvent('DATA_EXPORT_ERROR', `Export failed: ${error.message}`);
            console.error('❌ Data export error:', error);
            return null;
        }
    }

    // 📊 ANONYMIZED USER DATA (PRIVACY PROTECTED)
    getAnonymizedUsers() {
        const users = JSON.parse(localStorage.getItem('alpha_users') || '[]');
        return users.map((user, index) => ({
            userId: `user_${index + 1}`,
            registeredAt: user.registeredAt,
            totalScans: user.totalScans || 0,
            collectionSize: user.collection?.length || 0,
            lastActive: user.lastActive,
            // EMAIL HASHED (NEVER PLAIN TEXT)
            emailHash: this.hashEmail(user.email),
            isActive: this.isUserActive(user)
        }));
    }

    // 🔐 EMAIL PROTECTION (HASHED, NOT READABLE)
    hashEmail(email) {
        if (!email) return 'no_email';
        
        // Simple hash for privacy (not cryptographic, just obfuscation)
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            const char = email.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `hash_${Math.abs(hash)}`;
    }

    // 📈 USAGE STATISTICS (AGGREGATED ONLY)
    getUsageStatistics() {
        const users = JSON.parse(localStorage.getItem('alpha_users') || '[]');
        const feedback = JSON.parse(localStorage.getItem('alpha_feedback') || '[]');
        
        return {
            totalUsers: users.length,
            maxUsers: 500,
            registrationRate: this.calculateRegistrationRate(users),
            avgScansPerUser: this.calculateAvgScans(users),
            totalFeedbackItems: feedback.length,
            lastWeekActivity: this.getLastWeekActivity(users),
            collectionStats: this.getCollectionStatistics(users),
            scanSuccessRate: this.calculateSuccessRate()
        };
    }

    // 💬 FEEDBACK COLLECTION (ADMIN ACCESS ONLY)
    getAllFeedback() {
        if (!this.adminAuthenticated) {
            return [];
        }

        const feedback = JSON.parse(localStorage.getItem('alpha_feedback') || '[]');
        return feedback.map(item => ({
            feedbackId: item.id || 'unknown',
            timestamp: item.timestamp,
            rating: item.rating,
            comment: item.comment,
            userType: item.userType || 'alpha_tester',
            // USER EMAIL HASHED FOR PRIVACY
            userHash: this.hashEmail(item.email),
            scanCount: item.scanCount,
            sessionLength: item.sessionLength
        }));
    }

    // 🔍 SECURITY EVENT LOGGING
    logSecurityEvent(eventType, details) {
        const event = {
            timestamp: new Date().toISOString(),
            type: eventType,
            details: details,
            sessionId: this.getSessionId()
        };
        
        this.securityLog.push(event);
        
        // Keep only last 1000 security events
        if (this.securityLog.length > 1000) {
            this.securityLog = this.securityLog.slice(-1000);
        }
    }

    // 🛡️ DATA INTEGRITY VERIFICATION
    verifyDataIntegrity() {
        try {
            const users = JSON.parse(localStorage.getItem('alpha_users') || '[]');
            const feedback = JSON.parse(localStorage.getItem('alpha_feedback') || '[]');
            
            return {
                usersValid: Array.isArray(users),
                feedbackValid: Array.isArray(feedback),
                noCorruption: true,
                lastVerified: new Date().toISOString()
            };
        } catch (error) {
            this.logSecurityEvent('DATA_CORRUPTION', `Data integrity check failed: ${error.message}`);
            return {
                usersValid: false,
                feedbackValid: false,
                noCorruption: false,
                error: error.message
            };
        }
    }

    // 🧹 SECURITY CLEANUP
    clearPotentialLeaks() {
        // Remove any admin keys that might be in URL params
        if (window.location.search.includes('admin')) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Clear any accidental admin data from localStorage
        const keysToCheck = Object.keys(localStorage);
        keysToCheck.forEach(key => {
            if (key.toLowerCase().includes('admin') && key !== 'alpha_admin_auth') {
                localStorage.removeItem(key);
                this.logSecurityEvent('SECURITY_CLEANUP', `Removed potential leak: ${key}`);
            }
        });
    }

    // 📱 ADMIN PANEL ACCESS CHECK
    canAccessAdminPanel() {
        return this.adminAuthenticated;
    }

    // 🚪 ADMIN LOGOUT
    logoutAdmin() {
        this.adminAuthenticated = false;
        this.logSecurityEvent('ADMIN_LOGOUT', 'Admin logged out');
        console.log('🚪 Admin logged out');
    }

    // 🔄 UTILITY FUNCTIONS
    calculateRegistrationRate(users) {
        const last24h = users.filter(user => {
            const regTime = new Date(user.registeredAt);
            const now = new Date();
            return (now - regTime) < 24 * 60 * 60 * 1000;
        });
        return last24h.length;
    }

    calculateAvgScans(users) {
        if (users.length === 0) return 0;
        const totalScans = users.reduce((sum, user) => sum + (user.totalScans || 0), 0);
        return Math.round(totalScans / users.length);
    }

    getLastWeekActivity(users) {
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return users.filter(user => {
            const lastActive = new Date(user.lastActive);
            return lastActive > lastWeek;
        }).length;
    }

    getCollectionStatistics(users) {
        const collections = users.filter(user => user.collection && user.collection.length > 0);
        const totalCards = collections.reduce((sum, user) => sum + user.collection.length, 0);
        
        return {
            usersWithCollections: collections.length,
            totalCardsInCollections: totalCards,
            avgCollectionSize: collections.length > 0 ? Math.round(totalCards / collections.length) : 0
        };
    }

    calculateSuccessRate() {
        // This would be calculated from scan logs
        return 95; // Placeholder - your actual success rate
    }

    isUserActive(user) {
        const lastActive = new Date(user.lastActive);
        const now = new Date();
        return (now - lastActive) < 7 * 24 * 60 * 60 * 1000; // Active in last 7 days
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('security_session_id');
        if (!sessionId) {
            sessionId = 'sec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('security_session_id', sessionId);
        }
        return sessionId;
    }

    getTotalUsers() {
        const users = JSON.parse(localStorage.getItem('alpha_users') || '[]');
        return users.length;
    }
}

export default SecurityService;