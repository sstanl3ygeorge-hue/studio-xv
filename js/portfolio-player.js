// LOCKED: Legacy production component. Do not modify
// Portfolio waveform and playback logic for Studio XV
// Requires: WaveSurfer v7 loaded before this script

document.addEventListener('DOMContentLoaded', function () {
  if (typeof WaveSurfer === 'undefined') return;
  var players = [];
  var waveformEls = document.querySelectorAll('.waveform-player');

  waveformEls.forEach(function (playerEl, idx) {
    var waveformEl = playerEl.querySelector('.waveform');
    var playBtn = playerEl.querySelector('.play-btn');
    var beforeBtn = playerEl.querySelector('.ab-btn[data-mode="before"]');
    var afterBtn = playerEl.querySelector('.ab-btn[data-mode="after"]');
    var srcAfter = playerEl.getAttribute('data-after');
    var srcBefore = playerEl.getAttribute('data-before');
    var currentMode = playerEl.getAttribute('data-current') || 'after';

    var ws = WaveSurfer.create({
      container: waveformEl,
      waveColor: getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim() || '#666',
      progressColor: '#f97316',
      cursorColor: '#f97316',
      height: 80,
      barWidth: 2,
      barGap: 2,
      responsive: true,
    });

    function loadTrack(mode, time) {
      var src = (mode === 'before' && srcBefore) ? srcBefore : srcAfter;
      ws.load(src);
      ws.once('ready', function () {
        if (typeof time === 'number') ws.setTime(time);
      });
      playerEl.setAttribute('data-current', mode);
      if (beforeBtn && afterBtn) {
        beforeBtn.classList.toggle('active', mode === 'before');
        afterBtn.classList.toggle('active', mode === 'after');
      }
    }

    // Initial load
    loadTrack(currentMode);

    // Play/pause logic
    playBtn.addEventListener('click', function () {
      // Pause all other players
      players.forEach(function (other) {
        if (other !== ws) other.pause();
      });
      ws.playPause();
    });

    ws.on('play', function () {
      playBtn.textContent = 'Pause';
      playerEl.classList.add('playing');
    });
    ws.on('pause', function () {
      playBtn.textContent = 'Play';
      playerEl.classList.remove('playing');
    });
    ws.on('finish', function () {
      playBtn.textContent = 'Play';
      playerEl.classList.remove('playing');
    });

    // Before/after toggle
    if (beforeBtn && afterBtn) {
      function toggleMode(targetMode) {
        if (playerEl.getAttribute('data-current') === targetMode) return;
        var wasPlaying = ws.isPlaying();
        var time = ws.getCurrentTime();
        loadTrack(targetMode, time);
        ws.once('ready', function () {
          if (wasPlaying) ws.play();
        });
      }
      beforeBtn.addEventListener('click', function () { toggleMode('before'); });
      afterBtn.addEventListener('click', function () { toggleMode('after'); });
    }

    players.push(ws);
  });

  // Enforce single audio playback
  document.addEventListener('play', function (e) {
    if (e.target.tagName === 'AUDIO') {
      document.querySelectorAll('audio').forEach(function (audio) {
        if (audio !== e.target) audio.pause();
      });
    }
  }, true);
});
