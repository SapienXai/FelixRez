'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createRestaurant, updateRestaurant } from '@/app/manage/actions';
import { toast } from 'sonner';

interface RestaurantFormProps {
  restaurant?: RestaurantWithMedia;
  onSuccess?: () => void;
  onClose?: () => void;
}

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

export function RestaurantForm({ restaurant, onSuccess, onClose }: RestaurantFormProps) {
  const [isLoading, setIsLoading] = useState(false);
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
  });

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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {restaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : restaurant ? 'Update Restaurant' : 'Create Restaurant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}