import { createServiceRoleClient } from './lib/supabase.js';

async function checkRestaurantData() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('restaurants')
      .select('*');
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Restaurants data:');
    data.forEach(r => {
      console.log(`\n${r.name}:`);
      console.log(`- reservation_enabled: ${r.reservation_enabled}`);
      console.log(`- opening_time: ${r.opening_time}`);
      console.log(`- closing_time: ${r.closing_time}`);
      console.log(`- time_slot_duration: ${r.time_slot_duration}`);
      console.log(`- advance_booking_days: ${r.advance_booking_days}`);
      console.log(`- min_advance_hours: ${r.min_advance_hours}`);
      console.log(`- max_party_size: ${r.max_party_size}`);
      console.log(`- min_party_size: ${r.min_party_size}`);
      console.log(`- allowed_days_of_week: ${JSON.stringify(r.allowed_days_of_week)}`);
      console.log(`- blocked_dates: ${JSON.stringify(r.blocked_dates)}`);
    });
  } catch (err) {
    console.error('Script error:', err);
  }
}

checkRestaurantData();
export {};