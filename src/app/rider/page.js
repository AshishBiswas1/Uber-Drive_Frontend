'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import RideBookingForm from './../../components/RideBookingForm'; // ← IMPORT ADDED

function RideOption({ title, description, price, icon, isPopular = false }) {
  return (
    <div className={`border rounded-lg p-6 relative ${isPopular ? 'border-primary bg-primary/5' : 'border-white/10'}`}>
      {isPopular && (
        <div className="absolute -top-3 left-4">
          <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-[color:var(--muted)] text-sm mt-1">{description}</p>
          <p className="text-foreground font-semibold mt-2">Starting at {price}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, description }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <span className="text-lg">{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

export default function RiderPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        {/* Back navigation */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-foreground">
            ← Back to overview
          </Link>
        </div>

        {/* Hero section */}
        <div className="card p-8 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                Ride with RideFlex Pro
              </h1>
              <p className="mt-4 text-[15px] text-[color:var(--muted)] max-w-lg">
                Book rides with confidence. Enjoy upfront pricing, quick pickups, 
                real-time tracking, and verified drivers every time.
              </p>

              {/* Imported RideBookingForm component fitted in its exact location */}
              <RideBookingForm />
            </div>

            {/* App preview */}
            <div className="relative mx-auto h-[400px] w-[300px]">
              <Image
                src="/assets/rider-app-preview.png"
                alt="RideFlex Pro rider app"
                fill
                sizes="300px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Why choose us */}
        <section className="card p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6">Why choose RideFlex Pro?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureItem
              icon="💰"
              title="Transparent pricing"
              description="Know your fare upfront with no hidden charges or surge surprises."
            />
            <FeatureItem
              icon="⚡"
              title="Quick pickups"
              description="Average pickup time under 5 minutes with live driver tracking."
            />
            <FeatureItem
              icon="🛡️"
              title="Safety first"
              description="All drivers verified with background checks and trip sharing."
            />
            <FeatureItem
              icon="📱"
              title="Easy booking"
              description="Book in seconds with saved locations and payment methods."
            />
            <FeatureItem
              icon="🎧"
              title="24/7 support"
              description="Get help anytime via in-app chat or phone support."
            />
            <FeatureItem
              icon="⭐"
              title="Top rated"
              description="Consistently rated 4.9/5 stars by riders across all cities."
            />
          </div>
        </section>

        {/* Ride options */}
        <section className="card p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6">Choose your ride</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RideOption
              icon="🚗"
              title="Saver"
              description="Affordable rides in compact cars. Perfect for solo trips."
              price="₹79"
            />
            <RideOption
              icon="🚙"
              title="Flex"
              description="Spacious sedans with priority pickup and ETA tracking."
              price="₹119"
              isPopular
            />
            <RideOption
              icon="🚘"
              title="Pro"
              description="Premium cars with top-rated drivers and enhanced comfort."
              price="₹179"
            />
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-6">What riders say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Priya M.",
                location: "Mumbai",
                rating: 5,
                text: "Pickup was exactly on time and the driver was professional. App made everything so easy!"
              },
              {
                name: "Arjun K.",
                location: "Bangalore",
                rating: 5,
                text: "Love the upfront pricing. No more fare surprises at the end of the trip."
              },
              {
                name: "Sneha R.",
                location: "Delhi",
                rating: 5,
                text: "Shared my trip with family for a late night ride. Felt safe and secure throughout."
              }
            ].map((review) => (
              <div key={review.name} className="card p-6">
                <div className="flex items-center gap-2 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-[color:var(--muted)] text-sm mb-3">&quot;{review.text}&quot;</p>
                <p className="text-sm font-semibold">{review.name}</p>
                <p className="text-xs text-[color:var(--muted)]">{review.location}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="card p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to ride?</h2>
          <p className="text-[color:var(--muted)] mb-6 max-w-2xl mx-auto">
            Download the RideFlex Pro app and book your first ride today. 
            New users get ₹100 off their first 3 rides.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book-ride" className="btn btn-primary">
              Book Your First Ride
            </Link>
            <Link href="/download" className="btn border border-white/10 hover:bg-white/5">
              Download App
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
