/* K.C fafas*/

(function () {
    'use strict';

    // Tela de boas-vindas (letreiro subindo antes do hero)
    (function initIntro() {
        const overlay = document.getElementById('introOverlay');
        if (!overlay) return;

        // Já viu nesta sessão: some sem animar
        if (document.documentElement.classList.contains('no-intro')) {
            overlay.remove();
            return;
        }

        document.body.classList.add('intro-locked');

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let finished = false;

        function finishIntro() {
            if (finished) return;
            finished = true;
            overlay.classList.add('intro-hide');
            document.body.classList.remove('intro-locked');
            try { sessionStorage.setItem('ilhasnetIntroSeen', '1'); } catch (e) {}
            window.setTimeout(() => overlay.remove(), 650);
        }

        const timer = window.setTimeout(finishIntro, reduceMotion ? 350 : 1750);

        // Clique, toque ou tecla pulam a animação para quem tem pressa
        overlay.addEventListener('click', () => {
            window.clearTimeout(timer);
            finishIntro();
        });
        window.addEventListener('keydown', function onKey(e) {
            if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
                window.clearTimeout(timer);
                finishIntro();
                window.removeEventListener('keydown', onKey);
            }
        });
    })();

    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    function onScroll() {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    //mobile menu
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('open');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });


    const revealEls = document.querySelectorAll(
        '.section-head, .plan-card, .contact-card, .footer-inner, .contract-card'
    );
    revealEls.forEach((el) => el.classList.add('reveal'));

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );
        revealEls.forEach((el) => observer.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add('visible'));
    }

    // Carrossel de planos (Hero)
    (function initPlansCarousel() {
        const carousel = document.getElementById('plansCarousel');
        const track = document.getElementById('carouselTrack');
        if (!carousel || !track) return;

        const originalCards = Array.from(track.children);
        if (originalCards.length === 0) return;

        // Duplica os cards para permitir loop infinito sem saltos
        originalCards.forEach((card) => {
            const clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.setAttribute('tabindex', '-1');
            track.appendChild(clone);
        });

        let index = 0;
        let autoTimer = null;
        let isHovering = false;
        let isDragging = false;
        let dragStartX = 0;
        let dragDeltaX = 0;

        const AUTO_INTERVAL = 4500; // ms
        const SWIPE_THRESHOLD = 60; // px

        function getStepWidth() {
            const first = originalCards[0];
            const styles = window.getComputedStyle(track);
            const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
            return first.getBoundingClientRect().width + gap;
        }

        function applyTransform(animate = true) {
            if (!animate) {
                track.style.transition = 'none';
                // força reflow para aplicar a posição instantânea
                void track.offsetWidth;
            }
            const step = getStepWidth();
            track.style.transform = `translate3d(${-index * step}px, 0, 0)`;

            if (!animate) {
                requestAnimationFrame(() => {
                    track.style.transition = '';
                });
            }
        }

        function next() {
            index += 1;
            applyTransform(true);
        }

        function prev() {
            const total = originalCards.length;
            if (index <= 0) {
                // salto invisível para o clone do final, depois anima até o original
                index = total;
                applyTransform(false);
                requestAnimationFrame(() => {
                    index = total - 1;
                    applyTransform(true);
                });
            } else {
                index -= 1;
                applyTransform(true);
            }
        }

        // Quando chegar ao final dos originais + 1, faz o reset invisível
        track.addEventListener('transitionend', (e) => {
            if (e.propertyName !== 'transform') return;
            const total = originalCards.length;
            if (index >= total) {
                index = 0;
                applyTransform(false);
            }
        });

        function startAuto() {
            stopAuto();
            autoTimer = window.setInterval(() => {
                if (isHovering || isDragging) return;
                if (document.hidden) return;
                next();
            }, AUTO_INTERVAL);
        }

        function stopAuto() {
            if (autoTimer) {
                window.clearInterval(autoTimer);
                autoTimer = null;
            }
        }

        // Pausa no hover (desktop)
        carousel.addEventListener('mouseenter', () => { isHovering = true; });
        carousel.addEventListener('mouseleave', () => { isHovering = false; });
        // Pausa quando o foco entra (acessibilidade)
        carousel.addEventListener('focusin', () => { isHovering = true; });
        carousel.addEventListener('focusout', () => { isHovering = false; });

        // Pausa quando a aba não está visível
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stopAuto();
            else startAuto();
        });

        // ---- Touch / Pointer swipe ----
        function onPointerDown(e) {
            isDragging = true;
            dragStartX = e.clientX;
            dragDeltaX = 0;
            track.style.transition = 'none';
            // garante que o auto-play não dispare logo após o gesto
            stopAuto();
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            dragDeltaX = e.clientX - dragStartX;
            const step = getStepWidth();
            const offset = -index * step + dragDeltaX;
            track.style.transform = `translate3d(${offset}px, 0, 0)`;
        }

        function onPointerUp() {
            if (!isDragging) return;
            isDragging = false;
            track.style.transition = '';

            if (Math.abs(dragDeltaX) > SWIPE_THRESHOLD) {
                if (dragDeltaX < 0) {
                    next();
                } else {
                    prev();
                }
            } else {
                // volta para a posição atual
                applyTransform(true);
            }
            dragDeltaX = 0;
            // retoma o auto-play após o gesto
            startAuto();
        }

        // Mouse + touch unificados
        if (window.PointerEvent) {
            track.addEventListener('pointerdown', (e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                onPointerDown(e);
            });
            track.addEventListener('pointermove', onPointerMove);
            track.addEventListener('pointerup', onPointerUp);
            track.addEventListener('pointercancel', onPointerUp);
        } else {
            // fallback touch
            track.addEventListener('touchstart', (e) => {
                onPointerDown(e.touches[0]);
            }, { passive: true });
            track.addEventListener('touchmove', (e) => {
                onPointerMove(e.touches[0]);
            }, { passive: true });
            track.addEventListener('touchend', onPointerUp);
            track.addEventListener('touchcancel', onPointerUp);
        }

        // Recalcula ao redimensionar
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (resizeTimer) window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                applyTransform(false);
            }, 120);
        });

        // Inicializa
        applyTransform(false);
        startAuto();
    })();
})();
