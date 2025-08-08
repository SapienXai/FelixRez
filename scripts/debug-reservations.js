// Simple script to check reservations without external dependencies
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

async function debugReservations() {
  console.log('🔍 Checking existing reservations...')
  
  // Check all reservations
  const { data: allReservations, error: allError } = await supabase
    .from('reservations')
    .select(`
      *,
      restaurants (id, name)
    `)
    .order('created_at', { ascending: false })
  
  if (allError) {
    console.error('❌ Error fetching reservations:', allError)
    return
  }
  
  console.log(`📊 Total reservations found: ${allReservations?.length || 0}`)
  
  if (allReservations && allReservations.length > 0) {
    console.log('\n📋 Recent reservations:')
    allReservations.slice(0, 5).forEach((res, index) => {
      console.log(`${index + 1}. ${res.customer_name} - ${res.restaurants?.name} - ${res.reservation_date} ${res.reservation_time} - Status: ${res.status}`)
    })
  } else {
    console.log('\n⚠️  No reservations found in database!')
    console.log('\n🔧 Creating sample reservations for testing...')
    await createSampleReservations()
  }
  
  // Check today's reservations specifically
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  
  const { data: todayReservations, error: todayError } = await supabase
    .from('reservations')
    .select(`
      *,
      restaurants (id, name)
    `)
    .eq('reservation_date', todayStr)
    .order('reservation_time', { ascending: true })
  
  if (todayError) {
    console.error('❌ Error fetching today\'s reservations:', todayError)
  } else {
    console.log(`\n📅 Today's reservations (${todayStr}): ${todayReservations?.length || 0}`)
    if (todayReservations && todayReservations.length > 0) {
      todayReservations.forEach((res, index) => {
        console.log(`${index + 1}. ${res.customer_name} - ${res.restaurants?.name} - ${res.reservation_time} - Status: ${res.status}`)
      })
    }
  }
  
  // Check upcoming reservations
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  const { data: upcomingReservations, error: upcomingError } = await supabase
    .from('reservations')
    .select(`
      *,
      restaurants (id, name)
    `)
    .gte('reservation_date', tomorrow.toISOString().split('T')[0])
    .lte('reservation_date', nextWeek.toISOString().split('T')[0])
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })
  
  if (upcomingError) {
    console.error('❌ Error fetching upcoming reservations:', upcomingError)
  } else {
    console.log(`\n📆 Upcoming reservations (next 7 days): ${upcomingReservations?.length || 0}`)
    if (upcomingReservations && upcomingReservations.length > 0) {
      upcomingReservations.forEach((res, index) => {
        console.log(`${index + 1}. ${res.customer_name} - ${res.restaurants?.name} - ${res.reservation_date} ${res.reservation_time} - Status: ${res.status}`)
      })
    }
  }
}

async function createSampleReservations() {
  console.log('\n🏗️  Creating sample reservations...')
  
  // First, get available restaurants
  const { data: restaurants, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name')
  
  if (restaurantError || !restaurants || restaurants.length === 0) {
    console.error('❌ No restaurants found. Please seed restaurants first.')
    return
  }
  
  console.log(`✅ Found ${restaurants.length} restaurants`)
  
  const today = new Date()
  const sampleReservations = []
  
  // Create reservations for today
  const todayStr = today.toISOString().split('T')[0]
  sampleReservations.push(
    {
      restaurant_id: restaurants[0].id,
      customer_name: 'John Smith',
      customer_email: 'john.smith@example.com',
      customer_phone: '+1234567890',
      party_size: 2,
      reservation_date: todayStr,
      reservation_time: '19:00',
      status: 'confirmed',
      special_requests: 'Window table preferred'
    },
    {
      restaurant_id: restaurants[1] ? restaurants[1].id : restaurants[0].id,
      customer_name: 'Sarah Johnson',
      customer_email: 'sarah.j@example.com',
      customer_phone: '+1234567891',
      party_size: 4,
      reservation_date: todayStr,
      reservation_time: '20:30',
      status: 'pending',
      special_requests: 'Birthday celebration'
    }
  )
  
  // Create reservations for tomorrow
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  sampleReservations.push(
    {
      restaurant_id: restaurants[0].id,
      customer_name: 'Mike Wilson',
      customer_email: 'mike.w@example.com',
      customer_phone: '+1234567892',
      party_size: 3,
      reservation_date: tomorrowStr,
      reservation_time: '18:30',
      status: 'confirmed'
    },
    {
      restaurant_id: restaurants[2] ? restaurants[2].id : restaurants[0].id,
      customer_name: 'Emma Davis',
      customer_email: 'emma.d@example.com',
      customer_phone: '+1234567893',
      party_size: 6,
      reservation_date: tomorrowStr,
      reservation_time: '19:30',
      status: 'pending',
      special_requests: 'Vegetarian options needed'
    }
  )
  
  // Create reservations for next few days
  for (let i = 2; i <= 5; i++) {
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + i)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    sampleReservations.push({
      restaurant_id: restaurants[i % restaurants.length].id,
      customer_name: `Customer ${i}`,
      customer_email: `customer${i}@example.com`,
      customer_phone: `+123456789${i}`,
      party_size: Math.floor(Math.random() * 6) + 1,
      reservation_date: futureDateStr,
      reservation_time: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'][Math.floor(Math.random() * 6)],
      status: ['pending', 'confirmed'][Math.floor(Math.random() * 2)]
    })
  }
  
  // Insert sample reservations
  const { data, error } = await supabase
    .from('reservations')
    .insert(sampleReservations)
  
  if (error) {
    console.error('❌ Error creating sample reservations:', error)
  } else {
    console.log(`✅ Created ${sampleReservations.length} sample reservations`)
    console.log('\n📊 Sample reservations created:')
    sampleReservations.forEach((res, index) => {
      const restaurant = restaurants.find(r => r.id === res.restaurant_id)
      console.log(`${index + 1}. ${res.customer_name} - ${restaurant?.name} - ${res.reservation_date} ${res.reservation_time} - Status: ${res.status}`)
    })
  }
}

// Run the debug function
debugReservations().catch(console.error)