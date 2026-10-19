// peacock.js
let done = false;

export const featherSvg = cls =>
  `<svg class="${cls}" viewBox="0 0 280 560" aria-hidden="true" focusable="false" style="overflow: visible;">
    <!-- x and y control position, width and height control scale -->
    <image href="/assets/feather.png" x="-80" y="-220" width="440" height="880" preserveAspectRatio="xMidYMid meet" />
  </svg>`;

export function injectFeather() {
  if (done) return; 
  done = true;
}