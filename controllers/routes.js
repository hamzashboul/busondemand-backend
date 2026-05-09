const fetch = require('node-fetch')

const getRoutes = async (req, res) => {
  const { area, direction } = req.query

  try {
    // Geocoding
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(area + '، الأردن')}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'ar', 'User-Agent': 'BusOnDemand/1.0' } }
    )
    const geoData = await geoRes.json()

    if (!geoData || geoData.length === 0) {
      return res.status(404).json({ message: 'Location not found' })
    }

    const destLat = parseFloat(geoData[0].lat)
    const destLng = parseFloat(geoData[0].lon)

    const ISRA = { lat: 31.9454, lng: 35.9284 }
    const from = direction === 'from_university'
      ? [ISRA.lng, ISRA.lat]
      : [destLng, destLat]
    const to = direction === 'from_university'
      ? [destLng, destLat]
      : [ISRA.lng, ISRA.lat]

    // Routes
    const orsRes = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        method: 'POST',
        headers: {
          'Authorization': process.env.ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: [from, to],
          alternative_routes: { target_count: 3, weight_factor: 1.6 }
        })
      }
    )

    const orsData = await orsRes.json()
    res.json({ destination: { lat: destLat, lng: destLng }, routes: orsData })

  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch routes', error: error.message })
  }
}

module.exports = { getRoutes }