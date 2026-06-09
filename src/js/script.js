/* =========================================
   COURSELINE – main.js
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    /* ------------------------------------------
       MOBILE NAV TOGGLE
    ------------------------------------------ */
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            const open = navLinks.classList.contains('open');
            navToggle.setAttribute('aria-expanded', open);
            document.body.style.overflow = open ? 'hidden' : '';
        });

        // Close on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    /* ------------------------------------------
       STICKY NAVBAR SHADOW
    ------------------------------------------ */
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        const onScroll = () => {
            navbar.style.boxShadow = window.scrollY > 30 ?
                '0 4px 30px rgba(0,0,0,.5)' :
                'none';
        };
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ------------------------------------------
       ACCORDION (curriculum modules)
    ------------------------------------------ */
    document.querySelectorAll('.accordion-item').forEach(item => {
        const header = item.querySelector('.accordion-header');
        if (!header) return;

        header.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Close siblings
            item.closest('.curriculum-accordion') ?
                .querySelectorAll('.accordion-item.open')
                .forEach(sib => sib !== item && sib.classList.remove('open'));

            item.classList.toggle('open', !isOpen);
        });
    });

    // Open first module by default
    const firstAccordion = document.querySelector('.accordion-item');
    if (firstAccordion) firstAccordion.classList.add('open');

    /* ------------------------------------------
       FAQ ACCORDION
    ------------------------------------------ */
    document.querySelectorAll('.faq-item').forEach(item => {
        const question = item.querySelector('.faq-question');
        if (!question) return;

        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Close others
            document.querySelectorAll('.faq-item.open').forEach(other => {
                if (other !== item) other.classList.remove('open');
            });

            item.classList.toggle('open', !isOpen);
        });
    });

    /* ------------------------------------------
       SCROLL REVEAL (IntersectionObserver)
    ------------------------------------------ */
    const revealEls = document.querySelectorAll('[data-reveal]');
    if (revealEls.length) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
        );
        revealEls.forEach(el => observer.observe(el));
    }

    /* ------------------------------------------
       TICKER (logo strip) – duplicate if needed
    ------------------------------------------ */
    document.querySelectorAll('.ticker-inner').forEach(track => {
        // Clone for seamless loop if not already done in HTML
        if (!track.dataset.cloned) {
            const clone = track.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            track.parentNode.appendChild(clone);
            track.dataset.cloned = 'true';
        }
    });

    /* ------------------------------------------
       STICKY ENROLL BUTTON — show after scroll
    ------------------------------------------ */
    const stickyEnroll = document.querySelector('.sticky-enroll');
    if (stickyEnroll) {
        stickyEnroll.style.opacity = '0';
        stickyEnroll.style.transition = 'opacity .4s ease';

        window.addEventListener('scroll', () => {
            stickyEnroll.style.opacity = window.scrollY > 500 ? '1' : '0';
            stickyEnroll.style.pointerEvents = window.scrollY > 500 ? 'auto' : 'none';
        }, { passive: true });
    }

});