// ==========================================================================
// SMCM - APP CONTROLLER (JAVASCRIPT)
// Orchestrates SPA navigation, real-time polling, SVG mapping, simulation,
// ticketing, turnstile scanner, and chat assistant.
// ==========================================================================

// Global state
let currentSection = 'home-section';
let isLoggedIn = false;
let countsData = {};
let activeTicket = null;
let simulationInterval = null;
let userGeminiKey = '';

// Hyderabad Station Coordinates Mapping
const stationCoordinates = {
    // Red Line
    "Miyapur": { x: 50, y: 70, line: 'red' },
    "Kukatpally": { x: 150, y: 150, line: 'red' },
    "Ameerpet": { x: 250, y: 220, line: 'interchange' },
    "MGBS": { x: 350, y: 280, line: 'interchange' },
    "Malakpet": { x: 450, y: 350, line: 'red' },
    "L.B. Nagar": { x: 550, y: 420, line: 'red' },

    // Blue Line
    "Raidurg": { x: 50, y: 280, line: 'blue' },
    "Hitec City": { x: 150, y: 250, line: 'blue' },
    "JBS Parade Ground": { x: 350, y: 150, line: 'interchange' },
    "Tarnaka": { x: 450, y: 100, line: 'blue' },
    "Nagole": { x: 550, y: 80, line: 'blue' },

    // Green Line
    "RTC X Roads": { x: 350, y: 215, line: 'green' }
};

// Complete line definitions (ordered list of stations)
const metroLines = {
    red: ["Miyapur", "Kukatpally", "Ameerpet", "MGBS", "Malakpet", "L.B. Nagar"],
    blue: ["Raidurg", "Hitec City", "Ameerpet", "JBS Parade Ground", "Tarnaka", "Nagole"],
    green: ["JBS Parade Ground", "RTC X Roads", "MGBS"]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initNavigation();
    initPolling();
    initAuth();
    initTracker();
    initTicketing();
    initScanner();
    initChat();
    
    // Load saved settings
    const savedKey = localStorage.getItem('smcm_gemini_key');
    if (savedKey) {
        document.getElementById('settings-gemini-key').value = savedKey;
        userGeminiKey = savedKey;
    }
    
    // Load initial AI suggestion
    fetchAiSuggestion('global', 'home-ai-tip');
});

// Real-Time Clock
function initClock() {
    const timeEl = document.getElementById('current-time');
    setInterval(() => {
        const now = new Date();
        timeEl.textContent = now.toTimeString().split(' ')[0];
    }, 1000);
}

// SPA Navigation Tab Switching
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            switchTab(target);
        });
    });
}

function switchTab(targetId) {
    // Deactivate previous nav and sections
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    
    // Activate target
    const activeNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (activeNav) activeNav.classList.add('active');
    
    const activeSection = document.getElementById(targetId);
    if (activeSection) activeSection.classList.add('active');
    
    currentSection = targetId;
    
    // Set headers
    const heading = document.getElementById('page-heading');
    const subheading = document.getElementById('page-subheading');
    
    if (targetId === 'home-section') {
        heading.textContent = "Dashboard Home";
        subheading.textContent = "Overview and Smart Analytics";
        fetchAiSuggestion('global', 'home-ai-tip');
    } else if (targetId === 'crowd-section') {
        heading.textContent = "Crowd Density Monitor";
        subheading.textContent = "Live Computer Vision Occupancy Feeds";
        fetchAiSuggestion('crowd', 'crowd-ai-tip');
    } else if (targetId === 'tracking-section') {
        heading.textContent = "Live Metro Route Tracker";
        subheading.textContent = "Hyderabad Commute Navigation System";
        fetchAiSuggestion('tracking', 'tracker-ai-tip');
    } else if (targetId === 'booking-section') {
        heading.textContent = "Booking & Scanner Gates";
        subheading.textContent = "Ticketing Gateway and Entry Access Control";
        fetchAiSuggestion('booking', 'booking-ai-tip');
    }
}

// Polling Occupancy Counts
function initPolling() {
    const updateDashboardData = () => {
        fetch('/api/counts')
            .then(res => res.json())
            .then(data => {
                countsData = data;
                updateOccupancyUI();
            })
            .catch(err => console.error("Error fetching counts:", err));
    };

    updateDashboardData();
    setInterval(updateDashboardData, 3000); // Poll every 3 seconds
}

function updateOccupancyUI() {
    let totalCount = 0;
    let countsCount = 0;
    let bestCompartment = "Compartment-1";
    let minCount = 999;

    for (const [comp, info] of Object.entries(countsData)) {
        const count = info.count;
        const timestamp = info.timestamp;
        totalCount += count;
        countsCount++;

        // Find best compartment
        if (count < minCount) {
            minCount = count;
            bestCompartment = comp;
        }

        // Update indicators
        const countEl = document.getElementById(`${comp.toLowerCase().replace('-', '')}-count`);
        const statusEl = document.getElementById(`${comp.toLowerCase().replace('-', '')}-status`);
        const signalEl = document.getElementById(`${comp.toLowerCase().replace('-', '')}-signal`);
        const percentEl = document.getElementById(`${comp.toLowerCase().replace('-', '')}-percent`);
        const barEl = document.getElementById(`${comp.toLowerCase().replace('-', '')}-bar`);

        if (countEl) countEl.textContent = `${count} Persons`;

        let signalClass = 'sig-green';
        let statusText = '🟢 SAFE';
        let statusColorClass = 'txt-green';
        let fillClass = 'fill-green';
        
        if (count > 15) {
            signalClass = 'sig-red';
            statusText = '🔴 OVERCROWDED';
            statusColorClass = 'txt-red';
            fillClass = 'fill-red';
        } else if (count >= 9) {
            signalClass = 'sig-blue';
            statusText = '🔵 MODERATE';
            statusColorClass = 'txt-blue';
            fillClass = 'fill-blue';
        }

        if (statusEl) {
            statusEl.textContent = statusText;
            statusEl.className = statusColorClass;
        }
        if (signalEl) {
            signalEl.className = `signal-indicator-dot ${signalClass}`;
        }

        // Percent calculation (Assuming max capacity is 25 per compartment)
        const percent = Math.min(Math.round((count / 25) * 100), 100);
        if (percentEl) percentEl.textContent = `${percent}%`;
        
        if (barEl) {
            barEl.style.width = `${percent}%`;
            barEl.className = `progress-fill ${fillClass}`;
        }
    }

    // Update global dashboard home widgets
    const avgCount = countsCount > 0 ? Math.round(totalCount / countsCount) : 0;
    const avgOccupancyEl = document.getElementById('avg-occupancy');
    const optimalEl = document.getElementById('optimal-compartment');

    if (avgOccupancyEl) {
        avgOccupancyEl.textContent = `${avgCount} Pax / Coach`;
    }
    if (optimalEl) {
        optimalEl.textContent = `${bestCompartment} (${minCount} Pax)`;
    }
}

// AI Suggestions Handler
function fetchAiSuggestion(sectionName, targetElementId) {
    const targetEl = document.getElementById(targetElementId);
    if (!targetEl) return;

    fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(userGeminiKey ? { 'X-Gemini-Key': userGeminiKey } : {})
        },
        body: JSON.stringify({
            message: "Give a short contextual advice (max 2 sentences) for the current station section.",
            section: sectionName
        })
    })
    .then(res => res.json())
    .then(data => {
        targetEl.innerHTML = data.response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    })
    .catch(err => {
        console.error("AI Error:", err);
        targetEl.textContent = "AI engine unavailable. Showing cached data.";
    });
}

// Authentication Logic
function initAuth() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const sidebarUser = document.getElementById('sidebar-username');
    const sidebarRole = document.getElementById('sidebar-role');
    const authBlocker = document.getElementById('auth-blocker');
    const bookingWorkspace = document.getElementById('booking-workspace');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-username').value;
        const pass = document.getElementById('auth-password').value;

        if (username === 'metro_user' && pass === 'metro_pass') {
            isLoggedIn = true;
            localStorage.setItem('smcm_logged_in', 'true');
            localStorage.setItem('smcm_username', 'metro_user');
            
            updateLoginUI();
        } else {
            alert('Invalid credentials! Try metro_user / metro_pass');
        }
    });

    logoutBtn.addEventListener('click', () => {
        isLoggedIn = false;
        localStorage.removeItem('smcm_logged_in');
        localStorage.removeItem('smcm_username');
        updateLoginUI();
    });

    // Check existing session
    if (localStorage.getItem('smcm_logged_in') === 'true') {
        isLoggedIn = true;
        updateLoginUI();
    }
}

function updateLoginUI() {
    const authBlocker = document.getElementById('auth-blocker');
    const bookingWorkspace = document.getElementById('booking-workspace');
    const logoutBtn = document.getElementById('logout-btn');
    const sidebarUser = document.getElementById('sidebar-username');
    const sidebarRole = document.getElementById('sidebar-role');

    if (isLoggedIn) {
        if (authBlocker) authBlocker.style.display = 'none';
        if (bookingWorkspace) bookingWorkspace.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (sidebarUser) sidebarUser.textContent = "S. Saketh";
        if (sidebarRole) {
            sidebarRole.textContent = "Verified Passenger";
            sidebarRole.className = "badge badge-user";
        }
        
        // Populate Ticket Dropdowns when logged in
        populateBookingOptions();
    } else {
        if (authBlocker) authBlocker.style.display = 'flex';
        if (bookingWorkspace) bookingWorkspace.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (sidebarUser) sidebarUser.textContent = "Guest Passenger";
        if (sidebarRole) {
            sidebarRole.textContent = "Offline";
            sidebarRole.className = "badge badge-guest";
        }
    }
}

// Live Route Tracker Logic
function initTracker() {
    const startBtn = document.getElementById('start-tracking-btn');
    const cancelBtn = document.getElementById('cancel-tracking-btn');
    
    startBtn.addEventListener('click', startRouteSimulation);
    cancelBtn.addEventListener('click', stopRouteSimulation);
}

function getRoutePath(source, dest) {
    // Basic route calculations for Hyderabad Metro Map
    // Return path list of stations and intermediate coordinates
    
    // Find lines containing source and dest
    let path = [];
    let activeLine = '';
    
    // Check if on same line
    for (const [lineName, stations] of Object.entries(metroLines)) {
        const sourceIdx = stations.indexOf(source);
        const destIdx = stations.indexOf(dest);
        
        if (sourceIdx !== -1 && destIdx !== -1) {
            activeLine = lineName;
            if (sourceIdx < destIdx) {
                path = stations.slice(sourceIdx, destIdx + 1);
            } else {
                path = stations.slice(destIdx, sourceIdx + 1).reverse();
            }
            break;
        }
    }
    
    // If not on same line, handle Ameerpet or MGBS interchanges
    if (path.length === 0) {
        // Example: Miyapur (Red) to Raidurg (Blue) -> Interchange at Ameerpet
        if (metroLines.red.includes(source) && metroLines.blue.includes(dest)) {
            const redPart = getRoutePath(source, "Ameerpet").stations;
            const bluePart = getRoutePath("Ameerpet", dest).stations;
            path = [...redPart, ...bluePart.slice(1)];
            activeLine = 'multi'; // uses red & blue paths
        } else if (metroLines.green.includes(source) && metroLines.red.includes(dest)) {
            const greenPart = getRoutePath(source, "MGBS").stations;
            const redPart = getRoutePath("MGBS", dest).stations;
            path = [...greenPart, ...redPart.slice(1)];
            activeLine = 'multi';
        }
    }

    return { stations: path, line: activeLine };
}

function startRouteSimulation() {
    const source = document.getElementById('route-source').value;
    const dest = document.getElementById('route-dest').value;

    if (!source || !dest) {
        alert("Please select both Source and Destination stations!");
        return;
    }
    if (source === dest) {
        alert("Source and Destination stations cannot be the same!");
        return;
    }

    // Stop existing simulation
    stopRouteSimulation();

    const route = getRoutePath(source, dest);
    const stations = route.stations;
    
    if (stations.length === 0) {
        alert("Route could not be calculated. Please try another combination.");
        return;
    }

    // Display Sim stats
    const statsPanel = document.getElementById('sim-stats-panel');
    statsPanel.style.display = 'block';

    // Highlight map routes (toggled svg paths)
    document.querySelectorAll('.active-path-overlay').forEach(el => el.style.display = 'none');
    
    if (route.line === 'red' || route.line === 'multi') {
        const pathOverlay = document.getElementById('active-red-path');
        pathOverlay.style.display = 'block';
        pathOverlay.style.strokeDashoffset = '1000';
        setTimeout(() => pathOverlay.style.strokeDashoffset = '0', 50);
    }
    if (route.line === 'blue' || route.line === 'multi') {
        const pathOverlay = document.getElementById('active-blue-path');
        pathOverlay.style.display = 'block';
        pathOverlay.style.strokeDashoffset = '1000';
        setTimeout(() => pathOverlay.style.strokeDashoffset = '0', 50);
    }

    // Set up train marker on map
    const trainMarker = document.getElementById('map-train-indicator');
    const startCoord = stationCoordinates[stations[0]];
    trainMarker.setAttribute('cx', startCoord.x);
    trainMarker.setAttribute('cy', startCoord.y);
    trainMarker.style.display = 'block';

    // Run interval
    let currentIdx = 0;
    const totalStations = stations.length;
    
    const updateSimulationStep = () => {
        if (currentIdx >= totalStations - 1) {
            // Arrived at destination!
            document.getElementById('sim-current-station').textContent = stations[totalStations - 1];
            document.getElementById('sim-next-station').textContent = "Terminus";
            document.getElementById('sim-eta').textContent = "Arrived";
            document.getElementById('sim-remaining').textContent = "0";
            document.getElementById('sim-line-fill').style.width = `100%`;
            document.getElementById('sim-train-node').style.left = `100%`;
            
            const destCoord = stationCoordinates[stations[totalStations - 1]];
            trainMarker.setAttribute('cx', destCoord.x);
            trainMarker.setAttribute('cy', destCoord.y);
            
            clearInterval(simulationInterval);
            alert(`🚇 Train has arrived at ${dest}! Thank you for choosing Hyderabad Metro.`);
            return;
        }

        const curr = stations[currentIdx];
        const next = stations[currentIdx + 1];
        
        document.getElementById('sim-current-station').textContent = curr;
        document.getElementById('sim-next-station').textContent = next;
        document.getElementById('sim-eta').textContent = "2 mins";
        document.getElementById('sim-remaining').textContent = `${totalStations - 1 - currentIdx}`;
        
        // Progress filling
        const progress = Math.round((currentIdx / (totalStations - 1)) * 100);
        document.getElementById('sim-line-fill').style.width = `${progress}%`;
        document.getElementById('sim-train-node').style.left = `${progress}%`;
        
        // SVG Map Train Moving animation
        const currCoord = stationCoordinates[curr];
        const nextCoord = stationCoordinates[next];
        
        // Transition train coordinates
        trainMarker.setAttribute('cx', currCoord.x);
        trainMarker.setAttribute('cy', currCoord.y);

        // Animate movement from curr to next coordinate
        let step = 0;
        const animateSubsteps = setInterval(() => {
            step++;
            const t = step / 10;
            const x = currCoord.x + (nextCoord.x - currCoord.x) * t;
            const y = currCoord.y + (nextCoord.y - currCoord.y) * t;
            trainMarker.setAttribute('cx', x);
            trainMarker.setAttribute('cy', y);
            
            if (step >= 10) clearInterval(animateSubsteps);
        }, 300);

        currentIdx++;
    };

    updateSimulationStep();
    simulationInterval = setInterval(updateSimulationStep, 4000); // 4 seconds per station simulation
}

function stopRouteSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    // Hide panel & markers
    document.getElementById('sim-stats-panel').style.display = 'none';
    document.getElementById('map-train-indicator').style.display = 'none';
    document.querySelectorAll('.active-path-overlay').forEach(el => el.style.display = 'none');
}

// Ticketing Booking Engine
function initTicketing() {
    const bookingForm = document.getElementById('ticket-booking-form');
    
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const src = document.getElementById('book-source').value;
        const dest = document.getElementById('book-dest').value;
        const qty = parseInt(document.getElementById('book-passengers').value);
        const comp = document.getElementById('book-compartment').value;
        const fare = calculateFare(src, dest) * qty;

        if (src === dest) {
            alert("Origin and Destination cannot be the same!");
            return;
        }

        fetch('/api/book_ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source: src,
                destination: dest,
                passengers: qty,
                compartment: comp,
                fare: fare
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                activeTicket = data;
                displayDigitalTicket(src, dest, qty, comp, fare);
            }
        })
        .catch(err => console.error("Booking Error:", err));
    });

    // Update dynamic fare when selection changes
    const updateDynamicFare = () => {
        const src = document.getElementById('book-source').value;
        const dest = document.getElementById('book-dest').value;
        const qty = parseInt(document.getElementById('book-passengers').value) || 1;
        
        if (src && dest && src !== dest) {
            const fareVal = calculateFare(src, dest) * qty;
            document.getElementById('calculated-fare').textContent = `₹${fareVal}`;
        }
    };

    document.getElementById('book-source').addEventListener('change', updateDynamicFare);
    document.getElementById('book-dest').addEventListener('change', updateDynamicFare);
    document.getElementById('book-passengers').addEventListener('input', updateDynamicFare);
}

function calculateFare(source, dest) {
    const route = getRoutePath(source, dest);
    const stationCount = route.stations.length;
    
    if (stationCount <= 1) return 10;
    return 10 + (stationCount - 1) * 5; // ₹10 base + ₹5 per station hops
}

function populateBookingOptions() {
    const srcSelect = document.getElementById('book-source');
    const destSelect = document.getElementById('book-dest');
    
    // Clear and duplicate options from tracking section
    srcSelect.innerHTML = document.getElementById('route-source').innerHTML;
    destSelect.innerHTML = document.getElementById('route-dest').innerHTML;
    
    srcSelect.selectedIndex = 0;
    destSelect.selectedIndex = 0;
}

function displayDigitalTicket(src, dest, qty, comp, fare) {
    // Populate card details
    document.getElementById('ticket-card-id').textContent = activeTicket.ticket_id;
    document.getElementById('ticket-card-source').textContent = src;
    document.getElementById('ticket-card-dest').textContent = dest;
    document.getElementById('ticket-card-coach').textContent = comp;
    document.getElementById('ticket-card-qty').textContent = `${qty} Pax`;
    document.getElementById('ticket-card-fare').textContent = `₹${fare}`;

    // Render QR Code using the library
    const qrContainer = document.getElementById('ticket-qr-code');
    qrContainer.innerHTML = ''; // clear loading icon
    
    new QRCode(qrContainer, {
        text: activeTicket.qr_payload,
        width: 120,
        height: 120,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Display ticket container and the scanner
    document.getElementById('digital-ticket-container').style.display = 'block';
    document.getElementById('gate-scanner-container').style.display = 'block';
    
    // Suggestion update
    document.getElementById('booking-ai-tip').textContent = `🤖 AI Seat Allocation: Windows seats in row 4 & 5 of ${comp} are vacant. Ticket active for scanned entry.`;
}

// Virtual Gate Turnstile Scanner
function initScanner() {
    const scanBtn = document.getElementById('trigger-scan-btn');
    
    scanBtn.addEventListener('click', () => {
        if (!activeTicket) {
            alert("Please book a ticket first!");
            return;
        }

        const scannerBed = document.getElementById('scanner-bed');
        scannerBed.classList.add('scanning'); // trigger CSS pulse scan

        // Simulating the delay for scanning process
        setTimeout(() => {
            fetch('/api/scan_gate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_payload: activeTicket.qr_payload })
            })
            .then(res => res.json())
            .then(data => {
                scannerBed.classList.remove('scanning');
                processScanResult(data);
            })
            .catch(err => {
                scannerBed.classList.remove('scanning');
                console.error("Scanner API Error:", err);
            });
        }, 1200);
    });
}

function processScanResult(result) {
    const gateLight = document.getElementById('gate-light');
    const gateMessage = document.getElementById('gate-message');
    const turnstile = document.querySelector('.turnstile-wrapper');

    if (result.success) {
        // Access Granted!
        gateLight.className = "indicator-light light-green";
        gateMessage.textContent = "GRANTED";
        turnstile.classList.add('gate-open');
        
        // Play success beep sound (Self-contained Web Audio synthesis)
        playVerificationBeep(523.25, 0.15); // C5 note
        setTimeout(() => playVerificationBeep(659.25, 0.25), 150); // E5 note

        alert(result.message);

        // Auto close gate after 6 seconds
        setTimeout(() => {
            gateLight.className = "indicator-light light-red";
            gateMessage.textContent = "LOCKED";
            turnstile.classList.remove('gate-open');
        }, 6000);
    } else {
        // Access Denied
        gateLight.className = "indicator-light light-red";
        gateMessage.textContent = "DENIED";
        playVerificationBeep(220, 0.4); // A3 low note error buzzer
        alert(result.message);
    }
}

// Audio buzzer synthesis
function playVerificationBeep(frequency, duration) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // volume control
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Audio context not supported/allowed in browser:", e);
    }
}

// Persistent Chatbot interface
function initChat() {
    const chatFab = document.getElementById('chat-fab');
    const chatPanel = document.getElementById('chat-panel');
    const closeChat = document.getElementById('close-chat');
    const sendBtn = document.getElementById('send-chat-btn');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    // Toggle panel
    chatFab.addEventListener('click', () => {
        chatPanel.classList.toggle('open');
        // Hide badge pulse
        const pulse = chatFab.querySelector('.chat-badge-pulse');
        if (pulse) pulse.style.display = 'none';
    });

    closeChat.addEventListener('click', () => {
        chatPanel.classList.remove('open');
    });

    // Send logic
    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (!text) return;

        // Append user message
        appendMessage(text, 'user');
        chatInput.value = '';

        // Typing loading state
        const loadingMsg = appendMessage("Thinking...", 'bot typing');

        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(userGeminiKey ? { 'X-Gemini-Key': userGeminiKey } : {})
            },
            body: JSON.stringify({
                message: text,
                section: currentSection.replace('-section', '')
            })
        })
        .then(res => res.json())
        .then(data => {
            // Remove typing text
            loadingMsg.remove();
            appendMessage(data.response, 'bot');
        })
        .catch(err => {
            loadingMsg.remove();
            appendMessage("Sorry, I encountered an issue reaching the server. Please check connection.", 'bot');
            console.error("Chat API error:", err);
        });
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function appendMessage(text, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const msgEl = document.createElement('div');
    msgEl.className = `message msg-${sender}`;
    
    // Render markdown headings/bold tags in simple format
    if (sender.includes('bot')) {
        let renderedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        msgEl.innerHTML = renderedText;
    } else {
        msgEl.textContent = text;
    }
    
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return msgEl;
}

// Modal management
function closeSettings() {
    document.getElementById('settings-modal').classList.remove('open');
}

function saveSettings() {
    const key = document.getElementById('settings-gemini-key').value.trim();
    localStorage.setItem('smcm_gemini_key', key);
    userGeminiKey = key;
    closeSettings();
    alert("Settings saved successfully!");
}

// Toggler from header settings
document.getElementById('open-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('open');
});

// Chatbot consultations from buttons in panels
function askAiAboutCrowd() {
    document.getElementById('chat-panel').classList.add('open');
    const chatInput = document.getElementById('chat-input');
    chatInput.value = "Which compartment has the safest/lowest crowd distribution right now?";
    chatInput.focus();
}
