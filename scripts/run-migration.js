// Script to check if migration is needed and provide guidance
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env
const envPath = path.join(__dirname, '..', '.env')
let envVars = {}

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
    }
  })
}

// Set environment variables
Object.keys(envVars).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = envVars[key]
  }
})

async function checkMigration() {
  try {
    console.log('Checking if reservation settings migration is needed...')
    
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check if columns already exist by trying to select them
    const { data: existingData, error: checkError } = await supabase
      .from('restaurants')
      .select('reservation_enabled')
      .limit(1)
    
    if (!checkError) {
      console.log('✅ Reservation settings columns already exist!')
      console.log('The database schema is up to date.')
      return
    }
    
    console.log('❌ Reservation settings columns do not exist yet.')
    console.log('\n=== MIGRATION REQUIRED ===')
    console.log('Please run the SQL migration manually:')
    console.log('\n1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of scripts/sql/004_add_reservation_settings.sql')
    console.log('4. Execute the SQL')
    console.log('\nOr the columns will be created automatically when you first save a restaurant with the new form.')
    
  } catch (error) {
    console.error('Migration check failed:', error.message)
    console.log('\nThis might indicate that the columns don\'t exist yet.')
    console.log('Please run the SQL migration manually in Supabase dashboard.')
  }
}

checkMigration()