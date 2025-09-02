import React, { useEffect } from 'react';
import '../../css/SplashScreen.css';

const SplashScreen = ({ onComplete, message = "Preparing, please wait..." }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img 
          src="./assets/characters/stembot.svg" 
          alt="Loading..." 
          className="splash-logo"
        />
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
        <p className="loading-text">{message}</p>
      </div>
    </div>
  );
};

export default SplashScreen;
