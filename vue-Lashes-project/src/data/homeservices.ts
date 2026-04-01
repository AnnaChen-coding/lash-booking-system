import serviceImg1 from '@/assets/image/lashes ai.png'
import serviceImg2 from '@/assets/image/nails ai.png'

export interface ServiceItem {
  id: number
  title: string
  image: string
  price: string
  period?: string
  highlight: string
  subHighlight?: string
  benefits: string[]
  note: string
  buttonText: string
}

export const services: ServiceItem[] = [
  {
    id: 1,
    title: 'The Signature',
    image: serviceImg1,
    price: '$59',
    period: '/ month',
    highlight: '1 Freebie Service',
    subHighlight: 'for $70 (one visit)',
    benefits: [
      '1 Free Birthday Garden Manicure',
      '10% off additional services',
    ],
    note: '*Membership can only be used at chosen location purchased',
    buttonText: 'Join Today',
  },

  {
    id: 2,
    title: 'The Deluxe',
    image: serviceImg2,
    price: '$99',
    period: '/ month',
    highlight: '2 Freebie Services',
    subHighlight: 'for $120 (two visits)',
    benefits: [
      '1 Free Birthday Garden Manicure',
      '10% off additional services',
    ],
    note: '*Membership can only be used at chosen location purchased',
    buttonText: 'Join Today',
  },
]