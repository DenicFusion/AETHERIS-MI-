import React, { useEffect } from 'react';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  useEffect(() => {
    // Only load the script once
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      window.googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,fr,de,es,pt,it,ar,zh-CN,ja,ko,hi',
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          },
          'google_translate_element'
        );
      };
    }
  }, []);

  return (
    <div className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors h-10 px-2 rounded-xl border border-white/5 bg-white/5 relative z-50">
      <Globe className="w-4 h-4" />
      <div id="google_translate_element"></div>
      <style>{`
        /* Minimal styling overrides to hide default Google branding */
        #google_translate_element select {
          background-color: transparent;
          color: inherit;
          border: none;
          outline: none;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
          width: 100%;
        }
        #google_translate_element select option {
          background-color: #050505;
          color: #fff;
        }
        .goog-te-gadget { color: transparent !important; }
        .goog-logo-link { display: none !important; }
        .goog-te-banner-frame { display: none !important; }
        body { top: 0 !important; }
      `}</style>
    </div>
  );
}

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
  }
}
