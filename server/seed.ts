import { db } from './db.ts'

type SeedProvider = {
  type: 'individual' | 'center'
  name: string
  bio: string
  lat: number
  lng: number
  neighborhood: string
  address: string
  price_hint: string
  capacity: number
  verified_tier: number
  avatar: string
  languages: string[]
  amenities: string[]
  age_bands: string[]
  weekly_availability: Record<string, string[]>
  spots_available: number
  license_number?: string
  credentials?: { kind: string; issuer: string; details: string; expiry?: string; status: string }[]
  reviews?: { rating: number; text: string; author: string }[]
}

const WEEKDAYS_FT = { mon: ['am', 'pm'], tue: ['am', 'pm'], wed: ['am', 'pm'], thu: ['am', 'pm'], fri: ['am', 'pm'] }
const WITH_SAT = { ...WEEKDAYS_FT, sat: ['am'] }

const PROVIDERS: SeedProvider[] = [
  {
    type: 'center', name: 'Little Sprouts Learning Center', avatar: '🌱',
    bio: 'Play-based preschool with a big sunny yard and a garden the kids plant themselves.',
    lat: 37.7592, lng: -122.4173, neighborhood: 'Mission', address: '842 Valencia St',
    price_hint: '$$$', capacity: 40, verified_tier: 3, languages: ['English', 'Spanish'],
    amenities: ['meals_breakfast', 'meals_lunch', 'playground_outdoor', 'nap_room', 'arts', 'music'],
    age_bands: ['toddler', 'preschool'], weekly_availability: WEEKDAYS_FT, spots_available: 3,
    license_number: '384001982',
    credentials: [
      { kind: 'CA Child Care Center License', issuer: 'CA Dept of Social Services', details: 'Facility #384001982', status: 'verified' },
      { kind: 'CPR & First Aid', issuer: 'American Red Cross', details: 'All lead staff certified', expiry: '2027-03-01', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'The garden program is magic — my daughter comes home covered in dirt and full of stories.', author: 'Priya M.' },
      { rating: 5, text: 'Warm teachers, great Spanish immersion, communicative staff.', author: 'Daniel K.' },
      { rating: 4, text: 'Waitlist took a while but worth it. Wish hours ran later.', author: 'Sofia R.' },
    ],
  },
  {
    type: 'individual', name: 'Maria Gutierrez', avatar: '👩‍🏫',
    bio: '12 years nannying in SF. ECE units from City College, infant specialist, loves park days.',
    lat: 37.7411, lng: -122.4152, neighborhood: 'Bernal Heights', address: 'Cortland Ave area',
    price_hint: '$$', capacity: 2, verified_tier: 2, languages: ['English', 'Spanish'],
    amenities: ['meals_lunch', 'nut_free', 'arts', 'pickup_dropoff'],
    age_bands: ['infant', 'toddler'], weekly_availability: WITH_SAT, spots_available: 1,
    credentials: [
      { kind: 'ECE Units (12)', issuer: 'City College of San Francisco', details: 'Child growth & development, infant care', status: 'verified' },
      { kind: 'CPR & First Aid', issuer: 'American Heart Association', details: 'Pediatric CPR', expiry: '2026-11-15', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Maria is family at this point. Our infant adores her.', author: 'Jess T.' },
      { rating: 5, text: 'Reliable, warm, sends photo updates from the park.', author: 'Marcus L.' },
    ],
  },
  {
    type: 'center', name: 'Golden Gate Kids Academy', avatar: '🌉',
    bio: 'STEM-forward preschool and after-school club two blocks from Golden Gate Park.',
    lat: 37.7645, lng: -122.4665, neighborhood: 'Inner Sunset', address: '1210 9th Ave',
    price_hint: '$$$', capacity: 55, verified_tier: 3, languages: ['English', 'Mandarin'],
    amenities: ['meals_breakfast', 'meals_lunch', 'playground_outdoor', 'nap_room', 'stem', 'pickup_dropoff'],
    age_bands: ['preschool', 'school_age'], weekly_availability: WEEKDAYS_FT, spots_available: 6,
    license_number: '384002417',
    credentials: [
      { kind: 'CA Child Care Center License', issuer: 'CA Dept of Social Services', details: 'Facility #384002417', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'The robotics corner for 5-year-olds is unreal. Kiddo begs to go.', author: 'Wei C.' },
      { rating: 4, text: 'Great program, parking at pickup is chaos.', author: 'Tom H.' },
    ],
  },
  {
    type: 'individual', name: 'Aisha Osei', avatar: '👩🏾‍🍼',
    bio: 'Former pediatric nurse turned nanny. Newborn through toddler care, calm under pressure.',
    lat: 37.7808, lng: -122.4652, neighborhood: 'Inner Richmond', address: 'Clement St area',
    price_hint: '$$$', capacity: 2, verified_tier: 2, languages: ['English'],
    amenities: ['nut_free', 'meals_lunch', 'music'],
    age_bands: ['infant', 'toddler'], weekly_availability: WEEKDAYS_FT, spots_available: 2,
    credentials: [
      { kind: 'Registered Nurse (former)', issuer: 'CA Board of Registered Nursing', details: 'Pediatrics, 8 years', status: 'verified' },
      { kind: 'Infant CPR', issuer: 'American Red Cross', details: '', expiry: '2027-01-20', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Hiring a former peds nurse for our preemie was the best decision we made.', author: 'Hannah B.' },
    ],
  },
  {
    type: 'center', name: 'Marina Montessori House', avatar: '⛵',
    bio: 'AMI Montessori program, mixed-age classrooms, daily walks to the Marina Green.',
    lat: 37.8018, lng: -122.4383, neighborhood: 'Marina', address: '2170 Chestnut St',
    price_hint: '$$$$', capacity: 30, verified_tier: 3, languages: ['English', 'French'],
    amenities: ['meals_lunch', 'nap_room', 'arts', 'music', 'nut_free'],
    age_bands: ['toddler', 'preschool'], weekly_availability: WEEKDAYS_FT, spots_available: 0,
    license_number: '384003056',
    credentials: [
      { kind: 'CA Child Care Center License', issuer: 'CA Dept of Social Services', details: 'Facility #384003056', status: 'verified' },
      { kind: 'AMI Montessori Diploma', issuer: 'Association Montessori Internationale', details: 'Lead guides certified', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Beautiful prepared environment. Our son settled in within a week.', author: 'Claire D.' },
      { rating: 3, text: 'Lovely school but the waitlist is years long. Plan ahead.', author: 'Raj P.' },
    ],
  },
  {
    type: 'individual', name: 'Tommy Nguyen', avatar: '🧑‍🎨',
    bio: 'Art-school grad and after-school sitter. Painting, clay, comics — big kid energy, ages 5+.',
    lat: 37.7610, lng: -122.4348, neighborhood: 'Castro', address: '18th & Castro area',
    price_hint: '$', capacity: 3, verified_tier: 1, languages: ['English', 'Vietnamese'],
    amenities: ['arts', 'pickup_dropoff'],
    age_bands: ['school_age'], weekly_availability: { mon: ['pm'], tue: ['pm'], wed: ['pm'], thu: ['pm'], fri: ['pm'], sat: ['am', 'pm'] }, spots_available: 3,
    credentials: [
      { kind: 'Childcare experience', issuer: 'Self-reported', details: '4 years after-school care, references available', status: 'pending' },
    ],
    reviews: [
      { rating: 5, text: 'My 8yo made a full comic book with Tommy. Worth every penny.', author: 'Erin S.' },
    ],
  },
  {
    type: 'center', name: 'Sunset Seedlings Family Daycare', avatar: '🌻',
    bio: 'Licensed family daycare in a quiet Outer Sunset home. Small group, big backyard.',
    lat: 37.7532, lng: -122.4951, neighborhood: 'Outer Sunset', address: '45th Ave & Judah',
    price_hint: '$$', capacity: 8, verified_tier: 3, languages: ['English', 'Cantonese'],
    amenities: ['meals_breakfast', 'meals_lunch', 'playground_outdoor', 'nap_room', 'nut_free'],
    age_bands: ['infant', 'toddler', 'preschool'], weekly_availability: WEEKDAYS_FT, spots_available: 2,
    license_number: '384004311',
    credentials: [
      { kind: 'CA Family Child Care Home License', issuer: 'CA Dept of Social Services', details: 'Facility #384004311, large family home', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Feels like dropping your kid at grandma’s. Home cooking every day.', author: 'Kevin W.' },
      { rating: 5, text: 'Tiny group means our shy toddler actually gets attention.', author: 'Lauren F.' },
    ],
  },
  {
    type: 'individual', name: 'Sophie Laurent', avatar: '👩‍🎓',
    bio: 'French-native au pair alum with a child-development degree. Bilingual immersion at home.',
    lat: 37.7924, lng: -122.4391, neighborhood: 'Pacific Heights', address: 'Fillmore St area',
    price_hint: '$$$', capacity: 2, verified_tier: 2, languages: ['French', 'English'],
    amenities: ['music', 'arts', 'meals_lunch'],
    age_bands: ['toddler', 'preschool'], weekly_availability: WEEKDAYS_FT, spots_available: 1,
    credentials: [
      { kind: 'BA Child Development', issuer: 'Université de Lyon', details: '', status: 'verified' },
      { kind: 'CPR & First Aid', issuer: 'American Red Cross', details: '', expiry: '2026-09-30', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Our 3yo now corrects my French pronunciation. Incredible.', author: 'Grace N.' },
    ],
  },
  {
    type: 'center', name: 'SOMA Bright Start', avatar: '🏙️',
    bio: 'Downtown infant & toddler center built for working parents. 7am opens, flexible days.',
    lat: 37.7789, lng: -122.4041, neighborhood: 'SOMA', address: '650 Folsom St',
    price_hint: '$$$', capacity: 48, verified_tier: 3, languages: ['English', 'Spanish', 'Tagalog'],
    amenities: ['meals_breakfast', 'meals_lunch', 'nap_room', 'music', 'pickup_dropoff'],
    age_bands: ['infant', 'toddler'], weekly_availability: WEEKDAYS_FT, spots_available: 5,
    license_number: '384005128',
    credentials: [
      { kind: 'CA Child Care Center License', issuer: 'CA Dept of Social Services', details: 'Facility #384005128', status: 'verified' },
    ],
    reviews: [
      { rating: 4, text: 'The 7am open saves our commute. Staff turnover a bit high.', author: 'Omar J.' },
      { rating: 5, text: 'Flexible 3-day schedule was exactly what we needed.', author: 'Becca V.' },
    ],
  },
  {
    type: 'individual', name: 'Grandpa Joe Callahan', avatar: '👴',
    bio: 'Retired elementary teacher, 30 years in SFUSD. Homework help, chess, and terrible puns.',
    lat: 37.7340, lng: -122.4336, neighborhood: 'Glen Park', address: 'Diamond St area',
    price_hint: '$', capacity: 4, verified_tier: 2, languages: ['English'],
    amenities: ['stem', 'pickup_dropoff', 'meals_lunch'],
    age_bands: ['school_age'], weekly_availability: { mon: ['pm'], tue: ['pm'], wed: ['pm'], thu: ['pm'], fri: ['pm'] }, spots_available: 2,
    credentials: [
      { kind: 'CA Teaching Credential (retired)', issuer: 'CA Commission on Teacher Credentialing', details: 'Multiple subject, 30 years SFUSD', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Homework actually gets done AND my kid learned chess openings.', author: 'Dana C.' },
      { rating: 5, text: 'The puns are as advertised: terrible. Kids love him.', author: 'Phil G.' },
    ],
  },
  {
    type: 'center', name: 'Noe Valley Nest', avatar: '🪺',
    bio: 'Cozy neighborhood co-op preschool. Parents volunteer monthly, community-first.',
    lat: 37.7506, lng: -122.4331, neighborhood: 'Noe Valley', address: '24th St & Sanchez',
    price_hint: '$$', capacity: 24, verified_tier: 3, languages: ['English'],
    amenities: ['meals_breakfast', 'playground_outdoor', 'arts', 'nap_room', 'nut_free'],
    age_bands: ['toddler', 'preschool'], weekly_availability: WITH_SAT, spots_available: 4,
    license_number: '384006733',
    credentials: [
      { kind: 'CA Child Care Center License', issuer: 'CA Dept of Social Services', details: 'Facility #384006733', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'The co-op model keeps costs down and you actually know the other families.', author: 'Steph Y.' },
      { rating: 4, text: 'Volunteering is a real commitment — budget for it.', author: 'Ian M.' },
    ],
  },
  {
    type: 'individual', name: 'Keiko Tanaka', avatar: '🎹',
    bio: 'Suzuki-method piano teacher who sits weekday mornings. Music-filled infant care.',
    lat: 37.7856, lng: -122.4310, neighborhood: 'Japantown', address: 'Post St area',
    price_hint: '$$', capacity: 1, verified_tier: 2, languages: ['Japanese', 'English'],
    amenities: ['music', 'nut_free'],
    age_bands: ['infant', 'toddler'], weekly_availability: { mon: ['am'], tue: ['am'], wed: ['am'], thu: ['am'], fri: ['am'] }, spots_available: 1,
    credentials: [
      { kind: 'Suzuki Method Certification', issuer: 'Suzuki Association of the Americas', details: 'Piano, Books 1-4', status: 'verified' },
      { kind: 'CPR & First Aid', issuer: 'American Red Cross', details: '', expiry: '2027-05-12', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Our baby naps to live piano. Ridiculous and wonderful.', author: 'Alex F.' },
    ],
  },
  {
    type: 'center', name: 'Dogpatch Discovery Lab', avatar: '🔬',
    bio: 'Maker-space after-school program in a converted warehouse. 3D printers, woodshop (supervised!), slime.',
    lat: 37.7583, lng: -122.3891, neighborhood: 'Dogpatch', address: '2325 3rd St',
    price_hint: '$$$', capacity: 35, verified_tier: 2, languages: ['English'],
    amenities: ['stem', 'arts', 'pickup_dropoff', 'meals_lunch'],
    age_bands: ['school_age'], weekly_availability: { mon: ['pm'], tue: ['pm'], wed: ['pm'], thu: ['pm'], fri: ['pm'], sat: ['am', 'pm'] }, spots_available: 8,
    credentials: [
      { kind: 'CPR & First Aid', issuer: 'American Red Cross', details: 'All staff', expiry: '2026-12-01', status: 'verified' },
      { kind: 'Background checks', issuer: 'TrustLine', details: 'All staff registered', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'My 9yo 3D-printed a phone stand for my birthday. Crying.', author: 'Monica A.' },
      { rating: 5, text: 'Saturday sessions are a lifesaver for weekend work.', author: 'Devon R.' },
    ],
  },
  {
    type: 'individual', name: 'Rosa Fuentes', avatar: '👵',
    bio: 'Abuela-style care in the Excelsior. Three decades raising kids, homemade meals daily.',
    lat: 37.7247, lng: -122.4264, neighborhood: 'Excelsior', address: 'Mission St & Persia',
    price_hint: '$', capacity: 4, verified_tier: 1, languages: ['Spanish', 'English'],
    amenities: ['meals_breakfast', 'meals_lunch', 'nap_room'],
    age_bands: ['infant', 'toddler', 'preschool'], weekly_availability: WITH_SAT, spots_available: 2,
    credentials: [
      { kind: 'Childcare experience', issuer: 'Self-reported', details: '30 years, raised 5 kids and 11 grandkids', status: 'pending' },
    ],
    reviews: [
      { rating: 5, text: 'The tamales alone. But also the warmest woman alive.', author: 'Carmen O.' },
      { rating: 5, text: 'Affordable, flexible, endlessly patient.', author: 'Luis H.' },
    ],
  },
  {
    type: 'center', name: 'North Beach Bambini', avatar: '🇮🇹',
    bio: 'Italian-immersion preschool above Washington Square. Pasta Fridays are sacred.',
    lat: 37.8004, lng: -122.4103, neighborhood: 'North Beach', address: '1701 Stockton St',
    price_hint: '$$$', capacity: 28, verified_tier: 3, languages: ['Italian', 'English'],
    amenities: ['meals_breakfast', 'meals_lunch', 'arts', 'music', 'nap_room'],
    age_bands: ['toddler', 'preschool'], weekly_availability: WEEKDAYS_FT, spots_available: 1,
    license_number: '384007544',
    credentials: [
      { kind: 'CA Child Care Center License', issuer: 'CA Dept of Social Services', details: 'Facility #384007544', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Bambini! My kid yells Italian at the dog now.', author: 'Nick B.' },
    ],
  },
  {
    type: 'individual', name: 'Jordan Whitfield', avatar: '⚽',
    bio: 'Former D1 soccer player, youth coach, weekend and evening sitter. Big on outdoor play.',
    lat: 37.7763, lng: -122.4242, neighborhood: 'Hayes Valley', address: 'Octavia Blvd area',
    price_hint: '$$', capacity: 3, verified_tier: 1, languages: ['English'],
    amenities: ['playground_outdoor', 'pickup_dropoff'],
    age_bands: ['preschool', 'school_age'], weekly_availability: { wed: ['pm'], thu: ['pm'], fri: ['pm'], sat: ['am', 'pm'], sun: ['am', 'pm'] }, spots_available: 3,
    credentials: [
      { kind: 'Youth Coaching License', issuer: 'US Soccer', details: 'Grassroots, U6-U12', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Kid comes home exhausted and happy. That’s the dream.', author: 'Renee T.' },
    ],
  },
  {
    type: 'center', name: 'Potrero Hilltop Kids', avatar: '⛰️',
    bio: 'Bilingual daycare with the best view in SF and a hillside garden playground.',
    lat: 37.7599, lng: -122.4001, neighborhood: 'Potrero Hill', address: '18th & Connecticut',
    price_hint: '$$', capacity: 20, verified_tier: 3, languages: ['English', 'Spanish'],
    amenities: ['meals_breakfast', 'meals_lunch', 'playground_outdoor', 'nap_room', 'arts'],
    age_bands: ['infant', 'toddler', 'preschool'], weekly_availability: WEEKDAYS_FT, spots_available: 3,
    license_number: '384008220',
    credentials: [
      { kind: 'CA Child Care Center License', issuer: 'CA Dept of Social Services', details: 'Facility #384008220', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'They do pickup from two schools nearby. Logistics heroes.', author: 'Yuki S.' },
      { rating: 4, text: 'That hill with a stroller though.', author: 'Brad M.' },
    ],
  },
  {
    type: 'individual', name: 'Fatima Al-Rashid', avatar: '📚',
    bio: 'PhD student in early childhood education at SF State. Research-backed play, patient as a saint.',
    lat: 37.7659, lng: -122.4506, neighborhood: 'Cole Valley', address: 'Cole St area',
    price_hint: '$$', capacity: 2, verified_tier: 2, languages: ['English', 'Arabic'],
    amenities: ['arts', 'stem', 'nut_free'],
    age_bands: ['toddler', 'preschool'], weekly_availability: { mon: ['am', 'pm'], wed: ['am', 'pm'], fri: ['am', 'pm'], sat: ['am'] }, spots_available: 2,
    credentials: [
      { kind: 'MA Early Childhood Education', issuer: 'San Francisco State University', details: 'PhD in progress', status: 'verified' },
      { kind: 'CPR & First Aid', issuer: 'American Heart Association', details: '', expiry: '2027-02-28', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'She explained toddler tantrums to US. Free parenting course included.', author: 'Meg W.' },
    ],
  },
  {
    type: 'center', name: 'Richmond Rainbow Room', avatar: '🌈',
    bio: 'Inclusive family daycare, sensory-friendly space, sliding-scale pricing.',
    lat: 37.7776, lng: -122.4926, neighborhood: 'Outer Richmond', address: '38th Ave & Geary',
    price_hint: '$', capacity: 12, verified_tier: 3, languages: ['English', 'Cantonese', 'Russian'],
    amenities: ['meals_breakfast', 'meals_lunch', 'nap_room', 'music', 'nut_free'],
    age_bands: ['infant', 'toddler', 'preschool'], weekly_availability: WITH_SAT, spots_available: 4,
    license_number: '384009101',
    credentials: [
      { kind: 'CA Family Child Care Home License', issuer: 'CA Dept of Social Services', details: 'Facility #384009101', status: 'verified' },
      { kind: 'Inclusive Care Certification', issuer: 'WestEd', details: 'Sensory & special needs training', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'First place where our sensory-seeking kid truly fit in.', author: 'Nadia K.' },
      { rating: 5, text: 'Sliding scale made quality care possible for us.', author: 'Pete D.' },
    ],
  },
  {
    type: 'individual', name: 'Sam Okafor', avatar: '🧑🏿‍💻',
    bio: 'Software engineer by day, coding-club sitter evenings. Scratch, Minecraft mods, robot kits.',
    lat: 37.7929, lng: -122.4177, neighborhood: 'Nob Hill', address: 'Hyde St area',
    price_hint: '$$', capacity: 3, verified_tier: 1, languages: ['English'],
    amenities: ['stem'],
    age_bands: ['school_age'], weekly_availability: { mon: ['pm'], tue: ['pm'], thu: ['pm'], sat: ['pm'] }, spots_available: 3,
    credentials: [
      { kind: 'Childcare experience', issuer: 'Self-reported', details: '3 years coding club, references', status: 'pending' },
    ],
    reviews: [
      { rating: 5, text: 'My 10yo shipped a Minecraft mod. I don’t understand it but she’s thrilled.', author: 'Vic P.' },
    ],
  },
  {
    type: 'center', name: 'Presidio Trailblazers', avatar: '🌲',
    bio: 'Outdoor forest-school. Rain or shine, kids are on the Presidio trails in boots.',
    lat: 37.7889, lng: -122.4547, neighborhood: 'Presidio Heights', address: 'Sacramento & Spruce',
    price_hint: '$$$', capacity: 25, verified_tier: 2, languages: ['English'],
    amenities: ['playground_outdoor', 'meals_lunch', 'nut_free'],
    age_bands: ['preschool', 'school_age'], weekly_availability: WITH_SAT, spots_available: 5,
    credentials: [
      { kind: 'Wilderness First Aid', issuer: 'NOLS', details: 'All guides certified', expiry: '2026-10-10', status: 'verified' },
      { kind: 'Background checks', issuer: 'TrustLine', details: 'All staff registered', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Mud, sticks, joy. Buy the rain gear, thank me later.', author: 'Ellie G.' },
      { rating: 4, text: 'Amazing but you WILL do laundry daily.', author: 'Chris J.' },
    ],
  },
  {
    type: 'individual', name: 'Linh Pham', avatar: '🍜',
    bio: 'Weekend and evening sitter, cooks with the kids. Former restaurant owner, food-safety pro.',
    lat: 37.7529, lng: -122.4180, neighborhood: 'Mission', address: '24th St BART area',
    price_hint: '$', capacity: 3, verified_tier: 2, languages: ['Vietnamese', 'English'],
    amenities: ['meals_breakfast', 'meals_lunch', 'arts'],
    age_bands: ['preschool', 'school_age'], weekly_availability: { fri: ['pm'], sat: ['am', 'pm'], sun: ['am', 'pm'] }, spots_available: 3,
    credentials: [
      { kind: 'Food Handler Certification', issuer: 'ServSafe', details: '', expiry: '2027-08-01', status: 'verified' },
      { kind: 'CPR & First Aid', issuer: 'American Red Cross', details: '', expiry: '2026-06-30', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Kids made spring rolls and ATE VEGETABLES. Witchcraft.', author: 'Amy Z.' },
    ],
  },
  {
    type: 'center', name: 'Castro Community Kids Club', avatar: '🏳️‍🌈',
    bio: 'After-school and weekend drop-in club. Homework room, art studio, movie Fridays.',
    lat: 37.7625, lng: -122.4351, neighborhood: 'Castro', address: '584 Castro St',
    price_hint: '$$', capacity: 30, verified_tier: 2, languages: ['English', 'Spanish'],
    amenities: ['arts', 'music', 'meals_lunch', 'pickup_dropoff'],
    age_bands: ['school_age'], weekly_availability: { mon: ['pm'], tue: ['pm'], wed: ['pm'], thu: ['pm'], fri: ['pm'], sat: ['am', 'pm'] }, spots_available: 7,
    credentials: [
      { kind: 'CPR & First Aid', issuer: 'American Red Cross', details: 'All staff', expiry: '2027-04-15', status: 'verified' },
      { kind: 'Background checks', issuer: 'TrustLine', details: 'All staff registered', status: 'verified' },
    ],
    reviews: [
      { rating: 5, text: 'Drop-in flexibility is unmatched. Saved us dozens of times.', author: 'Robin Q.' },
    ],
  },
  {
    type: 'individual', name: 'Elena Volkov', avatar: '🩰',
    bio: 'Ballet instructor and nanny. Morning infant care with an unreasonable amount of grace.',
    lat: 37.7541, lng: -122.4926, neighborhood: 'Outer Sunset', address: 'Noriega & 44th',
    price_hint: '$$', capacity: 1, verified_tier: 0, languages: ['Russian', 'English'],
    amenities: ['music', 'nut_free'],
    age_bands: ['infant', 'toddler', 'preschool'], weekly_availability: { mon: ['am'], tue: ['am'], wed: ['am'], thu: ['am'], fri: ['am'], sat: ['am'] }, spots_available: 1,
    credentials: [],
    reviews: [],
  },
]

// Extra reviews merged in at seed time — keyed by provider name
const EXTRA_REVIEWS: Record<string, { rating: number; text: string; author: string }[]> = {
  'Little Sprouts Learning Center': [
    { rating: 5, text: 'We toured six preschools. This was the only one where the kids looked genuinely busy and happy.', author: 'Marcos V.' },
    { rating: 4, text: 'Communication app pings a little too often, but the daily photo updates are gold.', author: 'Helen C.' },
  ],
  'Maria Gutierrez': [
    { rating: 5, text: 'Maria handled a fever day better than we did. Calm, organised, kept us posted hourly.', author: 'Dev P.' },
  ],
  'Golden Gate Kids Academy': [
    { rating: 5, text: 'After-school pickup from Jefferson Elementary has been flawless for two years.', author: 'Sandra L.' },
    { rating: 4, text: 'STEM program is amazing. Lunches could use more variety per my very picky 6yo.', author: 'Ahmed K.' },
  ],
  'Aisha Osei': [
    { rating: 5, text: 'She spotted our son’s ear infection before the pediatrician did. Worth every cent.', author: 'Gina T.' },
    { rating: 5, text: 'Sends the sweetest end-of-day voice notes. We trust her completely.', author: 'Rob M.' },
  ],
  'Marina Montessori House': [
    { rating: 5, text: 'The calm in that classroom is unreal. My twins actually tidy up at home now.', author: 'Fiona W.' },
  ],
  'Tommy Nguyen': [
    { rating: 4, text: 'Kids adore him. Occasionally runs 10 minutes late, always texts ahead though.', author: 'Priyanka J.' },
  ],
  'Sunset Seedlings Family Daycare': [
    { rating: 5, text: 'Our daughter said her first Cantonese words here. Grandma was in tears.', author: 'Mike F.' },
  ],
  'Sophie Laurent': [
    { rating: 5, text: 'Structured, warm, and the craft projects are basically gallery-worthy.', author: 'Olivia B.' },
  ],
  'SOMA Bright Start': [
    { rating: 5, text: 'The flexible day passes saved us during a brutal on-call month.', author: 'Jason N.' },
  ],
  'Grandpa Joe Callahan': [
    { rating: 5, text: 'My kid now explains long division to ME. Joe is a legend.', author: 'Tara S.' },
  ],
  'Noe Valley Nest': [
    { rating: 5, text: 'The co-op community became our village. Made real friends here, kids and parents both.', author: 'Emily R.' },
  ],
  'Keiko Tanaka': [
    { rating: 5, text: 'Gentle, punctual, musical. Our mornings run like clockwork now.', author: 'Ben H.' },
  ],
  'Dogpatch Discovery Lab': [
    { rating: 4, text: 'Warehouse gets chilly in winter, pack a hoodie. Program itself is 10/10.', author: 'Steph K.' },
  ],
  'Rosa Fuentes': [
    { rating: 5, text: 'Rosa raised half this block. There is no better reference than that.', author: 'Diego A.' },
  ],
  'North Beach Bambini': [
    { rating: 4, text: 'Pasta Fridays are real and they are glorious. Street parking is not.', author: 'Laura Z.' },
  ],
  'Jordan Whitfield': [
    { rating: 5, text: 'Weekend games in the park, kid sleeps like a log after. Bless.', author: 'Nina G.' },
  ],
  'Potrero Hilltop Kids': [
    { rating: 5, text: 'The garden playground at golden hour is the best view in SF childcare.', author: 'Connor D.' },
  ],
  'Fatima Al-Rashid': [
    { rating: 5, text: 'She turned screen-time battles into board-game nights. Actual magic.', author: 'Leah M.' },
  ],
  'Richmond Rainbow Room': [
    { rating: 5, text: 'Sliding scale plus sensory-friendly space. This place is a public good.', author: 'Grace O.' },
  ],
  'Sam Okafor': [
    { rating: 4, text: 'Kids built a game in Scratch in three sessions. Wants more sessions per week!', author: 'Victor E.' },
  ],
  'Presidio Trailblazers': [
    { rating: 5, text: 'Rain or shine is not a slogan, it is a lifestyle. Kids are thriving.', author: 'Maya P.' },
  ],
  'Linh Pham': [
    { rating: 5, text: 'Sunday cooking sessions became the highlight of our week. Pho night!', author: 'Karen W.' },
  ],
  'Castro Community Kids Club': [
    { rating: 5, text: 'Drop-in saved us on strike days, sick-nanny days, and one memorable flat tire.', author: 'Paul T.' },
  ],
  'Elena Volkov': [
    { rating: 5, text: 'Elena is new to the platform but came recommended by two families we know. Graceful with our fussy napper.', author: 'Irina S.' },
    { rating: 4, text: 'Mornings only, which is the one downside. Otherwise wonderful.', author: 'Tom B.' },
  ],
}

export function seed({ force = false } = {}) {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM providers').get() as { n: number }).n
  if (count > 0 && !force) return { seeded: false, providers: count }
  db.exec('DELETE FROM reviews; DELETE FROM booking_requests; DELETE FROM credentials; DELETE FROM providers; DELETE FROM sqlite_sequence;')

  const insProvider = db.prepare(`
    INSERT INTO providers (type, name, bio, lat, lng, neighborhood, address, price_hint, capacity,
      verified_tier, avatar, languages, amenities, age_bands, weekly_availability, spots_available, license_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insCred = db.prepare(
    'INSERT INTO credentials (provider_id, kind, issuer, details, expiry, status) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const insReview = db.prepare('INSERT INTO reviews (provider_id, rating, text, author) VALUES (?, ?, ?, ?)')

  for (const p of PROVIDERS) {
    const { lastInsertRowid: id } = insProvider.run(
      p.type, p.name, p.bio, p.lat, p.lng, p.neighborhood, p.address, p.price_hint, p.capacity,
      p.verified_tier, p.avatar, JSON.stringify(p.languages), JSON.stringify(p.amenities),
      JSON.stringify(p.age_bands), JSON.stringify(p.weekly_availability), p.spots_available,
      p.license_number ?? null,
    )
    for (const c of p.credentials ?? []) insCred.run(id, c.kind, c.issuer, c.details, c.expiry ?? null, c.status)
    for (const r of [...(p.reviews ?? []), ...(EXTRA_REVIEWS[p.name] ?? [])]) insReview.run(id, r.rating, r.text, r.author)
  }
  return { seeded: true, providers: PROVIDERS.length }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  const result = seed({ force: process.argv.includes('--force') })
  console.log(result.seeded ? `Seeded ${result.providers} providers` : `Already seeded (${result.providers} providers) — use --force to reseed`)
}
