import { text } from './utils/fetch.mjs';
import Setting from './utils/setting.mjs';
import { registerHiddenSetting } from './share.mjs';

let playlist;
let currentTrack = 0;
let player;
let sliderTimeout = null;
let volumeSlider = null;
let volumeSliderInput = null;
let soundButton;
let soundVolume;
let soundStatus;

const mediaPlaying = new Setting('mediaPlaying', {
	name: 'Media Playing',
	type: 'boolean',
	defaultValue: false,
	sticky: true,
});

document.addEventListener('DOMContentLoaded', () => {
	// add the event handler to the page
	document.getElementById('ToggleMedia').addEventListener('click', handleClick);
	// get the slider elements
	volumeSlider = document.querySelector('#ToggleMediaContainer .volume-slider');
	volumeSliderInput = volumeSlider.querySelector('input');

	// catch interactions with the volume slider (timeout handler)
	// called on any interaction via 'input' (vs change) for immediate volume response
	volumeSlider.addEventListener('input', setSliderTimeout);
	volumeSlider.addEventListener('input', sliderChanged);

	// add listener for mute (pause) button under the volume slider
	volumeSlider.querySelector('img').addEventListener('click', stopMedia);

	// Accessible sound controls remain visible in kiosk and fullscreen modes.
	const controls = document.createElement('div');
	controls.className = 'ddn-audio-controls';
	controls.innerHTML = '<button type="button" id="ddn-sound-toggle" disabled aria-pressed="false">Turn sound on</button><label>Volume <input id="ddn-sound-volume" type="range" min="1" max="100" value="75"></label><span id="ddn-sound-status" role="status">Loading music…</span>';
	document.getElementById('divTwc').append(controls);
	soundButton = document.getElementById('ddn-sound-toggle');
	soundVolume = document.getElementById('ddn-sound-volume');
	soundStatus = document.getElementById('ddn-sound-status');
	soundVolume.value = Math.round(mediaVolume.value * 100);
	soundButton.addEventListener('click', () => {
		mediaPlaying.value = !mediaPlaying.value;
		stateChanged();
	});
	soundVolume.addEventListener('input', () => {
		mediaVolume.value = Number(soundVolume.value) / 100;
		volumeSliderInput.value = soundVolume.value;
	});
	window.dispatchEvent(new Event('resize'));
	// get the playlist
	getMedia();
});

const scanMusicDirectory = async () => {
	const parseDirectory = async (path, prefix = '') => {
		const listing = await text(path);
		const matches = [...listing.matchAll(/href="([^"]+\.mp3)"/gi)];
		return matches.map((m) => `${prefix}${m[1]}`);
	};

	try {
		let files = await parseDirectory('music/');
		if (files.length === 0) {
			files = await parseDirectory('music/default/', 'default/');
		}
		return { availableFiles: files };
	} catch (e) {
		console.error('Unable to scan music directory');
		console.error(e);
		return { availableFiles: [] };
	}
};

const getMedia = async () => {
	let playlistSource = '';

	try {
		const response = await fetch('playlist.json');
		if (response.ok) {
			playlist = await response.json();
			playlistSource = 'from server';
		} else if (response.status === 404 && response.headers.get('X-Weatherstar') === 'true') {
			// Expected behavior in static deployment mode
			playlist = await scanMusicDirectory();
			playlistSource = 'via directory scan (static deployment)';
		} else {
			playlist = { availableFiles: [] };
			playlistSource = `failed (${response.status} ${response.statusText})`;
		}
	} catch (_e) {
		// Network error or other fetch failure - fall back to directory scanning
		playlist = await scanMusicDirectory();
		playlistSource = 'via directory scan (after fetch failed)';
	}

	const fileCount = playlist?.availableFiles?.length || 0;
	if (fileCount > 0) {
		console.log(`Loaded playlist ${playlistSource} - found ${fileCount} music file${fileCount === 1 ? '' : 's'}`);
	} else {
		console.log(`No music files found ${playlistSource}`);
	}

	await configureNurseryPlaylists();
	enableMediaPlayer();
};

// Staff chooses one active site playlist; visitors only control mute/volume.
const configureNurseryPlaylists = async () => {
 const endpoint = new URLSearchParams(window.location.search).get('ddn_music');
 if (!endpoint) return;
 try {
  const url = new URL(endpoint, window.location.href);
  if (url.origin !== window.location.origin) return;
  const response = await fetch(url.href, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) return;
  const config = await response.json();
  if (config.useBuiltin === true) return;
  if (!Array.isArray(config.availableFiles)) return;
  const tracks = config.availableFiles.filter((track) => {
   try { const audio = new URL(track); return audio.origin === window.location.origin && ['http:', 'https:'].includes(audio.protocol); } catch (_error) { return false; }
  });
  playlist = { availableFiles: tracks };
 } catch (_error) { /* Retain the built-in collection on configuration failure. */ }
};

const enableMediaPlayer = () => {
	// see if files are available
	if (playlist?.availableFiles?.length > 0) {
		if (soundButton) soundButton.disabled = false;
		if (soundStatus) soundStatus.textContent = 'Sound is off';
		// randomize the list
		randomizePlaylist();
		// enable the icon
		const icon = document.getElementById('ToggleMediaContainer');
		icon.classList.add('available');
		// set the button type
		setIcon();
		// if we're already playing (sticky option) then try to start playing
		if (mediaPlaying.value === true) {
			startMedia();
		}
	} else if (soundStatus) { soundStatus.textContent = 'No music in the active playlist'; }
};

const setIcon = () => {
	if (soundButton) {
		soundButton.textContent = mediaPlaying.value ? 'Mute sound' : 'Turn sound on';
		soundButton.setAttribute('aria-pressed', String(mediaPlaying.value));
	}
	if (soundStatus) soundStatus.textContent = mediaPlaying.value ? 'Starting music…' : 'Sound is off';
	// get the icon
	const icon = document.getElementById('ToggleMediaContainer');
	if (mediaPlaying.value === true) {
		icon.classList.add('playing');
	} else {
		icon.classList.remove('playing');
	}
};

const handleClick = () => {
	// if media is off, start it
	if (mediaPlaying.value === false) {
		mediaPlaying.value = true;
	}

	if (mediaPlaying.value === true && !volumeSlider.classList.contains('show')) {
		// if media is playing and the slider isn't open, open it
		showVolumeSlider();
	} else {
		// hide the volume slider
		hideVolumeSlider();
	}

	// handle the state change
	stateChanged();
};

// set a timeout for the volume slider (called by interactions with the slider)
const setSliderTimeout = () => {
	// clear existing timeout
	if (sliderTimeout) clearTimeout(sliderTimeout);
	// set a new timeout
	sliderTimeout = setTimeout(hideVolumeSlider, 5000);
};

// show the volume slider and configure a timeout
const showVolumeSlider = () => {
	setSliderTimeout();

	// show the slider
	if (volumeSlider) {
		volumeSlider.classList.add('show');
	}
};

// hide the volume slider and clean up the timeout
const hideVolumeSlider = () => {
	// clear the timeout handler
	if (sliderTimeout) clearTimeout(sliderTimeout);
	sliderTimeout = null;

	// hide the element
	if (volumeSlider) {
		volumeSlider.classList.remove('show');
	}
};

const startMedia = async () => {
	try {
		if (!player) initializePlayer();
		// Call play during the button gesture, including the first click.
		await player.play();
		if (!mediaPlaying.value) { player.pause(); return; }
		setTrackName(playlist.availableFiles[currentTrack]);
		if (soundStatus) soundStatus.textContent = 'Music playing';
	} catch (e) {
		console.error("Couldn't play music", e);
		mediaPlaying.value = false;
		setIcon();
		setTrackName('Not playing');
		if (soundStatus) soundStatus.textContent = 'Unable to play music. Press Turn sound on to retry.';
	}
};

const stopMedia = () => {
	hideVolumeSlider();
	if (player) player.pause();
	mediaPlaying.value = false;
	setTrackName('Not playing');
	setIcon();
};

const stateChanged = () => {
	// update the icon
	setIcon();
	// react to the new state
	if (mediaPlaying.value) {
		startMedia();
	} else {
		stopMedia();
	}
};

const randomizePlaylist = () => {
	let availableFiles = [...playlist.availableFiles];
	const randomPlaylist = [];
	while (availableFiles.length > 0) {
		// get a randon item from the available files
		const i = Math.floor(Math.random() * availableFiles.length);
		// add it to the final list
		randomPlaylist.push(availableFiles[i]);
		// remove the file from the available files
		availableFiles = availableFiles.filter((file, index) => index !== i);
	}
	playlist.availableFiles = randomPlaylist;
};

const setVolume = (newVolume) => {
	if (soundVolume) soundVolume.value = Math.round(newVolume * 100);
	if (player) {
		player.volume = newVolume;
	}
};

const sliderChanged = () => {
	// get the value of the slider
	if (volumeSlider) {
		const newValue = volumeSliderInput.value;
		const cleanValue = parseFloat(newValue) / 100;
		setVolume(cleanValue);
		mediaVolume.value = cleanValue;
	}
};

const mediaVolume = new Setting('mediaVolume', {
	name: 'Volume',
	type: 'select',
	defaultValue: 0.75,
	values: [
		[1, '100%'],
		[0.75, '75%'],
		[0.50, '50%'],
		[0.25, '25%'],
	],
	changeAction: setVolume,
	visible: false,
});

registerHiddenSetting('mediaVolume', mediaVolume);

const initializePlayer = () => {
	// basic sanity checks
	if (!playlist.availableFiles || playlist?.availableFiles.length === 0) {
		throw new Error('No playlist available');
	}
	if (player) {
		return;
	}
	// create the player
	player = new Audio();

	// reset the playlist index
	currentTrack = 0;

	// add event handlers
	player.addEventListener('canplay', playerCanPlay);
	player.addEventListener('ended', playerEnded);

	// get the first file
	player.src = musicSource(playlist.availableFiles[currentTrack]);
	setTrackName(playlist.availableFiles[currentTrack]);
	player.type = 'audio/mpeg';
	// set volume and slider indicator
	setVolume(mediaVolume.value);
	volumeSliderInput.value = Math.round(mediaVolume.value * 100);
};

const playerCanPlay = async () => {
	// check to make sure they user still wants music (protect against slow loading music)
	if (!mediaPlaying.value) return;
	// start playing
	startMedia();
};

const playerEnded = () => {
	// next track
	currentTrack += 1;
	// roll over and re-randomize the tracks
	if (currentTrack >= playlist.availableFiles.length) {
		randomizePlaylist();
		currentTrack = 0;
	}
	// update the player source
	player.src = musicSource(playlist.availableFiles[currentTrack]);
	setTrackName(playlist.availableFiles[currentTrack]);
};

const musicSource = (fileName) => (/^https?:\/\//i.test(fileName) ? fileName : `music/${fileName}`);

const setTrackName = (fileName) => {
	const baseName = fileName.split('/').pop();
	const trackName = decodeURIComponent(
		baseName.replace(/\.mp3/gi, '').replace(/(_-)/gi, ''),
	);
	document.getElementById('musicTrack').textContent = trackName;
};

export {
	// eslint-disable-next-line import/prefer-default-export
	handleClick,
};

