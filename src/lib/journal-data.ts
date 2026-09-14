export interface JournalArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  author: string;
  date: string;
  readingTime: number;
  content: { heading?: string; paragraphs: string[] }[];
  relatedSlugs: string[];
  productSlugs: string[];
}

export const JOURNAL_CATEGORIES = [
  'Interior Ideas',
  'Garden Ideas',
  'Lighting',
  'Small Spaces',
  'DIY',
  'Materials',
  'Trends',
  'Sustainability',
];

export const journalArticles: JournalArticle[] = [
  {
    slug: 'how-to-transform-a-wall',
    title: 'How to Transform a Wall in One Afternoon',
    excerpt:
      'Wood slat panels are the fastest way we know to add warmth, depth and acoustic calm to a room. Here is our step-by-step guide.',
    category: 'DIY',
    image: '/images/journal-wall-transform.jpg',
    author: 'E-com.casa Studio',
    date: '2026-02-10',
    readingTime: 6,
    content: [
      {
        paragraphs: [
          'A bare wall is an invitation. With a set of wood slat panels, a saw and one free afternoon, you can give a living room the kind of depth that usually takes an architect — or at least a decorator with a very good eye.',
          'We installed our first panel wall in the studio two years ago. It still gets comments from almost every visitor, and it remains the single most-asked-about element in the space.',
        ],
      },
      {
        heading: 'What you need',
        paragraphs: [
          'For a standard 3-metre wall you will need five 240 × 60 cm panels, construction adhesive or screws (depending on your wall), a fine-tooth saw, a spirit level, a pencil and about three hours.',
          'If your wall is freshly painted, wipe it down and let it dry fully before you start. Felt-backed panels forgive a lot, but not dust.',
        ],
      },
      {
        heading: 'Step by step',
        paragraphs: [
          'Start at the corner that faces the room entrance — the first panel sets the line for everything that follows. Mark a vertical guide with your spirit level, apply adhesive in vertical stripes, and press the panel firmly against the wall for thirty seconds.',
          'Work across the wall panel by panel, checking alignment every metre. Where you reach an outlet or a corner, measure twice and cut once with a fine-tooth saw — oak veneer cuts cleanly if you let the saw do the work.',
          'Finish by running a bead of matching acrylic along the top and bottom edges. Then make a coffee, sit down opposite your new wall, and enjoy the way the light moves across the slats through the day.',
        ],
      },
    ],
    relatedSlugs: ['balcony-ideas', 'warm-minimal-interiors'],
    productSlugs: ['wood-slat-wall-panel-oak', 'oak-wall-shelf', 'arched-wall-mirror'],
  },
  {
    slug: 'balcony-ideas',
    title: 'Seven Balcony Ideas for Less Than €100',
    excerpt:
      'A small balcony is not a compromise — it is the most changeable room you own. These are the ideas we use again and again.',
    category: 'Small Spaces',
    image: '/images/journal-balcony-ideas.jpg',
    author: 'E-com.casa Studio',
    date: '2026-02-03',
    readingTime: 5,
    content: [
      {
        paragraphs: [
          'The average European balcony is four square metres. That is two parking spaces, or one very good outdoor room — depending entirely on what you do with the floor, the light and the greenery.',
        ],
      },
      {
        heading: 'Start with the floor',
        paragraphs: [
          'Interlocking deck tiles instantly read as "outdoor room" rather than "concrete ledge". Two packs usually cover a standard balcony, and they float on top of the original surface — no drilling, no landlord conversations.',
        ],
      },
      {
        heading: 'Then the light',
        paragraphs: [
          'Solar string lights have quietly become very good. Dusk sensors mean they switch themselves on, and a single charge lasts through the evening. Drape them along the railing, never overhead — light at hand height makes a space feel intentional.',
          'Add one lantern on the floor for depth. Layers of warm light, not brightness, is the goal.',
        ],
      },
      {
        heading: 'Finally, the green',
        paragraphs: [
          'Three planters at different heights beat ten planters in a row. Use one tall architectural pot, one hanging, one on the floor. Herbs count — rosemary smells better than most candles and survives neglect.',
        ],
      },
    ],
    relatedSlugs: ['garden-lighting', 'how-to-transform-a-wall'],
    productSlugs: ['solar-string-lights', 'ceramic-planter-set-of-2', 'rattan-accent-chair'],
  },
  {
    slug: 'garden-lighting',
    title: 'The Art of Garden Lighting: Layers, Not Floods',
    excerpt:
      'The best gardens at night are lit like good restaurants — pools of warmth, deep shadows and a path you can actually see.',
    category: 'Lighting',
    image: '/images/journal-garden-lighting.jpg',
    author: 'E-com.casa Studio',
    date: '2026-01-27',
    readingTime: 7,
    content: [
      {
        paragraphs: [
          'Most outdoor lighting fails in the same direction: too much. The instinct is to illuminate, but the craft is to suggest. A garden at night should reveal itself slowly — a path first, then a seat, then the shape of something growing.',
        ],
      },
      {
        heading: 'Layer one: the path',
        paragraphs: [
          'Low solar lanterns spaced two metres apart are enough. You want pools of light with darkness between them — the darkness is what makes the light feel warm rather than institutional.',
        ],
      },
      {
        heading: 'Layer two: the anchor',
        paragraphs: [
          'Every garden has one element worth lighting — an olive tree, a wall, a bench. A single flame torch or uplight aimed at that element gives the whole space a focal point. Everything else can stay in shadow.',
        ],
      },
      {
        heading: 'Layer three: the table',
        paragraphs: [
          'Portable LED lamps have changed outdoor dinners. They move from table to bench to floor as the evening moves, and recharge by USB between uses. Choose warm white (2700K or lower) — anything cooler belongs in an office.',
        ],
      },
    ],
    relatedSlugs: ['balcony-ideas', 'warm-minimal-interiors'],
    productSlugs: ['solar-lantern-set-of-2', 'garden-flame-torch', 'portable-led-table-lamp'],
  },
  {
    slug: 'warm-minimal-interiors',
    title: 'Warm Minimalism: The European Alternative to White-on-White',
    excerpt:
      'Minimalism does not have to feel cold. Warm minimalism keeps the calm and loses the chill — here is how to get it right.',
    category: 'Interior Ideas',
    image: '/images/journal-warm-minimal.jpg',
    author: 'E-com.casa Studio',
    date: '2026-01-20',
    readingTime: 6,
    content: [
      {
        paragraphs: [
          'For a decade, minimalism in Europe meant white walls, pale floors and furniture that looked afraid of being touched. Warm minimalism keeps the discipline — fewer objects, honest materials, clear surfaces — but swaps the palette for oak, linen, cream and clay.',
        ],
      },
      {
        heading: 'The palette',
        paragraphs: [
          'Think in materials rather than colours: oak, walnut, linen, boucle, unglazed ceramic, aged brass. If every surface in the room belongs to this family, the room will cohere almost automatically.',
        ],
      },
      {
        heading: 'The discipline',
        paragraphs: [
          'Warm minimalism is still minimalism. The rule we use: every surface gets at most three objects, and one of them should be organic — a branch, a bowl of pears, a plant. The rest goes in a basket. Baskets are the unsung heroes of this style.',
        ],
      },
      {
        heading: 'The light',
        paragraphs: [
          'Sheer curtains, always. Direct sun is the enemy of calm; filtered sun is the whole point. And at least one lamp per seating area, at hand height, with a warm bulb.',
        ],
      },
    ],
    relatedSlugs: ['how-to-transform-a-wall', 'garden-lighting'],
    productSlugs: ['linen-cushion-set-of-3', 'rattan-accent-chair', 'ceramic-vase-set-of-3'],
  },
];
