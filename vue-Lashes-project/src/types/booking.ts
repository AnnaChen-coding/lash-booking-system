export interface BookingItem {
  id: number
  name: string
  phone: string
  service: string
  date: string
  time: string
  notes: string
  status: 'pending' | 'confirmed' | 'cancelled'
}

export interface BookingFormData {
  name: string
  phone: string
  service: string
  date: string
  time: string
  notes: string
}