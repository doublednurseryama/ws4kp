/* Double D defaults run before the simulator reads its query settings. */
(() => {
	const url = new URL(window.location.href);
	const settings = {
		latLonQuery: 'Double D Nursery, Amarillo, TX',
		latLon: JSON.stringify({ lat: 35.080243, lon: -101.866682 }),
		units: 'us',
		travel: 'false',
		'current-weather': 'true',
		'local-forecast': 'true',
		'extended-forecast': 'true',
		radar: 'true',
	};
	// A shared permalink with its own location remains usable.
	const hasLocation = url.searchParams.has('latLon') || url.searchParams.has('latLonQuery');
	for (const [key, value] of Object.entries(settings)) {
		if (!url.searchParams.has(key) && !(hasLocation && key.startsWith('latLon'))) {
			url.searchParams.set(key, value);
		}
	}
	// Every page visit starts muted; the existing music button still enables audio.
	url.searchParams.set('mediaPlaying', 'false');
	window.history.replaceState(null, '', url);
	document.addEventListener('DOMContentLoaded', () => {
		for (const image of document.querySelectorAll('.header .logo img')) {
			image.src = 'https://test.covin.email/8081/wp-content/uploads/2026/09/Double-D-Nursery-Logo-Small-Transparent.png';
			image.alt = 'Double D Nursery';
		}
	});
})();
