// Function to generate a circular icon with a specified path content
export function circleIcon(content: string) {
    // Combine the SVG content with the data URI for embedding in HTML
    return `data:image/svg+xml;utf8,` + encodeURIComponent(`<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_d)">
      <circle cx="9" cy="9" r="5" fill="#582fbe"></circle>
    </g>
  
    <path d="${content}" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
  
    <defs>
      <filter id="filter0_d" x="0" y="0" width="18" height="18" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"></feColorMatrix>
        <feOffset></feOffset>
        <feGaussianBlur stdDeviation="2"></feGaussianBlur>
        <feColorMatrix type="matrix" values="0 0 0 0 0.137674 0 0 0 0 0.190937 0 0 0 0 0.270833 0 0 0 0.15 0"></feColorMatrix>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"></feBlend>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"></feBlend>
      </filter>
    </defs>
  </svg>`)
}

// Function to generate a rectangular icon with a specified path content
export function rectIcon(content: string) {
    // Combine the SVG content with the data URI for embedding in HTML
    return `data:image/svg+xml;utf8,` + encodeURIComponent(`<svg width="10" height="10" viewBox="4 4 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${content}" stroke="#582fbe" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`)
}

// Function to create an image element with a specified source
export function makeImage(src: string) {
    const img = document.createElement('img');
    img.src = src
    return img
}

// Object containing various control icons as image elements
export const icons = {
    rotate: makeImage(circleIcon("M10.8047 11.1242L9.49934 11.1242L9.49934 9.81885M6.94856 6.72607L8.25391 6.72607L8.25391 8.03142M9.69517 6.92267C10.007 7.03301 10.2858 7.22054 10.5055 7.46776C10.7252 7.71497 10.8787 8.01382 10.9517 8.33642C11.0247 8.65902 11.0148 8.99485 10.9229 9.31258C10.831 9.63031 10.6601 9.91958 10.4262 10.1534L9.49701 11.0421M8.25792 6.72607L7.30937 7.73554C7.07543 7.96936 6.90454 8.25863 6.81264 8.57636C6.72073 8.89408 6.71081 9.22992 6.78381 9.55251C6.8568 9.87511 7.01032 10.174 7.23005 10.4212C7.44978 10.6684 7.72855 10.8559 8.04036 10.9663")),
    cross: makeImage(circleIcon("M12 12L6 6M12 12L6 6")),
    add: makeImage(circleIcon("M6 9L12 9M9 6L9 12")),
    grab: makeImage(rectIcon("M6 8L5 9L6 10 M5 9L13 9 M12 8L13 9L12 10 M8 6L9 5L10 6 M9 5L9 13 M8 12L9 13L10 12")),
}
