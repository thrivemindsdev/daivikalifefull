import { useEffect } from 'react';

/**
 * Custom React Hook to dynamically manage SEO head tags, Open Graph (social share), and JSON-LD Schema markup.
 * Ensures search crawlers index optimal page context instantly.
 */
export default function useDocumentSEO({ title, description, schema }) {
  useEffect(() => {
    // 1. Update document title
    const formattedTitle = title
      ? (title.includes('DAIVIKA') || title.includes('Daivika') ? title : `${title} | DAIVIKA`)
      : 'DAIVIKA | Smart Products for Everyday Problems';
    document.title = formattedTitle;

    // 2. Manage meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    const finalDesc = description || 'Not just a brand. Smart solutions for everyday life. DAIVIKA is a purpose-driven brand built around a simple belief: everyday problems deserve better solutions.';
    metaDescription.setAttribute('content', finalDesc);

    // 3. Manage Open Graph (Social Sharing) Metadata
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', formattedTitle);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', finalDesc);

    // 4. Structured Data injection (JSON-LD) for rich search listings
    let schemaScript = document.querySelector('#ld-json-schema-page');
    if (schema) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.id = 'ld-json-schema-page';
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schema);
    } else {
      if (schemaScript) {
        schemaScript.remove();
      }
    }

    // Cleanup injected schema on page unmount to prevent duplicate schemas
    return () => {
      if (schemaScript) {
        schemaScript.remove();
      }
    };
  }, [title, description, schema]);
}
