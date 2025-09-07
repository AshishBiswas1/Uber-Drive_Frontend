// src/app/driver/page.js
'use client';
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

function FeatureItem({ icon, title, description }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

function RequirementItem({ children, completed = false }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full ${completed ? 'bg-green-500/20 text-green-400' : 'bg-foreground/10 text-foreground'}`}>
        {completed ? '✓' : '○'}
      </span>
      <span className="text-[15px] text-[color:var(--muted)]">{children}</span>
    </li>
  );
}

// Google Maps placeholder component
function GoogleMapComponent() {
  return (
    <div className="h-full w-full bg-neutral-800 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🗺️</div>
        <p className="text-[color:var(--muted)]">Google Maps will be integrated here</p>
        <p className="text-sm text-[color:var(--muted)] mt-2">
          Driver coverage areas and pickup zones
        </p>
      </div>
    </div>
  );
}

export default function DriverPage() {
  const [isClient, setIsClient] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    termsAccepted: false
  });
  const [errors, setErrors] = useState({});

  // Ensure component only renders on client after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.city) {
      newErrors.city = 'Please select your city';
    }
    
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Form submitted:', formData);
      alert('Application submitted successfully! We&apos;ll contact you within 24 hours.');
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        city: '',
        termsAccepted: false
      });
    }
  };

  const isFormValid = () => {
    return formData.firstName.trim() && 
           formData.lastName.trim() && 
           formData.phone.trim() && 
           formData.email.trim() && 
           formData.city && 
           formData.termsAccepted;
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Main Content - Left Half */}
      <div className="w-1/2 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-6 md:p-10">
          {/* Back navigation */}
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-foreground">
              ← Back to overview
            </Link>
          </div>

          {/* Hero section */}
          <div className="card p-8">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Drive with RideFlex Pro
            </h1>
            <p className="mt-4 text-[15px] text-[color:var(--muted)]">
              Join thousands of drivers earning flexible income on your schedule. 
              Sign up in minutes and start driving today with transparent fares and 24/7 support.
            </p>
            
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href="#signup" className="btn btn-primary">Start Application</a>
              <a href="#requirements" className="btn border border-white/10 hover:bg-white/5">View Requirements</a>
            </div>

            {/* Quick stats */}
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">₹2,500</div>
                <div className="text-xs text-[color:var(--muted)]">Avg. daily earnings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">5 min</div>
                <div className="text-xs text-[color:var(--muted)]">Signup time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">24/7</div>
                <div className="text-xs text-[color:var(--muted)]">Support available</div>
              </div>
            </div>
          </div>

          {/* Features */}
          <section className="card mt-6 p-8">
            <h2 className="text-2xl font-semibold">Why drive with us?</h2>
            <div className="mt-6 grid grid-cols-1 gap-6">
              <FeatureItem
                icon="💰"
                title="Flexible earnings"
                description="Keep 85% of each fare plus 100% of tips. Transparent pricing with no hidden deductions."
              />
              <FeatureItem
                icon="📱"
                title="Smart app"
                description="Built-in navigation, trip queue, and earnings tracker. Everything you need in one place."
              />
              <FeatureItem
                icon="🕐"
                title="Your schedule"
                description="Drive when you want. Set your availability and go online with one tap."
              />
              <FeatureItem
                icon="🛡️"
                title="Safety first"
                description="Background checks, real-time support, and insurance coverage on every trip."
              />
              <FeatureItem
                icon="⚡"
                title="Quick payouts"
                description="Daily automatic payouts to your bank account. No waiting for weekly transfers."
              />
              <FeatureItem
                icon="📞"
                title="24/7 support"
                description="Get help anytime via in-app chat, phone, or emergency assistance."
              />
            </div>
          </section>

          {/* Requirements */}
          <section id="requirements" className="card mt-6 p-8">
            <h2 className="text-2xl font-semibold">Requirements</h2>
            <div className="mt-6 grid grid-cols-1 gap-8">
              <div>
                <h3 className="text-lg font-semibold">Driver requirements</h3>
                <ul className="mt-4 space-y-3">
                  <RequirementItem>21+ years old with valid driving license</RequirementItem>
                  <RequirementItem>Clean driving record (last 3 years)</RequirementItem>
                  <RequirementItem>Pass background verification</RequirementItem>
                  <RequirementItem>Smartphone with 4G connection</RequirementItem>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Vehicle requirements</h3>
                <ul className="mt-4 space-y-3">
                  <RequirementItem>4-door vehicle (2015 or newer)</RequirementItem>
                  <RequirementItem>Valid registration & insurance</RequirementItem>
                  <RequirementItem>Good condition (interior & exterior)</RequirementItem>
                  <RequirementItem>Pass vehicle inspection</RequirementItem>
                </ul>
              </div>
            </div>
          </section>

          {/* Signup form - Enhanced with validation */}
          <section id="signup" className="card mt-6 p-8">
            <h2 className="text-2xl font-semibold">Start your application</h2>
            <p className="mt-2 text-[15px] text-[color:var(--muted)]">
              Takes 5 minutes to complete. You&apos;ll hear back within 24 hours.
            </p>
            
            <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground">First name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-foreground placeholder-[color:var(--muted)] focus:outline-none focus:ring-1 ${
                    errors.firstName 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-white/10 bg-black/20 focus:border-primary focus:ring-primary'
                  }`}
                  placeholder="Enter your first name"
                  suppressHydrationWarning
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Last name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-foreground placeholder-[color:var(--muted)] focus:outline-none focus:ring-1 ${
                    errors.lastName 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-white/10 bg-black/20 focus:border-primary focus:ring-primary'
                  }`}
                  placeholder="Enter your last name"
                  suppressHydrationWarning
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Phone number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-foreground placeholder-[color:var(--muted)] focus:outline-none focus:ring-1 ${
                    errors.phone 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-white/10 bg-black/20 focus:border-primary focus:ring-primary'
                  }`}
                  placeholder="+91 98765 43210"
                  suppressHydrationWarning
                />
                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Email address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-foreground placeholder-[color:var(--muted)] focus:outline-none focus:ring-1 ${
                    errors.email 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-white/10 bg-black/20 focus:border-primary focus:ring-primary'
                  }`}
                  placeholder="your.email@example.com"
                  suppressHydrationWarning
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">City *</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-foreground focus:outline-none focus:ring-1 ${
                    errors.city 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-white/10 bg-black/20 focus:border-primary focus:ring-primary'
                  }`}
                  suppressHydrationWarning
                >
                  <option value="">Select your city</option>
                  <option value="mumbai">Mumbai</option>
                  <option value="delhi">Delhi</option>
                  <option value="bengaluru">Bengaluru</option>
                  <option value="pune">Pune</option>
                  <option value="hyderabad">Hyderabad</option>
                </select>
                {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city}</p>}
              </div>
              
              <div>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 rounded border-white/10 bg-black/20 text-primary focus:ring-primary"
                    suppressHydrationWarning
                  />
                  <span className="text-sm text-[color:var(--muted)]">
                    I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a> *
                  </span>
                </label>
                {errors.termsAccepted && <p className="mt-1 text-sm text-red-500">{errors.termsAccepted}</p>}
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={!isFormValid()}
                  className={`w-full rounded-lg px-4 py-3 font-semibold transition-all ${
                    isFormValid()
                      ? 'bg-primary text-white hover:bg-primary/90 focus:ring-2 focus:ring-primary/50'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {isFormValid() ? 'Submit Application' : 'Complete Required Fields'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* Map Section - Right Half */}
      <div className="w-1/2 h-screen sticky top-0">
        <GoogleMapComponent />
      </div>
    </div>
  );
}
