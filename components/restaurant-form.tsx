'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { createRestaurant, updateRestaurant } from '@/app/manage/actions';
import { getReservationAreas, bulkUpdateReservationAreas } from '@/app/manage/reservation-areas-actions';
import { ReservationAreasForm } from '@/components/manage/reservation-areas-form';
import { toast } from 'sonner';
import type { Restaurant, ReservationArea } from '@/types/supabase';

interface RestaurantFormProps {
  restaurant?: RestaurantWithMedia;
  onSuccess?: () => void;
  onClose?: () => void;
  open?: boolean;
}

interface RestaurantWithMedia extends Restaurant {
  media?: { media_url: string }[];
}

interface ReservationAreaFormData {
  id?: string
  clientId?: string
  name: string
  description: string
  is_active: boolean
  display_order: number
  opening_time: string
  closing_time: string
  time_slot_duration: number | null
  max_party_size: number | null
  min_party_size: number | null
  advance_booking_days: number | null
  min_advance_hours: number | null
  allowed_days_of_week: number[] | null
  blocked_dates: string[]
  max_concurrent_reservations: number | null
  useRestaurantDefaults: boolean
}

const dayNames = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" }
]

export function RestaurantForm({ restaurant, onSuccess, onClose, open = true }: RestaurantFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [reservationAreas, setReservationAreas] = useState<ReservationAreaFormData[]>([]);
  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    description: restaurant?.description || '',
    cuisine: restaurant?.cuisine || '',
    location: restaurant?.location || '',
    phone: restaurant?.phone || '',
    hours: restaurant?.hours || '',
    atmosphere: restaurant?.atmosphere || '',
    media_type: restaurant?.media_type || '',
    media_url: restaurant?.media?.[0]?.media_url || '',
    reservation_enabled: restaurant?.reservation_enabled ?? true,
    opening_time: restaurant?.opening_time || '09:00',
    closing_time: restaurant?.closing_time || '22:00',
    time_slot_duration: restaurant?.time_slot_duration || 30,
    advance_booking_days: restaurant?.advance_booking_days || 30,
    min_advance_hours: restaurant?.min_advance_hours || 2,
    max_party_size: restaurant?.max_party_size || 12,
    min_party_size: restaurant?.min_party_size || 1,
    allowed_days_of_week: restaurant?.allowed_days_of_week || [1, 2, 3, 4, 5, 6, 7],
    meal_only_reservations: (restaurant as any)?.meal_only_reservations ?? false,
  });

  // Reset form when creating a new restaurant (open without a restaurant)
  useEffect(() => {
    if (open && !restaurant) {
      setFormData({
        name: '',
        description: '',
        cuisine: '',
        location: '',
        phone: '',
        hours: '',
        atmosphere: '',
        media_type: '',
        media_url: '',
        reservation_enabled: true,
        opening_time: '09:00',
        closing_time: '22:00',
        time_slot_duration: 30,
        advance_booking_days: 30,
        min_advance_hours: 2,
        max_party_size: 12,
        min_party_size: 1,
        allowed_days_of_week: [1, 2, 3, 4, 5, 6, 7],
        meal_only_reservations: false,
      })
      setReservationAreas([])
    }
  }, [open, restaurant])

  // When an existing restaurant is selected for editing, sync form fields
  useEffect(() => {
    if (!restaurant) return;
    setFormData({
      name: restaurant.name || '',
      description: restaurant.description || '',
      cuisine: restaurant.cuisine || '',
      location: restaurant.location || '',
      phone: restaurant.phone || '',
      hours: restaurant.hours || '',
      atmosphere: restaurant.atmosphere || '',
      media_type: restaurant.media_type || '',
      media_url: restaurant.media?.[0]?.media_url || '',
      reservation_enabled: restaurant.reservation_enabled ?? true,
      opening_time: restaurant.opening_time || '09:00',
      closing_time: restaurant.closing_time || '22:00',
      time_slot_duration: restaurant.time_slot_duration || 30,
      advance_booking_days: restaurant.advance_booking_days || 30,
      min_advance_hours: restaurant.min_advance_hours || 2,
      max_party_size: restaurant.max_party_size || 12,
      min_party_size: restaurant.min_party_size || 1,
      allowed_days_of_week: restaurant.allowed_days_of_week || [1, 2, 3, 4, 5, 6, 7],
      meal_only_reservations: (restaurant as any)?.meal_only_reservations ?? false,
    });
    // Reset areas until loaded for this restaurant
    setReservationAreas([])
  }, [restaurant?.id]);

  // Load reservation areas for existing restaurant
  useEffect(() => {
    if (restaurant?.id) {
      loadReservationAreas();
    }
  }, [restaurant?.id]);

  const loadReservationAreas = async () => {
    if (!restaurant?.id) return;
    
    const result = await getReservationAreas(restaurant.id);
    if (result.success) {
      const fetched = result.data.map(area => ({
        id: area.id,
        name: area.name,
        description: area.description || '',
        is_active: area.is_active,
        display_order: area.display_order,
        opening_time: area.opening_time || formData.opening_time,
        closing_time: area.closing_time || formData.closing_time,
        time_slot_duration: area.time_slot_duration,
        max_party_size: area.max_party_size,
        min_party_size: area.min_party_size,
        advance_booking_days: area.advance_booking_days,
        min_advance_hours: area.min_advance_hours,
        allowed_days_of_week: area.allowed_days_of_week,
        blocked_dates: area.blocked_dates || [],
        max_concurrent_reservations: area.max_concurrent_reservations,
        useRestaurantDefaults: (
          area.opening_time === null &&
          area.closing_time === null &&
          area.time_slot_duration === null &&
          area.max_party_size === null &&
          area.min_party_size === null &&
          area.advance_booking_days === null &&
          area.min_advance_hours === null &&
          area.allowed_days_of_week === null
        )
      }))

      // Preserve any unsaved local areas (without an id)
      setReservationAreas(prev => {
        const unsaved = prev.filter(a => !a.id)
        return [...fetched, ...unsaved]
      })
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      if (restaurant) {
        result = await updateRestaurant(restaurant.id, formData);
      } else {
        result = await createRestaurant(formData);
      }

      if (result.success) {
        // Save reservation areas if restaurant was created/updated successfully
        if (reservationAreas.length > 0 && restaurant?.id) {
          const areasData = reservationAreas.map(area => ({
            id: area.id,
            restaurant_id: restaurant.id,
            name: area.name,
            description: area.description,
            is_active: area.is_active,
            display_order: area.display_order,
            opening_time: area.useRestaurantDefaults ? undefined : area.opening_time,
            closing_time: area.useRestaurantDefaults ? undefined : area.closing_time,
            time_slot_duration: area.useRestaurantDefaults ? undefined : (area.time_slot_duration ?? undefined),
            max_party_size: area.useRestaurantDefaults ? undefined : (area.max_party_size ?? undefined),
            min_party_size: area.useRestaurantDefaults ? undefined : (area.min_party_size ?? undefined),
            advance_booking_days: area.useRestaurantDefaults ? undefined : (area.advance_booking_days ?? undefined),
            min_advance_hours: area.useRestaurantDefaults ? undefined : (area.min_advance_hours ?? undefined),
            allowed_days_of_week: area.useRestaurantDefaults ? undefined : (area.allowed_days_of_week ?? undefined),
            blocked_dates: area.blocked_dates || [],
            max_concurrent_reservations: area.max_concurrent_reservations ?? undefined,
          }));

          const areasResult = await bulkUpdateReservationAreas(restaurant.id, areasData);
          if (!areasResult.success) {
            toast.error(`Restaurant saved but failed to update areas: ${areasResult.message}`);
            return;
          }
        }

        toast.success(result.message);
        onSuccess?.();
        onClose?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayToggle = (day: number, checked: boolean) => {
    const currentDays = formData.allowed_days_of_week;
    const newDays = checked
      ? [...currentDays, day].sort()
      : currentDays.filter(d => d !== day);
    
    setFormData({ ...formData, allowed_days_of_week: newDays });
  };

  const handleAreasChange = (areas: ReservationAreaFormData[]) => {
    setReservationAreas(areas);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {restaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="areas">Areas</TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit}>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Restaurant name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Cuisine</Label>
                  <Input
                    id="cuisine"
                    value={formData.cuisine}
                    onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                    placeholder="e.g., Italian, Mexican, Asian"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Restaurant description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Restaurant location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="e.g., Mon-Sun 9AM-10PM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="atmosphere">Atmosphere</Label>
                  <Input
                    id="atmosphere"
                    value={formData.atmosphere}
                    onChange={(e) => setFormData({ ...formData, atmosphere: e.target.value })}
                    placeholder="e.g., Casual, Fine Dining, Family-friendly"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="media_type">Media Type</Label>
                  <Input
                    id="media_type"
                    value={formData.media_type}
                    onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
                    placeholder="e.g., image, video"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media_url">Media URL</Label>
                  <Input
                    id="media_url"
                    value={formData.media_url}
                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reservations" className="space-y-4 mt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="reservation-enabled"
                  checked={formData.reservation_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, reservation_enabled: checked })}
                />
                <Label htmlFor="reservation-enabled">Enable online reservations</Label>
              </div>

              {formData.reservation_enabled && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="meal-only-reservations"
                      checked={formData.meal_only_reservations}
                      onCheckedChange={(checked) => setFormData({ ...formData, meal_only_reservations: checked })}
                    />
                    <Label htmlFor="meal-only-reservations">Accept only dining reservations (no drinks-only)</Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="opening-time">Opening Time</Label>
                      <Input
                        id="opening-time"
                        type="time"
                        value={formData.opening_time}
                        onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closing-time">Closing Time</Label>
                      <Input
                        id="closing-time"
                        type="time"
                        value={formData.closing_time}
                        onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="time-slot-duration">Time Slot (min)</Label>
                      <Input
                        id="time-slot-duration"
                        type="number"
                        min="15"
                        max="240"
                        step="15"
                        value={formData.time_slot_duration}
                        onChange={(e) => setFormData({ ...formData, time_slot_duration: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min-party-size">Min Party</Label>
                      <Input
                        id="min-party-size"
                        type="number"
                        min="1"
                        value={formData.min_party_size}
                        onChange={(e) => setFormData({ ...formData, min_party_size: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-party-size">Max Party</Label>
                      <Input
                        id="max-party-size"
                        type="number"
                        min="1"
                        value={formData.max_party_size}
                        onChange={(e) => setFormData({ ...formData, max_party_size: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="advance-booking-days">Advance Days</Label>
                      <Input
                        id="advance-booking-days"
                        type="number"
                        min="1"
                        max="365"
                        value={formData.advance_booking_days}
                        onChange={(e) => setFormData({ ...formData, advance_booking_days: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min-advance-hours">Minimum Advance Hours</Label>
                    <Input
                      id="min-advance-hours"
                      type="number"
                      min="0"
                      max="72"
                      value={formData.min_advance_hours}
                      onChange={(e) => setFormData({ ...formData, min_advance_hours: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Available Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {dayNames.map(({ value, label }) => (
                        <div key={value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${value}`}
                            checked={formData.allowed_days_of_week.includes(value)}
                            onCheckedChange={(checked) => handleDayToggle(value, checked as boolean)}
                          />
                          <Label htmlFor={`day-${value}`} className="text-sm">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="areas" className="space-y-4 mt-4">
              {restaurant ? (
                <ReservationAreasForm
                  restaurant={{
                    ...formData,
                    id: restaurant.id,
                    created_at: restaurant.created_at,
                    updated_at: restaurant.updated_at,
                    blocked_dates: [],
                    special_hours: null
                  }}
                  areas={reservationAreas}
                  onAreasChange={handleAreasChange}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>Save the restaurant first to manage reservation areas.</p>
                </div>
              )}
            </TabsContent>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : restaurant ? 'Update Restaurant' : 'Create Restaurant'}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
