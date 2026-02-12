'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { RestaurantForm } from '@/components/restaurant-form';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { getRestaurants, deleteRestaurant, updateRestaurant } from '@/app/manage/actions';
import { useLanguage } from '@/context/language-context';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { MoreHorizontal, Edit, Trash2, Plus, MapPin, Phone, Utensils, Clock3 } from 'lucide-react';
import { TriangleLoader } from '@/components/ui/triangle-loader';
import { toast } from 'sonner';
import Image from 'next/image';
import type { Database } from '@/types/supabase';
import { useManageContext } from '@/context/manage-context';

type Restaurant = Database['public']['Tables']['restaurants']['Row']

interface RestaurantWithMedia extends Restaurant {
  media?: {
    id: string
    url: string
    alt_text?: string
    media_url: string
  }[]
}

function formatDisplayText(value: string | null | undefined) {
  if (!value) return null
  const withSpaces = value.replace(/\+/g, " ")
  try {
    return decodeURIComponent(withSpaces)
  } catch {
    return withSpaces
  }
}

function formatReservationHours(restaurant: RestaurantWithMedia) {
  if (restaurant.opening_time && restaurant.closing_time) {
    return `${restaurant.opening_time.slice(0, 5)} - ${restaurant.closing_time.slice(0, 5)}`
  }
  return formatDisplayText(restaurant.hours)
}

function sortRestaurantsByStatus(items: RestaurantWithMedia[]) {
  return [...items].sort((a, b) => {
    const aEnabled = a.reservation_enabled ? 1 : 0
    const bEnabled = b.reservation_enabled ? 1 : 0
    if (aEnabled !== bEnabled) return bEnabled - aEnabled
    return a.name.localeCompare(b.name)
  })
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantWithMedia | undefined>(undefined);
  const { role, loading: roleLoading } = useManageContext();
  const { getTranslation } = useLanguage();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();
  const supabase = getSupabaseBrowserClient();
  const isStaff = role === 'staff';

  const fetchRestaurants = async () => {
    try {
      const result = await getRestaurants();
      if (result.success && result.data) {
        setRestaurants(sortRestaurantsByStatus(result.data as RestaurantWithMedia[]));
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && isStaff) {
        setLoading(false);
        return;
      }
      fetchRestaurants();
    };

    if (!roleLoading) {
      checkSession();
    }
  }, [supabase, isStaff, roleLoading]);

  useEffect(() => {
    if (role === 'staff') {
      window.location.replace('/manage')
    }
  }, [role])

  const handleEdit = (restaurant: RestaurantWithMedia) => {
    setEditingRestaurant(restaurant);
    setShowForm(true);
  };

  const handleDelete = async (id: string, restaurantName: string) => {
    showConfirmation({
      title: 'Delete Restaurant',
      description: `Are you sure you want to delete "${restaurantName}"? This action cannot be undone and will also delete all associated reservations.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      requireTextConfirmation: true,
      confirmationText: 'delete',
      onConfirm: async () => {
        const result = await deleteRestaurant(id);
        if (result.success) {
          toast.success(result.message);
          fetchRestaurants();
        } else {
          toast.error(result.message);
        }
      }
    });
  };

  const handleFormSuccess = () => {
    fetchRestaurants();
    setShowForm(false);
    setEditingRestaurant(undefined);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingRestaurant(undefined);
  };

  const handleToggleReservationEnabled = async (restaurant: RestaurantWithMedia, enabled: boolean) => {
    const result = await updateRestaurant(restaurant.id, { reservation_enabled: enabled })
    if (result.success) {
      setRestaurants((prev) =>
        sortRestaurantsByStatus(
          prev.map((item) => (item.id === restaurant.id ? { ...item, reservation_enabled: enabled } : item))
        )
      )
      toast.success(
        enabled
          ? getTranslation('manage.restaurants.statusEnabled')
          : getTranslation('manage.restaurants.statusDisabled')
      )
    } else {
      toast.error(result.message || getTranslation('manage.restaurants.statusUpdateFailed'))
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50">
        <div className="text-center">
          <TriangleLoader />
          <p className="mt-4 text-lg font-semibold text-gray-600">{getTranslation('manage.common.loadingRestaurants')}</p>
        </div>
      </div>
    );
  }

  if (isStaff) return null

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">{getTranslation('manage.restaurants.title')}</h1>
        </div>
        {role === 'admin' && (
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Restaurant
        </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((restaurant) => (
          <Card key={restaurant.id} className="overflow-hidden">
            <div className="relative h-48">
              <div className="absolute left-2 top-2 z-10">
                <div className="flex items-center gap-2 rounded-full border bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
                  <span
                    className={`text-xs font-semibold ${
                      restaurant.reservation_enabled ? "text-emerald-700" : "text-gray-500"
                    }`}
                  >
                    {restaurant.reservation_enabled ? "ON" : "OFF"}
                  </span>
                  <Switch
                    checked={Boolean(restaurant.reservation_enabled)}
                    onCheckedChange={(checked) => handleToggleReservationEnabled(restaurant, checked)}
                    disabled={role !== 'admin'}
                  />
                </div>
              </div>
              {restaurant.media && restaurant.media.length > 0 ? (
                restaurant.media[0].media_url.endsWith('.mp4') || restaurant.media[0].media_url.endsWith('.webm') || restaurant.media[0].media_url.endsWith('.mov') ? (
                  <video
                    src={restaurant.media[0].media_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <Image
                    src={restaurant.media[0].media_url}
                    alt={restaurant.name}
                    fill
                    className="object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No media</span>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/80 hover:bg-white">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {role === 'admin' && (
                      <>
                        <DropdownMenuItem onClick={() => handleEdit(restaurant)} className="text-blue-600">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(restaurant.id, restaurant.name)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                {restaurant.cuisine && (
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{formatDisplayText(restaurant.cuisine)}</span>
                  </div>
                )}
                {restaurant.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{formatDisplayText(restaurant.location)}</span>
                  </div>
                )}
                {restaurant.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{restaurant.phone}</span>
                  </div>
                )}
                {restaurant.description && (
                  <p className="pt-1 text-gray-700 line-clamp-3">{formatDisplayText(restaurant.description)}</p>
                )}
              </div>
              <div className="mt-3 border-t pt-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock3 className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{getTranslation("manage.restaurants.reservationHours")}:</span>
                  <span>{formatReservationHours(restaurant) || getTranslation("manage.restaurants.hoursNotSet")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {restaurants.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{getTranslation('manage.common.noRestaurants')}</p>
        </div>
      )}
      
      <RestaurantForm
        restaurant={editingRestaurant || undefined}
        onSuccess={handleFormSuccess}
        onClose={handleFormClose}
        open={showForm}
      />
      {ConfirmationDialogComponent}
    </div>
  );
}
