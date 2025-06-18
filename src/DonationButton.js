// DonationButton.js - PayPal Donation Integration
import React, { useState } from 'react';

const DonationButton = ({ placement = 'default' }) => {
    const [showDonationModal, setShowDonationModal] = useState(false);

    // 💰 PayPal donation amounts
    const donationAmounts = [
        { amount: 5, label: '☕ Coffee', description: 'Buy me a coffee!' },
        { amount: 10, label: '🍕 Pizza', description: 'Fuel development!' },
        { amount: 25, label: '🎮 Game Night', description: 'Support the project!' },
        { amount: 50, label: '🚀 Rocket Fuel', description: 'Accelerate features!' }
    ];

    // 🎯 Different button styles based on placement
    const getButtonStyle = () => {
        const baseStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all 0.2s'
        };

        switch (placement) {
            case 'header':
                return {
                    ...baseStyle,
                    padding: '8px 16px',
                    backgroundColor: '#0070ba',
                    color: 'white',
                    fontSize: '14px'
                };
            case 'sidebar':
                return {
                    ...baseStyle,
                    padding: '12px 20px',
                    backgroundColor: '#ff6b35',
                    color: 'white',
                    fontSize: '16px',
                    width: '100%',
                    justifyContent: 'center'
                };
            case 'footer':
                return {
                    ...baseStyle,
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: '#0070ba',
                    border: '2px solid #0070ba',
                    fontSize: '14px'
                };
            default:
                return {
                    ...baseStyle,
                    padding: '12px 24px',
                    backgroundColor: '#0070ba',
                    color: 'white',
                    fontSize: '16px'
                };
        }
    };

    // 🎨 Donation modal
    const DonationModal = () => (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }} onClick={() => setShowDonationModal(false)}>
            <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '16px',
                maxWidth: '500px',
                width: '90%',
                textAlign: 'center'
            }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ marginBottom: '25px' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
                        🍕 Support a Starving Dev
                    </h2>
                    <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
                        Building MTG Scanner on caffeine and hope!
                    </p>
                </div>

                {/* Donation Options */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '15px',
                    marginBottom: '25px'
                }}>
                    {donationAmounts.map((donation) => (
                        <a
                            key={donation.amount}
                            href={`https://www.paypal.me/MTGScanner/${donation.amount}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                padding: '20px',
                                backgroundColor: '#f8f9fa',
                                border: '2px solid #e9ecef',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                color: '#333',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#0070ba';
                                e.target.style.color = 'white';
                                e.target.style.borderColor = '#0070ba';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.color = '#333';
                                e.target.style.borderColor = '#e9ecef';
                                e.target.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                                {donation.label}
                            </div>
                            <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '5px' }}>
                                ${donation.amount}
                            </div>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                                {donation.description}
                            </div>
                        </a>
                    ))}
                </div>

                {/* Custom Amount */}
                <div style={{ marginBottom: '25px' }}>
                    <a
                        href="https://www.paypal.me/MTGScanner"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'block',
                            padding: '15px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#218838';
                            e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#28a745';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        💳 Custom Amount - PayPal.me/MTGScanner
                    </a>
                </div>

                {/* Thank You Message */}
                <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#e7f3ff', 
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#004085' }}>
                        🙏 <strong>Thanks!</strong> Your support helps a solo developer survive while building cool MTG tools!
                    </p>
                </div>

                {/* Close Button */}
                <button
                    onClick={() => setShowDonationModal(false)}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    ✕ Close
                </button>
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setShowDonationModal(true)}
                style={getButtonStyle()}
                onMouseEnter={(e) => {
                    if (placement === 'footer') {
                        e.target.style.backgroundColor = '#0070ba';
                        e.target.style.color = 'white';
                    } else {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,112,186,0.3)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (placement === 'footer') {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#0070ba';
                    } else {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }
                }}
            >
                <span>💝</span>
                <span>
                    {placement === 'header' ? 'Donate' : 
                     placement === 'sidebar' ? 'Support Project' :
                     placement === 'footer' ? 'Support via PayPal' :
                     'Support MTG Scanner'}
                </span>
            </button>

            {showDonationModal && <DonationModal />}
        </>
    );
};

export default DonationButton;