'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ManageHeader } from '@/components/manage/manage-header';
import { ManageSidebar } from '@/components/manage/manage-sidebar';
import { RestaurantForm } from '@/components/restaurant-form';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { getRestaurants, deleteRestaurant } from '@/app/manage/actions';
import { useLanguage } from '@/context/language-context';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { MoreHorizontal, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface RestaurantWithMedia {
  id: string;
  name: string;
  description?: string;
  cuisine?: string;
  location?: string;
  phone?: string;
  hours?: string;
  atmosphere?: string;
  media_type?: string;
  media?: { media_url: string }[];
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantWithMedia | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({ email: '', name: 'Admin User' });
  const { getTranslation } = useLanguage();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();
  const supabase = getSupabaseBrowserClient();

  const fetchRestaurants = async () => {
    try {
      const result = await getRestaurants();
      if (result.success && result.data) {
        setRestaurants(result.data);
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
      if (data.session) {
        setUser({
          email: data.session.user.email || '',
          name: data.session.user.user_metadata?.full_name || 'Admin User',
        });
      }
      fetchRestaurants();
    };

    checkSession();
  }, [supabase]);

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <ManageSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ManageHeader user={user} toggleSidebar={toggleSidebar} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center">{getTranslation('manage.common.loadingRestaurants')}</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <ManageSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ManageHeader user={user} toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold">{getTranslation('manage.restaurants.title')}</h1>
              </div>
              <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Restaurant
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <Card key={restaurant.id} className="overflow-hidden">
                  <div className="relative h-48">
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
                          <DropdownMenuItem onClick={() => handleEdit(restaurant)} className="text-blue-600">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(restaurant.id, restaurant.name)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
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
                        <p><span className="font-medium">Cuisine:</span> {restaurant.cuisine}</p>
                      )}
                      {restaurant.location && (
                        <p><span className="font-medium">Location:</span> {restaurant.location}</p>
                      )}
                      {restaurant.phone && (
                        <p><span className="font-medium">Phone:</span> {restaurant.phone}</p>
                      )}
                      {restaurant.description && (
                        <p className="text-gray-700 mt-2">{restaurant.description}</p>
                      )}
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
          </div>
          
          {showForm && (
            <RestaurantForm
              restaurant={editingRestaurant}
              onSuccess={handleFormSuccess}
              onClose={handleFormClose}
            />
          )}
          {ConfirmationDialogComponent}
        </main>
      </div>
    </div>
  );
}
