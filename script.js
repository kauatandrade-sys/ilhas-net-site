/* K.C fafas*/

(function () {
    'use strict';

    // Tela de boas-vindas antes do hero)
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

        if (track.children.length === 0) return;

        let autoTimer = null;
        let isHovering = false;
        let isDragging = false;
        let isAnimating = false;
        let dragStartX = 0;
        let dragDeltaX = 0;

        const AUTO_INTERVAL = 2500; // ms (reduzido em 2s)
        const SWIPE_THRESHOLD = 60; // px

        function getStepWidth() {
            const first = track.children[0];
            const styles = window.getComputedStyle(track);
            const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
            return first.getBoundingClientRect().width + gap;
        }

        function resetPosition(withTransition) {
            if (!withTransition) track.style.transition = 'none';
            track.style.transform = 'translate3d(0, 0, 0)';
            if (!withTransition) {
                void track.offsetWidth;
                requestAnimationFrame(() => {
                    track.style.transition = '';
                });
            }
        }

        function next() {
            if (isAnimating || isDragging) return;
            isAnimating = true;
            const step = getStepWidth();
            track.style.transition = '';
            track.style.transform = `translate3d(${-step}px, 0, 0)`;

            track.addEventListener('transitionend', function onEnd(e) {
                if (e.propertyName !== 'transform') return;
                track.removeEventListener('transitionend', onEnd);
                // O card que já passou vai para o final da fila:
                // o carrossel continua normalmente, sem voltar ao início.
                track.appendChild(track.firstElementChild);
                resetPosition(false);
                isAnimating = false;
            });
        }

        function prev() {
            if (isAnimating || isDragging) return;
            isAnimating = true;
            // Traz o último card para o início e parte de uma posição
            // "fora da tela" à esquerda, animando até a posição de repouso.
            track.insertBefore(track.lastElementChild, track.firstElementChild);
            const step = getStepWidth();
            track.style.transition = 'none';
            track.style.transform = `translate3d(${-step}px, 0, 0)`;
            void track.offsetWidth; // força reflow

            requestAnimationFrame(() => {
                track.style.transition = '';
                track.style.transform = 'translate3d(0, 0, 0)';
            });

            track.addEventListener('transitionend', function onEnd(e) {
                if (e.propertyName !== 'transform') return;
                track.removeEventListener('transitionend', onEnd);
                isAnimating = false;
            });
        }

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
            if (isAnimating) return;
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
            track.style.transform = `translate3d(${dragDeltaX}px, 0, 0)`;
        }

        function onPointerUp() {
            if (!isDragging) return;
            isDragging = false;
            track.style.transition = '';

            if (Math.abs(dragDeltaX) > SWIPE_THRESHOLD) {
                if (dragDeltaX < 0) {
                    resetPosition(false);
                    next();
                } else {
                    resetPosition(false);
                    prev();
                }
            } else {
                // volta para a posição atual
                resetPosition(true);
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
                if (!isDragging && !isAnimating) resetPosition(false);
            }, 120);
        });

        // Inicializa
        resetPosition(false);
        startAuto();
    })();
})();
