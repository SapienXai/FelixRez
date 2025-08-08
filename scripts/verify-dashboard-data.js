// Script to verify exactly what data the dashboard should be showing
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

async function verifyDashboardData() {
  console.log('🔍 Verifying dashboard data...')
  console.log(`📅 Current system date: ${new Date().toISOString().split('T')[0]}`)
  
  // Replicate the exact logic from dashboard-actions.ts
  
  // 1. Get Dashboard Stats
  console.log('\n📊 DASHBOARD STATS:')
  
  // Total reservations
  const { count: total, error: totalError } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
  
  if (totalError) {
    console.error('❌ Error fetching total:', totalError)
  } else {
    console.log(`Total Reservations: ${total}`)
  }
  
  // Pending reservations
  const { count: pending, error: pendingError } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  
  if (pendingError) {
    console.error('❌ Error fetching pending:', pendingError)
  } else {
    console.log(`Pending Reservations: ${pending}`)
  }
  
  // Confirmed reservations
  const { count: confirmed, error: confirmedError } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmed')
  
  if (confirmedError) {
    console.error('❌ Error fetching confirmed:', confirmedError)
  } else {
    console.log(`Confirmed Reservations: ${confirmed}`)
  }
  
  // Cancelled reservations
  const { count: cancelled, error: cancelledError } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cancelled')
  
  if (cancelledError) {
    console.error('❌ Error fetching cancelled:', cancelledError)
  } else {
    console.log(`Cancelled Reservations: ${cancelled}`)
  }
  
  // 2. Get Today's Reservations (exact logic from getTodayReservations)
  console.log('\n📅 TODAY\'S RESERVATIONS:')
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDateStr = today.toISOString().split('T')[0]
  
  console.log(`Looking for reservations on: ${todayDateStr}`)
  
  const { data: todayReservations, error: todayError } = await supabase
    .from('reservations')
    .select(`
      *,
      restaurants (id, name)
    `)
    .eq('reservation_date', todayDateStr)
    .order('reservation_time', { ascending: true })
  
  if (todayError) {
    console.error('❌ Error fetching today\'s reservations:', todayError)
  } else {
    console.log(`Found ${todayReservations?.length || 0} reservations for today:`)
    if (todayReservations && todayReservations.length > 0) {
      todayReservations.forEach((res, index) => {
        console.log(`${index + 1}. ${res.customer_name} - ${res.restaurants?.name} - ${res.reservation_time} - ${res.status} - Party: ${res.party_size}`)
      })
    }
  }
  
  // 3. Get Upcoming Reservations (exact logic from getUpcomingReservations)
  console.log('\n📆 UPCOMING RESERVATIONS:')
  
  const todayForUpcoming = new Date()
  todayForUpcoming.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(todayForUpcoming)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const nextWeek = new Date(todayForUpcoming)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  console.log(`Looking for reservations from ${tomorrow.toISOString().split('T')[0]} to ${nextWeek.toISOString().split('T')[0]}`)
  
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
    console.log(`Found ${upcomingReservations?.length || 0} upcoming reservations:`)
    if (upcomingReservations && upcomingReservations.length > 0) {
      upcomingReservations.forEach((res, index) => {
        console.log(`${index + 1}. ${res.customer_name} - ${res.restaurants?.name} - ${res.reservation_date} ${res.reservation_time} - ${res.status} - Party: ${res.party_size}`)
      })
    }
  }
  
  console.log('\n✅ Dashboard verification complete!')
  console.log('🔗 The dashboard at http://localhost:3000/manage should show this exact data.')
}

// Run the verification
verifyDashboardData().catch(console.error)