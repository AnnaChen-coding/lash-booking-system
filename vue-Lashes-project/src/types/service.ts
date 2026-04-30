export interface ServiceItem {
  id: number
  name: string
  category: 'nails' | 'lashes'
  price: number
  duration: number
  shortDescription: string
  description: string
  image: string
  imageWebp?: string
  imageFallback?: string
  popular?: boolean
}
