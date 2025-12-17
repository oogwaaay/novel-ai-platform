import React, { useEffect, useState } from 'react';
import { PrimaryButton } from './ui/PrimaryButton';
import { SecondaryButton } from './ui/SecondaryButton';

interface CookieConsentOptions {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'scribely_cookie_consent';
const ANALYTICS_SCRIPT_LOADED = 'scribely_analytics_loaded';

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState<CookieConsentOptions>({
    necessary: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already given consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent) {
      setConsent(JSON.parse(savedConsent));
    } else {
      setShowBanner(true);
    }
  }, []);

  useEffect(() => {
    // Load analytics script if consent is given
    if (consent.analytics && !localStorage.getItem(ANALYTICS_SCRIPT_LOADED)) {
      loadAnalyticsScript();
    }
  }, [consent.analytics]);

  const loadAnalyticsScript = () => {
    const script = document.createElement('script');
    script.src = 'https://analytics.ahrefs.com/analytics.js';
    script.setAttribute('data-key', 'H6qvdrW45qWBvlN0Pg94Nw');
    script.async = true;
    document.head.appendChild(script);
    localStorage.setItem(ANALYTICS_SCRIPT_LOADED, 'true');
  };

  const handleConsent = (options: CookieConsentOptions) => {
    setConsent(options);
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(options));
    setShowBanner(false);
  };

  const handleAcceptAll = () => {
    handleConsent({
      necessary: true,
      analytics: true,
      marketing: true
    });
  };

  const handleOnlyNecessary = () => {
    handleConsent({
      necessary: true,
      analytics: false,
      marketing: false
    });
  };

  const handleCustomize = () => {
    // In a real implementation, this would open a modal for custom consent options
    // For now, we'll just toggle a more detailed view
    alert('Custom consent options would be available here.');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 shadow-lg border-t border-slate-200 dark:border-slate-700 z-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Cookie Consent
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We use cookies to enhance your experience, analyze site traffic, and personalize content. You can manage your preferences below.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <SecondaryButton
              onClick={handleCustomize}
              className="w-full sm:w-auto"
            >
              Customize
            </SecondaryButton>
            <SecondaryButton
              onClick={handleOnlyNecessary}
              className="w-full sm:w-auto"
            >
              Only Necessary
            </SecondaryButton>
            <PrimaryButton
              onClick={handleAcceptAll}
              className="w-full sm:w-auto"
            >
              Accept All
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
