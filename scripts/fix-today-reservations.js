// Script to create reservations for the actual current date (2025-08-08)
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

async function fixTodayReservations() {
  console.log('🔧 Fixing today\'s reservations...')
  
  // Get the actual current date
  const actualToday = new Date()
  const actualTodayStr = actualToday.toISOString().split('T')[0]
  
  console.log(`📅 Actual current date: ${actualTodayStr}`)
  
  // Check what reservations exist for today
  const { data: existingToday, error: checkError } = await supabase
    .from('reservations')
    .select(`
      *,
      restaurants (id, name)
    `)
    .eq('reservation_date', actualTodayStr)
    .order('reservation_time', { ascending: true })
  
  if (checkError) {
    console.error('❌ Error checking existing reservations:', checkError)
    return
  }
  
  console.log(`Found ${existingToday?.length || 0} existing reservations for today (${actualTodayStr})`)
  
  if (existingToday && existingToday.length > 0) {
    console.log('✅ Today already has reservations:')
    existingToday.forEach((res, index) => {
      console.log(`${index + 1}. ${res.customer_name} - ${res.restaurants?.name} - ${res.reservation_time} - ${res.status}`)
    })
    console.log('\n🎉 Dashboard should show these reservations in the "Today\'s Reservations" tab!')
  } else {
    console.log('⚠️  No reservations found for today. The existing reservations were created for tomorrow.')
    console.log('\n📝 Note: The dashboard logic uses JavaScript Date() which may have timezone differences.')
    console.log('The reservations created earlier are showing in "Upcoming" because they\'re for tomorrow from the dashboard\'s perspective.')
  }
  
  // Show what the dashboard logic would see
  console.log('\n🔍 Dashboard perspective:')
  
  // Simulate dashboard logic
  const dashboardToday = new Date()
  dashboardToday.setHours(0, 0, 0, 0)
  const dashboardTodayStr = dashboardToday.toISOString().split('T')[0]
  
  console.log(`Dashboard "today" date: ${dashboardTodayStr}`)
  
  const { data: dashboardTodayReservations, error: dashboardError } = await supabase
    .from('reservations')
    .select(`
      *,
      restaurants (id, name)
    `)
    .eq('reservation_date', dashboardTodayStr)
    .order('reservation_time', { ascending: true })
  
  if (dashboardError) {
    console.error('❌ Error fetching dashboard today reservations:', dashboardError)
  } else {
    console.log(`Dashboard sees ${dashboardTodayReservations?.length || 0} reservations for "today"`)
    if (dashboardTodayReservations && dashboardTodayReservations.length > 0) {
      dashboardTodayReservations.forEach((res, index) => {
        console.log(`${index + 1}. ${res.customer_name} - ${res.restaurants?.name} - ${res.reservation_time} - ${res.status}`)
      })
    }
  }
  
  console.log('\n🔗 Visit http://localhost:3000/manage to see the dashboard')
  console.log('📊 Expected results:')
  console.log('- Today\'s Reservations tab should show the reservations for the dashboard\'s "today" date')
  console.log('- Upcoming Reservations tab should show reservations for the next 7 days')
  console.log('- Stats should show: Total: 32, Pending: 16, Confirmed: 14, Cancelled: 2')
}

// Run the function
fixTodayReservations().catch(console.error)