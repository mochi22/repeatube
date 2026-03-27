let player;
let pointA = null;
let pointB = null;
let isLooping = false;
let isPlaying = false;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '360',
        width: '640',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'cc_load_policy': 1,
            'cc_lang_pref': 'en',
            'origin': window.location.origin,  // この行を追加
            'enablejsapi': 1,                 // この行を追加
            'widget_referrer': window.location.href,  // この行を追加
            'cors': 'anonymous'
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onApiChange': onApiChange
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
        player.loadVideoById(videoId);
        setTimeout(initializeCaptions, 1000);
    } else {
        alert('有効なYouTube URLを入力してください。');
    }
});

function onPlayerReady(event) {
    console.log('Player is ready');
    
    // 字幕の初期化を試みる
    let attempts = 0;
    const maxAttempts = 5;
    
    function tryInitializeCaptions() {
        if (attempts >= maxAttempts) {
            console.error('Failed to initialize captions after multiple attempts');
            return;
        }
        
        try {
            initializeCaptions();
            if (!player.getOptions('captions')) {
                attempts++;
                setTimeout(tryInitializeCaptions, 1000);
            }
        } catch (error) {
            console.error('Error in caption initialization:', error);
            attempts++;
            setTimeout(tryInitializeCaptions, 1000);
        }
    }
    
    tryInitializeCaptions();
}


function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        document.getElementById('playPause').innerHTML = '<i class="fas fa-pause"></i> 停止';
        checkLoop();
        updateCaptions();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        document.getElementById('playPause').innerHTML = '<i class="fas fa-play"></i> 再生';
    }
}

function onApiChange() {
    console.log('API changed');
    initializeCaptions();
}

function initializeCaptions() {
    try {
        const tracks = player.getOptions('captions');
        if (!tracks) {
            console.log('Captions not available yet');
            return;
        }

        const trackList = player.getOption('captions', 'tracklist');
        const languageSelect = document.getElementById('captionLanguage');
        languageSelect.innerHTML = '';
        
        if (trackList && trackList.length > 0) {
            trackList.forEach(track => {
                const option = document.createElement('option');
                option.value = track.languageCode;
                option.textContent = `${track.languageName} (${track.languageCode})`;
                languageSelect.appendChild(option);
            });
            
            // デフォルトで英語の字幕を選択
            player.setOption('captions', 'track', {'languageCode': 'en'});
            document.querySelector('.caption-container').style.display = 'block';
        }
    } catch (error) {
        console.error('Caption initialization error:', error);
    }
}

function updateCaptions() {
    if (!player || !player.getOptions || !player.getOptions('captions')) {
        return;
    }

    try {
        const currentTime = player.getCurrentTime();
        const captions = player.getOption('captions', 'tracklist');
        
        if (captions) {
            // 現在の時間に対応する字幕を表示
            const currentCaption = captions.find(caption => 
                currentTime >= caption.start && currentTime <= caption.end
            );
            
            if (currentCaption) {
                document.getElementById('captionText').textContent = currentCaption.text;
            }
        }
        
        if (isPlaying) {
            requestAnimationFrame(updateCaptions);
        }
    } catch (error) {
        console.error('Error updating captions:', error);
    }
}


document.getElementById('setPointA').addEventListener('click', () => {
    pointA = player.getCurrentTime();
    document.getElementById('pointA').textContent = pointA.toFixed(2) + '秒';
});

document.getElementById('setPointB').addEventListener('click', () => {
    pointB = player.getCurrentTime();
    document.getElementById('pointB').textContent = pointB.toFixed(2) + '秒';
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

document.getElementById('playPause').addEventListener('click', () => {
    if (isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
});

document.getElementById('rewind5').addEventListener('click', () => {
    const currentTime = player.getCurrentTime();
    player.seekTo(Math.max(0, currentTime - 5), true);
});

document.getElementById('forward5').addEventListener('click', () => {
    const currentTime = player.getCurrentTime();
    player.seekTo(currentTime + 5, true);
});

document.getElementById('toggleCaption').addEventListener('click', () => {
    const container = document.querySelector('.caption-container');
    if (container.style.display === 'none' || !container.style.display) {
        container.style.display = 'block';
        player.loadModule('captions');
    } else {
        container.style.display = 'none';
        player.unloadModule('captions');
    }
});

document.getElementById('captionLanguage').addEventListener('change', (e) => {
    try {
        player.setOption('captions', 'track', {
            'languageCode': e.target.value
        });
        
        // 字幕の表示を強制的に有効化
        player.setOption('captions', 'reload', true);
    } catch (error) {
        console.error('Error changing caption language:', error);
    }
});


function checkPlayerReady() {
    if (!player || typeof player.getOptions !== 'function') {
        console.error('Player not properly initialized');
        return false;
    }
    return true;
}