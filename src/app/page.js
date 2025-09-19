// LandingPage.js - ENHANCED WITH ROLE VALIDATION & ERROR POPUP
'use client';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function CheckItem({ children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900/10 text-gray-900">✓</span>
      <span className="text-[15px] text-gray-600">{children}</span>
    </li>
  );
}

function Testimonial({ quote, name, role }) {
  return (
    <figure className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <blockquote className="text-[15px] text-gray-600 leading-relaxed">&quot;{quote}&quot;</blockquote>
      <figcaption className="mt-4 text-sm text-gray-900">
        <span className="font-semibold">{name}</span>
        <span className="text-gray-500"> • {role}</span>
      </figcaption>
    </figure>
  );
}

function PriceCard({ title, price, cta, features, highlight = false, onNavigate }) {
  return (
    <div className={`rounded-2xl p-6 border ${highlight ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"} shadow-sm flex flex-col`}>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-gray-900">{price}</span>
        <span className="text-sm text-gray-500">/trip</span>
      </div>
      <ul className="mt-4 space-y-2 flex-grow">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[15px] text-gray-600">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onNavigate('/rider')}
        className={`mt-6 inline-flex w-full justify-center rounded-lg px-4 py-2 font-semibold transition-colors ${highlight ? "bg-gray-900 text-white hover:bg-gray-800" : "border border-gray-300 text-gray-800 hover:bg-gray-50"}`}
      >
        {cta}
      </button>
    </div>
  );
}

// New: Custom Error Popup Component
function ErrorPopup({ isOpen, onClose, message, title }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md transform rounded-xl bg-red-50 border-2 border-red-200 p-6 shadow-2xl transition-all">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-red-400 hover:text-red-600 transition-colors"
          aria-label="Close error dialog"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Error icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {/* Error content */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {title}
          </h3>
          <p className="text-red-700 mb-6">
            {message}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
            >
              Got it
            </button>
            <button
              onClick={() => {
                onClose();
                // Optional: redirect to login to switch roles
                window.location.href = '/authentication/login';
              }}
              className="px-6 py-2 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 font-medium transition-colors"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const router = useRouter();
  
  // New: State for error popup
  const [errorPopup, setErrorPopup] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  // Enhanced: Check if logged in and get user data
  const getAuthData = () => {
    if (typeof window !== "undefined") {
      // Check JWT cookie first
      const jwt = document.cookie.split('; ').find(row => row.startsWith('jwt='));
      
      // Check localStorage for login status and role
      const isLoggedIn = localStorage.getItem('isUserLoggedIn') === 'true';
      const userRole = localStorage.getItem('user_role');
      const userName = localStorage.getItem('user_name');
      
      return {
        isLoggedIn: !!jwt || isLoggedIn,
        userRole: userRole,
        userName: userName || 'User'
      };
    }
    return { isLoggedIn: false, userRole: null, userName: 'User' };
  };

  // Enhanced: Handle navigation with role validation
  const handleNavigation = (path) => {
    const authData = getAuthData();

    // If not logged in, redirect to login
    if (!authData.isLoggedIn) {
      router.push('/authentication/login');
      return;
    }

    // If logged in, check role permissions
    const targetRole = path.includes('/rider') ? 'rider' : 'driver';
    const currentRole = authData.userRole;

    // Role validation: Check if user has correct role
    if (currentRole && currentRole !== targetRole) {
      const errorMessages = {
        rider: {
          title: 'Access Denied - Rider Only',
          message: `You are currently logged in as a ${currentRole}. This page is only accessible to riders. Please switch to a rider account or create a new rider account to continue.`
        },
        driver: {
          title: 'Access Denied - Driver Only', 
          message: `You are currently logged in as a ${currentRole}. This page is only accessible to drivers. Please switch to a driver account or create a new driver account to continue.`
        }
      };

      setErrorPopup({
        isOpen: true,
        title: errorMessages[targetRole].title,
        message: errorMessages[targetRole].message
      });
      return;
    }

    // If role matches or no specific role restrictions, proceed
    router.push(path);
  };

  // New: Close error popup
  const closeErrorPopup = () => {
    setErrorPopup({
      isOpen: false,
      title: '',
      message: ''
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        
        {/* Header / Nav breadcrumbs */}
        <div className="mb-6 flex items-center gap-3">
          <span className="badge bg-gray-100 text-gray-600 border-gray-300">Security</span>
          <span className="badge bg-gray-100 text-gray-600 border-gray-300">Less wait</span>
        </div>

        {/* Hero card */}
        <div className="card grid grid-cols-1 gap-10 p-8 md:grid-cols-2 md:p-12 hero-card">
          <div className="order-2 md:order-1">
            <div className="relative mx-auto h-[420px] w-[320px] md:h-[460px] md:w-[350px] hero-image-container">
              <Image
                src="/assets/preview-phone.png"
                alt="RideFlex Pro app preview"
                fill
                sizes="(min-width: 768px) 350px, 320px"
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div className="order-1 md:order-2 self-center hero-content">
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight text-gray-900 hero-title">
              RideFlex<br />Pro
            </h1>
            <p className="mt-4 max-w-md text-[15px] text-gray-600 hero-description">
              Smarter rides for riders and flexible earnings for drivers—reliable, safe, and fast. Built with live tracking, upfront pricing, and 24/7 in‑app support.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 hero-buttons">
              <button 
                onClick={() => handleNavigation('/driver')} 
                className="btn bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200 hover:shadow-lg"
              >
                🚙 Driver
              </button>
              <button 
                onClick={() => handleNavigation('/rider')} 
                className="btn btn-primary transition-all duration-200 hover:shadow-lg"
              >
                🚗 Rider
              </button>
            </div>
          </div>
        </div>

        {/* Features grid */}
        <div className="card mt-6 grid grid-cols-1 gap-10 p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">For drivers</h2>
            <ul className="mt-5 space-y-3">
              <CheckItem>Hands‑off onboarding</CheckItem>
              <CheckItem>Short waiting times</CheckItem>
              <CheckItem>Fair, transparent earnings</CheckItem>
              <CheckItem>Next‑gen safety</CheckItem>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">For riders</h2>
            <ul className="mt-5 space-y-3">
              <CheckItem>Real‑time trip monitoring</CheckItem>
              <CheckItem>In‑app support</CheckItem>
              <CheckItem>Surge pricing clarity</CheckItem>
              <CheckItem>No‑friction payouts</CheckItem>
            </ul>
          </div>
          <div className="col-span-full mt-2 grid grid-cols-2 gap-6 text-center text-[13px] text-gray-500 md:grid-cols-4">
            <div className="rounded-lg bg-gray-100 px-4 py-3 border border-gray-200">Faster pickup</div>
            <div className="rounded-lg bg-gray-100 px-4 py-3 border border-gray-200">24/7 watch</div>
            <div className="rounded-lg bg-gray-100 px-4 py-3 border border-gray-200">Verified</div>
            <div className="rounded-lg bg-gray-100 px-4 py-3 border border-gray-200">Secure</div>
          </div>
        </div>

        {/* Testimonials */}
        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Testimonial
            quote="Pickups are consistently under 5 minutes and the app feels snappy while driving."
            name="Amar P."
            role="Driver • Pune"
          />
          <Testimonial
            quote="Price shown upfront is what I pay—no surprises at drop‑off anymore."
            name="Ritika S."
            role="Rider • Mumbai"
          />
          <Testimonial
            quote="Sharing trip status with family gives me peace of mind on late rides."
            name="Karan V."
            role="Rider • Delhi"
          />
        </section>

        {/* Pricing */}
        <section className="card mt-6 p-8">
          <h2 className="text-2xl font-semibold text-gray-900">Simple pricing</h2>
          <p className="mt-2 text-[15px] text-gray-600">Only pay for completed trips. No hidden fees.</p>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <PriceCard title="Saver" price="₹79" cta="Book Saver" features={["Compact car", "Standard pickup", "Upfront price"]} onNavigate={handleNavigation} />
            <PriceCard title="Flex" price="₹119" cta="Book Flex" features={["Sedan class", "Priority pickup", "ETA tracking"]} highlight onNavigate={handleNavigation} />
            <PriceCard title="Pro" price="₹179" cta="Book Pro" features={["Premium sedan", "Top drivers", "Enhanced support"]} onNavigate={handleNavigation} />
          </div>
        </section>

        {/* Top 5 Reviews */}
        <section className="card mt-6 p-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Top reviews</h2>
            <a href="/reviews" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
              See all
            </a>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Ayesha K.", role: "Rider • Bengaluru", rating: 5, text: "Pickup was under 3 minutes and the route was ready. Smooth, safe, and quick!" },
              { name: "Rohit M.", role: "Driver • Mumbai", rating: 5, text: "Transparent fares and steady queue. Payouts the next morning—no hassles." },
              { name: "Sneha P.", role: "Rider • Pune", rating: 4, text: "Upfront price matched the bill. ETA tracking made it easy to plan ahead." },
              { name: "Vikram S.", role: "Driver • Delhi", rating: 5, text: "Accurate navigation and clear surge info. Peak-hour driving feels fair." },
              { name: "Neha G.", role: "Rider • Hyderabad", rating: 5, text: "App is fast and responsive. Driver arrived early; fare was exactly as quoted." },
            ].map((r) => (
              <article key={r.name} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{r.name}</h3>
                    <p className="text-xs text-gray-500">{r.role}</p>
                  </div>
                  <div className="flex items-center" aria-label={`${r.rating} out of 5 stars`} role="img">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        viewBox="0 0 20 20"
                        className={`h-4 w-4 ${i < r.rating ? "text-yellow-400" : "text-gray-300"}`}
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M10 15.27l-5.18 3.05 1.64-5.64L2 8.96l5.75-.5L10 3l2.25 5.46 5.75.5-4.46 3.72 1.64 5.64z"
                        />
                      </svg>
                    ))}
                  </div>
                </header>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600">&quot;{r.text}&quot;</p>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="card mt-6 p-8">
          <h2 className="text-2xl font-semibold text-gray-900">FAQ</h2>
          <div className="mt-4 divide-y divide-gray-200">
            {[
              { q: "How are fares calculated?", a: "Fares are based on distance, time, and local factors. You always see the total before you confirm." },
              { q: "Can I share my trip?", a: "Yes. Use Share Trip from the trip screen to send a live link with your driver and ETA." },
              { q: "When do drivers get paid?", a: "Earnings are settled to the driver's account automatically with daily summaries and payout controls." },
            ].map(({ q, a }) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] text-gray-900 hover:text-gray-700">
                  {q}
                  <span className="ml-4 rounded-md border border-gray-300 px-2 py-0.5 text-[12px] text-gray-500 group-open:rotate-180 transition">
                    ▼
                  </span>
                </summary>
                <p className="mt-2 text-[15px] text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky footer CTA */}
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <p className="hidden text-[13px] text-gray-600 md:block">Ready to ride or drive with RideFlex Pro?</p>
          <div className="ml-auto flex gap-3">
            <button 
              onClick={() => handleNavigation('/driver')} 
              className="btn bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200 hover:shadow-lg"
            >
              🚙 Become a Driver
            </button>
            <button 
              onClick={() => handleNavigation('/rider')} 
              className="btn btn-primary transition-all duration-200 hover:shadow-lg"
            >
              🚗 Book a Ride
            </button>
          </div>
        </div>
      </div>

      {/* New: Error Popup Modal */}
      <ErrorPopup
        isOpen={errorPopup.isOpen}
        onClose={closeErrorPopup}
        title={errorPopup.title}
        message={errorPopup.message}
      />
    </main>
  );
}
