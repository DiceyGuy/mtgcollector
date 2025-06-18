// AdminPanel.js - SECURE ADMIN DASHBOARD (YOUR EYES ONLY) - FIXED
import React, { useState, useEffect } from 'react';
import SecurityService from './SecurityService';

const AdminPanel = () => {
    const [securityService] = useState(() => new SecurityService());
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminKey, setAdminKey] = useState('');
    const [alphaData, setAlphaData] = useState(null);
    const [showRawData, setShowRawData] = useState(false);

    // 🔐 ADMIN AUTHENTICATION
    const handleAdminLogin = () => {
        if (securityService.authenticateAdmin(adminKey)) {
            setIsAuthenticated(true);
            setAdminKey(''); // Clear input for security
            loadAdminData();
        } else {
            alert('❌ Invalid admin key');
            setAdminKey('');
        }
    };

    // 📊 LOAD ADMIN DATA
    const loadAdminData = () => {
        const data = securityService.exportAlphaData();
        setAlphaData(data);
    };

    // 💾 EXPORT DATA (DOWNLOAD JSON)
    const exportDataToFile = () => {
        if (!alphaData) return;
        
        const dataStr = JSON.stringify(alphaData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mtg_scanner_alpha_data_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // 🚪 ADMIN LOGOUT
    const handleLogout = () => {
        securityService.logoutAdmin();
        setIsAuthenticated(false);
        setAlphaData(null);
        setShowRawData(false);
    };

    // 🔒 LOGIN FORM (SECURITY FIRST)
    if (!isAuthenticated) {
        return (
            <div style={{ 
                maxWidth: '400px', 
                margin: '50px auto', 
                padding: '40px', 
                backgroundColor: '#1a1a1a',
                color: '#fff',
                borderRadius: '12px',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold', 
                        marginBottom: '8px' 
                    }}>
                        🔐 Admin Access
                    </div>
                    <div style={{ color: '#888', fontSize: '14px' }}>
                        MTG Scanner Security Portal
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <input
                        type="password"
                        placeholder="Enter admin key..."
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #333',
                            backgroundColor: '#2a2a2a',
                            color: '#fff',
                            fontSize: '16px'
                        }}
                    />
                </div>

                <button
                    onClick={handleAdminLogin}
                    style={{
                        width: '100%',
                        padding: '12px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    🔑 Authenticate
                </button>

                <div style={{ 
                    marginTop: '20px', 
                    fontSize: '12px', 
                    color: '#666' 
                }}>
                    🛡️ Secure access for data export & alpha monitoring
                </div>
            </div>
        );
    }

    // 📊 ADMIN DASHBOARD
    return (
        <div style={{ 
            maxWidth: '1200px', 
            margin: '20px auto', 
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* Admin Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                borderRadius: '12px'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px' }}>
                        🔐 MTG Scanner Admin Dashboard
                    </h1>
                    <p style={{ margin: '5px 0 0 0', color: '#888' }}>
                        Alpha Testing Data & Security Portal
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    🚪 Logout
                </button>
            </div>

            {alphaData && (
                <>
                    {/* Statistics Grid */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginBottom: '30px'
                    }}>
                        <div style={{ 
                            padding: '20px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '8px',
                            border: '2px solid #28a745'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>
                                👥 Alpha Users
                            </h3>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                                {alphaData.statistics.totalUsers} / {alphaData.statistics.maxUsers}
                            </p>
                            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                                {alphaData.statistics.lastWeekActivity} active this week
                            </p>
                        </div>

                        <div style={{ 
                            padding: '20px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '8px',
                            border: '2px solid #007bff'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
                                📊 Scan Activity
                            </h3>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                                {alphaData.statistics.avgScansPerUser} avg/user
                            </p>
                            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                                {alphaData.statistics.scanSuccessRate}% success rate
                            </p>
                        </div>

                        <div style={{ 
                            padding: '20px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '8px',
                            border: '2px solid #ffc107'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>
                                🗃️ Collections
                            </h3>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                                {alphaData.statistics.collectionStats.usersWithCollections}
                            </p>
                            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                                {alphaData.statistics.collectionStats.totalCardsInCollections} total cards
                            </p>
                        </div>

                        <div style={{ 
                            padding: '20px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '8px',
                            border: '2px solid #6f42c1'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>
                                💬 Feedback
                            </h3>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                                {alphaData.statistics.totalFeedbackItems}
                            </p>
                            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                                feedback items collected
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '15px', 
                        marginBottom: '30px',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={exportDataToFile}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            💾 Export All Data (JSON)
                        </button>

                        <button
                            onClick={() => setShowRawData(!showRawData)}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {showRawData ? '👁️ Hide' : '👁️ View'} Raw Data
                        </button>

                        <button
                            onClick={loadAdminData}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Refresh Data
                        </button>
                    </div>

                    {/* Recent Feedback */}
                    {alphaData.feedback && alphaData.feedback.length > 0 && (
                        <div style={{ 
                            padding: '20px', 
                            backgroundColor: '#fff', 
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ margin: '0 0 15px 0' }}>💬 Recent Feedback</h3>
                            {alphaData.feedback.slice(0, 5).map((feedback, index) => (
                                <div key={index} style={{ 
                                    padding: '12px', 
                                    backgroundColor: '#f8f9fa', 
                                    borderRadius: '6px',
                                    marginBottom: '10px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 'bold' }}>
                                            Rating: {feedback.rating}/5 ⭐
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#666' }}>
                                            {new Date(feedback.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontStyle: 'italic' }}>
                                        "{feedback.comment}"
                                    </p>
                                    <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                                        User: {feedback.userHash} | Scans: {feedback.scanCount}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Raw Data View */}
                    {showRawData && (
                        <div style={{ 
                            padding: '20px', 
                            backgroundColor: '#1a1a1a', 
                            color: '#fff',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ margin: '0 0 15px 0' }}>🗂️ Raw Alpha Data</h3>
                            <pre style={{ 
                                whiteSpace: 'pre-wrap', 
                                fontSize: '12px',
                                overflow: 'auto',
                                maxHeight: '400px',
                                backgroundColor: '#2a2a2a',
                                padding: '15px',
                                borderRadius: '6px'
                            }}>
                                {JSON.stringify(alphaData, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Data Export Info */}
                    <div style={{ 
                        padding: '15px', 
                        backgroundColor: '#e7f3ff', 
                        borderRadius: '6px',
                        fontSize: '14px'
                    }}>
                        <strong>🔒 Privacy Protection:</strong> All emails are hashed, no plain text stored. 
                        Export data for analysis while protecting user privacy. 
                        Data exported at: {alphaData.exportedAt}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminPanel;