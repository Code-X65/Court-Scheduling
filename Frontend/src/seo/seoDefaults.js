export const SITE_URL = 'https://court-scheduling.example.com';

export const SEO_PROPS_DEFAULT = {
  siteName: 'Court Scheduling System',
  defaultTitle: 'Court Scheduling System',
  titleTemplate: '%s | Court Scheduling System',
  defaultDescription: 'Court scheduling and case management system for efficient judicial operations.',
  robots: 'index, follow',
  googlebot: 'index, follow'
};

export const getMetaArray = (props) => {
  return [
    { name: 'description', content: props.description },
    { name: 'robots', content: props.robots },
    { name: 'googlebot', content: props.googlebot },
    { property: 'og:site_name', content: SEO_PROPS_DEFAULT.siteName },
    { property: 'og:type', content: props.ogType || 'website' },
    { property: 'og:title', content: props.title ? `${props.title} | ${SEO_PROPS_DEFAULT.siteName}` : SEO_PROPS_DEFAULT.defaultTitle },
    { property: 'og:description', content: props.description },
    { property: 'og:url', content: props.canonical },
    { property: 'og:image', content: props.ogImage },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: '@CourtBridge' },
    { name: 'twitter:title', content: props.title ? `${props.title} | ${SEO_PROPS_DEFAULT.siteName}` : SEO_PROPS_DEFAULT.defaultTitle },
    { name: 'twitter:description', content: props.description },
    { name: 'twitter:image', content: props.ogImage }
  ];
};
