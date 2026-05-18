import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SEO_PROPS_DEFAULT, SITE_URL, getMetaArray } from './seoDefaults';

export default function PageSEO({
  title,
  description = SEO_PROPS_DEFAULT.defaultDescription,
  canonical = SITE_URL,
  robots = SEO_PROPS_DEFAULT.robots,
  googlebot = SEO_PROPS_DEFAULT.googlebot,
  ogImage = `${SITE_URL}/og-image.png`,
  ogType = 'website',
  structuredData
}) {
  const metaTags = getMetaArray({
    title,
    description,
    canonical,
    robots,
    googlebot,
    ogImage,
    ogType
  });

  return (
    <Helmet
      titleTemplate={SEO_PROPS_DEFAULT.titleTemplate}
      defaultTitle={SEO_PROPS_DEFAULT.defaultTitle}
    >
      {title && <title>{title}</title>}
      <link rel="canonical" href={canonical} />
      
      {metaTags.map((meta, index) => (
        <meta key={index} {...meta} />
      ))}

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
