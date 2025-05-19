/* js/main.js */
let game; // Instância global do jogo

// --- Canvas e Contexto ---
const canvas = document.getElementById('gameCanvas'); 
const ctx = canvas.getContext('2d'); 

// --- Gerenciamento de Entradas (Teclado) ---
const keys = {}; 
window.addEventListener('keydown', e => {
    keys[e.code] = true; 
    if (e.code === 'KeyP' || e.code === 'Escape') { 
        if (game && (game.gameState === 'playing' || game.gameState === 'paused')) {
            game.togglePause(); 
        }
    }
});
window.addEventListener('keyup', e => {
    keys[e.code] = false; 
});

// --- Função Auxiliar para Carregar Imagens ---
function loadImage(src) {
  const img = new Image(); 
  img.src = src; 
  return img; 
}

// --- Pré-carregamento de Assets (Imagens e Sons) ---
const assets = {
  background: loadImage('assets/images/background.png'),
  ship: loadImage('assets/images/ship.png'),
  asteroid: loadImage('assets/images/asteroid.png'),
  explosionImg: loadImage('assets/images/explosion.png'),
  pu_shield: loadImage('assets/images/escudo.png'),    
  pu_double: loadImage('assets/images/tiroduplo.png'), 
  heartFull: loadImage('assets/images/heart_full.png'), 
  heartEmpty: loadImage('assets/images/heart_empty.png'),
  shootSound: new Audio('assets/sounds/effects/shoot.wav'),    
  explodeSound: new Audio('assets/sounds/effects/explosion.wav'),
  gameSoundtrack: new Audio('assets/sounds/music/soundtrack.mp3') // Trilha sonora do jogo
};
// Configura a trilha sonora do jogo para loop
assets.gameSoundtrack.loop = true;


// --- Classe da Nave (Ship) ---
class Ship {
  constructor() { this.reset(); }
  reset() { this.x = canvas.width/2; this.y = canvas.height/2; this.angle=0; this.vx=0; this.vy=0; this.radius=20; this.lives=3; this.score=0; }
  update() {
    if(keys['ArrowLeft']||keys['KeyA'])this.angle-=0.05; if(keys['ArrowRight']||keys['KeyD'])this.angle+=0.05;
    if(keys['ArrowUp']||keys['KeyW']){const t=0.15,r=this.angle-Math.PI/2;this.vx+=Math.cos(r)*t;this.vy+=Math.sin(r)*t;}
    this.vx*=0.99;this.vy*=0.99;this.x=(this.x+this.vx+canvas.width)%canvas.width;this.y=(this.y+this.vy+canvas.height)%canvas.height;
  }
  draw() {
    ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.angle);
    if(assets.ship.complete&&assets.ship.naturalHeight!==0)ctx.drawImage(assets.ship,-25,-25,50,50);
    else{ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(10,10);ctx.lineTo(-10,10);ctx.closePath();ctx.strokeStyle='white';ctx.stroke();}
    ctx.restore();
  }
}

// --- Classe do Asteroide (Asteroid) ---
class Asteroid {
  constructor(x,y,s){this.x=x;this.y=y;this.size=s;this.hp=s;this.speed=1+Math.random()*1.5;this.angle=Math.random()*2*Math.PI;this.radius=s*15;}
  update(){this.x=(this.x+Math.cos(this.angle)*this.speed+canvas.width)%canvas.width;this.y=(this.y+Math.sin(this.angle)*this.speed+canvas.height)%canvas.height;}
  draw(){
    ctx.save();ctx.translate(this.x,this.y);
    if(assets.asteroid.complete&&assets.asteroid.naturalHeight!==0)ctx.drawImage(assets.asteroid,-this.radius,-this.radius,this.radius*2,this.radius*2);
    else{ctx.beginPath();ctx.arc(0,0,this.radius,0,Math.PI*2);ctx.strokeStyle='grey';ctx.stroke();}
    ctx.restore();
  }
}

// --- Classe do Projétil (Bullet) ---
class Bullet {
  constructor(x,y,a){this.x=x;this.y=y;this.angle=a;this.speed=7;this.radius=3;}
  update(){this.x+=Math.cos(this.angle)*this.speed;this.y+=Math.sin(this.angle)*this.speed;}
  draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,2*Math.PI);ctx.fillStyle='#fff';ctx.fill();}
}

// --- Classe da Explosão (Explosion) ---
class Explosion {
  constructor(x,y,s){this.x=x;this.y=y;this.size=s;this.timer=20;if(assets.explodeSound&&typeof assets.explodeSound.play==='function'){const snd=assets.explodeSound.cloneNode();snd.currentTime=0;snd.play().catch(e=>console.warn("Falha ao tocar áudio (explosão):",e));}}
  update(){this.timer--;}
  draw(){
    const d=this.size*30;
    if(assets.explosionImg.complete&&assets.explosionImg.naturalHeight!==0)ctx.drawImage(assets.explosionImg,this.x-d/2,this.y-d/2,d,d);
    else{ctx.fillStyle=`rgba(255,100,0,${this.timer/20})`;ctx.beginPath();ctx.arc(this.x,this.y,d/2,0,Math.PI*2);ctx.fill();}
  }
}

// --- Classe do Power-up (PowerUp) ---
class PowerUp {
  constructor(x,y,t){this.x=x;this.y=y;this.type=t;this.radius=t==='life'?12:16;}
  update(){} 
  draw(){
    let img,iW=this.radius*2,iH=this.radius*2; 
    switch(this.type){case 'shield':img=assets.pu_shield;break;case 'double':img=assets.pu_double;break;case 'life':img=assets.heartFull;iW=24;iH=24;break;default:img=null;}
    if(img&&img.complete&&img.naturalHeight!==0)ctx.drawImage(img,this.x-iW/2,this.y-iH/2,iW,iH);
    else{let c='grey',txt='?';if(this.type==='shield'){c='rgba(0,0,255,0.7)';txt='S';}else if(this.type==='double'){c='rgba(255,255,0,0.7)';txt='D';}else if(this.type==='life'){c='rgba(255,0,0,0.7)';txt='L';}
    ctx.fillStyle=c;ctx.beginPath();if(this.type==='life')ctx.fillRect(this.x-iW/2,this.y-iH/2,iW,iH);else{ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${iW*0.6}px Arial`;ctx.fillText(txt,this.x,this.y);}
  }
}

// --- Lógica Principal do Jogo (Classe Game) ---
class Game {
  constructor() {
    this.ship = new Ship();
    this.asteroids = []; this.bullets = []; this.explosions = []; this.powerUps = [];
    this.wave = 0; this.lastShot = 0; 
    this.shieldCount = 0; this.shieldTime = 0; 
    this.doubleActive = false; this.doubleTime = 0; 
    this.animationFrameId = null; 
    this.maxLives = 3; 
    this.gameState = 'menu'; 
    this.isGameSoundtrackPlaying = false; // Flag para controlar a trilha sonora do jogo
    this.isGameMusicEnabledByUser = true; // Se o usuário habilitou a música do jogo

    const btnW = 250, btnH = 50, btnYOff = 60; // Ajuste na altura do botão e offset
    const menuBtnY = canvas.height / 2 + 50; 

    this.menuStartButton = {
        x: canvas.width / 2 - btnW / 2, y: menuBtnY,
        width: btnW, height: btnH, text: 'Iniciar Jogo',
        font: '22px "Press Start 2P"', 
        color: '#00eaff', hoverColor: '#00b8d4', textColor: '#000010', isHovered: false,
        borderColor: '#00eaff', hoverBorderColor: '#ffffff'
    };
    this.newGameButton = { 
        x: canvas.width / 2 - (btnW-50) / 2, y: canvas.height / 2 + 20,
        width: btnW-50, height: btnH-10, text: 'Tentar Novamente',
        font: '18px "Press Start 2P"',
        color: '#007bff', hoverColor: '#0056b3', textColor: '#fff', isHovered: false,
        borderColor: '#007bff', hoverBorderColor: '#fff'
    };
    this.resumeButton = { 
        x: canvas.width / 2 - btnW / 2, y: canvas.height / 2 - btnH - btnYOff / 2 + 20, // Posição ajustada
        width: btnW, height: btnH, text: 'Continuar Jogo',
        font: '20px "Press Start 2P"',
        color: '#28a745', hoverColor: '#1e7e34', textColor: '#fff', isHovered: false,
        borderColor: '#28a745', hoverBorderColor: '#fff'
    };
    this.quitButton = { 
        x: canvas.width / 2 - btnW / 2, y: canvas.height / 2 - btnYOff / 2 + 20, // Posição ajustada
        width: btnW, height: btnH, text: 'Sair do Jogo',
        font: '20px "Press Start 2P"',
        color: '#dc3545', hoverColor: '#b02a37', textColor: '#fff', isHovered: false,
        borderColor: '#dc3545', hoverBorderColor: '#fff'
    };
    // Novo botão para controlar a música do jogo no menu de pausa
    this.gameMusicToggleButton = {
        x: canvas.width / 2 - btnW / 2,
        y: this.quitButton.y + btnH + 15, // Posicionado abaixo do botão "Sair do Jogo"
        width: btnW, height: btnH, text: 'Música Jogo: ON', // Texto inicial
        font: '18px "Press Start 2P"',
        color: '#ffc107', hoverColor: '#e0a800', textColor: '#000', isHovered: false,
        borderColor: '#ffc107', hoverBorderColor: '#fff'
    };
  }

  start() {
    if (this.animationFrameId && this.gameState !== 'playing') { 
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.ship.reset(); this.ship.lives = 3; this.ship.score = 0;
    this.asteroids.length = 0; this.bullets.length = 0;
    this.explosions.length = 0; this.powerUps.length = 0;
    this.wave = 0; this.shieldCount = 0; this.shieldTime = 0;
    this.doubleActive = false; this.doubleTime = 0; this.lastShot = 0;
    
    this.gameState = 'playing'; 
    this.playSoundtrack();
    if (!this.animationFrameId) { 
        this.loop();
    }
  }

  playSoundtrack() {
    // Toca a trilha sonora do jogo se estiver habilitada pelo usuário e pausada
    if (this.isGameMusicEnabledByUser && assets.gameSoundtrack && assets.gameSoundtrack.paused) {
        assets.gameSoundtrack.currentTime = 0; 
        assets.gameSoundtrack.play().then(() => {
            this.isGameSoundtrackPlaying = true;
        }).catch(error => {
            console.warn("Autoplay da trilha sonora do jogo bloqueado:", error);
        });
    }
  }

  pauseSoundtrack() {
    // Pausa a trilha sonora do jogo se estiver tocando
    if (assets.gameSoundtrack && !assets.gameSoundtrack.paused) {
        assets.gameSoundtrack.pause();
    }
    this.isGameSoundtrackPlaying = false; 
  }

  resumeSoundtrack() {
    // Retoma a trilha sonora do jogo se estiver habilitada e o jogo estiver no estado 'playing'
    if (this.isGameMusicEnabledByUser && assets.gameSoundtrack && assets.gameSoundtrack.paused && this.gameState === 'playing') {
        assets.gameSoundtrack.play().then(() => {
            this.isGameSoundtrackPlaying = true;
        }).catch(error => console.warn("Erro ao retomar trilha sonora do jogo:", error));
    }
  }
  
  toggleGameMusic() {
    // Alterna o estado da música do jogo (habilitada/desabilitada pelo usuário)
    this.isGameMusicEnabledByUser = !this.isGameMusicEnabledByUser;
    if (this.isGameMusicEnabledByUser) {
        this.gameMusicToggleButton.text = 'Música Jogo: ON';
        // Se o jogo estiver pausado, mas a música foi reabilitada, ela tocará ao despausar.
        // Se o jogo estiver rodando, tenta tocar imediatamente.
        if (this.gameState === 'playing' || this.gameState === 'paused') { // Se pausado, tocará ao despausar
             this.resumeSoundtrack(); // Tenta tocar se o jogo estiver 'playing' ou preparar para tocar ao despausar
        }
    } else {
        this.gameMusicToggleButton.text = 'Música Jogo: OFF';
        this.pauseSoundtrack();
    }
  }


  stopAndShowGameOver() { 
    this.gameState = 'gameOver'; 
    this.pauseSoundtrack(); 
  }

  togglePause() { 
    if (this.gameState === 'playing') {
        this.gameState = 'paused';
        // A música não é pausada aqui automaticamente, o usuário controla pelo botão no menu de pausa
        // ou ela para se this.isGameMusicEnabledByUser for false.
        // Se quiser que pause sempre ao pausar o jogo, descomente: this.pauseSoundtrack();
    } else if (this.gameState === 'paused') {
        this.gameState = 'playing';
        this.resumeSoundtrack(); // Tenta retomar a música se habilitada
    }
  }
  resumeGame() { 
    if (this.gameState === 'paused') {
        this.gameState = 'playing'; 
        this.resumeSoundtrack(); // Tenta retomar a música se habilitada
    }
  }
  quitGameToMenu() { 
    this.gameState = 'menu'; 
    this.pauseSoundtrack(); 
  }

  nextWave() {
    this.wave++;
    const sA = 3 + this.wave, mA = this.wave >= 2 ? this.wave : 0, lA = this.wave >= 3 ? this.wave - 2 : 0;
    for (let i = 0; i < sA; i++) this.spawnAsteroid(1);
    for (let i = 0; i < mA; i++) this.spawnAsteroid(2);
    for (let i = 0; i < lA; i++) this.spawnAsteroid(3);
  }

  spawnAsteroid(size) {
    let x, y, dist;
    const sX = this.ship ? this.ship.x : canvas.width/2, sY = this.ship ? this.ship.y : canvas.height/2;
    const sR = this.ship ? this.ship.radius : 20, aR = size * 15, safeB = 100 + aR;
    do {
      x = Math.random()*canvas.width; y = Math.random()*canvas.height;
      dist = Math.hypot(x-sX, y-sY);
    } while (dist < aR + sR + safeB);
    this.asteroids.push(new Asteroid(x, y, size));
  }

  loop() {
    if (this.gameState === 'playing') {
        this.update();
    }
    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  update() {
    this.ship.update();
    this.asteroids.forEach(a => a.update());
    this.bullets.forEach(b => b.update());
    this.powerUps.forEach(p => p.update());
    this.explosions.forEach(e => e.update());

    if (this.shieldCount > 0 && Date.now() - this.shieldTime > 8000) this.shieldCount = 0;
    if (this.doubleActive && Date.now() - this.doubleTime > 10000) this.doubleActive = false;

    if (keys['Space'] && (Date.now() - this.lastShot > 300)) {
      const rad = this.ship.angle - Math.PI/2;
      if (this.doubleActive) { this.fire(rad - 0.1); this.fire(rad + 0.1); }
      else { this.fire(rad); }
      if (assets.shootSound && typeof assets.shootSound.play === 'function') {
        assets.shootSound.currentTime = 0;
        assets.shootSound.play().catch(e => console.warn("Falha ao tocar áudio (tiro):", e));
      }
      this.lastShot = Date.now();
    }

    this.bullets = this.bullets.filter(b => b.x>=0 && b.x<=canvas.width && b.y>=0 && b.y<=canvas.height);

    let nextAsteroids = [];
    for (let a of this.asteroids) {
      let asteroidHit = false;
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius) {
          this.bullets.splice(i, 1); a.hp--;
          if (a.hp <= 0) { 
            asteroidHit = true; this.ship.score += 10 * a.size;
            this.explosions.push(new Explosion(a.x, a.y, a.size));
            if (a.size > 1) { this.spawnAsteroidFragment(a.x,a.y,a.size-1); this.spawnAsteroidFragment(a.x,a.y,a.size-1); }
            if (Math.random() < 0.20) { 
                const rT = Math.random(); let pT;
                if (rT < 0.40) pT = 'shield'; else if (rT < 0.80) pT = 'double'; else pT = 'life';
                this.powerUps.push(new PowerUp(a.x, a.y, pT));
            }
          } break; 
        }
      }
      if (!asteroidHit) nextAsteroids.push(a); 
    }
    this.asteroids = nextAsteroids; 

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      if (Math.hypot(a.x - this.ship.x, a.y - this.ship.y) < a.radius + this.ship.radius) {
        if (this.shieldCount > 0) { 
          this.shieldCount--; this.explosions.push(new Explosion(a.x, a.y, a.size));
          this.asteroids.splice(i, 1); 
        } else { 
          this.ship.lives--;
          this.explosions.push(new Explosion(this.ship.x, this.ship.y, 2)); 
          this.explosions.push(new Explosion(a.x, a.y, a.size)); 
          this.asteroids.splice(i, 1); 
          if (this.ship.lives <= 0) { this.stopAndShowGameOver(); return; } 
          else { 
            this.ship.x = canvas.width/2; this.ship.y = canvas.height/2; this.ship.vx=0; this.ship.vy=0; 
          }
        }
      }
    }
    this.powerUps = this.powerUps.filter(p => {
      if (Math.hypot(p.x - this.ship.x, p.y - this.ship.y) < p.radius + this.ship.radius) {
        if (p.type === 'shield') { this.shieldCount = 3; this.shieldTime = Date.now(); }
        else if (p.type === 'double') { this.doubleActive = true; this.doubleTime = Date.now(); }
        else if (p.type === 'life' && this.ship.lives < this.maxLives) { this.ship.lives++; }
        return false; 
      } return true; 
    });
    
    this.explosions = this.explosions.filter(e => e.timer > 0);
    
    if (this.asteroids.length === 0 && this.explosions.length === 0) { 
      this.nextWave();
    }
  }

  spawnAsteroidFragment(x,y,size) { if(size<=0)return;this.asteroids.push(new Asteroid(x+(Math.random()-0.5)*10,y+(Math.random()-0.5)*10,size)); }
  fire(angle) { const bX=this.ship.x+Math.cos(angle)*25,bY=this.ship.y+Math.sin(angle)*25;this.bullets.push(new Bullet(bX,bY,angle));}

  draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (assets.background.complete && assets.background.naturalHeight !== 0) {
      ctx.drawImage(assets.background, 0, 0, canvas.width, canvas.height);
    } else { ctx.fillStyle = '#000010'; ctx.fillRect(0,0,canvas.width,canvas.height); }

    if (this.gameState === 'playing') this.drawPlayingState();
    else if (this.gameState === 'gameOver') this.drawGameOverScreen();
    else if (this.gameState === 'menu') this.drawMenuScreen();
    else if (this.gameState === 'paused') this.drawPauseScreen();
  }
  
  drawPlayingState() {
    if (this.ship.lives > 0) this.ship.draw();
    this.asteroids.forEach(a => a.draw());
    this.bullets.forEach(b => b.draw());
    this.powerUps.forEach(p => p.draw());
    this.explosions.forEach(e => e.draw()); 

    if (this.shieldCount > 0 && this.ship.lives > 0) {
      ctx.beginPath(); ctx.arc(this.ship.x,this.ship.y,this.ship.radius+5+(this.shieldCount*2),0,Math.PI*2);
      ctx.strokeStyle = `rgba(0,150,255,${0.2+(this.shieldCount*0.2)})`; ctx.lineWidth=3; ctx.stroke();
    }
    this.drawHUD();
  }

  drawHUD() {
    const hudMarginX = 10; let currentHudY = 10;
    const heartSize = 24; const heartSpacing = 4; const textLineHeight = 25;
    for (let i = 0; i < this.maxLives; i++) {
      const img = i < this.ship.lives ? assets.heartFull : assets.heartEmpty;
      if (img.complete && img.naturalHeight !== 0) ctx.drawImage(img, hudMarginX + i * (heartSize + heartSpacing), currentHudY, heartSize, heartSize);
      else { ctx.fillStyle = i < this.ship.lives ? 'red' : 'grey'; ctx.fillRect(hudMarginX + i * (heartSize + heartSpacing), currentHudY, heartSize, heartSize);
             ctx.strokeStyle = 'white'; ctx.strokeRect(hudMarginX + i * (heartSize + heartSpacing), currentHudY, heartSize, heartSize); }
    }
    currentHudY += heartSize + (textLineHeight / 2); 
    ctx.fillStyle = '#fff'; ctx.font = '18px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${this.ship.score}`, hudMarginX, currentHudY);
    currentHudY += textLineHeight;
    ctx.fillText(`Onda: ${this.wave}`, hudMarginX, currentHudY);
  }
  
  drawMenuScreen() {
    ctx.fillStyle = '#00eaff'; 
    ctx.font = '48px "Press Start 2P", Arial, sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00eaff'; 
    ctx.shadowBlur = 15;
    ctx.fillText('Galaxy Guardian', canvas.width / 2, canvas.height / 2 - 120);
    ctx.shadowBlur = 0; 

    ctx.fillStyle = '#e0e0e0'; 
    ctx.font = '16px "Roboto", Arial, sans-serif'; 
    const instructions = [
        "Use Setas ou W,A,S,D para mover.",
        "Barra de Espaço para atirar.",
        "P ou ESC para pausar o jogo."
    ];
    instructions.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, canvas.height / 2 - 30 + (index * 25));
    });
    
    const btn = this.menuStartButton;
    this.fancyButton(btn.x, btn.y, btn.width, btn.height, 15, 
                     btn.isHovered ? btn.hoverColor : btn.color, 
                     btn.isHovered ? btn.hoverBorderColor : btn.borderColor, 
                     btn.text, btn.font, btn.textColor);
  }

  drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0,0,canvas.width,canvas.height); 
    ctx.fillStyle = '#ff4444'; ctx.font = '48px "Press Start 2P", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 100);
    ctx.fillStyle = '#fff'; ctx.font = '24px Arial';
    ctx.fillText(`Pontuação Final: ${this.ship.score}`, canvas.width/2, canvas.height/2 - 30);
    
    const btn = this.newGameButton;
    this.fancyButton(btn.x, btn.y, btn.width, btn.height, 10, 
                     btn.isHovered ? btn.hoverColor : btn.color, 
                     btn.isHovered ? btn.hoverBorderColor : btn.borderColor, 
                     btn.text, btn.font, btn.textColor);
  }

  drawPauseScreen() {
    this.drawPlayingState(); 
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; 
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = '#FFF'; ctx.font = '40px "Press Start 2P", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Jogo Pausado', canvas.width/2, canvas.height/2 - 120);
    ctx.font = '20px Arial';
    ctx.fillText(`Pontuação Atual: ${this.ship.score}`, canvas.width/2, canvas.height/2 - 60);

    const resBtn = this.resumeButton;
    this.fancyButton(resBtn.x, resBtn.y, resBtn.width, resBtn.height, 10, 
                     resBtn.isHovered ? resBtn.hoverColor : resBtn.color, 
                     resBtn.isHovered ? resBtn.hoverBorderColor : resBtn.borderColor, 
                     resBtn.text, resBtn.font, resBtn.textColor);

    const quitBtn = this.quitButton;
    this.fancyButton(quitBtn.x, quitBtn.y, quitBtn.width, quitBtn.height, 10, 
                     quitBtn.isHovered ? quitBtn.hoverColor : quitBtn.color, 
                     quitBtn.isHovered ? quitBtn.hoverBorderColor : quitBtn.borderColor, 
                     quitBtn.text, quitBtn.font, quitBtn.textColor);
    
    // Desenha o botão de controle de música do jogo
    const musicBtn = this.gameMusicToggleButton;
    this.fancyButton(musicBtn.x, musicBtn.y, musicBtn.width, musicBtn.height, 10,
                     musicBtn.isHovered ? musicBtn.hoverColor : musicBtn.color,
                     musicBtn.isHovered ? musicBtn.hoverBorderColor : musicBtn.borderColor,
                     musicBtn.text, musicBtn.font, musicBtn.textColor);
  }

  fancyButton(x, y, width, height, radius, fillColor, borderColor, text, font, textColor) {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3; 
    
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke(); 

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; 
    ctx.lineWidth = 1.5; 
    ctx.beginPath();
    ctx.moveTo(x + radius + 2, y + 2); 
    ctx.lineTo(x + width - radius - 2, y + 2);
    ctx.quadraticCurveTo(x + width - 2, y + 2, x + width - 2, y + radius + 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; 
    ctx.beginPath();
    ctx.moveTo(x + width - radius - 2, y + height - 2);
    ctx.lineTo(x + radius + 2, y + height - 2);
    ctx.quadraticCurveTo(x + 2, y + height - 2, x + 2, y + height - radius - 2);
    ctx.moveTo(x + 2, y + height - radius - 2); 
    ctx.lineTo(x + 2, y + radius + 2); 
    ctx.stroke();


    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    ctx.fillText(text, x + width / 2, y + height / 2);
    ctx.shadowColor = 'transparent'; 
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }


  handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const mX = event.clientX - rect.left, mY = event.clientY - rect.top; 

    if (this.gameState === 'menu') {
        const btn = this.menuStartButton;
        if (mX>=btn.x && mX<=btn.x+btn.width && mY>=btn.y && mY<=btn.y+btn.height) this.start();
    } else if (this.gameState === 'gameOver') {
        const btn = this.newGameButton;
        if (mX>=btn.x && mX<=btn.x+btn.width && mY>=btn.y && mY<=btn.y+btn.height) this.start();
    } else if (this.gameState === 'paused') {
        const resBtn = this.resumeButton;
        if (mX>=resBtn.x && mX<=resBtn.x+resBtn.width && mY>=resBtn.y && mY<=resBtn.y+resBtn.height) this.resumeGame();
        
        const quitBtn = this.quitButton;
        if (mX>=quitBtn.x && mX<=quitBtn.x+quitBtn.width && mY>=quitBtn.y && mY<=quitBtn.y+btn.height) this.quitGameToMenu();

        const musicBtn = this.gameMusicToggleButton;
        if (mX>=musicBtn.x && mX<=musicBtn.x+musicBtn.width && mY>=musicBtn.y && mY<=musicBtn.y+musicBtn.height) this.toggleGameMusic();
    }
  }
  
  handleCanvasMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const mX = event.clientX-rect.left, mY = event.clientY-rect.top;
    let onButton = false; 

    this.menuStartButton.isHovered = false;
    this.newGameButton.isHovered = false;
    this.resumeButton.isHovered = false;
    this.quitButton.isHovered = false;
    this.gameMusicToggleButton.isHovered = false; // Reseta o hover do novo botão

    if (this.gameState === 'menu') {
        const btn = this.menuStartButton;
        if (mX>=btn.x && mX<=btn.x+btn.width && mY>=btn.y && mY<=btn.y+btn.height) {
            btn.isHovered = true; onButton = true;
        }
    } else if (this.gameState === 'gameOver') {
        const btn = this.newGameButton;
         if (mX>=btn.x && mX<=btn.x+btn.width && mY>=btn.y && mY<=btn.y+btn.height) {
            btn.isHovered = true; onButton = true;
        }
    } else if (this.gameState === 'paused') {
        const resBtn = this.resumeButton;
        if (mX>=resBtn.x && mX<=resBtn.x+resBtn.width && mY>=resBtn.y && mY<=resBtn.y+resBtn.height) {
            resBtn.isHovered = true; onButton = true;
        }
        const quitBtn = this.quitButton;
        if (mX>=quitBtn.x && mX<=quitBtn.x+quitBtn.width && mY>=quitBtn.y && mY<=quitBtn.y+quitBtn.height) { // Corrigido: quitBtn.height
            quitBtn.isHovered = true; onButton = true;
        }
        const musicBtn = this.gameMusicToggleButton;
        if (mX>=musicBtn.x && mX<=musicBtn.x+musicBtn.width && mY>=musicBtn.y && mY<=musicBtn.y+musicBtn.height) {
            musicBtn.isHovered = true; onButton = true;
        }
    }
    canvas.style.cursor = onButton ? 'pointer' : 'default';
  }
}

// --- Inicialização do Jogo ---
document.addEventListener('DOMContentLoaded', () => {
  const fontLink=document.createElement('link');
  fontLink.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Roboto:wght@300;400;700&display=swap';
  fontLink.rel='stylesheet';
  document.head.appendChild(fontLink);
  
  if (!game) { 
    game = new Game(); 
    game.loop(); 
  }
  
  canvas.addEventListener('click', (e) => { if (game) game.handleCanvasClick(e); });
  canvas.addEventListener('mousemove', (e) => { if (game) game.handleCanvasMouseMove(e); });
});
