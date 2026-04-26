const baseUrl = import.meta.env.BASE_URL || '/';

function withBase(path: string) {
  return `${baseUrl}${path}`.replace(/([^:]\/)\/+/g, '$1');
}

export const placeholderImage = withBase('placeholder.png');
export const pocadexLogo = withBase('pocadex.png');
export const faviconImage = withBase('favicon.png');
