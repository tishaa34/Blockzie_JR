import React, { useEffect } from 'react';
import '../../css/SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
  useEffect(() => {
    // Show splash screen for 3 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img 
          src="/assets/ui/splash-screen.png" 
          alt="Loading..." 
          className="splash-logo"
        />
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
        <p className="loading-text">Preparing, please wait...</p>
      </div>
    </div>
  );
};

export default SplashScreen;
