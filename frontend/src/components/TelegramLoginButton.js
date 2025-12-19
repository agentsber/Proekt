import React, { useEffect, useRef } from 'react';

const TELEGRAM_BOT_USERNAME = 'YourGameHubBot'; // Замените на username вашего бота

export function TelegramLoginButton({ onAuth, buttonSize = 'large', cornerRadius = 8 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Clear previous widget
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Create callback function
    window.onTelegramAuth = (user) => {
      if (onAuth) {
        onAuth(user);
      }
    };

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    return () => {
      // Cleanup
      delete window.onTelegramAuth;
    };
  }, [onAuth, buttonSize, cornerRadius]);

  return <div ref={containerRef} className="telegram-login-container" />;
}

export default TelegramLoginButton;
