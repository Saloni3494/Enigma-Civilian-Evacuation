// Navigation Engine – Turn-by-turn routing, journey simulation, voice assistance
// Uses OSRM for real road routing + Web Speech API for voice

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

// Get turn-by-turn route from OSRM (real roads)
export async function getOSRMRoute(startLat, startLng, endLat, endLng) {
  try {
    const url = `${OSRM_URL}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true&annotations=true`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.length) {
      console.warn('OSRM route not found');
      return null;
    }

    const route = data.routes[0];
    const steps = route.legs[0].steps;

    // Parse steps into navigation instructions
    const instructions = steps
      .filter(s => s.maneuver && s.distance > 0)
      .map((step, i) => ({
        id: i,
        instruction: formatInstruction(step),
        distance: step.distance,
        duration: step.duration,
        maneuver: step.maneuver.type,
        modifier: step.maneuver.modifier || '',
        location: step.maneuver.location, // [lng, lat]
        name: step.name || 'unnamed road',
      }));

    // Extract coordinates as [lat, lng] pairs for Leaflet
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    return {
      coordinates,
      instructions,
      distance: route.distance, // meters
      duration: route.duration, // seconds
      summary: route.legs[0].summary || '',
    };
  } catch (err) {
    console.error('OSRM routing error:', err);
    return null;
  }
}

// Format OSRM maneuver into human-readable instruction
function formatInstruction(step) {
  const { type, modifier } = step.maneuver;
  const name = step.name || 'the road';

  switch (type) {
    case 'depart':
      return `Start heading on ${name}`;
    case 'arrive':
      return `You have arrived at your destination`;
    case 'turn':
      return `Turn ${modifier || ''} onto ${name}`.trim();
    case 'new name':
      return `Continue onto ${name}`;
    case 'merge':
      return `Merge ${modifier || ''} onto ${name}`.trim();
    case 'on ramp':
      return `Take the ramp onto ${name}`;
    case 'off ramp':
      return `Take the exit onto ${name}`;
    case 'fork':
      return `Keep ${modifier || 'straight'} at the fork onto ${name}`;
    case 'end of road':
      return `Turn ${modifier || ''} at the end of the road onto ${name}`.trim();
    case 'roundabout':
    case 'rotary':
      return `Enter the roundabout and take the exit onto ${name}`;
    case 'continue':
      return `Continue ${modifier || 'straight'} on ${name}`;
    default:
      return `Continue on ${name}`;
  }
}

// ========== VOICE NAVIGATION ==========

let voiceEnabled = true;
let currentUtterance = null;

export function setVoiceEnabled(enabled) {
  voiceEnabled = enabled;
  if (!enabled && currentUtterance) {
    window.speechSynthesis.cancel();
  }
}

export function speak(text) {
  if (!voiceEnabled || !('speechSynthesis' in window)) return;

  // Cancel any current speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to use a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha'))
  ) || voices.find(v => v.lang.startsWith('en'));

  if (preferred) utterance.voice = preferred;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

// Speak distance in a friendly way
function speakDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} kilometers`;
  if (meters >= 100) return `${Math.round(meters / 10) * 10} meters`;
  return `${Math.round(meters)} meters`;
}

// ========== JOURNEY SIMULATION ==========

export class JourneySimulator {
  constructor(coordinates, instructions, zones, onUpdate, onComplete) {
    this.coordinates = coordinates;
    this.instructions = instructions;
    this.zones = zones || [];
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.currentIndex = 0;
    this.currentStepIndex = 0;
    this.running = false;
    this.paused = false;
    this.speed = 1; // 1x, 2x, 5x
    this.intervalId = null;
    this.lastZoneAlert = null;
    this.spokenSteps = new Set();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.currentIndex = 0;
    this.currentStepIndex = 0;
    this.spokenSteps.clear();

    speak('Starting navigation. ' + this.instructions[0]?.instruction || '');

    this._tick();
  }

  pause() {
    this.paused = true;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  resume() {
    if (!this.running) return;
    this.paused = false;
    this._tick();
  }

  stop() {
    this.running = false;
    this.paused = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    window.speechSynthesis.cancel();
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  _tick() {
    if (!this.running || this.paused) return;
    if (this.currentIndex >= this.coordinates.length) {
      this.running = false;
      speak('You have arrived at your destination.');
      if (this.onComplete) this.onComplete();
      return;
    }

    const pos = this.coordinates[this.currentIndex];
    const progress = this.currentIndex / (this.coordinates.length - 1);
    const remainingDistance = this._calcRemainingDistance();

    // Check which step we're at
    this._checkStep(pos);

    // Check if entering unsafe zone
    this._checkZoneSafety(pos);

    // Notify update
    if (this.onUpdate) {
      this.onUpdate({
        position: pos,
        index: this.currentIndex,
        progress,
        remainingDistance,
        currentStep: this.instructions[this.currentStepIndex] || null,
        nextStep: this.instructions[this.currentStepIndex + 1] || null,
        heading: this._calcHeading(),
      });
    }

    this.currentIndex++;

    // Speed: simulate movement (~30m per tick at 1x)
    const interval = Math.max(50, 300 / this.speed);
    this.intervalId = setTimeout(() => this._tick(), interval);
  }

  _checkStep(pos) {
    for (let i = this.currentStepIndex; i < this.instructions.length; i++) {
      const step = this.instructions[i];
      if (!step.location) continue;

      const stepPos = [step.location[1], step.location[0]]; // [lat, lng]
      const dist = this._dist(pos, stepPos);

      // Approaching step (within 100m) – announce
      if (dist < 0.001 && !this.spokenSteps.has(i)) { // ~100m
        this.spokenSteps.add(i);
        this.currentStepIndex = i;

        const nextStep = this.instructions[i + 1];
        if (nextStep) {
          const distToNext = speakDistance(nextStep.distance);
          speak(`In ${distToNext}, ${nextStep.instruction}`);
        } else {
          speak(step.instruction);
        }
        break;
      }
    }
  }

  _checkZoneSafety(pos) {
    for (const zone of this.zones) {
      const dist = this._dist(pos, [zone.lat, zone.lng]);
      if (dist < 0.008 && zone.status === 'danger') { // ~800m radius
        if (this.lastZoneAlert !== zone.id) {
          this.lastZoneAlert = zone.id;
          speak(`Warning! You are entering an unsafe area. ${zone.name} is classified as dangerous. Please exercise caution.`);
          if (this.onUpdate) {
            this.onUpdate({
              position: pos,
              index: this.currentIndex,
              progress: this.currentIndex / (this.coordinates.length - 1),
              remainingDistance: this._calcRemainingDistance(),
              currentStep: this.instructions[this.currentStepIndex],
              nextStep: this.instructions[this.currentStepIndex + 1],
              heading: this._calcHeading(),
              zoneAlert: {
                zone: zone,
                type: 'danger',
                message: `⚠️ Entering unsafe area: ${zone.name}`,
              },
            });
          }
        }
      } else if (dist < 0.012 && zone.status === 'warn') {
        if (this.lastZoneAlert !== zone.id + '_warn') {
          this.lastZoneAlert = zone.id + '_warn';
          speak(`Caution. ${zone.name} ahead is a moderate risk area.`);
        }
      }
    }
  }

  _calcHeading() {
    if (this.currentIndex <= 0 || this.currentIndex >= this.coordinates.length) return 0;
    const prev = this.coordinates[this.currentIndex - 1];
    const curr = this.coordinates[this.currentIndex];
    const dLng = curr[1] - prev[1];
    const dLat = curr[0] - prev[0];
    return Math.atan2(dLng, dLat) * 180 / Math.PI;
  }

  _calcRemainingDistance() {
    let total = 0;
    for (let i = this.currentIndex; i < this.coordinates.length - 1; i++) {
      total += this._dist(this.coordinates[i], this.coordinates[i + 1]) * 111000;
    }
    return total;
  }

  _dist(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  }
}
