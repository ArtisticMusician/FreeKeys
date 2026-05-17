document.addEventListener("DOMContentLoaded", () => {
    initTracksAndMixer();
    initTimelineRuler();
    setupEventListeners();
});

function initTracksAndMixer() {
    const tracksContainer = document.getElementById("tracks-container");
    const mixerContainer = document.getElementById("mixer-channels");
    tracksContainer.innerHTML = "";
    mixerContainer.innerHTML = "";

    const trackColors = ['#cc0000', '#aa0000', '#880000', '#660000', '#440000', '#cc3333', '#aa3333', '#883333'];

    for (let i = 1; i <= 8; i++) {
        const color = trackColors[i-1];

        // --- Generate Track ---
        const trackHtml = `
            <div class="track" id="track-${i}">
                <div class="track-header">
                    <div class="track-row-top">
                        <div style="display: flex; align-items: center;">
                            <input type="color" class="track-color-picker" value="${color}" title="Track Color">
                            <input type="text" class="track-name-input" value="Track ${i}">
                        </div>
                        <div class="track-controls-small">
                            <button class="track-btn mute-btn" data-track="${i}" title="Mute">M</button>
                            <button class="track-btn solo-btn" data-track="${i}" title="Solo">S</button>
                        </div>
                    </div>
                    <div class="signal-meter">
                        <div class="signal-level" style="width: ${Math.random() * 80 + 10}%; background-color: ${color}"></div>
                    </div>
                    <div class="track-row-bottom">
                        <div class="track-controls-small">
                            <button class="track-btn fx-btn" title="FX Chain">FX</button>
                            <button class="track-btn auto-btn" title="Automation Lane">~</button>
                        </div>
                        <button class="track-btn enlarge-btn" data-track="${i}" title="Enlarge Track">↕</button>
                    </div>
                </div>
                <div class="track-timeline">
                    <!-- Mock loop clips -->
                    <div class="clip-block" style="left: ${Math.random() * 200 + 50}px; width: ${Math.random() * 150 + 100}px; background-color: ${color}44; border-color: ${color}">
                        <div class="clip-header" style="background-color: ${color}">Loop_${i}_A</div>
                        <div class="clip-waveform"></div>
                    </div>
                    ${Math.random() > 0.5 ? `
                    <div class="clip-block" style="left: ${Math.random() * 300 + 400}px; width: ${Math.random() * 200 + 50}px; background-color: ${color}44; border-color: ${color}">
                        <div class="clip-header" style="background-color: ${color}">Loop_${i}_B</div>
                        <div class="clip-waveform"></div>
                    </div>` : ''}
                </div>
            </div>
        `;
        tracksContainer.insertAdjacentHTML('beforeend', trackHtml);

        // --- Generate Mixer Channel ---
        const channelHtml = `
            <div class="channel-strip" id="channel-${i}">
                <div class="channel-fx-slots">
                    <div class="fx-slot active">EQ</div>
                    <div class="fx-slot ${Math.random() > 0.5 ? 'active' : ''}">Comp</div>
                    <div class="fx-slot"></div>
                    <div class="fx-slot"></div>
                </div>
                <div class="pan-knob" style="transform: rotate(${(Math.random() * 60) - 30}deg);" title="Pan"></div>
                <div class="track-controls-small" style="margin-bottom: 5px;">
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
                <input type="text" class="channel-label" value="TRK ${i}">
            </div>
        `;
        mixerContainer.insertAdjacentHTML('beforeend', channelHtml);
    }

    // --- Generate Master Bus ---
    const masterHtml = `
        <div class="channel-strip master-bus" id="channel-master">
            <div class="channel-fx-slots">
                <div class="fx-slot active">Limiter</div>
                <div class="fx-slot"></div>
                <div class="fx-slot"></div>
                <div class="fx-slot"></div>
            </div>
            <div style="height: 34px;"></div> <!-- Spacer for pan/mute/solo -->
            <div class="fader-area">
                <div class="fader-track">
                    <div class="fader-cap" style="bottom: 80%;"></div>
                </div>
                <div class="mixer-signal-meter">
                    <div class="mixer-signal-level" style="height: 75%;"></div>
                </div>
                <div class="mixer-signal-meter">
                    <div class="mixer-signal-level" style="height: 80%;"></div>
                </div>
            </div>
            <div class="channel-label" style="color: var(--accent-red-bright);">MASTER</div>
        </div>
    `;
    mixerContainer.insertAdjacentHTML('beforeend', masterHtml);
}

function initTimelineRuler() {
    const rulerContent = document.getElementById("ruler-content");
    let html = '';

    // Create Tag Markers
    html += `<div style="position:absolute; left: 50px; top: 0; background: #333; font-size: 9px; padding: 1px 4px; border-radius: 2px;">Intro</div>`;
    html += `<div style="position:absolute; left: 350px; top: 0; background: var(--accent-red-dark); font-size: 9px; padding: 1px 4px; border-radius: 2px;">Verse 1</div>`;

    // Create Tick Marks
    for(let i=0; i<40; i++) {
        const left = i * 80; // 80px per beat
        const isBar = i % 4 === 0;
        const height = isBar ? '10px' : '5px';
        const top = isBar ? '20px' : '25px';
        const label = isBar ? `<span style="position:absolute; top:-15px; left:2px; font-size:10px; color:#aaa;">${(i/4)+1}</span>` : '';

        html += `<div style="position:absolute; left:${left}px; bottom:0; width:1px; height:${height}; background-color:#555;">${label}</div>`;
    }
    rulerContent.innerHTML = html;
}

function setupEventListeners() {
    // Top/Bottom Swap Logic
    const swapLayoutBtn = document.getElementById("swap-layout-btn");
    const appHeader = document.getElementById("app-header");
    const toolbar = document.getElementById("toolbar");
    const appFooter = document.getElementById("app-footer");
    let isSwapped = false;

    swapLayoutBtn.addEventListener("click", () => {
        isSwapped = !isSwapped;
        if (isSwapped) {
            appHeader.style.order = "4";
            toolbar.style.order = "5";
            appFooter.style.order = "1";
        } else {
            appHeader.style.order = "1";
            toolbar.style.order = "2";
            appFooter.style.order = "4";
        }
    });

    // Mixer Toggle
    const toggleMixerBtn = document.getElementById("toggle-mixer-btn");
    const closeMixerBtn = document.getElementById("close-mixer-btn");
    const mixerPanel = document.getElementById("mixer-panel");

    const toggleMixer = () => mixerPanel.classList.toggle("hidden");
    toggleMixerBtn.addEventListener("click", toggleMixer);
    closeMixerBtn.addEventListener("click", toggleMixer);

    // Toolbar active states
    const toolBtns = document.querySelectorAll(".tool-group .tool-btn");
    toolBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            // If it's a primary tool (Arrow, Razor, etc)
            if(['Arrow', 'Razor', 'Warp', 'Mute', 'Glue'].includes(e.target.innerText)) {
                toolBtns.forEach(b => {
                    if(['Arrow', 'Razor', 'Warp', 'Mute', 'Glue'].includes(b.innerText)) b.classList.remove("active")
                });
                e.target.classList.add("active");
            } else {
                // Toggles like Snap, Metronome
                e.target.classList.toggle("active");
            }
        });
    });

    // Transport Loop Toggle
    const loopBtn = document.querySelector(".loop-btn");
    loopBtn.addEventListener("click", () => loopBtn.classList.toggle("active"));

    // Event Delegation for dynamic track buttons
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

        // Mute / Solo sync logic
        if (e.target.classList.contains("mute-btn") || e.target.classList.contains("solo-btn")) {
            e.target.classList.toggle("active");
            const isMute = e.target.classList.contains("mute-btn");
            const trackId = e.target.getAttribute("data-track");
            const btnTypeClass = isMute ? ".mute-btn" : ".solo-btn";

            const trackBtn = document.querySelector(`#track-${trackId} ${btnTypeClass}`);
            const mixerBtn = document.querySelector(`#channel-${trackId} ${btnTypeClass}`);

            const isActive = e.target.classList.contains("active");
            if (trackBtn) isActive ? trackBtn.classList.add("active") : trackBtn.classList.remove("active");
            if (mixerBtn) isActive ? mixerBtn.classList.add("active") : mixerBtn.classList.remove("active");
        }

        // FX / Auto toggles
        if (e.target.classList.contains("fx-btn") || e.target.classList.contains("auto-btn")) {
            e.target.classList.toggle("active");
        }
    });

    // Sync track names
    document.addEventListener("input", (e) => {
        if(e.target.classList.contains("track-name-input")) {
            const trackHeader = e.target.closest(".track-header");
            const trackId = trackHeader.parentElement.id.split("-")[1];
            const mixerLabel = document.querySelector(`#channel-${trackId} .channel-label`);
            if(mixerLabel) mixerLabel.value = e.target.value;
        }
    });
}
