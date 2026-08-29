require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('./src/models/Venue');

function img(id) {
  return `https://images.unsplash.com/${id}?q=80&w=1200&auto=format&fit=crop`;
}

// Real Marbella venues (names, areas and vibe based on public nightlife guides).
// Photography: where possible, images are hotlinked directly from each venue's own official
// site (Suite Club, Olivia Valere, Nikki Beach, Funky Buddha, Mirage, Le Jade, plus the local
// /images/venues/*.jpg files below). Pangea, Tibu, and Ocean Club Marbella still use free-license
// stock (Unsplash) as representative imagery — their sites don't expose a fetchable photo.
const venues = [
  {
    _id: 'v-starlite', name: 'Starlite Occident', area: 'Cantera de Nagüeles (hills above Puerto Banús)', address: 'Calle Albinoni, s/n, Cantera de Nagüeles, 29602 Marbella, Málaga, Spain', type: 'Club', genres: ['Live Music', 'Electronic', 'Commercial'],
    rating: 4.2, image: 'https://themarbelladirectory.com/wp-content/uploads/2026/03/0829_LoveOfLesbian_StarliteMarbella26_NLG.jpg', lat: 36.53296, lng: -4.92126, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.3, atmosphere: 4.4, crowd: 4.1, staff: 4.0, drinks: 4.0, venue: 4.3 },
    bestNights: [{ day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 5 }],
    bestArrival: '23:30–00:30', opening: '00:30', closing: '06:00', dressCode: 'Smart casual', verified: true,
  },
  {
    _id: 'v-nyx', name: 'NYX', area: 'Puente Romano, Golden Mile', address: 'Bulevar Príncipe Alfonso von Hohenlohe, s/n, 29602 Marbella, Málaga, Spain', type: 'Club', genres: ['House', 'Deep House', 'Afro House'],
    rating: 4.7, image: 'https://www.puenteromano.com/media/zw3mtl1c/banner-nyx.jpg?width=2000&height=785&quality=80&v=1dcc9062754d510', lat: 36.504, lng: -4.9249, crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.7, atmosphere: 4.8, crowd: 4.6, staff: 4.6, drinks: 4.5, venue: 4.8 },
    bestNights: [{ day: 'Friday', stars: 5 }, { day: 'Saturday', stars: 5 }],
    bestArrival: '22:00–23:00', closing: '04:00', dressCode: 'Smart casual', verified: true,
  },
  {
    _id: 'v-playapadre', name: 'Playa Padre', area: 'Playa del Cable', address: 'Calle Playa del Cable, s/n, 29603 Marbella, Málaga, Spain', type: 'Beach Club', genres: ['Tech House', 'Afro House'],
    rating: 4.6, image: '/images/venues/playa-padre.jpg', lat: 36.50797, lng: -4.86989, crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.6, atmosphere: 4.7, crowd: 4.5, staff: 4.4, drinks: 4.3, venue: 4.7 },
    bestNights: [{ day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 5 }, { day: 'Sunday', stars: 4 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '20:00–21:30', closing: '02:00', dressCode: 'Casual chic — beachwear by day, smarter in the evening', verified: true,
  },
  {
    _id: 'v-coyaclub', name: 'COYA Club', area: 'Puente Romano, Golden Mile', address: 'Bulevar Príncipe Alfonso von Hohenlohe, s/n, 29602 Marbella, Málaga, Spain', type: 'Club', genres: ['Latin', 'Global Beats'],
    rating: 4.6, image: 'https://www.puenteromano.com/media/rv4bhnq2/adri_-axiun_adr03123.jpg?width=2000&height=785&quality=80&v=1db9eff6d33ec10', lat: 36.504, lng: -4.9249, crowdStatus: 'getting_busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.6, atmosphere: 4.7, crowd: 4.5, staff: 4.6, drinks: 4.5, venue: 4.7 },
    bestNights: [{ day: 'Thursday', stars: 4 }, { day: 'Friday', stars: 5 }, { day: 'Saturday', stars: 5 }],
    bestArrival: '21:00–22:00', closing: '04:00', dressCode: 'Smart casual — no open shoes, shorts, trunks or sleeveless tops for men', verified: true,
  },
  {
    _id: 'v-nikkibeach', name: 'Nikki Beach Marbella', area: 'Elviria', address: 'Ctra. de Cádiz, Km. 192, 29604 Marbella, Málaga, Spain', type: 'Beach Club', genres: ['Afro House', 'Commercial'],
    rating: 4.5, image: 'https://nikkibeach.com/marbella/wp-content/uploads/sites/6/2024/10/010_PEDROJAEN_DJI_0340.jpg', lat: 36.4897, lng: -4.7732, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.3, atmosphere: 4.6, crowd: 4.3, staff: 4.5, drinks: 4.2, venue: 4.6 },
    bestNights: [{ day: 'Sunday', stars: 5 }, { day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 4 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '13:00–14:00', closing: '19:00', dressCode: 'Beach chic resort wear', verified: true,
  },
  {
    _id: 'v-pangea', name: 'Pangea', area: 'Puerto Banús', address: 'Edificio Club del Mar, Muelle de Honor, Puerto Banús, 29660 Marbella, Málaga, Spain', type: 'Club', genres: ['EDM', 'Commercial'],
    rating: 4.4, image: 'https://www.therooftopguide.com/rooftop-bars-in-marbella/Bilder/pangea-600-1.jpg', lat: 36.485, lng: -4.953, crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.4, atmosphere: 4.5, crowd: 4.6, staff: 4.1, drinks: 4.0, venue: 4.5 },
    bestNights: [{ day: 'Saturday', stars: 5 }, { day: 'Friday', stars: 5 }, { day: 'Sunday', stars: 3 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '00:30–01:30', closing: '03:00', dressCode: 'Smart casual', verified: true,
  },
  {
    _id: 'v-tibu', name: 'Tibu', area: 'Puerto Banús', address: 'Plaza Antonio Banderas, Av. de Julio Iglesias, 103, 29660 Marbella, Málaga, Spain', type: 'Club', genres: ['Commercial', 'Reggaeton'],
    rating: 4.2, image: 'https://directus.solvexus.com/assets/2F89FB59-0213-4AAA-BEB8-043D6F797BA7.jpg', lat: 36.48806, lng: -4.9535, crowdStatus: 'getting_busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.1, atmosphere: 4.3, crowd: 4.4, staff: 4.0, drinks: 3.9, venue: 4.2 },
    bestNights: [{ day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 4 }, { day: 'Sunday', stars: 3 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '00:00–01:00', closing: '06:00', dressCode: 'Smart/stylish — no beachwear, sportswear, trainers or flip-flops', verified: false,
  },
  {
    _id: 'v-funkybuddha', name: 'Funky Buddha Puerto Banús', area: 'Puerto Banús (2nd line)', address: 'Calle Muelle Ribera, s/n, Nueva Andalucía, 29660 Marbella, Málaga, Spain', type: 'Club', genres: ['Tech House', 'House'],
    rating: 4.3, image: 'https://funkybuddhabanus.com/wp-content/uploads/2023/07/Img-destacada.jpg', lat: 36.4884, lng: -4.9519, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.5, atmosphere: 4.2, crowd: 4.1, staff: 4.2, drinks: 4.0, venue: 4.1 },
    bestNights: [{ day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 4 }, { day: 'Sunday', stars: 3 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '00:00–01:00', opening: '00:00', closing: '06:00', verified: false,
  },
  {
    _id: 'v-oceanclub', name: 'Ocean Club Marbella', area: 'Puerto Banús', address: 'Avda. Lola Flores, s/n, Puerto Banús, 29660 Marbella, Málaga, Spain', type: 'Beach Club', genres: ['EDM', 'Commercial'],
    rating: 4.3, image: 'https://directus.solvexus.com/assets/B729CE99-6647-4112-A762-0C72FCF5B487.jpg', lat: 36.48538, lng: -4.95899, crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.2, atmosphere: 4.5, crowd: 4.4, staff: 4.1, drinks: 4.1, venue: 4.5 },
    bestNights: [{ day: 'Saturday', stars: 5 }, { day: 'Sunday', stars: 4 }, { day: 'Friday', stars: 4 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '13:00–15:00', opening: '11:00', closing: '22:00', dressCode: 'Beachwear/casual — no body paint, face gems, fancy dress or stag/hen attire', verified: true,
  },
  {
    _id: 'v-laplage', name: 'La Plage Casanis', area: 'Golden Beach, Elviria', address: 'Urbanización Golden Beach, Playa Real de Zaragoza, 29604 Marbella, Málaga, Spain', type: 'Beach Club', genres: ['House', 'Electronic'],
    rating: 4.5, image: 'https://laplagecasanis.com/wp-content/uploads/2024/10/laplagecasanis-promo-sunset-ritual-1.jpg', lat: 36.4931, lng: -4.78803, crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.5, atmosphere: 4.7, crowd: 4.3, staff: 4.4, drinks: 4.3, venue: 4.6 },
    bestNights: [{ day: 'Sunday', stars: 5 }, { day: 'Saturday', stars: 4 }, { day: 'Friday', stars: 4 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '17:00–18:30', closing: '00:00', verified: true,
  },
  {
    _id: 'v-chiringuito', name: 'Chiringuito Puente Romano', area: 'Puente Romano, Golden Mile', address: 'Bulevar Príncipe Alfonso von Hohenlohe, s/n, 29602 Marbella, Málaga, Spain', type: 'Beach Club', genres: ['Afro House', 'House'],
    rating: 4.6, image: 'https://www.puenteromano.com/media/pmtbuagv/_d1a6835.jpg?rxy=0.4963063795059114,0.651631263880803&width=2000&height=785&quality=80&v=1dd259818369570', lat: 36.5025, lng: -4.926, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.5, atmosphere: 4.7, crowd: 4.4, staff: 4.6, drinks: 4.5, venue: 4.8 },
    bestNights: [{ day: 'Wednesday', stars: 5 }, { day: 'Thursday', stars: 4 }, { day: 'Saturday', stars: 4 }, { day: 'Sunday', stars: 3 }],
    bestArrival: '13:00–14:00', closing: '00:00', verified: true,
  },
  {
    _id: 'v-fitz', name: 'Fitz Marbella', area: 'Río Verde, near Puerto Banús', address: 'Ctra. Nac. 340, km 175, Río Verde (C.C. Rimesa-Tino), 29660 Marbella, Málaga, Spain', type: 'Club', genres: ['Hip Hop', 'Urban'],
    rating: 4.3, image: 'https://fitzmarbella.com/og-image.jpg', lat: 36.49537, lng: -4.95246, crowdStatus: 'getting_busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.2, atmosphere: 4.4, crowd: 4.5, staff: 4.0, drinks: 4.0, venue: 4.3 },
    bestNights: [{ day: 'Friday', stars: 5 }, { day: 'Saturday', stars: 5 }, { day: 'Thursday', stars: 3 }, { day: 'Sunday', stars: 3 }],
    bestArrival: '00:00–01:00', closing: '05:00', dressCode: 'Smart-casual to elegant — no flip-flops, beachwear, sleeveless shirts or casual shorts', verified: false,
  },
  {
    _id: 'v-bonbonniere', name: 'Bonbonniere Marbella', area: 'Istán Road', address: 'Ctra. de Istán, 29600 Marbella, Málaga, Spain', type: 'Club', genres: ['Tech House', 'Afro House'],
    rating: 4.4, image: 'https://www.bonbonniere.club/assets/bonbonniere/Seo/OG_Marbella.jpg?v=4', lat: 36.5024, lng: -4.9468, crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.5, atmosphere: 4.4, crowd: 4.3, staff: 4.2, drinks: 4.1, venue: 4.4 },
    bestNights: [{ day: 'Saturday', stars: 5 }, { day: 'Friday', stars: 4 }, { day: 'Sunday', stars: 3 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '00:30–01:30', closing: '05:00', dressCode: 'Elegant-casual — no caps, hats, swimwear, sandals/flip-flops or tank tops', verified: true,
  },
  {
    _id: 'v-momento', name: 'Momento', area: 'Urb. Villa Parra Palomeras, Golden Mile', address: 'Urbanización Villa Parra Palomeras, 68, 29602 Marbella, Málaga, Spain', type: 'Club', genres: ['House', 'Electronic'],
    rating: 4.5, image: 'https://momentomarbella.com/wp-content/uploads/2026/08/HIGHLIGHTS-MOSH-9-scaled.jpg', lat: 36.501, lng: -4.936, crowdStatus: 'getting_busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.7, atmosphere: 4.6, crowd: 4.4, staff: 4.4, drinks: 4.3, venue: 4.6 },
    bestNights: [{ day: 'Friday', stars: 5 }, { day: 'Saturday', stars: 5 }, { day: 'Thursday', stars: 3 }, { day: 'Wednesday', stars: 3 }],
    bestArrival: '23:30–00:30', closing: '06:00', dressCode: 'Glamour / Etiqueta Festiva (smart, dressy)', verified: true,
  },
  {
    _id: 'v-mirage', name: 'Mirage', area: 'Nueva Andalucía, Puerto Banús', address: 'Urbanización Nueva Andalucía, Puerto Banús, 14, Nueva Andalucía, 29660 Marbella, Málaga, Spain', type: 'Club', genres: ['Commercial', 'EDM'],
    rating: 4.3, image: 'https://static.wixstatic.com/media/11062b_fff5993068ca4809aad11f523dd1a376f000.jpg/v1/fill/w_1328,h_747,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/11062b_fff5993068ca4809aad11f523dd1a376f000.jpg', lat: 36.4863, lng: -4.9558, crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.2, atmosphere: 4.5, crowd: 4.4, staff: 4.1, drinks: 4.0, venue: 4.4 },
    bestNights: [{ day: 'Friday', stars: 5 }, { day: 'Saturday', stars: 5 }, { day: 'Sunday', stars: 3 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '00:30–01:30', closing: '06:00', verified: true,
  },
  {
    _id: 'v-lejade', name: 'Le Jade', area: 'Calle de la Cruz, Marbella Centro', address: 'Camino de la Cruz, s/n, 29602 Marbella, Málaga, Spain', type: 'Club', genres: ['House', 'Electronic'],
    rating: 4.5, image: 'https://lejademarbella.com/wp-content/uploads/2025/10/lejademarbella-ambiente-1.jpg', lat: 36.5103, lng: -4.9288, crowdStatus: 'getting_busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.6, atmosphere: 4.7, crowd: 4.3, staff: 4.5, drinks: 4.4, venue: 4.6 },
    bestNights: [{ day: 'Sunday', stars: 5 }, { day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 4 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '23:00–00:00', closing: '04:00', verified: true,
  },
  {
    _id: 'v-fbmarbella', name: 'Funky Buddha Marbella', area: 'Golden Mile', address: 'Camino de la Cruz, s/n, 29602 Marbella, Málaga, Spain', type: 'Club', genres: ['R&B'],
    rating: 4.1, image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/09/12/39/e0/funky-buddha.jpg?w=1200&h=1200&s=1', lat: 36.5105, lng: -4.9287, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.0, atmosphere: 4.1, crowd: 4.0, staff: 4.0, drinks: 3.9, venue: 4.1 },
    bestNights: [{ day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 4 }],
    bestArrival: '22:30–23:30', closing: '02:00', dressCode: 'No flip-flops (door-enforced)', verified: true,
  },
  {
    _id: 'v-maya', name: 'Maya', area: 'Puerto Deportivo (Marbella marina)', address: 'Puerto Deportivo Marbella, Local 1.2.3, 29602 Marbella, Málaga, Spain', type: 'Club', genres: [],
    rating: 3.9, image: 'https://uploads.zicketo.com/establishments/cover/13b91bb1aa329c417eec58f5e6258a77ce97ebd094b78bd1ce64869fe4dbe96f.jpg', lat: 36.510, lng: -4.884, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 3.8, atmosphere: 4.0, crowd: 3.8, staff: 3.9, drinks: 3.8, venue: 4.0 },
    bestNights: [{ day: 'Friday', stars: 3 }, { day: 'Saturday', stars: 4 }],
    bestArrival: '23:00–00:00', closing: '06:00', verified: false,
  },
  {
    _id: 'v-lemmon', name: 'Lemmon', area: 'Puerto Deportivo (Marbella marina)', address: 'Puerto Deportivo Marbella, Local 12, 29602 Marbella, Málaga, Spain', type: 'Club', genres: ['House', 'Electronic'],
    rating: 4.2, image: 'https://lemmon-marbella.com/wp-content/uploads/2025/05/asset9-PB8STXE.png', lat: 36.5065, lng: -4.8894, crowdStatus: 'getting_busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.2, atmosphere: 4.4, crowd: 4.1, staff: 4.2, drinks: 4.1, venue: 4.3 },
    bestNights: [{ day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 5 }],
    bestArrival: '17:00–19:00', opening: '18:00', closing: '06:00', dressCode: 'Smart casual', verified: true,
  },
  {
    _id: 'v-sunsetmarbella', name: 'Sunset Marbella', area: 'Puerto Deportivo (Marbella marina)', address: 'Puerto Deportivo de Marbella, Local 17C, 29602 Marbella, Málaga, Spain', type: 'Club', genres: [],
    rating: 3.7, image: 'https://images.mnstatic.com/91/08/910846e8207850d0be5050e157948276.jpg', lat: 36.5067, lng: -4.8898, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 3.6, atmosphere: 3.8, crowd: 3.6, staff: 3.7, drinks: 3.6, venue: 3.7 },
    bestNights: [{ day: 'Thursday', stars: 3 }],
    bestArrival: '20:00–22:00', closing: '02:00', verified: false,
  },
  {
    _id: 'v-scream', name: 'Scream', area: 'Puerto Banús (2nd line)', address: 'Calle Ribera, Puerto Banús, 29660 Marbella, Málaga, Spain', type: 'Club', genres: ['House', 'Dance'],
    rating: 3.8, image: 'https://itin-dev.wanderlogstatic.com/freeImage/dD3mEi9ybVm54S1rtNW1DBGJjMdf5AQa', lat: 36.4874, lng: -4.9533, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 3.8, atmosphere: 3.8, crowd: 3.7, staff: 3.7, drinks: 3.7, venue: 3.8 },
    bestNights: [{ day: 'Friday', stars: 3 }, { day: 'Saturday', stars: 4 }],
    bestArrival: '22:00–23:00', opening: '22:00', closing: '06:00', verified: false,
  },
  {
    _id: 'v-seven', name: 'Seven', area: 'Puerto Banús (2nd line)', address: 'Calle Muelle Ribera, s/n, 29660 Puerto Banús, Marbella, Málaga, Spain', type: 'Club', genres: [],
    rating: 3.9, image: 'https://clubbable.blob.core.windows.net/medias/Seven-Marbella_200?timestamp=636658785921208789', lat: 36.4889, lng: -4.951, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 3.9, atmosphere: 4.0, crowd: 3.8, staff: 3.8, drinks: 3.8, venue: 3.9 },
    bestNights: [{ day: 'Wednesday', stars: 3 }, { day: 'Saturday', stars: 4 }],
    bestArrival: '22:30–23:30', closing: '04:00', verified: false,
  },
  {
    _id: 'v-mogli', name: 'Mogli The Key', area: 'Nueva Andalucía', address: 'Av. del Prado, 37, 29660 Nueva Andalucía, Marbella, Málaga, Spain', type: 'Beach Club', genres: ['Afrobeat', 'House'],
    rating: 4.4, image: 'https://directus.solvexus.com/assets/EC6420B4-8090-40B9-90C1-45A0774DC070.jpg', lat: 36.501109, lng: -4.961065, crowdStatus: 'getting_busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.4, atmosphere: 4.5, crowd: 4.3, staff: 4.3, drinks: 4.2, venue: 4.4 },
    bestNights: [{ day: 'Saturday', stars: 5 }, { day: 'Sunday', stars: 4 }],
    bestArrival: '13:00–14:00', closing: '20:00', dressCode: 'Swimwear; 21+', verified: true,
  },
  {
    _id: 'v-lasalabanus', name: 'La Sala Puerto Banús', area: 'Puerto Banús / Nueva Andalucía', address: 'Calle Juan Belmonte, s/n, 29660 Nueva Andalucía, Marbella, Málaga, Spain', type: 'Club', genres: ['Live Music'],
    rating: 4.3, image: 'https://lasalabanus.com/wp-content/uploads/2022/07/LaSalaChristmas.jpg', lat: 36.4901, lng: -4.9568, crowdStatus: 'getting_busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.2, atmosphere: 4.4, crowd: 4.2, staff: 4.3, drinks: 4.2, venue: 4.4 },
    bestNights: [{ day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 4 }],
    bestArrival: '21:00–22:00', closing: '03:00', verified: true,
  },
  {
    _id: 'v-lasalabythesea', name: 'La Sala by the Sea', area: 'Puerto Banús / Nueva Andalucía', address: 'Urb. Villa Marina, Av. José Banús, 29660 Marbella, Málaga, Spain', type: 'Beach Club', genres: ['House', 'Electronic'],
    rating: 4.4, image: 'https://lasalabythesea.com/wp-content/uploads/2022/05/PoolandBar-1.jpg', lat: 36.4846, lng: -4.9617, crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.4, atmosphere: 4.5, crowd: 4.3, staff: 4.3, drinks: 4.3, venue: 4.5 },
    bestNights: [{ day: 'Saturday', stars: 5 }, { day: 'Sunday', stars: 4 }],
    bestArrival: '13:00–14:30', closing: '19:00', dressCode: 'Smart beachwear — no fancy dress or body glitter', verified: true,
  },
  {
    _id: 'v-trocadero', name: 'Trocadero Arena', area: 'Río Real', address: 'Río Real Beach, Ctra. N-340 km 186, 29600 Marbella, Málaga, Spain', type: 'Beach Club', genres: [],
    rating: 4.3, image: 'https://www.roccabox.com/img/seo-hero/trocadero-arena.jpg', lat: 36.5045, lng: -4.8443, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.1, atmosphere: 4.4, crowd: 4.1, staff: 4.3, drinks: 4.2, venue: 4.4 },
    bestNights: [{ day: 'Saturday', stars: 4 }, { day: 'Sunday', stars: 4 }],
    bestArrival: '13:00–15:00', closing: '01:00', verified: false,
  },
  {
    _id: 'v-nosso', name: 'NOSSO Summer Club', area: 'El Rosario (eastern Marbella)', address: 'Avenida del Limonar, 124, 29604 Marbella, Málaga, Spain', type: 'Beach Club', genres: ['House'],
    rating: 4.3, image: 'https://sandbeds.com/wp-content/uploads/2022/07/Nosso-Marbella-Sandbeds-5.jpg', lat: 36.498, lng: -4.815, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.2, atmosphere: 4.4, crowd: 4.1, staff: 4.2, drinks: 4.2, venue: 4.4 },
    bestNights: [{ day: 'Saturday', stars: 4 }, { day: 'Sunday', stars: 4 }],
    bestArrival: '13:00–15:00', closing: '01:00', verified: false,
  },
  {
    _id: 'v-naopool', name: 'NAO Pool Club', area: 'Nueva Andalucía / Golf Valley', address: 'C/ Los Tilos, 29660 Nueva Andalucía, Marbella, Málaga, Spain', type: 'Beach Club', genres: ['House'],
    rating: 4.4, image: 'https://naopoolclub.com/wp-content/uploads/2018/08/NAO_HOME-HOR-2.jpg', lat: 36.4955, lng: -4.9641, crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.3, atmosphere: 4.5, crowd: 4.4, staff: 4.3, drinks: 4.2, venue: 4.4 },
    bestNights: [{ day: 'Sunday', stars: 5 }],
    bestArrival: '12:00–13:00', closing: '20:00', dressCode: 'Pool Hippie Chic / Smart-Casual', verified: true,
  },
  {
    _id: 'v-dune', name: 'Dune Beach Club', area: 'El Rosario (Elviria)', address: 'Avenida Cervantes s/n, Urb. Costa Bella, El Rosario, 29604 Marbella, Málaga, Spain', type: 'Beach Club', genres: [],
    rating: 4.2, image: 'https://dunebeachmarbella.com/wp-content/uploads/2023/05/DUNE_FOTOS_01-1.jpg', lat: 36.498, lng: -4.812, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.0, atmosphere: 4.3, crowd: 4.0, staff: 4.1, drinks: 4.1, venue: 4.3 },
    bestNights: [{ day: 'Saturday', stars: 4 }],
    bestArrival: '13:00–15:00', closing: '23:00', verified: false,
  },
  {
    _id: 'v-mistral', name: 'Mistral Beach', area: 'Between San Pedro Alcántara and Puerto Banús', address: 'Playa del Rodeo, s/n, 29660 Marbella, Málaga, Spain', type: 'Beach Club', genres: [],
    rating: 4.1, image: 'https://mistral-beach-marbella.com/wp-content/uploads/2025/06/WhatsApp-Image-2025-05-28-at-13.51.33-1-768x1152.jpeg', lat: 36.4822, lng: -4.966, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 3.9, atmosphere: 4.2, crowd: 3.9, staff: 4.0, drinks: 4.0, venue: 4.2 },
    bestNights: [{ day: 'Saturday', stars: 3 }],
    bestArrival: '12:00–14:00', closing: '23:30', verified: false,
  },
  {
    _id: 'v-lacabane', name: 'La Cabane Marbella', area: 'Los Monteros', address: 'Calle Jabalí, 29603 Marbella, Málaga, Spain', type: 'Beach Club', genres: [],
    rating: 4.4, image: 'https://marbelladreamvillas.com/wp-content/uploads/2024/09/La-Cabane-Marbella-1.jpg', lat: 36.5001, lng: -4.8235, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.1, atmosphere: 4.5, crowd: 4.2, staff: 4.4, drinks: 4.3, venue: 4.5 },
    bestNights: [{ day: 'Saturday', stars: 4 }, { day: 'Sunday', stars: 4 }],
    bestArrival: '13:00–15:00', closing: '00:00', dressCode: 'Beachwear by day, smarter for dinner (16+ pool)', verified: false,
  },
  {
    _id: 'v-elancla', name: 'El Ancla Beach Club', area: 'San Pedro Alcántara', address: 'Avenida Carmen Sevilla, Urbanización Linda Vista Playa, 29670 San Pedro de Alcántara, Marbella, Málaga, Spain', type: 'Beach Club', genres: [],
    rating: 4.3, image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0f/c7/2b/af/nuestra-piscina-de-agua.jpg', lat: 36.4704, lng: -4.9905, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 3.8, atmosphere: 4.3, crowd: 4.0, staff: 4.3, drinks: 4.2, venue: 4.3 },
    bestNights: [{ day: 'Saturday', stars: 3 }, { day: 'Sunday', stars: 3 }],
    bestArrival: '13:00–15:00', closing: '23:00', verified: false,
  },
  {
    _id: 'v-marbellaclubbeach', name: 'Marbella Club Hotel Beach Club', area: 'Golden Mile', address: 'Bulevar Príncipe Alfonso von Hohenlohe, s/n, 29602 Marbella, Málaga, Spain', type: 'Beach Club', genres: [],
    rating: 4.6, image: 'https://image-tc.galaxy.tf/wijpeg-4rxklcj0o2w5tcvn3cvw0r044/mch-nov-221346-low-1_square.jpg', lat: 36.5034, lng: -4.9182, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.2, atmosphere: 4.7, crowd: 4.4, staff: 4.7, drinks: 4.6, venue: 4.7 },
    bestNights: [{ day: 'Sunday', stars: 4 }],
    bestArrival: '12:30–13:00', closing: '20:00', verified: true,
  },
  {
    _id: 'v-victorsbeach', name: "Victor's Beach", area: 'Golden Mile (between Puerto Banús and Marbella Club)', address: 'Urb. El Ancón, Ctra. de Cádiz, Km 177, 29602 Marbella, Málaga, Spain', type: 'Beach Club', genres: ['Balearic'],
    rating: 4.2, image: '', lat: 36.50028, lng: -4.93223, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.0, atmosphere: 4.3, crowd: 4.1, staff: 4.1, drinks: 4.1, venue: 4.3 },
    bestNights: [{ day: 'Friday', stars: 3 }, { day: 'Sunday', stars: 3 }],
    bestArrival: '18:00–19:30', closing: '00:00', verified: false,
  },
  {
    _id: 'v-barbillon', name: 'Barbillón Marbella', area: 'Guadalmina Baja', address: 'Urb. Guadalmina Baja, C. 3, 318, 29670 Marbella, Málaga, Spain', type: 'Beach Club', genres: [],
    rating: 4.3, image: 'https://barbillon.com/cdn/shop/files/DJI_0918.jpg?v=1776946110&width=3840', lat: 36.46897, lng: -4.99253, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.0, atmosphere: 4.4, crowd: 4.1, staff: 4.2, drinks: 4.2, venue: 4.4 },
    bestNights: [{ day: 'Saturday', stars: 4 }],
    bestArrival: '13:00–15:00', closing: '20:00', verified: true,
  },
  {
    _id: 'v-beachhouse', name: 'The Beach House', area: 'Elviria', address: 'Urbanización Coto de los Dolores, Avenida de Las Antillas, s/n, 29604 Marbella, Málaga, Spain', type: 'Beach Club', genres: [],
    rating: 4.3, image: 'https://static.wixstatic.com/media/8412a5_814a1c573f9540009a12e6e2447674be~mv2.jpg', lat: 36.4919, lng: -4.7824, crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.0, atmosphere: 4.4, crowd: 4.1, staff: 4.3, drinks: 4.2, venue: 4.4 },
    bestNights: [{ day: 'Saturday', stars: 4 }],
    bestArrival: '13:00–15:00', closing: '20:00', verified: true,
  },
];

const CURRENT_IDS = venues.map((v) => v._id);

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('No MONGODB_URI set in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  for (const v of venues) {
    await Venue.findByIdAndUpdate(v._id, v, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  const removed = await Venue.deleteMany({ _id: { $nin: CURRENT_IDS } });
  console.log(`Seeded ${venues.length} venues`);
  if (removed.deletedCount) console.log(`Removed ${removed.deletedCount} old venue(s) no longer in the app`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
