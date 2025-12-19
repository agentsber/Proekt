import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TELEGRAM_BOT_USERNAME = 'eplaysbot';

export function TelegramLoginButton({ onAuth, buttonSize = 'large', cornerRadius = 8 }) {
  const containerRef = useRef(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [error, setError] = useState(false);

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

    script.onload = () => {
      // Check if widget rendered after a short delay
      setTimeout(() => {
        if (containerRef.current && containerRef.current.querySelector('iframe')) {
          setWidgetLoaded(true);
        } else {
          setError(true);
        }
      }, 2000);
    };

    script.onerror = () => {
      setError(true);
    };

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!widgetLoaded && containerRef.current) {
        const hasIframe = containerRef.current.querySelector('iframe');
        if (!hasIframe) {
          setError(true);
        }
      }
    }, 4000);

    return () => {
      // Cleanup
      delete window.onTelegramAuth;
      clearTimeout(timeout);
    };
  }, [onAuth, buttonSize, cornerRadius, widgetLoaded]);

  // Fallback button that opens Telegram bot directly
  const handleFallbackClick = () => {
    // Open Telegram bot in new window
    const telegramUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=auth`;
    window.open(telegramUrl, '_blank');
  };

  if (error) {
    return (
      <Button
        type="button"
        onClick={handleFallbackClick}
        variant="outline"
        className="w-full border-[#30363d] hover:bg-[#161b22]"
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        Войти через Telegram
      </Button>
    );
  }

  return (
    <div className="telegram-login-wrapper">
      <div ref={containerRef} className="telegram-login-container" />
      {!widgetLoaded && !error && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-pulse text-[#8b949e] text-sm">Загрузка Telegram...</div>
        </div>
      )}
    </div>
  );
}

export default TelegramLoginButton;
