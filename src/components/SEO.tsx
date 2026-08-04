import React, { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const DEFAULT_TITLE = 'Aura ERP - Sistema de Gestión Empresarial y Punto de Venta en la Nube';
const DEFAULT_DESCRIPTION = 'Optimiza las ventas, inventario, cajas y personal de tu negocio con Aura ERP. El sistema de punto de venta (POS) más rápido, intuitivo y eficiente.';
const DEFAULT_KEYWORDS = 'ERP, POS, punto de venta, inventario, control de caja, software empresarial, facturacion, gestion de ventas';
const DEFAULT_OG_IMAGE = '/logo.png';

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd,
}) => {
  useEffect(() => {
    // Update Title
    const fullTitle = title ? `${title} | Aura ERP` : DEFAULT_TITLE;
    document.title = fullTitle;

    // Helper to update meta tag
    const updateMetaTag = (nameOrProperty: string, value: string, isProperty = false) => {
      const attributeName = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attributeName}="${nameOrProperty}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, nameOrProperty);
        document.head.appendChild(element);
      }
      element.setAttribute('content', value);
    };

    // Update Standard Meta Tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Update OpenGraph
    updateMetaTag('og:title', fullTitle, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', ogType, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:url', window.location.href, true);

    // Update Twitter Cards
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);

    // Update Canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (canonical || window.location.href) {
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', canonical || window.location.href);
    }

    // Inject JSON-LD Schema if provided
    let scriptJsonLd = document.getElementById('json-ld-schema');
    if (jsonLd) {
      if (!scriptJsonLd) {
        scriptJsonLd = document.createElement('script');
        scriptJsonLd.id = 'json-ld-schema';
        scriptJsonLd.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptJsonLd);
      }
      scriptJsonLd.textContent = JSON.stringify(jsonLd);
    } else if (scriptJsonLd) {
      scriptJsonLd.remove();
    }
  }, [title, description, keywords, canonical, ogType, ogImage, jsonLd]);

  return null;
};
