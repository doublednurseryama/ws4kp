const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = fs.readFileSync(process.argv[2] || 'server/scripts/nursery-defaults.js', 'utf8');
function run(href) {
    let result;
    vm.runInNewContext(code, {URL, document:{addEventListener(){}}, window:{location:{href}, history:{replaceState(_,__,url){result=url;}}}});
    return result;
}
const root = run('https://example.com/8081/wp-content/plugins/ddn-weather/weatherstar/index.html');
assert.equal(root.searchParams.get('units'), 'us');
assert.equal(root.searchParams.get('mediaPlaying'), 'false');
assert.equal(JSON.parse(root.searchParams.get('latLon')).lat,35.080243);
const custom = run('https://example.com/index.html?latLonQuery=Denver&units=si&mediaPlaying=true');
assert.equal(custom.searchParams.get('latLonQuery'), 'Denver');
assert.equal(custom.searchParams.has('latLon'),false);
assert.equal(custom.searchParams.get('units'), 'si');
assert.equal(custom.searchParams.get('mediaPlaying'), 'false');
const loaderPath = new URL('data/stations.json', root.href);
assert.equal(loaderPath.pathname,'/8081/wp-content/plugins/ddn-weather/weatherstar/data/stations.json');
console.log('Location, permalink, muted startup, and subdirectory checks passed');
