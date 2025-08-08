// Script to create reservations for today and upcoming days for dashboard testing
const fs = require('fs')
const path = require('path')

// Read environment variables from .env
const envPath = path.join(__dirname, '..', '.env')
let envVars = {}

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
    }
  })
}

// Import Supabase client
const { createClient } = require('@supabase/supabase-js')

// Create Supabase client
const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function createTodayReservations() {
  console.log('🏗️  Creating reservations for today and upcoming days...')
  
  // First, get available restaurants
  const { data: restaurants, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name')
  
  if (restaurantError || !restaurants || restaurants.length === 0) {
    console.error('❌ No restaurants found. Please seed restaurants first.')
    return
  }
  
  console.log(`✅ Found ${restaurants.length} restaurants:`, restaurants.map(r => r.name).join(', '))
  
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  console.log(`📅 Creating reservations for today: ${todayStr}`)
  
  const todayReservations = [
    {
      restaurant_id: restaurants[0].id,
      customer_name: 'Alice Johnson',
      customer_email: 'alice.johnson@example.com',
      customer_phone: '+1555123456',
      party_size: 2,
      reservation_date: todayStr,
      reservation_time: '12:30:00',
      status: 'confirmed',
      special_requests: 'Lunch meeting - quiet table preferred'
    },
    {
      restaurant_id: restaurants[1] ? restaurants[1].id : restaurants[0].id,
      customer_name: 'Bob Smith',
      customer_email: 'bob.smith@example.com',
      customer_phone: '+1555234567',
      party_size: 4,
      reservation_date: todayStr,
      reservation_time: '18:00:00',
      status: 'pending',
      special_requests: 'Family dinner'
    },
    {
      restaurant_id: restaurants[2] ? restaurants[2].id : restaurants[0].id,
      customer_name: 'Carol Davis',
      customer_email: 'carol.davis@example.com',
      customer_phone: '+1555345678',
      party_size: 3,
      reservation_date: todayStr,
      reservation_time: '19:30:00',
      status: 'confirmed',
      special_requests: 'Anniversary celebration'
    },
    {
      restaurant_id: restaurants[3] ? restaurants[3].id : restaurants[0].id,
      customer_name: 'David Wilson',
      customer_email: 'david.wilson@example.com',
      customer_phone: '+1555456789',
      party_size: 6,
      reservation_date: todayStr,
      reservation_time: '20:00:00',
      status: 'pending',
      special_requests: 'Business dinner - need private area'
    }
  ]
  
  // Create reservations for the next few days
  const upcomingReservations = []
  
  for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + dayOffset)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    const dayName = futureDate.toLocaleDateString('en-US', { weekday: 'long' })
    
    upcomingReservations.push(
      {
        restaurant_id: restaurants[dayOffset % restaurants.length].id,
        customer_name: `Customer Day${dayOffset}A`,
        customer_email: `customer.day${dayOffset}a@example.com`,
        customer_phone: `+155567890${dayOffset}`,
        party_size: Math.floor(Math.random() * 4) + 2,
        reservation_date: futureDateStr,
        reservation_time: '18:30:00',
        status: Math.random() > 0.5 ? 'confirmed' : 'pending',
        special_requests: `${dayName} reservation`
      },
      {
        restaurant_id: restaurants[(dayOffset + 1) % restaurants.length].id,
        customer_name: `Customer Day${dayOffset}B`,
        customer_email: `customer.day${dayOffset}b@example.com`,
        customer_phone: `+155578901${dayOffset}`,
        party_size: Math.floor(Math.random() * 4) + 2,
        reservation_date: futureDateStr,
        reservation_time: '20:00:00',
        status: Math.random() > 0.5 ? 'confirmed' : 'pending'
      }
    )
  }
  
  const allNewReservations = [...todayReservations, ...upcomingReservations]
  
  // Insert all reservations
  const { data, error } = await supabase
    .from('reservations')
    .insert(allNewReservations)
  
  if (error) {
    console.error('❌ Error creating reservations:', error)
    return
  }
  
  console.log(`✅ Successfully created ${allNewReservations.length} reservations`)
  
  console.log('\n📊 Today\'s reservations created:')
  todayReservations.forEach((res, index) => {
    const restaurant = restaurants.find(r => r.id === res.restaurant_id)
    console.log(`${index + 1}. ${res.customer_name} - ${restaurant?.name} - ${res.reservation_time} - Status: ${res.status}`)
  })
  
  console.log('\n📆 Upcoming reservations created:')
  upcomingReservations.slice(0, 6).forEach((res, index) => {
    const restaurant = restaurants.find(r => r.id === res.restaurant_id)
    console.log(`${index + 1}. ${res.customer_name} - ${restaurant?.name} - ${res.reservation_date} ${res.reservation_time} - Status: ${res.status}`)
  })
  
  console.log('\n🎉 Dashboard should now show today\'s and upcoming reservations!')
  console.log('🔗 Visit http://localhost:3000/manage to see the updated dashboard')
}

// Run the function
createTodayReservations().catch(console.error)