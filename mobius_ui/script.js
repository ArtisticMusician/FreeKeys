// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
    initTracks();
    setupEventListeners();
});

// Initialize the 8 tracks
function initTracks() {
    const container = document.getElementById("tracks-container");
    const mixerContainer = document.getElementById("mixer-channels");
    container.innerHTML = "";
    mixerContainer.innerHTML = "";

    for (let i = 1; i <= 8; i++) {
        const trackHtml = `
            <div class="track" id="track-${i}">
                <div class="track-header">
                    <div class="track-info">
                        <span class="track-number">${i}</span>
                        <span class="track-name">Track ${i}</span>
                    </div>
                    <div class="track-controls">
                        <button class="track-btn mute-btn" data-track="${i}">M</button>
                        <button class="track-btn solo-btn" data-track="${i}">S</button>
                        <button class="track-btn enlarge-btn" data-track="${i}">↕</button>
                    </div>
                    <div class="signal-meter">
                        <div class="signal-level" style="width: ${Math.random() * 80 + 10}%;"></div>
                    </div>
                </div>
                <div class="track-timeline">
                    <!-- Mock loop blocks -->
                    <div class="loop-block" style="left: 10%; width: 20%;"></div>
                    <div class="loop-block" style="left: 40%; width: 30%;"></div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', trackHtml);

        const channelHtml = `
            <div class="channel-strip" id="channel-${i}">
                <span class="channel-label">TRK ${i}</span>
                <div class="pan-knob" style="transform: rotate(${(Math.random() * 60) - 30}deg);"></div>
                <div class="track-controls">
                    <button class="track-btn mute-btn" data-track="${i}">M</button>
                    <button class="track-btn solo-btn" data-track="${i}">S</button>
                </div>
                <div class="fader-area">
                    <div class="fader-track">
                        <div class="fader-cap" style="bottom: ${Math.random() * 60 + 20}%;"></div>
                    </div>
                    <div class="mixer-signal-meter">
                        <div class="mixer-signal-level" style="height: ${Math.random() * 80 + 10}%;"></div>
                    </div>
                </div>
            </div>
        `;
        mixerContainer.insertAdjacentHTML('beforeend', channelHtml);
    }
}

// Setup Event Listeners for UI Interactions
function setupEventListeners() {
    // Swap Header/Footer Logic
    const swapLayoutBtn = document.getElementById("swap-layout-btn");
    const appHeader = document.getElementById("app-header");
    const appFooter = document.getElementById("app-footer");
    let isSwapped = false;

    swapLayoutBtn.addEventListener("click", () => {
        isSwapped = !isSwapped;
        if (isSwapped) {
            appHeader.style.order = "3";
            appFooter.style.order = "1";
        } else {
            appHeader.style.order = "1";
            appFooter.style.order = "3";
        }
    });

    // Time / Bars Toggle Logic
    const toggleTimeBtn = document.getElementById("toggle-time-btn");
    const timeDisplay = document.getElementById("time-display");
    let isTimeMode = true;

    toggleTimeBtn.addEventListener("click", () => {
        isTimeMode = !isTimeMode;
        if (isTimeMode) {
            timeDisplay.innerText = "00:00:00";
        } else {
            timeDisplay.innerText = "001:01:000"; // Bars:Beats:Ticks
        }
    });

    // Mixer Toggle Logic
    const toggleMixerBtn = document.getElementById("toggle-mixer-btn");
    const closeMixerBtn = document.getElementById("close-mixer-btn");
    const mixerPanel = document.getElementById("mixer-panel");

    const toggleMixer = () => mixerPanel.classList.toggle("hidden");

    toggleMixerBtn.addEventListener("click", toggleMixer);
    closeMixerBtn.addEventListener("click", toggleMixer);

    // Mute/Solo/Enlarge logic (event delegation on document to catch all dynamically generated buttons)
    document.addEventListener("click", (e) => {
        // Enlarge Track
        if (e.target.classList.contains("enlarge-btn")) {
            const trackId = e.target.getAttribute("data-track");
            const trackElem = document.getElementById(`track-${trackId}`);
            if (trackElem) {
                trackElem.classList.toggle("enlarged");
                e.target.classList.toggle("active");
            }
        }

        // Mute / Solo logic (applies to both main track and mixer)
        if (e.target.classList.contains("mute-btn") || e.target.classList.contains("solo-btn")) {
            e.target.classList.toggle("active");

            // To be thorough, keep track and mixer states synced visually
            const isMute = e.target.classList.contains("mute-btn");
            const trackId = e.target.getAttribute("data-track");
            const btnTypeClass = isMute ? ".mute-btn" : ".solo-btn";

            const trackBtn = document.querySelector(`#track-${trackId} ${btnTypeClass}`);
            const mixerBtn = document.querySelector(`#channel-${trackId} ${btnTypeClass}`);

            const isActive = e.target.classList.contains("active");
            if (trackBtn) isActive ? trackBtn.classList.add("active") : trackBtn.classList.remove("active");
            if (mixerBtn) isActive ? mixerBtn.classList.add("active") : mixerBtn.classList.remove("active");
        }
    });
}
