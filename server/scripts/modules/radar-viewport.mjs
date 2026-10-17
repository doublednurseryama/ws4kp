// IEM N0R's documented 6000 x 2600 EPSG:4326 grid, verified against
// https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0r_0.wld
export const N0R_WORLD_FILE = '0.01\n0\n0\n-0.01\n-126\n50';

// One geographic viewport drives the map and precipitation. Calibration comes
// from the upstream radar-stretched.webp longitude/latitude fit.
const MAP_WIDTH = 6800;
const MAP_HEIGHT = 4255;
const MAP_X_RATE = 111.407;
const MAP_Y_RATE = 145.095;
const MAP_X_ORIGIN = 14224.972;
const MAP_Y_ORIGIN = 7350.117;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export const radarViewport = (position, finalSize) => {
 const nurseryRegion = position.latitude >= 33 && position.latitude <= 37.5
  && position.longitude >= -104.5 && position.longitude <= -99;
 // Keep the complete Panhandle in view even for a Canyon forecast location.
 const latitude = nurseryRegion ? 35.5 : position.latitude;
 const longitude = nurseryRegion ? -101.8 : position.longitude;
 const scale = nurseryRegion ? 1.35 : 1;
 const width = finalSize.width * scale;
 const height = finalSize.height * scale;
 const x = clamp(MAP_X_RATE * longitude + MAP_X_ORIGIN - width / 2, 0, MAP_WIDTH - width);
 const y = clamp(MAP_Y_ORIGIN - MAP_Y_RATE * latitude - height / 2, 0, MAP_HEIGHT - height);
 return {
  x, y, width, height,
  west: (x - MAP_X_ORIGIN) / MAP_X_RATE,
  east: (x + width - MAP_X_ORIGIN) / MAP_X_RATE,
  north: (MAP_Y_ORIGIN - y) / MAP_Y_RATE,
  south: (MAP_Y_ORIGIN - y - height) / MAP_Y_RATE,
 };
};

export const radarRasterCrop = (viewport, worldFile) => {
 const values = worldFile.trim().split(/\s+/).map(Number);
 if (values.length !== 6 || !values.every(Number.isFinite)
  || values[0] <= 0 || values[3] >= 0 || values[1] !== 0 || values[2] !== 0) {
  throw new Error('Unsupported radar georeferencing; cannot align precipitation safely');
 }
 const [pixelX, , , pixelY, westCenter, northCenter] = values;
 return {
  x: (viewport.west - westCenter) / pixelX + 0.5,
  y: (viewport.north - northCenter) / pixelY + 0.5,
  width: (viewport.east - viewport.west) / pixelX,
  height: (viewport.south - viewport.north) / pixelY,
 };
};
