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
    
    // 4. Set ARIA attributes
    modal.setAttribute('aria-hidden', 'false');
    
    // 5. Trap focus inside modal
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }

    // 6. Specific Logic for Waitlist Modal
    if (modalId === 'waitlistModal') {
        const form = document.getElementById("waitlistForm");
        const msg = document.getElementById("successMessage");
        const btn = form ? form.querySelector('button[type="submit"]') : null;
        
        // Reset form state on open
        if (form) {
            form.reset();
            form.classList.remove("hidden");
            // Clear any validation states
            form.querySelectorAll('input, select').forEach(el => {
                el.classList.remove('input-error', 'input-success');
            });
            form.querySelectorAll('.error-message').forEach(el => {
                el.classList.remove('visible');
            });
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = ">> EXECUTE";
                btn.style.opacity = '1';
                btn.classList.remove('btn-loading');
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
    
    // 2. Set ARIA attributes
    modal.setAttribute('aria-hidden', 'true');

    // 3. Hide Container after animation finishes (300ms matches CSS transition)
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

// --- Video Modal (Watch Sequence Button) ---
window.openVideoModal = function() {
    // Create video modal dynamically if it doesn't exist
    let videoModal = document.getElementById('videoModal');
    if (!videoModal) {
        videoModal = document.createElement('div');
        videoModal.id = 'videoModal';
        videoModal.className = 'fixed inset-0 z-[100] hidden';
        videoModal.innerHTML = `
            <div class="absolute inset-0 bg-black/95 backdrop-blur-md transition-opacity opacity-0 modal-backdrop" onclick="closeModal('videoModal')"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4 z-10">
                <div class="bg-[#0a0a0a] border border-white/10 w-full max-w-4xl relative transform scale-95 opacity-0 transition-all duration-300 modal-content rounded-2xl overflow-hidden">
                    <button onclick="closeModal('videoModal')" class="absolute top-4 right-4 z-20 text-gray-400 hover:text-white transition-colors" aria-label="Close video">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>
                    <div class="aspect-video bg-black flex items-center justify-center">
                        <div class="text-center p-8">
                            <i class="fa-solid fa-video text-[#ff5100] text-6xl mb-4"></i>
                            <p class="text-white text-xl font-bold mb-2">Product Demo Coming Soon</p>
                            <p class="text-gray-500 text-sm">We're crafting an immersive experience. Stay tuned!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(videoModal);
    }
    openModal('videoModal');
};

// --- Earnings Calculator Modal ---
window.openCalculatorModal = function() {
    let calcModal = document.getElementById('calculatorModal');
    if (!calcModal) {
        calcModal = document.createElement('div');
        calcModal.id = 'calculatorModal';
        calcModal.className = 'fixed inset-0 z-[100] hidden';
        calcModal.innerHTML = `
            <div class="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity opacity-0 modal-backdrop" onclick="closeModal('calculatorModal')"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4 z-10">
                <div class="bg-[#0a0a0a] border border-[#ff5100]/30 w-full max-w-md relative transform scale-95 opacity-0 transition-all duration-300 modal-content rounded-2xl overflow-hidden">
                    <div class="bg-[#050505] border-b border-white/10 px-6 py-4 flex items-center justify-between">
                        <h3 class="text-white font-bold">Earnings Calculator</h3>
                        <button onclick="closeModal('calculatorModal')" class="text-gray-500 hover:text-white" aria-label="Close calculator">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="p-6 space-y-6">
                        <div>
                            <label class="text-[#ff5100] text-xs font-mono uppercase mb-2 block">Sessions per Month</label>
                            <input type="range" id="sessionsSlider" min="1" max="50" value="10" class="w-full accent-[#ff5100]" oninput="updateCalculator()">
                            <div class="flex justify-between text-xs text-gray-500 mt-1">
                                <span>1</span>
                                <span id="sessionsValue" class="text-white font-bold">10</span>
                                <span>50</span>
                            </div>
                        </div>
                        <div>
                            <label class="text-[#ff5100] text-xs font-mono uppercase mb-2 block">Rate per Session (৳)</label>
                            <input type="range" id="rateSlider" min="500" max="10000" step="500" value="2000" class="w-full accent-[#ff5100]" oninput="updateCalculator()">
                            <div class="flex justify-between text-xs text-gray-500 mt-1">
                                <span>৳500</span>
                                <span id="rateValue" class="text-white font-bold">৳2,000</span>
                                <span>৳10,000</span>
                            </div>
                        </div>
                        <div class="bg-[#ff5100]/10 border border-[#ff5100]/30 rounded-xl p-6 text-center">
                            <p class="text-gray-400 text-xs uppercase tracking-wider mb-2">Estimated Monthly Earnings</p>
                            <p id="earningsResult" class="text-4xl font-bold text-[#ff5100]">৳18,000</p>
                            <p class="text-gray-500 text-xs mt-2">After 10% platform fee</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(calcModal);
    }
    openModal('calculatorModal');
    updateCalculator();
};

window.updateCalculator = function() {
    const sessions = document.getElementById('sessionsSlider')?.value || 10;
    const rate = document.getElementById('rateSlider')?.value || 2000;
    const gross = sessions * rate;
    const net = gross * 0.9; // 90% after 10% platform fee
    
    document.getElementById('sessionsValue').textContent = sessions;
    document.getElementById('rateValue').textContent = '৳' + parseInt(rate).toLocaleString();
    document.getElementById('earningsResult').textContent = '৳' + parseInt(net).toLocaleString();
};


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
            // Update ARIA
            btn.setAttribute('aria-expanded', 'false');
        }
    });

    // Toggle current item
    if (content.style.height && content.style.height !== '0px') {
        // Close
        content.style.height = '0px';
        icon.classList.remove('rotate-45', 'fa-xmark');
        icon.classList.add('fa-plus');
        button.setAttribute('aria-expanded', 'false');
    } else {
        // Open
        content.style.height = content.scrollHeight + 'px';
        icon.classList.add('rotate-45', 'fa-xmark');
        icon.classList.remove('fa-plus');
        button.setAttribute('aria-expanded', 'true');
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
        // Add validation helper functions
        const validateEmail = (email) => {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        };
        
        const validatePhone = (phone) => {
            const re = /^[\d\s\-\+\(\)]{7,20}$/;
            return re.test(phone);
        };
        
        const showFieldError = (field, message) => {
            field.classList.add('input-error');
            field.classList.remove('input-success');
            let errorEl = field.nextElementSibling;
            if (!errorEl || !errorEl.classList.contains('error-message')) {
                errorEl = document.createElement('p');
                errorEl.className = 'error-message text-red-500 text-xs mt-1';
                field.parentNode.insertBefore(errorEl, field.nextSibling);
            }
            errorEl.textContent = message;
            errorEl.classList.add('visible');
        };
        
        const clearFieldError = (field) => {
            field.classList.remove('input-error');
            field.classList.add('input-success');
            const errorEl = field.nextElementSibling;
            if (errorEl && errorEl.classList.contains('error-message')) {
                errorEl.classList.remove('visible');
            }
        };
        
        // Real-time validation
        form.querySelectorAll('input, select').forEach(field => {
            field.addEventListener('blur', function() {
                if (this.name === 'email' && this.value && !validateEmail(this.value)) {
                    showFieldError(this, 'Please enter a valid email address');
                } else if (this.name === 'phone' && this.value && !validatePhone(this.value)) {
                    showFieldError(this, 'Please enter a valid phone number');
                } else if (this.required && !this.value) {
                    showFieldError(this, 'This field is required');
                } else if (this.value) {
                    clearFieldError(this);
                }
            });
        });
        
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            // Validate all fields
            let isValid = true;
            const emailField = form.querySelector('[name="email"]');
            const phoneField = form.querySelector('[name="phone"]');
            const nameField = form.querySelector('[name="name"]');
            const interestField = form.querySelector('[name="interest"]');
            
            if (!nameField.value.trim()) {
                showFieldError(nameField, 'Please enter your name');
                isValid = false;
            }
            
            if (!validateEmail(emailField.value)) {
                showFieldError(emailField, 'Please enter a valid email address');
                isValid = false;
            }
            
            if (!validatePhone(phoneField.value)) {
                showFieldError(phoneField, 'Please enter a valid phone number');
                isValid = false;
            }
            
            if (!interestField.value) {
                showFieldError(interestField, 'Please select your role');
                isValid = false;
            }
            
            if (!isValid) {
                form.classList.add('error-shake');
                setTimeout(() => form.classList.remove('error-shake'), 500);
                return;
            }
            
            // Loading State
            btn.innerHTML = '<span class="animate-pulse">>> PROCESSING...</span>';
            btn.disabled = true;
            btn.classList.add('btn-loading');
            btn.style.opacity = '0.7';

            try {
                const formData = new FormData(form);
                const urlEncoded = new URLSearchParams(formData).toString();
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
                
                await fetch(form.action, {
                    method: "POST",
                    body: urlEncoded,
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    mode: 'no-cors', // Important for Google Script
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

                // Success State
                form.classList.add("hidden");
                const successMsg = document.getElementById("successMessage");
                successMsg.classList.remove("hidden");
                successMsg.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fa-solid fa-check-circle text-green-500 text-4xl mb-3"></i>
                        <p class="text-green-500 font-mono text-sm">> UPLOAD COMPLETE.</p>
                        <p class="text-gray-400 text-xs mt-2">You're on the list! We'll be in touch soon.</p>
                    </div>
                `;
                
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
                        btn.classList.remove('btn-loading');
                        // Clear validation states
                        form.querySelectorAll('input, select').forEach(el => {
                            el.classList.remove('input-error', 'input-success');
                        });
                    }, 500);
                }, 3000);

            } catch (err) {
                console.error('Form submission error:', err);
                
                // Show error message
                const errorHtml = `
                    <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mt-4">
                        <p class="text-red-400 text-sm font-mono">
                            <i class="fa-solid fa-exclamation-triangle mr-2"></i>
                            ${err.name === 'AbortError' 
                                ? 'Connection timed out. Please try again.' 
                                : 'Connection failed. Please check your internet and try again.'}
                        </p>
                    </div>
                `;
                
                let errorContainer = form.querySelector('.form-error-container');
                if (!errorContainer) {
                    errorContainer = document.createElement('div');
                    errorContainer.className = 'form-error-container';
                    form.appendChild(errorContainer);
                }
                errorContainer.innerHTML = errorHtml;
                
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.classList.remove('btn-loading');
            }
        });
    }

});

// Add to script.js inside 'DOMContentLoaded'
const spotlight = document.getElementById('spotlight');
if (spotlight) {
    document.addEventListener('mousemove', (e) => {
        spotlight.style.left = `${e.clientX}px`;
        spotlight.style.top = `${e.clientY}px`;
    });
}