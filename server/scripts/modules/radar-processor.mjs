import { removeDopplerRadarImageNoise } from './radar-utils.mjs';
import { RADAR_FINAL_SIZE } from './radar-constants.mjs';
import { radarRasterCrop, N0R_WORLD_FILE } from './radar-viewport.mjs';

const processRadar = async ({ url, RADAR_HOST, OVERRIDES, viewport }) => {
 const imageUrl = OVERRIDES.RADAR_HOST ? url.replace(RADAR_HOST, OVERRIDES.RADAR_HOST) : url;
 const response = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
 if (!response.ok) throw new Error('Radar image unavailable');
 const crop = radarRasterCrop(viewport, N0R_WORLD_FILE);
 const bitmap = await createImageBitmap(await response.blob());
 try {
  if (bitmap.width !== 6000 || bitmap.height !== 2600) throw new Error('Radar grid changed; cannot align precipitation safely');
  const size = RADAR_FINAL_SIZE();
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingEnabled = false;
  // Crop the original provider pixels directly, using the verified N0R world file.
  context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, size.width, size.height);
  removeDopplerRadarImageNoise(context);
  return canvas.toDataURL();
 } finally { bitmap.close(); }
};
export default processRadar;
