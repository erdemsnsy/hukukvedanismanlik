// Force scroll to top on reload/refresh (F5) or initial load without hash
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
if (isReload || !window.location.hash) {
    window.scrollTo(0, 0);
    window.addEventListener('load', () => {
        window.scrollTo(0, 0);
    });
}

// ============================================================
// ===== GÜVENLİK & YARDIMCI FONKSİYONLAR =====
// Bu blok tüm sayfalarda kullanılan ortak güvenlik ve UX
// fonksiyonlarını içerir. script.js her sayfada yüklendiğinden
// burada tanımlanmaları yeterlidir.
// ============================================================

/**
 * escapeHtml — XSS Koruması
 * Kullanıcıdan gelen metin değerlerini güvenli hale getirir.
 * HTML özel karakterlerini (&, <, >, ", ') entity'lere dönüştürür.
 * Bu fonksiyon, innerHTML ile DOM'a yazılan her kullanıcı inputunda
 * MUTLAKA çağrılmalıdır.
 * 
 * @param {string} str — Sanitize edilecek metin
 * @returns {string} — HTML-safe metin
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

/**
 * RateLimiter — Spam ve Kötüye Kullanım Koruması
 * Client-side cooldown mekanizması. Belirli bir işlemin
 * art arda çok hızlı tetiklenmesini engeller.
 * 
 * Kullanım:
 *   const limiter = new RateLimiter(3000); // 3 saniye cooldown
 *   if (!limiter.canProceed()) { showToast('...'); return; }
 * 
 * @param {number} cooldownMs — İki işlem arası minimum milisaniye
 */
function RateLimiter(cooldownMs) {
    this.cooldownMs = cooldownMs || 3000;
    this.lastAction = 0;
}

RateLimiter.prototype.canProceed = function() {
    var now = Date.now();
    if (now - this.lastAction < this.cooldownMs) {
        return false;
    }
    this.lastAction = now;
    return true;
};

// Sayfa genelinde kullanılan rate limiter instance'ları
var dilekceRateLimiter = new RateLimiter(3000);   // Dilekçe formu: 3sn
var chatRateLimiter = new RateLimiter(800);        // Chat widget: 0.8sn
var hesaplamaRateLimiter = new RateLimiter(2000);  // Hesaplama: 2sn

/**
 * showToast — Kullanıcıya Bildirim Gösterme
 * alert() yerine kullanılan modern, overlay olmayan bildirim.
 * Ekranın alt-ortasında belirip otomatik kaybolur.
 * 
 * @param {string} message — Gösterilecek mesaj metni
 * @param {string} type — 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration — Görünür kalma süresi (ms), varsayılan 3500
 */
function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3500;

    // Toast container yoksa oluştur
    var container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }

    // Toast ikonları
    var icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    // Toast renkleri
    var colors = {
        success: 'rgba(34,197,94,0.15)',
        error: 'rgba(239,68,68,0.15)',
        warning: 'rgba(234,179,8,0.15)',
        info: 'rgba(201,169,110,0.15)'
    };
    var borderColors = {
        success: 'rgba(34,197,94,0.4)',
        error: 'rgba(239,68,68,0.4)',
        warning: 'rgba(234,179,8,0.4)',
        info: 'rgba(201,169,110,0.4)'
    };

    var toast = document.createElement('div');
    toast.style.cssText = 'pointer-events:auto;background:' + (colors[type] || colors.info) + ';border:1px solid ' + (borderColors[type] || borderColors.info) + ';backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#fff;padding:14px 24px;border-radius:14px;font-size:0.92rem;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,0.3);opacity:0;transform:translateY(20px);transition:all 0.35s cubic-bezier(0.4,0,0.2,1);max-width:90vw;text-align:center;';

    toast.innerHTML = '<span style="font-size:1.1rem;">' + (icons[type] || icons.info) + '</span><span>' + escapeHtml(message) + '</span>';
    container.appendChild(toast);

    // Animasyonlu giriş
    requestAnimationFrame(function() {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Otomatik kaldırma
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
    }, duration);
}

/**
 * Global Error Handler — Teknik Detay Sızıntısını Önler
 * Yakalanmamış hatalar konsola yazılmaz, kullanıcıya
 * anlaşılır bir mesaj gösterilir. Stack trace, API bilgisi
 * gibi hassas veriler asla son kullanıcıya ulaşmaz.
 */
window.onerror = function(message, source, lineno, colno, error) {
    // Teknik detayları gizle, kullanıcıya genel mesaj göster
    showToast('Beklenmeyen bir hata oluştu. Sayfa yenilenirse sorun genellikle çözülür.', 'error', 5000);
    // Konsola sadece geliştirme ortamında yazılabilir:
    // console.error('Hata:', message, source, lineno);
    return true; // Tarayıcı konsoluna hata sızmasını engelle
};

window.addEventListener('unhandledrejection', function(event) {
    // Promise rejection'ları da yakala
    showToast('Bir işlem sırasında hata oluştu. Lütfen tekrar deneyin.', 'error', 5000);
    event.preventDefault(); // Konsola sızmasını engelle
});

/**
 * validateTcKimlik — TC Kimlik Numarası Algoritma Doğrulaması
 * Resmi 11 haneli T.C. Kimlik checksum doğrulama algoritmasını çalıştırır.
 * 
 * Kurallar:
 * 1. 11 hane olmalıdır ve hepsi rakam olmalıdır.
 * 2. 0 ile başlayamaz.
 * 3. 1, 3, 5, 7 ve 9. hanelerin toplamının 7 katından, 2, 4, 6 ve 8. hanelerin
 *    toplamı çıkarıldığında elde edilen sonucun modulo 10'u 10. haneyi vermelidir.
 * 4. İlk 10 hanenin toplamının modulo 10'u 11. haneyi vermelidir.
 * 
 * @param {string} tc — Kontrol edilecek TC numarası
 * @returns {boolean}
 */
function validateTcKimlik(tc) {
    if (!tc || tc.length !== 11) return false;
    if (!/^\d{11}$/.test(tc)) return false;
    if (tc[0] === '0') return false;

    var digits = tc.split('').map(Number);

    var oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    var evenSum = digits[1] + digits[3] + digits[5] + digits[7];

    var tenthDigit = (oddSum * 7 - evenSum) % 10;
    tenthDigit = (tenthDigit + 10) % 10; // Negatif çıkma ihtimaline karşı safe modulo

    if (tenthDigit !== digits[9]) return false;

    var sumOfTen = 0;
    for (var i = 0; i < 10; i++) {
        sumOfTen += digits[i];
    }
    var eleventhDigit = sumOfTen % 10;

    if (eleventhDigit !== digits[10]) return false;

    return true;
}

/**
 * initCopyright — Telif Hakkı Yılını Dinamik Günceller
 * Sayfadaki class="copyright-year" olan tüm elemanları bulur
 * ve içlerini güncel yıl ile doldurur.
 */
function initCopyright() {
    var elements = document.querySelectorAll('.copyright-year');
    var currentYear = new Date().getFullYear();
    elements.forEach(function(el) {
        el.textContent = currentYear;
    });
}

/**
 * validateTextLength — Metin Uzunluk Kontrolü
 * Çok kısa veya çok uzun metin girişlerini engeller.
 * 
 * @param {string} text — Kontrol edilecek metin
 * @param {number} min — Minimum karakter (varsayılan 2)
 * @param {number} max — Maximum karakter (varsayılan 2000)
 * @returns {boolean}
 */
function validateTextLength(text, min, max) {
    min = min || 2;
    max = max || 2000;
    if (!text) return false;
    var trimmed = text.trim();
    return trimmed.length >= min && trimmed.length <= max;
}

// ===== PARTICLES SYSTEM =====
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    const particleCount = 40;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 3 + 1) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particle.style.opacity = Math.random() * 0.5 + 0.1;
        container.appendChild(particle);
    }
}

// ===== NAVBAR SCROLL EFFECT =====
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    // Scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
    
    // Mobile menu
    if (hamburger) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        document.body.appendChild(overlay);
        
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });
        
        overlay.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // Close on link click
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
    
    // Active link on scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset + 200;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
}

// ===== SCROLL ANIMATIONS (Intersection Observer) =====
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay for grid items
                const siblings = entry.target.parentElement.querySelectorAll('[data-animate]');
                let delay = 0;
                
                siblings.forEach((sibling, i) => {
                    if (sibling === entry.target) {
                        delay = i * 100;
                    }
                });
                
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('[data-animate]').forEach(el => {
        observer.observe(el);
    });
}

// ===== COUNTER ANIMATION =====
function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-count'));
                const duration = 2000;
                const startTime = performance.now();
                const suffix = entry.target.textContent.includes('%') ? '%' : '+';
                
                function updateCounter(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Ease out cubic
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(eased * target);
                    
                    entry.target.textContent = current + suffix;
                    
                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    }
                }
                
                requestAnimationFrame(updateCounter);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => counterObserver.observe(counter));
}

// ===== BACK TO TOP =====
function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });
    
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===== PARALLAX EFFECT ON HERO =====
function initParallax() {
    const hero3d = document.querySelector('.hero-3d-element');
    
    if (hero3d && window.innerWidth > 768) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            hero3d.style.transform = `translateY(calc(-50% + ${rate}px))`;
        });
        
        // Mouse movement parallax
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            
            if (hero3d) {
                hero3d.style.transform = `translateY(-50%) rotateY(${x}deg) rotateX(${-y}deg)`;
            }
        });
    }
}

// ===== TILT EFFECT ON PRACTICE CARDS =====
function initTiltEffect() {
    if (window.innerWidth <= 768) return;
    
    const cards = document.querySelectorAll('.practice-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ===== MAGNETIC BUTTON EFFECT =====
function initMagneticButtons() {
    if (window.innerWidth <= 768) return;
    
    const buttons = document.querySelectorAll('.btn-primary, .btn-gold');
    
    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) translateY(-3px)`;
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}

// ===== CURSOR GLOW EFFECT ON CARDS =====
function initCursorGlow() {
    const cards = document.querySelectorAll('.practice-card, .article-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const glow = card.querySelector('.practice-card-glow');
            if (glow) {
                glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(201, 169, 110, 0.08) 0%, transparent 60%)`;
                glow.style.opacity = '1';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            const glow = card.querySelector('.practice-card-glow');
            if (glow) {
                glow.style.opacity = '0';
            }
        });
    });
}

// ===== TEXT REVEAL ANIMATION =====
function initTextReveal() {
    const titles = document.querySelectorAll('.title-line');
    
    titles.forEach((title, index) => {
        title.style.opacity = '0';
        title.style.transform = 'translateY(40px)';
        
        setTimeout(() => {
            title.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            title.style.opacity = '1';
            title.style.transform = 'translateY(0)';
        }, 400 + index * 200);
    });
}

// ===== ACCORDION INITIATION =====
function initAccordions() {
    const accordions = document.querySelectorAll('.accordion-header');
    
    accordions.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = item.querySelector('.accordion-content');
            const isActive = item.classList.contains('active');
            
            // Close other items in the same accordion container
            const container = item.closest('.article-accordion');
            if (container) {
                container.querySelectorAll('.accordion-item').forEach(i => {
                    i.classList.remove('active');
                    const c = i.querySelector('.accordion-content');
                    if (c) c.style.maxHeight = null;
                });
            }
            
            if (!isActive) {
                item.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });
}

// ===== SCROLL JUSTICE ICON ANIMATION =====
function initScrollJustice() {
    const overlay = document.getElementById('scrollJusticeOverlay');
    if (!overlay) return;

    // Only run on desktop screens for optimal performance and layout alignment
    if (window.innerWidth <= 768) return;

    let lastScrollY = window.scrollY;
    let scaleBoost = 0;
    
    let currentScale = 0;
    let currentRotation = 0;
    let currentOpacity = 0;

    // Track scroll wheel movement to apply size boost on scroll up
    window.addEventListener('wheel', (e) => {
        if (e.deltaY < 0) {
            // Scrolling UP: increase scale boost
            scaleBoost += Math.abs(e.deltaY) * 0.0015;
            if (scaleBoost > 0.8) scaleBoost = 0.8; // Cap boost
        } else {
            // Scrolling DOWN: decay boost quickly
            scaleBoost *= 0.6;
        }
    }, { passive: true });

    // Track scroll event for trackpads, dragging scrollbar, etc.
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        
        if (scrollTop < lastScrollY) {
            // Scrolling UP: calculate scroll difference and apply to scaleBoost
            const diff = lastScrollY - scrollTop;
            scaleBoost += diff * 0.0025;
            if (scaleBoost > 0.8) scaleBoost = 0.8; // Cap boost
        }
        
        lastScrollY = scrollTop;
    }, { passive: true });

    function animate() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrollTop / docHeight : 0;

        // Base curves: start at 0 at the top, peak in the middle, shrink to 0 at the bottom
        let baseScale = 0;
        let targetOpacity = 0;

        // Scale and opacity are active when scrolled slightly past the top
        if (scrollTop > 50) {
            baseScale = Math.sin(progress * Math.PI) * 1.4; // Max scale at middle is 1.4
            targetOpacity = Math.sin(progress * Math.PI) * 0.12; // Peak opacity is 0.12
        }

        // Smoothly decay the upward scroll boost over frames
        scaleBoost *= 0.94;
        if (scaleBoost < 0.001) scaleBoost = 0;

        const targetScale = baseScale + scaleBoost;
        const targetRotation = scrollTop * 0.22; // Rotate 0.22 degrees per pixel scrolled

        // Smooth interpolation (lerp) for buttery 60fps movement
        currentScale += (targetScale - currentScale) * 0.08;
        currentRotation += (targetRotation - currentRotation) * 0.08;
        currentOpacity += (targetOpacity - currentOpacity) * 0.08;

        // Prevent negative or too-small scale values
        const finalScale = Math.max(0, currentScale);
        const finalOpacity = Math.max(0, Math.min(0.2, currentOpacity));

        overlay.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg) scale(${finalScale})`;
        overlay.style.opacity = finalOpacity;

        requestAnimationFrame(animate);
    }

    // Start the animation loop
    requestAnimationFrame(animate);
}

// ===== INITIALIZE EVERYTHING =====
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    initNavbar();
    initScrollAnimations();
    initCounters();
    initBackToTop();
    initSmoothScroll();
    initParallax();
    initTiltEffect();
    initMagneticButtons();
    initCursorGlow();
    initTextReveal();
    initAccordions();
    initScrollJustice();
    initChatWidget();
    initCopyright();
});

// ===== AKILLI ASİSTAN (CHAT WIDGET) INJECTION & LOGIC =====
function initChatWidget() {
    // Create launcher
    const launcher = document.createElement('div');
    launcher.className = 'chat-launcher';
    launcher.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span class="chat-launcher-badge"></span>
    `;
    
    // Create widget box
    const box = document.createElement('div');
    box.className = 'chat-widget-box';
    box.innerHTML = `
        <div class="chat-header">
            <div class="chat-header-info">
                <div class="chat-avatar">⚖️</div>
                <div>
                    <div class="chat-title">Şensoy Hukuk Asistanı</div>
                    <div class="chat-status">Çevrimiçi</div>
                </div>
            </div>
            <button class="chat-close-btn">&times;</button>
        </div>
        <div class="chat-messages" id="chatMessages">
        </div>
        <div class="chat-options-container" id="chatOptions">
            <!-- Options will be rendered dynamically -->
        </div>
    `;
    
    document.body.appendChild(launcher);
    document.body.appendChild(box);
    
    const closeBtn = box.querySelector('.chat-close-btn');
    const badge = launcher.querySelector('.chat-launcher-badge');
    
    // Toggle active state
    launcher.addEventListener('click', () => {
        box.classList.toggle('active');
        badge.style.display = 'none';
    });
    
    closeBtn.addEventListener('click', () => {
        box.classList.remove('active');
    });
    
    const messagesContainer = box.querySelector('#chatMessages');
    const optionsContainer = box.querySelector('#chatOptions');
    
    const chatData = {
        start: {
            text: "Merhaba! Ben Şensoy Hukuk Yapay Zeka Asistanıyım. Hukuk büromuzun uzmanlık alanlarına göre size bilgi verebilirim. Hangi konuda yardıma ihtiyacınız var?",
            options: [
                { text: "⚖️ Boşanma Hukuku", next: "bosanma" },
                { text: "🛍️ Ayıplı Mal & Tüketici", next: "tuketici" },
                { text: "🚨 Dolandırıcılık Suçu", next: "dolandiricilik" },
                { text: "👶 Evlât Edinme", next: "evlat" },
                { text: "🏠 Aile Yurdu Davaları", next: "yurt" }
            ]
        },
        bosanma: {
            text: "Boşanma hukuku ile ilgili en çok merak edilen konulardan birini seçebilirsiniz:",
            options: [
                { text: "Anlaşmalı Boşanma Şartları", next: "bosanma_anlasmali" },
                { text: "Zina Sebebiyle Boşanma", next: "bosanma_zina" },
                { text: "Nafaka ve Tazminat Hakları", next: "bosanma_tazminat" },
                { text: "⬅️ Geri Dön", next: "start" }
            ]
        },
        bosanma_anlasmali: {
            text: "Anlaşmalı boşanabilmek için evliliğin en az 1 yıl sürmüş olması ve eşlerin nafaka, velayet, mal paylaşımı gibi tüm konularda tam mutabık kalarak bir protokol hazırlaması gerekir.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-bosanma.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Anlaşmalı boşanma davası şartları hakkında görüşmek istiyorum." },
                { text: "⬅️ Geri Dön", next: "bosanma" }
            ]
        },
        bosanma_zina: {
            text: "Zina mutlak bir boşanma sebebidir. Zinayı öğrenen eşin 6 ay, her halükarda eylemin üzerinden 5 yıl geçmeden dava açması şarttır. Eşin affetmesi halinde dava hakkı düşer.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-bosanma.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Zina sebebiyle boşanma davası hakkında görüşmek istiyorum." },
                { text: "⬅️ Geri Dön", next: "bosanma" }
            ]
        },
        bosanma_tazminat: {
            text: "Kusursuz veya daha az kusurlu olan eş, boşanma nedeniyle maddi ve manevi tazminat isteyebilir. Ayrıca yoksulluğa düşecek olan taraf süresiz yoksulluk nafakası talep edebilir. Bu haklar kesinleşmeden itibaren 1 yıllık zamanaşımına tabidir.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-bosanma.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Boşanmada tazminat ve nafaka hakları hakkında danışmak istiyorum." },
                { text: "⬅️ Geri Dön", next: "bosanma" }
            ]
        },
        tuketici: {
            text: "Ayıplı mal ve tüketici uyuşmazlıkları ile ilgili konular:",
            options: [
                { text: "Tüketicinin 4 Seçimlik Hakkı", next: "tuketici_haklar" },
                { text: "Ayıplı Mal İhbar Süreleri", next: "tuketici_sureler" },
                { text: "⬅️ Geri Dön", next: "start" }
            ]
        },
        tuketici_haklar: {
            text: "Ayıplı bir ürün durumunda tüketici şunlardan birini seçebilir: Sözleşmeden dönme (para iadesi), ayıp oranında bedel indirimi, ücretsiz onarım veya ürünün ayıpsız misliyle değişimi.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-ayipli-mal.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Ayıplı mal seçimlik haklarım hakkında danışmak istiyorum." },
                { text: "⬅️ Geri Dön", next: "tuketici" }
            ]
        },
        tuketici_sureler: {
            text: "Açık ayıplarda 2 gün, gizli ayıplarda ise 8 gün içinde satıcıya ihbar yapılmalıdır. Teslimden itibaren ilk 6 aydaki ayıpların teslim anında var olduğu kabul edilir. İspat yükü satıcıdadır. Genel zamanaşımı menkulde 2 yıl, konutta 5 yıldır.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-ayipli-mal.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Ayıplı mal ihbarı ve zamanaşımı süreleri hakkında danışmak istiyorum." },
                { text: "⬅️ Geri Dön", next: "tuketici" }
            ]
        },
        dolandiricilik: {
            text: "Dolandırıcılık suçu hileli davranışlarla bir kimseyi aldatıp zarara uğratarak haksız menfaat sağlamaktır. Bilişim sistemleri, bankalar kullanılarak yapılması Nitelikli Dolandırıcılık sayılır.",
            options: [
                { text: "Dolandırıcılık Cezası Nedir?", next: "dolandiricilik_ceza" },
                { text: "Nasıl Şikayetçi Olunur?", next: "dolandiricilik_sikayet" },
                { text: "⬅️ Geri Dön", next: "start" }
            ]
        },
        dolandiricilik_ceza: {
            text: "Basit dolandırıcılık cezası 1 yıldan 5 yıla kadar hapistir. Nitelikli dolandırıcılıkta ise ceza alt sınırı 4 yıldan başlar ve Ağır Ceza Mahkemesinde yargılama yapılır.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-dolandiricilik.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Dolandırıcılık suçu ve cezası hakkında bilgi almak istiyorum." },
                { text: "⬅️ Geri Dön", next: "dolandiricilik" }
            ]
        },
        dolandiricilik_sikayet: {
            text: "Dolandırıcılık şikayete tabi bir suç değildir, resen soruşturulur. Savcılığa dekontlar, WhatsApp konuşmaları ve ekran görüntüleri ile dilekçe verilerek suç duyurusunda bulunulur.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-dolandiricilik.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Dolandırıcılık suçu suç duyurusu işlemleri hakkında görüşmek istiyorum." },
                { text: "⬅️ Geri Dön", next: "dolandiricilik" }
            ]
        },
        evlat: {
            text: "Evlat edinme; küçüğün veya ergin/kısıtlının evlat edinilmesi şeklinde gerçekleşebilir. Eşler ancak birlikte evlat edinebilir.",
            options: [
                { text: "Küçüklerin Evlat Edinilmesi", next: "evlat_kucuk" },
                { text: "Erginlerin Evlat Edinilmesi", next: "evlat_ergin" },
                { text: "⬅️ Geri Dön", next: "start" }
            ]
        },
        evlat_kucuk: {
            text: "Küçüğün evlat edinilmesi için evlat edinenin en az 30 yaşında olması veya 5 yıllık evli olması, çocuğa 1 yıl süreyle bakmış olması ve ana-baba rızası (yokluk/ihmal hariç) şarttır.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-evlat-edinme.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Çocuğun evlat edinilmesi prosedürü hakkında danışmak istiyorum." },
                { text: "⬅️ Geri Dön", next: "evlat" }
            ]
        },
        evlat_ergin: {
            text: "Erginlerin evlat edinilmesi için evlat edinenin altsoyunun (çocuklarının) açık muvafakati ve evlat edinen tarafından en az 5 yıl bakılmış veya aile içinde yaşanmış olması gerekir.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-evlat-edinme.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Ergin kişinin evlat edinilmesi hakkında bilgi almak istiyorum." },
                { text: "⬅️ Geri Dön", next: "evlat" }
            ]
        },
        yurt: {
            text: "Aile yurdu, bir ailenin barınma ve geçimini korumak için konut veya arazinin devredilemez/rehnedilemez kılınarak tapuya şerh edilmesidir.",
            options: [
                { text: "Kuruluş Şartları Nelerdir?", next: "yurt_kurulus" },
                { text: "Sonuçları Nelerdir?", next: "yurt_sonuc" },
                { text: "⬅️ Geri Dön", next: "start" }
            ]
        },
        yurt_kurulus: {
            text: "Aile Mahkemesi aracılığıyla ilan yapılır. 2 ay içinde alacaklıların itirazları toplanır, mevcut borç/haciz yoksa mahkeme kararıyla tapu siciline aile yurdu şerhi verilir.",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-aile-yurdu.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Aile yurdu tesisi ve tapu işlemleri hakkında görüşmek istiyorum." },
                { text: "⬅️ Geri Dön", next: "yurt" }
            ]
        },
        yurt_sonuc: {
            text: "Taşınmaz satılamaz, kiralanamaz, rehnedilemez ve üzerine haciz konulamaz. Malik ölünce, vasiyetnamede devir maddesi yoksa yurt şerhi terkin edilir (kaldırılır).",
            options: [
                { text: "Detaylı Makaleyi Oku", link: "makale-aile-yurdu.html" },
                { text: "💬 Avukata WhatsApp'tan Danış", whatsapp: "Aile yurdunun yasal sonuçları hakkında danışmak istiyorum." },
                { text: "⬅️ Geri Dön", next: "yurt" }
            ]
        }
    };
    
    function renderStep(stepKey) {
        const step = chatData[stepKey];
        if (!step) return;
        
        // Show typing indicator
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
        messagesContainer.appendChild(typing);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Disable options during typing
        optionsContainer.innerHTML = '';
        
        setTimeout(() => {
            // Remove typing
            typing.remove();
            
            // Add bot message
            const botMsg = document.createElement('div');
            botMsg.className = 'chat-message bot';
            // chatData hardcoded olduğundan XSS riski düşük,
            // ama gelecekte veri kaynağı değişebilir diye textContent kullanıyoruz
            botMsg.textContent = step.text;
            messagesContainer.appendChild(botMsg);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Render options
            step.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'chat-option-btn';
                btn.textContent = opt.text;
                btn.addEventListener('click', () => {
                    // Rate limiting — çok hızlı art arda tıklamayı engelle
                    if (!chatRateLimiter.canProceed()) {
                        showToast('Lütfen biraz bekleyiniz...', 'warning', 1500);
                        return;
                    }

                    // Add user message
                    const userMsg = document.createElement('div');
                    userMsg.className = 'chat-message user';
                    userMsg.textContent = opt.text;
                    messagesContainer.appendChild(userMsg);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    
                    if (opt.next) {
                        renderStep(opt.next);
                    } else if (opt.link) {
                        window.location.href = opt.link;
                    } else if (opt.whatsapp) {
                        window.open(`https://wa.me/905468650875?text=${encodeURIComponent(opt.whatsapp)}`, '_blank');
                    }
                });
                optionsContainer.appendChild(btn);
            });
        }, 800);
    }
    
    // Start flow
    renderStep('start');
}

// Reinitialize on resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Reinit responsive features
        if (window.innerWidth > 768) {
            initTiltEffect();
            initMagneticButtons();
        }
    }, 250);
});

