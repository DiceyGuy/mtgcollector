import React from 'react';
import { createRoot } from 'react-dom/client';
import Scanner from './Scanner';
import './index.css';

console.log('🚀 MTG Scanner initializing...');

// Get root element
const container = document.getElementById('root');
if (!container) {
    throw new Error('Root element not found');
}

// Create React root
const root = createRoot(container);

// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('🚨 MTG Scanner Error:', error);
        console.error('🚨 Error Info:', errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '20px',
                    fontFamily: 'Arial, sans-serif',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        maxWidth: '600px',
                        textAlign: 'center'
                    }}>
                        <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>
                            🚨 MTG Scanner Error
                        </h1>
                        <p style={{ marginBottom: '20px', fontSize: '16px' }}>
                            Something went wrong with the scanner. This is usually a temporary issue.
                        </p>
                        <details style={{ 
                            background: '#f8f9fa', 
                            padding: '15px', 
                            borderRadius: '6px',
                            marginBottom: '20px',
                            textAlign: 'left'
                        }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                Technical Details
                            </summary>
                            <pre style={{ 
                                fontSize: '12px', 
                                marginTop: '10px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {this.state.error && this.state.error.toString()}
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                        <button 
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '12px 24px',
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                marginRight: '10px'
                            }}
                        >
                            🔄 Reload Scanner
                        </button>
                        <a 
                            href="mailto:support@mtgscanner.com"
                            style={{
                                padding: '12px 24px',
                                background: '#28a745',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: '6px',
                                fontSize: '16px'
                            }}
                        >
                            📧 Report Issue
                        </a>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// App Component
function App() {
    return (
        <ErrorBoundary>
            <Scanner />
        </ErrorBoundary>
    );
}

// Render the app
console.log('🎯 Rendering MTG Scanner...');
root.render(<App />);

// Log successful initialization
console.log('✅ MTG Scanner initialized successfully');

// Performance monitoring
if (window.performance) {
    window.addEventListener('load', () => {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        console.log(`⚡ MTG Scanner loaded in ${loadTime}ms`);
    });
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});

// Export for debugging
if (process.env.NODE_ENV === 'development') {
    window.MTGScanner = {
        version: '1.0.0-alpha',
        environment: process.env.NODE_ENV
    };
}