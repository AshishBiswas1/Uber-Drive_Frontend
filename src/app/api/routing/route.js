import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startLat = searchParams.get('startLat');
    const startLng = searchParams.get('startLng');
    const endLat = searchParams.get('endLat');
    const endLng = searchParams.get('endLng');

    if (!startLat || !startLng || !endLat || !endLng) {
      return NextResponse.json(
        { error: 'Missing required coordinates' },
        { status: 400 }
      );
    }

    // Try OSRM first (free routing service)
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
        {
          headers: {
            'User-Agent': 'RideFlexPro/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          return NextResponse.json({
            geometry: data.routes[0].geometry,
            distance: data.routes[0].distance,
            duration: data.routes[0].duration,
            service: 'OSRM'
          });
        }
      }
    } catch (error) {
      console.error('OSRM routing error:', error);
    }

    // Fallback: straight line
    return NextResponse.json({
      geometry: {
        coordinates: [
          [parseFloat(startLng), parseFloat(startLat)],
          [parseFloat(endLng), parseFloat(endLat)]
        ]
      },
      distance: calculateDistance(
        parseFloat(startLat), parseFloat(startLng),
        parseFloat(endLat), parseFloat(endLng)
      ),
      duration: null,
      service: 'straight-line'
    });

  } catch (error) {
    console.error('Routing API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate route' },
      { status: 500 }
    );
  }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}
    