/* =========================================
   1. GLOBAL FUNCTIONS (Accessible via HTML onclick)
   ========================================= */

// --- Modal System ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const backdrop = modal.querySelector(".modal-backdrop");
    const content = modal.querySelector(".modal-content");

    // 1. Unhide container
    modal.classList.remove("hidden");

    // 2. Trigger Animations (Small delay ensures CSS transition catches the change)
    setTimeout(() => {
        if(backdrop) backdrop.classList.remove("opacity-0");
        if(content) {
            content.classList.remove("scale-95", "opacity-0");
            content.classList.add("scale-100", "opacity-100");
        }
    }, 10);

    // 3. Lock Body Scroll
    document.body.style.overflow = "hidden";

    // 4. Specific Logic for Waitlist Modal
    if (modalId === 'waitlistModal') {
        const form = document.getElementById("waitlistForm");
        const msg = document.getElementById("successMessage");
        const btn = form ? form.querySelector('button[type="submit"]') : null;
        
        // Reset form state on open
        if (form) {
            form.reset();
            form.classList.remove("hidden");
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = ">> EXECUTE";
                btn.style.opacity = '1';
            }
        }
        if (msg) msg.classList.add("hidden");
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const backdrop = modal.querySelector(".modal-backdrop");
    const content = modal.querySelector(".modal-content");

    // 1. Reverse Animations
    if(backdrop) backdrop.classList.add("opacity-0");
    if(content) {
        content.classList.remove("scale-100", "opacity-100");
        content.classList.add("scale-95", "opacity-0");
    }

    // 2. Hide Container after animation finishes (300ms matches CSS transition)
    setTimeout(() => {
        modal.classList.add("hidden");
        document.body.style.overflow = "auto"; // Restore scroll
    }, 300);
}

// Wrapper functions for specific buttons in HTML
window.openWaitlistModal = () => openModal('waitlistModal');
window.openLoginModal = () => window.location.href = 'login.html'; // Direct link for login page
// Expose close/open to window for HTML attributes
window.openModal = openModal;
window.closeModal = closeModal;


// --- FAQ Accordion Logic ---
window.toggleFaq = function(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('i');

    // Close other open FAQs (Accordion Style)
    document.querySelectorAll('.faq-content').forEach(el => {
        if (el !== content) {
            el.style.height = '0px';
            const btn = el.previousElementSibling;
            const icn = btn.querySelector('i');
            if(icn) {
                icn.classList.remove('rotate-45', 'fa-xmark');
                icn.classList.add('fa-plus');
            }
        }
    });

    // Toggle current item
    if (content.style.height && content.style.height !== '0px') {
        // Close
        content.style.height = '0px';
        icon.classList.remove('rotate-45', 'fa-xmark');
        icon.classList.add('fa-plus');
    } else {
        // Open
        content.style.height = content.scrollHeight + 'px';
        icon.classList.add('rotate-45', 'fa-xmark');
        icon.classList.remove('fa-plus');
    }
};


/* =========================================
   2. DOM READY EVENTS (Animations & Logic)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {

    // --- Preloader ---
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.style.transition = 'opacity 0.5s ease';
            preloader.style.opacity = '0';
            setTimeout(() => preloader.remove(), 500);
        }, 1200);
    }

    // --- Navbar Scroll Logic (Dynamic Glass) ---
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('border-white/10', 'bg-[#030303]/90', 'shadow-lg', 'backdrop-blur-md');
                navbar.classList.remove('border-transparent', 'bg-transparent');
            } else {
                navbar.classList.add('border-transparent', 'bg-transparent');
                navbar.classList.remove('border-white/10', 'bg-[#030303]/90', 'shadow-lg', 'backdrop-blur-md');
            }
        });
    }

    // --- Scroll Animations (Reveal on Scroll) ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target); // Animate only once
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // --- Live Number Counters (Global Map) ---
    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = +counter.getAttribute('data-target');
                const duration = 2000; // Animation duration in ms
                const increment = target / (duration / 16); // 60 FPS

                let current = 0;
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.innerText = Math.ceil(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.innerText = target;
                    }
                };
                updateCounter();
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.counter').forEach(c => counterObserver.observe(c));

    // --- 3D Tilt Effect (Hero Section) ---
    const heroCard = document.getElementById('hero-card');
    const tiltContainer = document.getElementById('tilt-container');

    if (heroCard && tiltContainer) {
        tiltContainer.addEventListener('mousemove', (e) => {
            const rect = tiltContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Max rotation degrees
            const rotateX = ((y - centerY) / centerY) * -12;
            const rotateY = ((x - centerX) / centerX) * 12;

            heroCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        tiltContainer.addEventListener('mouseleave', () => {
            heroCard.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
        });
    }

    // --- Magnetic Buttons Effect ---
    // Adds a subtle pull effect to buttons when hovered
    document.querySelectorAll('.btn-magnetic').forEach(btn => {
        btn.addEventListener('mousemove', function(e) {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            // Move button text slightly towards cursor
            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });
        btn.addEventListener('mouseleave', function() {
            btn.style.transform = 'translate(0, 0)';
        });
    });

    // --- Pricing Toggle Switch ---
    const pricingToggle = document.getElementById('pricing-toggle');
    if (pricingToggle) {
        pricingToggle.addEventListener('change', function() {
            const prices = document.querySelectorAll('.price-text');
            if (this.checked) {
                // Yearly Pricing Logic
                prices[0].innerHTML = '৳1600 <span class="text-sm text-gray-500 font-sans text-white">/mo</span>';
                prices[1].innerHTML = '৳3200 <span class="text-sm text-gray-500 font-sans">/mo</span>';
                prices[2].innerHTML = '৳3200 <span class="text-sm text-gray-500 font-sans">/mo</span>';
            } else {
                // Monthly Pricing Logic
                prices[0].innerHTML = '৳2k <span class="text-sm text-gray-500 font-sans text-white">/mo</span>';
                prices[1].innerHTML = '৳4k <span class="text-sm text-gray-500 font-sans">/mo</span>';
                prices[2].innerHTML = '৳4k <span class="text-sm text-gray-500 font-sans">/mo</span>';
            }
        });
    }

    // --- Mobile Menu Toggle ---
    const mobileToggle = document.getElementById('mobile-toggle');
    const closeMobile = document.getElementById('close-mobile');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => mobileMenu.classList.remove('hidden'));
        closeMobile.addEventListener('click', () => mobileMenu.classList.add('hidden'));
        
        // Close menu when a link is clicked
        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
        });
    }

    // --- Live Feed Simulation (Global Map Terminal) ---
    // Simulates a "hacking/activity" terminal effect
    const feedContainer = document.getElementById('live-feed');
    if(feedContainer) {
        const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
        
        const logTypes = [
            { text: (id) => `User_${id} connected with Expert_Sarah`, color: 'text-white' },
            { text: (id) => `$$ PAYMENT_VERIFIED : ৳${rand(1500, 5000)}`, color: 'text-green-500' },
            { text: (id) => `New Expert Application: Engineering`, color: 'text-blue-400' },
            { text: (id) => `Session #${id} Started`, color: 'text-white' },
            { text: (id) => `Server Load: ${rand(20, 45)}%`, color: 'text-gray-500' }
        ];

        setInterval(() => {
            // Pick random log type
            const logType = logTypes[Math.floor(Math.random() * logTypes.length)];
            const id = rand(1000, 9999);
            
            const div = document.createElement('div');
            div.className = 'text-xs font-mono text-gray-500 py-2 border-b border-white/5 animate-fade-in-up';
            
            div.innerHTML = `
                <span class="text-[#ff5100] mr-2">[LOG]</span> 
                <span class="${logType.color}">${logType.text(id)}</span>
            `;
            
            // Add to top of list
            feedContainer.prepend(div);
            
            // Keep list length manageable (max 5 items)
            if(feedContainer.children.length > 5) {
                feedContainer.lastElementChild.remove();
            }
        }, 2500); // New log every 2.5 seconds
    }

    // --- Waitlist Form Submission (Google Sheets) ---
    const form = document.getElementById("waitlistForm");
    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            // Loading State
            btn.innerHTML = '>> PROCESSING...';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            try {
                const formData = new FormData(form);
                const urlEncoded = new URLSearchParams(formData).toString();
                
                await fetch(form.action, {
                    method: "POST",
                    body: urlEncoded,
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    mode: 'no-cors' // Important for Google Script
                });

                // Success State
                form.classList.add("hidden");
                document.getElementById("successMessage").classList.remove("hidden");
                
                // Auto-close modal after 3 seconds
                setTimeout(() => {
                    closeModal('waitlistModal');
                    // Reset form after closing
                    setTimeout(() => {
                        form.reset();
                        form.classList.remove("hidden");
                        document.getElementById("successMessage").classList.add("hidden");
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        btn.style.opacity = '1';
                    }, 500);
                }, 3000);

            } catch (err) {
                alert("ERROR: CONNECTION FAILED. PLEASE CHECK INTERNET.");
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });
    }

});