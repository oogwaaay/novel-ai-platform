import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const SITE_URL = 'https://scribelydesigns.top';
const DEFAULT_IMAGE = `${SITE_URL}/brand1090.png`;

export function SEO({
  title,
  description,
  keywords,
  image = DEFAULT_IMAGE,
  type = 'website',
  jsonLd,
  author,
  publishedTime,
  modifiedTime
}: SEOProps) {
  const location = useLocation();
  const fullUrl = `${SITE_URL}${location.pathname}`;

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Update meta keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords);
    }

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // Update Open Graph tags
    const updateOG = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateOG('og:title', title);
    updateOG('og:description', description);
    updateOG('og:url', fullUrl);
    updateOG('og:type', type);
    updateOG('og:image', image);
    updateOG('og:site_name', 'Scribely');
    updateOG('og:locale', 'en_US');

    // Update Twitter Card tags
    const updateTwitter = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateTwitter('twitter:card', 'summary_large_image');
    updateTwitter('twitter:title', title);
    updateTwitter('twitter:description', description);
    updateTwitter('twitter:image', image);
    updateTwitter('twitter:site', '@scribely');
    updateTwitter('twitter:creator', '@scribely');
    
    // Add meta viewport for mobile optimization
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    
    // Add robots meta tag
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'index, follow');


    // Update article-specific meta tags
    if (type === 'article') {
      if (author) {
        updateOG('article:author', author);
      }
      if (publishedTime) {
        updateOG('article:published_time', publishedTime);
      }
      if (modifiedTime) {
        updateOG('article:modified_time', modifiedTime);
      }
    }

    // Add JSON-LD structured data
    let jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      const jsonLdData = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      
      // Remove existing JSON-LD scripts
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        script.remove();
      });

      // Add new JSON-LD scripts
      jsonLdData.forEach((data, index) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = `json-ld-${index}`;
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
      });
    } else if (jsonLdScript) {
      // Remove JSON-LD if not provided
      jsonLdScript.remove();
    }

    // Cleanup function
    return () => {
      // Remove JSON-LD scripts on unmount
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        script.remove();
      });
    };
  }, [title, description, keywords, image, type, jsonLd, author, publishedTime, modifiedTime, fullUrl, location]);

  return null;
}

