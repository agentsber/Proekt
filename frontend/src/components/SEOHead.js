import { useEffect, useContext } from 'react';
import { SiteSettingsContext } from '@/App';

export function SEOHead() {
  const { siteSettings } = useContext(SiteSettingsContext);

  useEffect(() => {
    if (!siteSettings) return;

    // Update document title
    if (siteSettings.seo_title) {
      document.title = siteSettings.seo_title;
    } else if (siteSettings.site_name) {
      document.title = siteSettings.site_name;
    }

    // Helper to update or create meta tag
    const setMeta = (name, content, isProperty = false) => {
      if (!content) return;
      
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Meta description
    setMeta('description', siteSettings.seo_description || siteSettings.site_description);
    
    // Keywords
    setMeta('keywords', siteSettings.seo_keywords);

    // Open Graph
    setMeta('og:title', siteSettings.seo_title || siteSettings.site_name, true);
    setMeta('og:description', siteSettings.seo_description || siteSettings.site_description, true);
    setMeta('og:image', siteSettings.og_image, true);
    setMeta('og:type', 'website', true);

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', siteSettings.seo_title || siteSettings.site_name);
    setMeta('twitter:description', siteSettings.seo_description || siteSettings.site_description);
    setMeta('twitter:image', siteSettings.og_image);

    // Favicon
    if (siteSettings.favicon_url) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = siteSettings.favicon_url;
    }

    // Google Analytics
    if (siteSettings.google_analytics_id && !document.querySelector(`script[src*="googletagmanager"]`)) {
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${siteSettings.google_analytics_id}`;
      document.head.appendChild(gaScript);

      const gaInit = document.createElement('script');
      gaInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${siteSettings.google_analytics_id}');
      `;
      document.head.appendChild(gaInit);
    }

    // Yandex Metrika
    if (siteSettings.yandex_metrika_id && !document.querySelector(`script[src*="mc.yandex.ru"]`)) {
      const ymScript = document.createElement('script');
      ymScript.innerHTML = `
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
        ym(${siteSettings.yandex_metrika_id}, "init", {clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
      `;
      document.head.appendChild(ymScript);
    }

    // Custom head scripts
    if (siteSettings.custom_head_scripts) {
      const existingCustom = document.querySelector('#custom-head-scripts');
      if (existingCustom) {
        existingCustom.remove();
      }
      
      const customDiv = document.createElement('div');
      customDiv.id = 'custom-head-scripts';
      customDiv.innerHTML = siteSettings.custom_head_scripts;
      
      // Move script tags to actually execute
      customDiv.querySelectorAll('script').forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.innerHTML = script.innerHTML;
        }
        document.head.appendChild(newScript);
      });
    }

  }, [siteSettings]);

  return null;
}

export default SEOHead;
