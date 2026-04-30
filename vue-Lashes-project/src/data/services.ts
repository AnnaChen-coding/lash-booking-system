import type { ServiceItem } from '@/types/service'
import ClassicManicureNailWebp from '@/assets/image/service-image/Classic Manicure.webp'
import ClassicManicureNailFallback from '@/assets/image/service-image/Classic Manicure.png'
import GelManicureNailWebp from '@/assets/image/service-image/Gel Manicure.webp'
import GelManicureNailFallback from '@/assets/image/service-image/Gel Manicure.png'
import NailExtensionWebp from '@/assets/image/service-image/Nail Extension.webp'
import NailExtensionFallback from '@/assets/image/service-image/Nail Extension.png'
import ClassicLashExtensionsWebp from '@/assets/image/service-image/Classic Lash Extensions.webp'
import ClassicLashExtensionsFallback from '@/assets/image/service-image/Classic Lash Extensions.png'
import LashLiftWebp from '@/assets/image/service-image/Lash Lift.webp'
import LashLiftFallback from '@/assets/image/service-image/Lash Lift.png'
import HybridLashExtensionsWebp from '@/assets/image/service-image/Hybrid Lash Extensions.webp'
import HybridLashExtensionsFallback from '@/assets/image/service-image/Hybrid Lash Extensions.png'

export const services: ServiceItem[] = [
  {
    id: 1,
    name: 'Classic Manicure',
    category: 'nails',
    price: 45,
    duration: 45,
    shortDescription: 'A clean and elegant manicure for everyday beauty.',
    description:
      'This service includes nail shaping, cuticle care, and a classic polish finish for a neat and polished look.',
    image: ClassicManicureNailWebp,
    imageWebp: ClassicManicureNailWebp,
    imageFallback: ClassicManicureNailFallback,
    popular: true,
  },
  {
    id: 2,
    name: 'Gel Manicure',
    category: 'nails',
    price: 60,
    duration: 60,
    shortDescription: 'Long-lasting shine with a flawless gel finish.',
    description:
      'A durable gel manicure designed for clients who want glossy, chip-resistant nails with a polished appearance.',
    image: GelManicureNailWebp,
    imageWebp: GelManicureNailWebp,
    imageFallback: GelManicureNailFallback,
    popular: true,
  },
  {
    id: 3,
    name: 'Nail Extension',
    category: 'nails',
    price: 85,
    duration: 90,
    shortDescription: 'Add length and shape for a more refined nail style.',
    description:
      'Perfect for clients who want extra length, elegant shaping, and a customized nail look for everyday wear or special occasions.',
    image: NailExtensionWebp,
    imageWebp: NailExtensionWebp,
    imageFallback: NailExtensionFallback,
  },
  {
    id: 4,
    name: 'Classic Lash Extensions',
    category: 'lashes',
    price: 75,
    duration: 75,
    shortDescription: 'Natural-looking lashes that enhance your everyday beauty.',
    description:
      'A classic lash set that adds subtle length and definition while keeping the look soft, light, and natural.',
    image: ClassicLashExtensionsWebp,
    imageWebp: ClassicLashExtensionsWebp,
    imageFallback: ClassicLashExtensionsFallback,
    popular: true,
  },
  {
    id: 5,
    name: 'Hybrid Lash Extensions',
    category: 'lashes',
    price: 90,
    duration: 90,
    shortDescription: 'A balanced mix of softness and volume.',
    description:
      'Hybrid lashes combine classic and volume techniques to create a fuller yet still natural appearance.',
    image: HybridLashExtensionsWebp,
    imageWebp: HybridLashExtensionsWebp,
    imageFallback: HybridLashExtensionsFallback,
  },
  {
    id: 6,
    name: 'Lash Lift',
    category: 'lashes',
    price: 65,
    duration: 50,
    shortDescription: 'Lift and curl your natural lashes with a fresh open-eye effect.',
    description:
      'A lash lift enhances your natural lashes by lifting and curling them, creating a brighter and more effortless look.',
    image: LashLiftWebp,
    imageWebp: LashLiftWebp,
    imageFallback: LashLiftFallback,
  },
]