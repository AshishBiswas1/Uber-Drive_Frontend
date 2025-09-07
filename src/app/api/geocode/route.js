// src/app/api/geocode/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  
  if (!query && (!lat || !lng)) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    let url;
    if (query) {
      // Forward geocoding
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=in`;
    } else {
      // Reverse geocoding
      url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RideFlexPro/1.0 (contact@rideflex.com)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Add small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding API error:', error);
    return NextResponse.json(
      { error: 'Geocoding service temporarily unavailable' }, 
      { status: 503 }
    );
  }
}
