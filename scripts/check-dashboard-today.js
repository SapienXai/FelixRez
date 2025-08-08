const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables from .env file
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    // Remove quotes if present
    const cleanValue = value.trim().replace(/^["']|["']$/g, '')
    envVars[key.trim()] = cleanValue
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTodayReservations() {
  console.log('🔍 Checking what dashboard sees for today...')
  
  // Use the exact same logic as the dashboard
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${day}`
  
  console.log(`📅 Dashboard date logic: ${todayStr}`)
  console.log(`📅 System date: ${today.toISOString().split('T')[0]}`)
  
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select(`
      *,
      restaurants (
        name
      )
    `)
    .eq('reservation_date', todayStr)
    .order('reservation_time', { ascending: true })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`\n📊 Found ${reservations.length} reservations for today (${todayStr}):`)
  reservations.forEach((res, index) => {
    console.log(`${index + 1}. ${res.customer_name} - ${res.restaurants.name} - ${res.date} ${res.time} - ${res.status} - Party: ${res.party_size}`)
  })
}

checkTodayReservations().catch(console.error)