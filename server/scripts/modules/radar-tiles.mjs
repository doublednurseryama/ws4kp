import { RADAR_FINAL_SIZE } from './radar-constants.mjs';

// Full calibrated maps already ship with the nursery plugin. Both layers use
// identical crops and document-relative URLs, including under /wp-content/.
const setTiles = ({ viewport, elemId }) => {
 const size = RADAR_FINAL_SIZE();
 for (const [className, file] of [['map-tiles', 'radar-stretched.webp'], ['overlay-tiles', 'radar-stretched-overlay.webp']]) {
  const container = document.querySelector(`#${elemId}-html .${className}`);
  for (const image of container.querySelectorAll('img')) { image.hidden = true; image.removeAttribute('src'); }
  Object.assign(container.style, {
   top: '0px', left: '0px', width: `${size.width}px`, height: `${size.height}px`,
   backgroundImage: `url("${new URL(`images/maps/${file}`, document.baseURI).href}")`,
   backgroundSize: `${6800 * size.width / viewport.width}px ${4255 * size.height / viewport.height}px`,
   backgroundPosition: `${-viewport.x * size.width / viewport.width}px ${-viewport.y * size.height / viewport.height}px`,
   backgroundRepeat: 'no-repeat',
  });
 }
};
export default setTiles;
