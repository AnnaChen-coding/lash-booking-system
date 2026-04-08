export interface BookingItem {
  id: number
  name: string
  phone: string
  service: string
  date: string
  time: string
  notes: string
  status:
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'pending_payment'
    | 'paid'
}

export interface BookingFormData {
  name: string
  phone: string
  service: string
  date: string
  time: string
  notes: string
}