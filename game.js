// ============================================
// MAIN GAME ENGINE
// ============================================
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundManager();
    this.state = 'menu'; // menu | playing | gameover
    this.frame = 0;
    this.lastTime = 0;

    // Road config
    this.laneCount = 5;
    this.roadMargin = 0;
    this.laneWidth = 0;
    this.roadLeft = 0;
    this.roadRight = 0;
    this.roadOffset = 0;

    // Player
    this.player = { lane: 2, x: 0, targetX: 0, y: 0, rotation: 0, w: 0, h: 0, skin: 0 };

    // Game state
    this.speed = 0;
    this.maxSpeed = 14;
    this.baseSpeed = 1.5;
    this.speedAccel = 0.0012;
    this.score = 0;
    this.coinsCollected = 0;
    this.nitroActive = false;
    this.nitroTimer = 0;
    this.nitroDuration = 180; // frames (~3 seconds)
    this.nitroCharges = 0;
    this.maxNitroCharges = 3;
    this.lastTapTime = 0;

    // Entities
    this.obstacles = [];
    this.coins = [];
    this.nitroPickups = [];
    this.particles = [];
    this.roadTrees = [];

    // Persistence
    this.highScore = parseInt(localStorage.getItem('rr_highscore')) || 0;
    this.totalCoins = parseInt(localStorage.getItem('rr_coins')) || 0;
    this.unlockedSkins = JSON.parse(localStorage.getItem('rr_skins')) || [0, 1];
    this.selectedSkin = parseInt(localStorage.getItem('rr_selectedskin')) || 0;
    this.player.skin = this.selectedSkin;

    // Input
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.keys = {};

    // Screen shake
    this.shake = { x: 0, y: 0, intensity: 0 };

    this.resize();
    this.setupInput();
    this.setupUI();
    this.generateTrees();

    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const cont = this.canvas.parentElement;
    const r = cont.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = r.width;
    this.H = r.height;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.roadMargin = this.W * 0.12;
    const roadW = this.W - this.roadMargin * 2;
    this.laneWidth = roadW / this.laneCount;
    this.roadLeft = this.roadMargin;
    this.roadRight = this.W - this.roadMargin;

    this.player.w = this.laneWidth * 0.65;
    this.player.h = this.player.w * 1.75;
    this.player.x = this.laneToX(this.player.lane);
    this.player.targetX = this.player.x;
    this.player.y = this.H * 0.72;
  }

  laneToX(lane) {
    return this.roadLeft + lane * this.laneWidth + this.laneWidth / 2 - this.player.w / 2;
  }

  generateTrees() {
    this.roadTrees = [];
    for (let i = 0; i < 30; i++) {
      this.roadTrees.push({
        x: Math.random() < 0.5 ? Math.random() * this.roadMargin * 0.7 : this.roadRight + Math.random() * this.roadMargin * 0.7,
        y: Math.random() * this.H * 1.5,
        r: 6 + Math.random() * 10,
        color: `hsl(${130 + Math.random() * 30}, ${50 + Math.random() * 20}%, ${25 + Math.random() * 15}%)`
      });
    }
  }

  setupInput() {
    window.addEventListener('resize', () => this.resize());

    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      if (this.state === 'playing') {
        if (e.key === 'ArrowLeft' || e.key === 'a') this.movePlayer(-1);
        if (e.key === 'ArrowRight' || e.key === 'd') this.movePlayer(1);
        if (e.key === ' ' || e.key === 'n' || e.key === 'N') this.activateNitro();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });

    // Touch
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      if (this.state === 'playing') {
        // Double-tap detection for nitro
        const now = Date.now();
        if (now - this.lastTapTime < 300) {
          this.activateNitro();
          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
          if (t.clientX < this.W / 2) this.movePlayer(-1);
          else this.movePlayer(1);
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        const dx = e.changedTouches[0].clientX - this.touchStartX;
        if (Math.abs(dx) > 30 && this.state === 'playing') {
          this.movePlayer(dx > 0 ? 1 : -1);
        }
      }
    }, { passive: false });

    // Mouse fallback
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state === 'playing') {
        const rect = this.canvas.getBoundingClientRect();
        if (e.clientX - rect.left < this.W / 2) this.movePlayer(-1);
        else this.movePlayer(1);
      }
    });
  }

  movePlayer(dir) {
    const newLane = Math.max(0, Math.min(this.laneCount - 1, this.player.lane + dir));
    if (newLane !== this.player.lane) {
      this.player.lane = newLane;
      this.player.targetX = this.laneToX(newLane);
    }
  }

  setupUI() {
    document.getElementById('menu-high-score').textContent = this.highScore;
    document.getElementById('total-coins').textContent = this.totalCoins;

    // Skin options
    const container = document.getElementById('skin-options');
    container.innerHTML = '';
    SKINS.forEach((skin, i) => {
      const div = document.createElement('div');
      div.className = 'skin-option' + (i === this.selectedSkin ? ' selected' : '') + (!this.unlockedSkins.includes(i) ? ' locked' : '');
      const c = document.createElement('canvas');
      c.width = 36; c.height = 48;
      const sctx = c.getContext('2d');
      drawCar(sctx, 2, 2, 32, 44, skin, true);
      div.appendChild(c);
      div.addEventListener('click', () => this.selectSkin(i));
      container.appendChild(div);
    });

    document.getElementById('play-btn').addEventListener('click', () => this.startGame());
    document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
    document.getElementById('menu-btn').addEventListener('click', () => this.showMenu());
  }

  selectSkin(i) {
    if (!this.unlockedSkins.includes(i)) {
      if (this.totalCoins >= SKINS[i].price) {
        this.totalCoins -= SKINS[i].price;
        this.unlockedSkins.push(i);
        localStorage.setItem('rr_coins', this.totalCoins);
        localStorage.setItem('rr_skins', JSON.stringify(this.unlockedSkins));
      } else return;
    }
    this.selectedSkin = i;
    this.player.skin = i;
    localStorage.setItem('rr_selectedskin', i);
    this.setupUI();
  }

  startGame() {
    this.sound.init();
    this.sound.resume();
    this.state = 'playing';
    this.speed = this.baseSpeed;
    this.score = 0;
    this.coinsCollected = 0;
    this.obstacles = [];
    this.coins = [];
    this.nitroPickups = [];
    this.particles = [];
    this.player.lane = 2;
    this.player.x = this.laneToX(2);
    this.player.targetX = this.player.x;
    this.player.y = this.H * 0.72;
    this.player.rotation = 0;
    this.nitroActive = false;
    this.nitroTimer = 0;
    this.nitroCharges = 0;
    this.lastTapTime = 0;
    this.shake = { x: 0, y: 0, intensity: 0 };

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('nitro-hud').classList.remove('hidden');

    this.sound.startEngine();
    this.sound.startMusic();
    this.generateTrees();
  }

  gameOver() {
    this.state = 'gameover';
    this.sound.playCrash();
    this.sound.stopEngine();
    this.sound.stopMusic();

    // Crash particles
    const px = this.player.x + this.player.w / 2;
    const py = this.H * 0.75;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      this.particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 40 + Math.random() * 30,
        maxLife: 70, size: 3 + Math.random() * 4,
        color: ['#ef4444', '#f97316', '#fbbf24', '#fff'][Math.floor(Math.random() * 4)]
      });
    }

    this.shake.intensity = 12;

    // Update records
    let isNewRecord = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('rr_highscore', this.highScore);
      isNewRecord = true;
    }
    this.totalCoins += this.coinsCollected;
    localStorage.setItem('rr_coins', this.totalCoins);

    // Show gameover after delay
    setTimeout(() => {
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('nitro-hud').classList.add('hidden');
      document.getElementById('gameover-screen').classList.remove('hidden');
      document.getElementById('final-score').textContent = this.score;
      document.getElementById('final-high-score').textContent = this.highScore;
      document.getElementById('final-coins').textContent = this.coinsCollected;
      document.getElementById('new-record').classList.toggle('hidden', !isNewRecord);
    }, 800);
  }

  showMenu() {
    this.state = 'menu';
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('nitro-hud').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    this.setupUI();
  }

  // ==========================================
  // GAME LOOP
  // ==========================================
  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 16.67, 3);
    this.lastTime = timestamp;
    this.frame++;

    if (this.state === 'playing') this.update(dt);
    this.render();
    this.updateParticles(dt);

    requestAnimationFrame((t) => this.loop(t));
  }

  activateNitro() {
    if (this.nitroCharges > 0 && !this.nitroActive && this.state === 'playing') {
      this.nitroCharges--;
      this.nitroActive = true;
      this.nitroTimer = this.nitroDuration;
      this.nitroTargetSpeed = Math.max(this.baseSpeed * 2.5, this.speed * 1.4); // 40% boost
      this.shake.intensity = 6;
      this.sound.playTone(523, 0.15, 'sawtooth', 0.12);
      setTimeout(() => this.sound.playTone(659, 0.15, 'sawtooth', 0.1), 80);
      setTimeout(() => this.sound.playTone(784, 0.2, 'sawtooth', 0.08), 160);
    }
  }

  update(dt) {
    // Gradual speed increase - starts slow, ramps up over time
    if (this.nitroActive) {
      const targetSpeed = this.nitroTargetSpeed;
      this.speed += (targetSpeed - this.speed) * 0.08 * dt;
      this.nitroTimer -= dt;
      if (this.nitroTimer <= 0) {
        this.nitroActive = false;
        this.nitroTimer = 0;
        this.speed = 4.5; // Corresponds to 150 km/h (60 + 4.5 * 20)
      }
    } else {
      this.speed = Math.min(this.maxSpeed, this.speed + this.speedAccel * dt);
    }

    // Score
    this.score = Math.floor(this.score + this.speed * 0.5 * dt);

    // Road scroll
    this.roadOffset = (this.roadOffset + this.speed * 4 * dt) % 40;

    // Player movement (lerp)
    const dx = this.player.targetX - this.player.x;
    this.player.x += dx * 0.18 * dt;
    this.player.rotation = dx * 0.008;

    // Vertical movement
    const vSpeed = 3.5 * dt;
    if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) this.player.y -= vSpeed;
    if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) this.player.y += vSpeed;
    this.player.y = Math.max(this.H * 0.4, Math.min(this.H * 0.85, this.player.y));

    // Spawn obstacles (less frequent at low speed)
    const speedRatio = this.speed / this.maxSpeed;
    if (Math.random() < 0.012 * (0.5 + speedRatio) * dt) {
      this.spawnObstacle();
    }

    // Spawn coins
    if (Math.random() < 0.008 * dt) {
      this.spawnCoin();
    }

    // Spawn nitro pickups (rarer than coins)
    if (Math.random() < 0.002 * dt && this.nitroPickups.length < 2) {
      this.spawnNitroPickup();
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.y += this.speed * 3.5 * dt;
      if (o.y > this.H + 100) { this.obstacles.splice(i, 1); continue; }
      // Collision
      if (this.checkCollision(this.player.x, this.player.y, this.player.w, this.player.h, o.x, o.y, o.w, o.h)) {
        if (this.nitroActive) {
          this.destroyObstacle(i, o);
          continue;
        } else {
          this.gameOver();
          return;
        }
      }
    }

    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.y += this.speed * 3.5 * dt;
      if (c.y > this.H + 50) { this.coins.splice(i, 1); continue; }
      const cx = c.x + c.r, cy = c.y + c.r;
      const px = this.player.x + this.player.w / 2, py = this.player.y + this.player.h / 2;
      if (Math.hypot(cx - px, cy - py) < c.r + this.player.w * 0.4) {
        this.coinsCollected++;
        this.sound.playCoin();
        // Coin particles
        for (let j = 0; j < 8; j++) {
          const a = Math.random() * Math.PI * 2;
          this.particles.push({
            x: cx, y: cy, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
            life: 20, maxLife: 20, size: 3, color: '#fbbf24'
          });
        }
        this.coins.splice(i, 1);
      }
    }

    // Update nitro pickups
    for (let i = this.nitroPickups.length - 1; i >= 0; i--) {
      const np = this.nitroPickups[i];
      np.y += this.speed * 3.5 * dt;
      if (np.y > this.H + 50) { this.nitroPickups.splice(i, 1); continue; }
      const nx = np.x + np.r, ny = np.y + np.r;
      const px = this.player.x + this.player.w / 2, py = this.player.y + this.player.h / 2;
      if (Math.hypot(nx - px, ny - py) < np.r + this.player.w * 0.4) {
        if (this.nitroCharges < this.maxNitroCharges) {
          this.nitroCharges++;
        }
        // Nitro collect sound
        this.sound.playTone(440, 0.1, 'sine', 0.15);
        setTimeout(() => this.sound.playTone(660, 0.1, 'sine', 0.12), 60);
        setTimeout(() => this.sound.playTone(880, 0.15, 'sine', 0.1), 120);
        // Nitro collect particles
        for (let j = 0; j < 12; j++) {
          const a = Math.random() * Math.PI * 2;
          this.particles.push({
            x: nx, y: ny, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
            life: 25, maxLife: 25, size: 3 + Math.random() * 2,
            color: ['#60a5fa', '#38bdf8', '#818cf8', '#fef08a'][Math.floor(Math.random() * 4)]
          });
        }
        this.nitroPickups.splice(i, 1);
      }
    }

    // Speed particles (scaled to current speed)
    if (Math.random() < 0.15 + speedRatio * 0.6) {
      const sx = this.roadLeft + Math.random() * (this.roadRight - this.roadLeft);
      this.particles.push({
        x: sx, y: -5, vx: 0, vy: this.speed * 5,
        life: 20 + Math.random() * 10, maxLife: 30,
        size: 1 + Math.random(), color: 'rgba(255,255,255,0.3)'
      });
    }

    // Nitro boost particles (when nitro is active)
    if (this.nitroActive && this.state === 'playing') {
      const px = this.player.x + this.player.w / 2;
      const py = this.player.y + this.player.h;
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: px + (Math.random() - 0.5) * this.player.w * 0.4,
          y: py + Math.random() * 8,
          vx: (Math.random() - 0.5) * 2,
          vy: 3 + Math.random() * 5,
          life: 18 + Math.random() * 12, maxLife: 30,
          size: 3 + Math.random() * 4,
          color: ['#60a5fa', '#818cf8', '#c084fc', '#38bdf8'][Math.floor(Math.random() * 4)]
        });
      }
      // Side trail particles
      for (let side = -1; side <= 1; side += 2) {
        if (Math.random() < 0.4) {
          this.particles.push({
            x: px + side * this.player.w * 0.3,
            y: py - Math.random() * this.player.h * 0.3,
            vx: side * (1 + Math.random()), vy: 2 + Math.random() * 3,
            life: 10 + Math.random() * 8, maxLife: 18,
            size: 2 + Math.random() * 2,
            color: '#fef08a'
          });
        }
      }
    }

    // Shake decay
    if (this.shake.intensity > 0) {
      this.shake.x = (Math.random() - 0.5) * this.shake.intensity;
      this.shake.y = (Math.random() - 0.5) * this.shake.intensity;
      this.shake.intensity *= 0.9;
      if (this.shake.intensity < 0.5) this.shake.intensity = 0;
    }

    // Trees scroll
    for (const t of this.roadTrees) {
      t.y += this.speed * 3.5 * dt;
      if (t.y > this.H + 20) t.y = -20 - Math.random() * 40;
    }

    // Update HUD
    document.getElementById('score-value').textContent = this.score;
    document.getElementById('speed-value').textContent = Math.floor(60 + this.speed * 20);
    document.getElementById('coin-value').textContent = this.coinsCollected;
    this.updateNitroHUD();

    this.sound.updateEngine(this.speed, this.maxSpeed);
  }

  spawnObstacle() {
    const lane = Math.floor(Math.random() * this.laneCount);
    const types = ['car', 'car', 'car', 'cone', 'barrier'];
    const type = types[Math.floor(Math.random() * types.length)];
    let w, h;
    if (type === 'car') { w = this.laneWidth * 0.65; h = w * 1.75; }
    else if (type === 'cone') { w = this.laneWidth * 0.35; h = w; }
    else { w = this.laneWidth * 0.9; h = this.laneWidth * 0.3; }

    const x = this.roadLeft + lane * this.laneWidth + (this.laneWidth - w) / 2;
    // Check no overlap with existing obstacles
    for (const o of this.obstacles) {
      if (Math.abs(o.x - x) < w && o.y < 0 && o.y > -h * 2) return;
    }
    const colorIdx = Math.floor(Math.random() * OBS_COLORS.length);
    this.obstacles.push({ x, y: -h - 20, w, h, type, colorIdx, lane });
  }

  spawnCoin() {
    const lane = Math.floor(Math.random() * this.laneCount);
    const r = this.laneWidth * 0.18;
    const x = this.roadLeft + lane * this.laneWidth + (this.laneWidth - r * 2) / 2;
    this.coins.push({ x, y: -r * 2 - 10, r, lane });
  }

  spawnNitroPickup() {
    const lane = Math.floor(Math.random() * this.laneCount);
    const r = this.laneWidth * 0.22;
    const x = this.roadLeft + lane * this.laneWidth + (this.laneWidth - r * 2) / 2;
    // Don't spawn on top of existing pickups
    for (const np of this.nitroPickups) {
      if (np.lane === lane && np.y < 0) return;
    }
    this.nitroPickups.push({ x, y: -r * 2 - 10, r, lane });
  }
  
  destroyObstacle(index, o) {
    const ox = o.x + o.w / 2;
    const oy = o.y + o.h / 2;
    
    // Explosion particles
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4;
      this.particles.push({
        x: ox, y: oy,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - this.speed,
        life: 20 + Math.random() * 20, maxLife: 40,
        size: 2 + Math.random() * 4,
        color: ['#ef4444', '#f97316', '#fff'][Math.floor(Math.random() * 3)]
      });
    }
    
    this.shake.intensity = 8;
    this.sound.playTone(150, 0.2, 'sawtooth', 0.15); // Deep thud sound
    this.obstacles.splice(index, 1);
    this.score += 500; // Bonus for destroying obstacles!
  }

  updateNitroHUD() {
    const container = document.getElementById('nitro-charges');
    if (!container) return;
    let html = '';
    for (let i = 0; i < this.maxNitroCharges; i++) {
      html += `<span class="nitro-charge ${i < this.nitroCharges ? 'filled' : ''}${this.nitroActive && i === this.nitroCharges ? ' using' : ''}">⚡</span>`;
    }
    container.innerHTML = html;
    // Nitro bar timer
    const bar = document.getElementById('nitro-bar-fill');
    if (bar) {
      if (this.nitroActive) {
        bar.style.width = (this.nitroTimer / this.nitroDuration * 100) + '%';
        bar.parentElement.classList.add('active');
      } else {
        bar.style.width = '0%';
        bar.parentElement.classList.remove('active');
      }
    }
  }

  checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    const shrink = 4;
    return x1 + shrink < x2 + w2 - shrink && x1 + w1 - shrink > x2 + shrink &&
           y1 + shrink < y2 + h2 - shrink && y1 + h1 - shrink > y2 + shrink;
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  // ==========================================
  // RENDERING
  // ==========================================
  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);

    this.drawBackground(ctx);
    this.drawRoad(ctx);
    this.drawTrees(ctx);
    this.drawCoins(ctx);
    this.drawNitroPickups(ctx);
    this.drawObstacles(ctx);
    if (this.state === 'playing' || this.state === 'gameover') this.drawPlayer(ctx);
    this.drawParticles(ctx);

    // Nitro vignette
    if (this.nitroActive && this.state === 'playing') {
      const g = ctx.createRadialGradient(this.W / 2, this.H / 2, this.W * 0.2, this.W / 2, this.H / 2, this.W);
      g.addColorStop(0, 'transparent');
      g.addColorStop(0.7, `rgba(56, 189, 248, ${0.05 + Math.sin(this.frame * 0.1) * 0.03})`);
      g.addColorStop(1, `rgba(99, 102, 241, ${0.2 + Math.sin(this.frame * 0.08) * 0.05})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    ctx.restore();
  }

  drawBackground(ctx) {
    // Sky / grass
    ctx.fillStyle = '#1a472a';
    ctx.fillRect(0, 0, this.W, this.H);

    // Grass texture stripes
    ctx.globalAlpha = 0.15;
    for (let y = -40 + (this.roadOffset * 0.5) % 20; y < this.H; y += 20) {
      ctx.fillStyle = '#2d5a3a';
      ctx.fillRect(0, y, this.W, 8);
    }
    ctx.globalAlpha = 1;
  }

  drawRoad(ctx) {
    const rl = this.roadLeft, rr = this.roadRight, rw = rr - rl;

    // Road shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(rl - 4, 0, rw + 8, this.H);

    // Road surface
    ctx.fillStyle = '#2a2a2e';
    ctx.fillRect(rl, 0, rw, this.H);

    // Road texture
    ctx.globalAlpha = 0.05;
    for (let y = -40 + this.roadOffset % 8; y < this.H; y += 8) {
      ctx.fillStyle = y % 16 < 8 ? '#333' : '#222';
      ctx.fillRect(rl, y, rw, 4);
    }
    ctx.globalAlpha = 1;

    // Edge lines (solid yellow)
    ctx.fillStyle = '#eab308';
    ctx.fillRect(rl, 0, 3, this.H);
    ctx.fillRect(rr - 3, 0, 3, this.H);

    // Lane dashes
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 1; i < this.laneCount; i++) {
      const x = rl + i * this.laneWidth - 1;
      for (let y = -40 + this.roadOffset; y < this.H; y += 40) {
        ctx.fillRect(x, y, 2, 22);
      }
    }

    // Shoulder markings
    ctx.fillStyle = '#ef4444';
    const shW = 5;
    for (let y = -40 + this.roadOffset; y < this.H; y += 30) {
      ctx.fillRect(rl - shW - 2, y, shW, 15);
      ctx.fillRect(rr + 2, y, shW, 15);
    }
  }

  drawTrees(ctx) {
    for (const t of this.roadTrees) {
      // Trunk
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(t.x + t.r * 0.35, t.y + t.r * 0.5, t.r * 0.3, t.r * 0.5);
      // Canopy
      ctx.beginPath();
      ctx.arc(t.x + t.r * 0.5, t.y + t.r * 0.4, t.r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = t.color;
      ctx.fill();
    }
  }

  drawPlayer(ctx) {
    const skin = SKINS[this.player.skin] || SKINS[0];
    
    ctx.save();
    ctx.translate(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
    ctx.rotate(this.player.rotation);

    // Power Aura if nitro is active (indestructible state)
    if (this.nitroActive) {
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 15 + Math.sin(this.frame * 0.2) * 10;
      
      // Outer glow ring
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.w * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    drawCar(ctx, -this.player.w / 2, -this.player.h / 2, this.player.w, this.player.h, skin, true);
    ctx.restore();
  }

  drawObstacles(ctx) {
    for (const o of this.obstacles) {
      if (o.type === 'car') {
        drawCar(ctx, o.x, o.y, o.w, o.h, OBS_COLORS[o.colorIdx], false);
      } else if (o.type === 'cone') {
        drawCone(ctx, o.x, o.y, o.w);
      } else if (o.type === 'barrier') {
        drawBarrier(ctx, o.x, o.y, o.w, o.h);
      }
    }
  }

  drawCoins(ctx) {
    for (const c of this.coins) {
      drawCoinSprite(ctx, c.x + c.r, c.y + c.r, c.r, this.frame);
    }
  }

  drawNitroPickups(ctx) {
    for (const np of this.nitroPickups) {
      drawNitroPickup(ctx, np.x + np.r, np.y + np.r, np.r, this.frame);
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ==========================================
// INIT
// ==========================================
window.addEventListener('load', () => { new Game(); });
