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
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
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
        waitForDuration();
        initializeCaptions(videoId);
    } else {
        alert('有効なYouTube URLを入力してください。');
    }
});

// ---- 字幕関連 ----

async function fetchCaptionList(videoId) {
    try {
        const res = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&type=list`);
        const text = await res.text();
        const xml = new DOMParser().parseFromString(text, 'text/xml');
        const tracks = [];
        xml.querySelectorAll('track').forEach(t => {
            tracks.push({
                languageCode: t.getAttribute('lang_code'),
                languageName: t.getAttribute('lang_translated') || t.getAttribute('lang_code'),
            });
        });
        return tracks;
    } catch (e) {
        console.error('字幕リスト取得失敗:', e);
        return [];
    }
}

async function fetchCaptions(videoId, lang) {
    try {
        const res = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`);
        const text = await res.text();
        const xml = new DOMParser().parseFromString(text, 'text/xml');
        const captions = [];
        xml.querySelectorAll('text').forEach(t => {
            captions.push({
                start: parseFloat(t.getAttribute('start')),
                duration: parseFloat(t.getAttribute('dur') || '2'),
                text: t.textContent.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
            });
        });
        return captions;
    } catch (e) {
        console.error('字幕データ取得失敗:', e);
        return [];
    }
}

async function initializeCaptions(videoId) {
    const languageSelect = document.getElementById('captionLanguage');
    languageSelect.innerHTML = '';
    captionData = [];

    const tracks = await fetchCaptionList(videoId);
    if (tracks.length === 0) {
        languageSelect.innerHTML = '<option value="">字幕なし</option>';
        return;
    }

    tracks.forEach(track => {
        const option = document.createElement('option');
        option.value = track.languageCode;
        option.textContent = `${track.languageName} (${track.languageCode})`;
        languageSelect.appendChild(option);
    });

    captionData = await fetchCaptions(videoId, tracks[0].languageCode);
}

function updateCaptions() {
    if (!captionVisible || !isPlaying) return;

    const currentTime = player.getCurrentTime();
    const caption = captionData.find(c =>
        currentTime >= c.start && currentTime < c.start + c.duration
    );
    document.getElementById('captionText').textContent = caption ? caption.text : '';
    requestAnimationFrame(updateCaptions);
}

// ---- プレイヤーイベント ----

function onPlayerReady(event) {
    console.log('Player is ready');
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        document.getElementById('playPause').innerHTML = '<i class="fas fa-pause"></i> 停止';
        checkLoop();
        if (captionVisible) updateCaptions();
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
    console.log("subtitle button clicked");
    const container = document.querySelector('.caption-container');
    captionVisible = !captionVisible;
    container.style.display = captionVisible ? 'block' : 'none';
    document.getElementById('captionText').textContent = '';
    if (captionVisible && isPlaying) updateCaptions();
});

document.getElementById('captionLanguage').addEventListener('change', async (e) => {
    if (!currentVideoId || !e.target.value) return;
    captionData = await fetchCaptions(currentVideoId, e.target.value);
    document.getElementById('captionText').textContent = '';
});
