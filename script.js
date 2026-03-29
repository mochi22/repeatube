console.log('script.js loaded');
document.getElementById('footerYear').textContent = new Date().getFullYear();

let player;
let pointA = null;
let pointB = null;
let isLooping = false;
let isPlaying = false;
let captionData = [];
let captionVisible = false;
let currentVideoId = null;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '360',
        width: '640',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'origin': window.location.origin,
            'enablejsapi': 1,
            'cc_load_policy': 0,
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onApiChange': onApiChange,
            'onPlaybackRateChange': onPlaybackRateChange,
        }
    });
}

function extractVideoID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

document.getElementById('loadButton').addEventListener('click', () => {
    const url = document.getElementById('videoUrl').value;
    const videoId = extractVideoID(url);
    if (videoId) {
        currentVideoId = videoId;
        player.loadVideoById(videoId);
        currentSpeed = 1;
        document.getElementById('speedDisplay').textContent = '1.00x';
        waitForDuration();
    } else {
        alert('有効なYouTube URLを入力してください。');
    }
});

// ---- 字幕関連 ----

function onApiChange() {
    const tracks = player.getOption('captions', 'tracklist');
    const languageSelect = document.getElementById('captionLanguage');
    languageSelect.innerHTML = '';

    if (!tracks || tracks.length === 0) {
        languageSelect.innerHTML = '<option value="">字幕なし</option>';
        return;
    }

    tracks.forEach(track => {
        const option = document.createElement('option');
        option.value = track.languageCode;
        option.textContent = `${track.languageName} (${track.languageCode})`;
        languageSelect.appendChild(option);
    });
}

function initializeCaptions() {
    // ネイティブ字幕はonApiChangeで初期化されるため不要
}

// ---- プレイヤーイベント ----

function onPlayerReady(event) {
    console.log('Player is ready');
}

function onPlaybackRateChange(event) {
    currentSpeed = event.data;
    document.getElementById('speedDisplay').textContent = currentSpeed.toFixed(2) + 'x';
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        document.getElementById('playPause').innerHTML = '<i class="fas fa-pause"></i> 停止';
        checkLoop();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        document.getElementById('playPause').innerHTML = '<i class="fas fa-play"></i> 再生';
    }
}

// ---- スライダー ----

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + s.toString().padStart(2, '0');
}

function updateSliderFill() {
    const sliderA = document.getElementById('sliderA');
    const sliderB = document.getElementById('sliderB');
    const fill = document.getElementById('sliderRangeFill');
    const max = parseFloat(sliderA.max) || 100;
    const aPercent = (parseFloat(sliderA.value) / max) * 100;
    const bPercent = (parseFloat(sliderB.value) / max) * 100;
    fill.style.left = aPercent + '%';
    fill.style.width = (bPercent - aPercent) + '%';
    if (bPercent - aPercent < 5) {
        sliderA.style.zIndex = 3;
        sliderB.style.zIndex = 2;
    } else {
        sliderA.style.zIndex = 1;
        sliderB.style.zIndex = 2;
    }
}

function initSliders() {
    const duration = player.getDuration();
    const sliderA = document.getElementById('sliderA');
    const sliderB = document.getElementById('sliderB');
    sliderA.max = duration;
    sliderB.max = duration;
    sliderA.value = 0;
    sliderB.value = duration;
    document.getElementById('sliderALabel').textContent = formatTime(0);
    document.getElementById('sliderBLabel').textContent = formatTime(duration);
    updateSliderFill();
}

function waitForDuration() {
    if (!player || typeof player.getDuration !== 'function') {
        setTimeout(waitForDuration, 500);
        return;
    }
    const duration = player.getDuration();
    if (duration > 0) {
        initSliders();
    } else {
        setTimeout(waitForDuration, 500);
    }
}

document.getElementById('sliderA').addEventListener('input', () => {
    const sliderA = document.getElementById('sliderA');
    const sliderB = document.getElementById('sliderB');
    if (parseFloat(sliderA.value) >= parseFloat(sliderB.value)) {
        sliderA.value = parseFloat(sliderB.value) - 0.1;
    }
    pointA = parseFloat(sliderA.value);
    document.getElementById('pointA').textContent = pointA.toFixed(2) + '秒';
    document.getElementById('sliderALabel').textContent = formatTime(pointA);
    updateSliderFill();
});

document.getElementById('sliderB').addEventListener('input', () => {
    const sliderA = document.getElementById('sliderA');
    const sliderB = document.getElementById('sliderB');
    if (parseFloat(sliderB.value) <= parseFloat(sliderA.value)) {
        sliderB.value = parseFloat(sliderA.value) + 0.1;
    }
    pointB = parseFloat(sliderB.value);
    document.getElementById('pointB').textContent = pointB.toFixed(2) + '秒';
    document.getElementById('sliderBLabel').textContent = formatTime(pointB);
    updateSliderFill();
});

// ---- A/B点 ----

document.getElementById('setPointA').addEventListener('click', () => {
    pointA = player.getCurrentTime();
    document.getElementById('pointA').textContent = pointA.toFixed(2) + '秒';
    document.getElementById('sliderA').value = pointA;
    document.getElementById('sliderALabel').textContent = formatTime(pointA);
    updateSliderFill();
});

document.getElementById('setPointB').addEventListener('click', () => {
    pointB = player.getCurrentTime();
    document.getElementById('pointB').textContent = pointB.toFixed(2) + '秒';
    document.getElementById('sliderB').value = pointB;
    document.getElementById('sliderBLabel').textContent = formatTime(pointB);
    updateSliderFill();
});

document.getElementById('startLoop').addEventListener('click', () => {
    if (pointA !== null && pointB !== null && pointA < pointB) {
        isLooping = true;
        player.seekTo(pointA);
        player.playVideo();
    } else {
        alert('有効なA点とB点を設定してください。');
    }
});

document.getElementById('stopLoop').addEventListener('click', () => {
    isLooping = false;
});

function checkLoop() {
    if (isLooping && player.getCurrentTime() >= pointB) {
        player.seekTo(pointA);
    }
    if (isPlaying) {
        setTimeout(checkLoop, 100);
    }
}

// ---- 再生速度 ----

let currentSpeed = 1.0;

function stepSpeed(direction) {
    const supported = player.getAvailablePlaybackRates();
    const current = player.getPlaybackRate();
    const idx = supported.indexOf(current);
    if (idx === -1) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= supported.length) return;
    player.setPlaybackRate(supported[nextIdx]);
    // 表示はonPlaybackRateChangeで更新される
}

document.getElementById('speedDown').addEventListener('click', () => stepSpeed(-1));
document.getElementById('speedUp').addEventListener('click', () => stepSpeed(1));

// ---- 再生コントロール ----

document.getElementById('playPause').addEventListener('click', () => {
    if (isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
});

document.getElementById('rewind5').addEventListener('click', () => {
    player.seekTo(Math.max(0, player.getCurrentTime() - 5), true);
});

document.getElementById('forward5').addEventListener('click', () => {
    player.seekTo(player.getCurrentTime() + 5, true);
});

// ---- 字幕コントロール ----

document.getElementById('toggleCaption').addEventListener('click', () => {
    captionVisible = !captionVisible;
    if (captionVisible) {
        player.loadModule('captions');
        const lang = document.getElementById('captionLanguage').value;
        if (lang) player.setOption('captions', 'track', { languageCode: lang });
    } else {
        player.unloadModule('captions');
    }
    document.getElementById('toggleCaption').textContent =
        captionVisible ? 'Hide subtitles' : 'Display subtitle';
});

document.getElementById('captionLanguage').addEventListener('change', (e) => {
    if (!e.target.value) return;
    player.setOption('captions', 'track', { languageCode: e.target.value });
});
