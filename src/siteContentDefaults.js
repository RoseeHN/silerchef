'use strict';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function cuisineBlockImage(slug, index1Based) {
  return `images/cuisines/${slug}/gallery/${pad2(index1Based)}.jpg`;
}

function serviceBlockImage(slug, index1Based) {
  return `images/services-and-occasions/${slug}/gallery/${pad2(index1Based)}.jpg`;
}

function item(name, desc) {
  return { name, desc };
}

function serviceDefaults(slug, occasionLabel) {
  return {
    intro:
      'Planning and culinary framework for ' +
      occasionLabel +
      '. Formats below mirror how we structure events, trainings, and invitations.',
    blocks: [
      {
        title: 'Events & Celebrations',
        image: serviceBlockImage(slug, 1),
        items: [
          item('Timeline & flow', 'Arrival bites, seated courses or stations, and a clear rhythm for guests.'),
          item('Venue coordination notes', 'Buffet, plated, or hybrid - aligned with your space and guest count.'),
        ],
      },
      {
        title: 'Workshops & Culinary Training',
        image: serviceBlockImage(slug, 2),
        items: [
          item(
            'Hands-on sessions',
            'Technique-focused modules - knife skills, sauces, plating - paced for your group.'
          ),
          item('Demonstration format', 'Chef-led narrative with tasting flights and Q&A.'),
        ],
      },
      {
        title: 'Invitations & Private Gatherings',
        image: serviceBlockImage(slug, 3),
        items: [
          item('Intimate dining format', 'Chef’s table energy with discreet service and conversational pacing.'),
          item('Welcome reception styling', 'Passed bites and beverage pairing cadence before the main experience.'),
        ],
      },
      {
        title: 'Signature Experiences',
        image: serviceBlockImage(slug, 4),
        items: [
          item('Custom menu arc', 'Story-led courses reflecting your occasion from first bite to dessert.'),
          item('Add-on enhancements', 'Wine coordination notes, printed menus, and dietary accommodations.'),
        ],
      },
    ],
  };
}

const DEFAULT_SITE_CONTENT = {
  site: {
    hero: {
      headline: 'Private Chef Dining That Feels Like the Best Table in the City',
      tagline: 'Reno · Tahoe · Bay Area · Luxury in-home experiences',
      lede:
        'For hosts who want more than dinner, Siler Chef designs globally inspired menus, refined plating, and an effortless service flow that turns home entertaining into a true occasion.',
    },
    quote: {
      text: 'Every menu is a conversation - between season, setting, and the people at your table.',
      cite: 'Chef Siler',
    },
    cuisinesSection: {
      lede: 'A portrait of world traditions - tap a cuisine for courses, tasting notes, and photography.',
      noticeKicker: 'Sample menus only',
      noticeBody:
        'Each cuisine opens into three sample menu sets. Every course can be adjusted to your preferences, dietary needs, or redesigned from scratch.',
    },
    servicesSection: {
      lede:
        'Corporate milestones, workshops, family tables, and intimate celebrations - open any card for experience pillars and a full image strip.',
      noticeKicker: 'Sample outlines only',
      noticeBody: 'What you see is a starting point - timing, courses, and flow adapt to your event.',
    },
    craft: {
      eyebrow: 'The Siler Craft',
      title: 'From long fermentation to small-batch churning',
      body1:
        'Every culinary experience is elevated by artisanal preparation. We use professional-grade stone-milling and kneading for signature breads, alongside small-batch churning for fresh sorbets and gelatos, so each course lands at its best texture and flavor.',
      body2:
        'At Siler Chef, true luxury lives in the details. Every element is hand-crafted from scratch, from long-fermented breads to freshly spun frozen desserts, honoring traditional technique while delivering a polished private-dining experience at home.',
      primaryLabel: 'See the gallery',
      primaryHref: '#moments',
      secondaryLabel: 'View sample menus',
      secondaryHref: '#cuisines',
    },
    stats: {
      cuisinePortfolios: '6',
      occasionArchetypes: '5',
      chefExperience: '1',
    },
    cta: {
      headline: 'Hold your night on the calendar',
      summary: 'Choose a time, tell us about your occasion, and we’ll follow up with menu direction.',
    },
    booking: {
      title: 'Reserve your date',
      lede: 'Tell us about your table - we’ll confirm and shape the menu from here.',
      successTitle: 'Thank you - your request is in.',
      successText: 'We’ll follow up shortly to confirm timing and menu direction.',
      fallbackUrl: 'https://www.silerchef.com/book-online',
    },
    detailNotice:
      'These are sample menu directions and service outlines - every event can be tailored to your brief, guest list, and dietary needs.',
    contact: {
      title: 'Contact',
      subtitle: 'Chef Siler · Reno, Nevada - call, message, or follow.',
      phone: '+1 (775) 389-6677',
      phoneHref: 'tel:+17753896677',
      email: 'silerchef@gmail.com',
      emailHref: 'mailto:silerchef@gmail.com',
      website: 'www.silerchef.com',
      websiteHref: 'https://www.silerchef.com/',
      location: 'Reno · Lake Tahoe · Truckee · Incline Village',
      streetAddress: '',
      addressLocality: 'Reno',
      addressRegion: 'NV',
      postalCode: '',
      googleMapsHref:
        'https://www.google.com/maps/place/Siler+Chef+LLC/@39.543334371593346,-119.82424082388114,17z/data=!4m6!3m5!1s0xa180e099e5f7d05b:0x5f23cef288df732e!8m2!3d39.543334371593346!4d-119.82424082388114!16s%2Fg%2F11z80y9ty7',
      googleMapsEmbedSrc:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3076.721583400254!2d-119.82424082388114!3d39.543334371593346!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa180e099e5f7d05b%3A0x5f23cef288df732e!2sSiler%20Chef%20LLC!5e0!3m2!1str!2str!4v1780082158534!5m2!1str!2str',
      instagramHref: 'https://www.instagram.com/fikretsilerr',
      yelpHref: 'https://www.yelp.com/biz/siler-chef-reno',
      whatsappHref: 'https://wa.me/17753896677',
      facebookHref: 'https://www.facebook.com/share/1Eea7fQpfV/?mibextid=wwXIfr',
    },
  },
  cuisineCards: [
    {
      slug: 'american-cuisine',
      title: 'American Cuisine',
      no: '01',
      tagline: 'Refined comfort, premium cuts, and contemporary private dining.',
    },
    {
      slug: 'french-cuisine',
      title: 'French Cuisine',
      no: '02',
      tagline: 'Classical technique, pastry artistry, and polished Gallic refinement.',
    },
    {
      slug: 'italian-cuisine',
      title: 'Italian Cuisine',
      no: '03',
      tagline: 'Artisanal soul, regional warmth, and elegant Mediterranean pacing.',
    },
    {
      slug: 'greek-cuisine',
      title: 'Greek Cuisine',
      no: '04',
      tagline: 'Aegean clarity, bright herbs, citrus, and coastal refinement.',
    },
    {
      slug: 'turkish-cuisine',
      title: 'Turkish Cuisine',
      no: '05',
      tagline: 'Ottoman references, Anatolian depth, and modern luxury plating.',
    },
    {
      slug: 'middle-eastern-cuisine',
      title: 'Global Fusion',
      no: '06',
      tagline: 'Borderless flavor pairings with precise fine-dining execution.',
    },
  ],
  serviceCards: [
    {
      slug: 'anniversary-celebrations',
      title: 'Anniversary Celebrations',
      no: '01',
      tagline: 'Milestones at the table - courses paced as quiet luxury.',
    },
    {
      slug: 'birthday-events',
      title: 'Birthday Events',
      no: '02',
      tagline: 'Chef-led joy - timing built for laughter and togetherness.',
    },
    {
      slug: 'family-dinners',
      title: 'Family Dinners',
      no: '03',
      tagline: 'Generous plates - home comfort without the restaurant rush.',
    },
    {
      slug: 'special-events',
      title: 'Special Events',
      no: '04',
      tagline: 'Corporate and private - polished flow from reception to last bite.',
    },
    {
      slug: 'special-occasion-dining',
      title: 'Special Occasion Dining',
      no: '05',
      tagline: 'Intimate arcs - proposals, reunions, chef’s-table focus.',
    },
  ],
  cuisines: {
    'american-cuisine': {
      intro:
        'Three illustrative American menu directions for Siler Chef. Menus can be refined to the client’s preferences or redesigned from scratch for the occasion.',
      blocks: [
        {
          title: 'Set 1 · The Modern American Prime',
          image: cuisineBlockImage('american-cuisine', 1),
          items: [
            item(
              'Appetizer',
              'Jumbo Lump Crab Cake - Pan-seared with a citrus-remoulade, pickled micro-fennel, and Old Bay coral tuile.'
            ),
            item(
              'The Bakery',
              'Maple-Glazed Parker House Rolls - Hand-kneaded, buttery milk rolls served with whipped sea-salt honey butter.'
            ),
            item(
              'Intermezzo',
              'Spiced Cranberry & Blood Orange Sorbet - A vibrant, tart palate cleanser to prepare for the richness of the steak.'
            ),
            item(
              'Main Entree',
              'Center-Cut Filet Mignon au Poivre - Dry-aged beef, cognac-peppercorn reduction, garlic-confit marble potatoes, and charred broccolini.'
            ),
            item(
              'Grand Finale',
              'Bourbon Vanilla Bean Ice Cream - Freshly churned, served over a warm smoked-apple Tatin with a salted caramel drizzle.'
            ),
          ],
        },
        {
          title: 'Set 2 · The American Harvest',
          image: cuisineBlockImage('american-cuisine', 2),
          items: [
            item('Appetizer', 'Butter-Poached Maine Lobster - Sweet corn veloute, tarragon oil, and crispy leeks.'),
            item(
              'The Bakery',
              'Buttermilk & Chive Infused Biscuits - Hand-laminated artisanal biscuits served with whipped maple-bourbon butter.'
            ),
            item(
              'Intermezzo',
              'Honeyed Green Apple Sorbet - A crisp, garden-fresh palate cleanser with a touch of sweetness.'
            ),
            item(
              'Main Entree',
              'Pan-Seared Muscovy Duck Breast - Roasted parsnip puree, blackberry-balsamic reduction, and honey-glazed baby turnips.'
            ),
            item(
              'Grand Finale',
              'Warm Bourbon-Apple Galette - A rustic, hand-folded tart served with house-spun smoked vanilla bean gelato and a salted caramel drizzle.'
            ),
          ],
        },
        {
          title: 'Set 3 · The Pacific Horizon',
          image: cuisineBlockImage('american-cuisine', 3),
          items: [
            item(
              'Appetizer',
              'Pan-Seared Alaskan Halibut Cheeks - Served over a pea-mint puree, with crispy prosciutto shards and a lemon-caper emulsion.'
            ),
            item(
              'The Bakery',
              'Rosemary & Sea Salt Pretzel Buns - Artisanal, slow-kneaded soft pretzel rolls served with a sharp Vermont cheddar and craft ale dip.'
            ),
            item(
              'Intermezzo',
              'Wild Raspberry & Tarragon Sorbet - Small-batch botanical sorbet to refresh the senses before the main course.'
            ),
            item(
              'Main Entree',
              '48-Hour Braised Prime Short Ribs - Red wine reduction, silky parsnip mousseline, and honey-roasted heirloom carrots.'
            ),
            item(
              'Grand Finale',
              'Warm Georgia Peach & Pecan Cobbler - A buttery, hand-folded crust served with house-spun bourbon vanilla bean gelato and a dash of cinnamon dust.'
            ),
          ],
        },
      ],
    },
    'french-cuisine': {
      intro:
        'Three classical French menu directions built around sauce discipline, seasonal refinement, and pastry-forward elegance.',
      blocks: [
        {
          title: 'Set 1 · Belle Époque',
          image: cuisineBlockImage('french-cuisine', 1),
          items: [
            item(
              'Appetizer',
              'Marinated Salmon Gravlax - Citrus-dill cure, caper berries, crème fraîche, and rye crostini.'
            ),
            item(
              'The Bakery',
              'Pain au Levain & Cultured Butter - Long-fermentation sourdough pullman with flaky Maldon salt and cultured Normandy butter.'
            ),
            item(
              'Intermezzo',
              'Champagne & Pear Sorbet - Bright orchard pear with a delicate sparkle and restrained sweetness.'
            ),
            item(
              'Main Entree',
              'Roasted Duck Breast à l’Orange - Lacquered skin, Grand Marnier jus, roasted endive, and pommes fondant.'
            ),
            item(
              'Grand Finale',
              'Dark Chocolate Soufflé - Valrhona ganache heart, Tahitian vanilla anglaise, and candied hazelnut.'
            ),
          ],
        },
        {
          title: 'Set 2 · Lyon & Burgundy',
          image: cuisineBlockImage('french-cuisine', 2),
          items: [
            item(
              'Appetizer',
              'Escargots de Bourgogne - Garlic-herb butter, parsley crumb, and toasted brioche soldiers.'
            ),
            item(
              'The Bakery',
              'Comté & Black Pepper Fougasse - Hand-stretched olive oil dough with aged Comté pockets.'
            ),
            item(
              'Intermezzo',
              'Sorbet Cassis - Cassis-champagne palate bridge before the rich main.'
            ),
            item(
              'Main Entree',
              'Beef Tenderloin au Poivre Vert - Cognac cream, pommes purée Robuchon-style, and glazed spring vegetables.'
            ),
            item(
              'Grand Finale',
              'Tarte Tatin Moderne - Caramelized apple rosette, Isigny crème fraîche, and Calvados caramel.'
            ),
          ],
        },
        {
          title: 'Set 3 · Pastry Atelier',
          image: cuisineBlockImage('french-cuisine', 3),
          items: [
            item(
              'Appetizer',
              'Velouté of Sunchoke - White truffle oil, crispy sage, and parmesan tuile.'
            ),
            item(
              'The Bakery',
              'Brioche Feuilletée - Laminated butter brioche with fleur de sel and whipped honey butter.'
            ),
            item(
              'Intermezzo',
              'Lemon Verbena Sorbet - Clean herbal lift before the flagship course.'
            ),
            item(
              'Main Entree',
              'Sole Meunière Elevated - Brown butter capers, lemon supremes, haricots verts, and pommes vapeur.'
            ),
            item(
              'Grand Finale',
              'Saint-Honoré Reimagined - Choux ring, light caramel, Chantilly, and Tahitian vanilla chantilly.'
            ),
          ],
        },
      ],
    },
    'italian-cuisine': {
      intro:
        'Three elevated Italian menu directions shaped around artisanal technique, regional warmth, and elegant pacing for private dining.',
      blocks: [
        {
          title: 'Set 1 · La Dolce Vita',
          image: cuisineBlockImage('italian-cuisine', 1),
          items: [
            item(
              'Appetizer',
              'Wild Mushroom Arancini - Crispy risotto spheres infused with black truffle, served over a silky parmesan fonduta.'
            ),
            item(
              'The Bakery',
              'Rosemary & Smoked Sea Salt Focaccia - 48-hour fermented high-hydration dough, served with aged balsamic and cold-pressed olive oil.'
            ),
            item(
              'Intermezzo',
              'Sicilian Lemon & Prosecco Sorbet - A sharp, bubbly, and refreshing citrus zest to lift the palate.'
            ),
            item(
              'Main Entree',
              'Braised Osso Buco over Saffron Risotto - Slow-cooked veal shank, Milanese-style risotto, and an aromatic gremolata.'
            ),
            item(
              'Grand Finale',
              'Toasted Hazelnut Gelato - Freshly churned Italian hazelnut gelato, served with a dark chocolate ganache and almond biscotti crumble.'
            ),
          ],
        },
        {
          title: 'Set 2 · The Venetian Soiree',
          image: cuisineBlockImage('italian-cuisine', 2),
          items: [
            item('Appetizer', 'Pan-Seared Diver Scallops - Cauliflower silk, crispy pancetta, and gremolata oil.'),
            item(
              'The Bakery',
              'Artisanal Ciabatta with Roasted Garlic - High-hydration, hearth-baked bread served with Sicilian olive oil and sun-dried tomato tapenade.'
            ),
            item(
              'Intermezzo',
              'Blood Orange & Campari Sorbet - A sophisticated, bitter-sweet citrus zest to awaken the senses.'
            ),
            item(
              'Main Entree',
              'Truffle-Infused Wild Mushroom Pappardelle - Hand-cut pasta tossed in a light porcini cream with shaved 24-month Parmigiano-Reggiano.'
            ),
            item(
              'Grand Finale',
              'Dark Chocolate Flourless Torte - A dense, rich chocolate cake accompanied by silky mascarpone & espresso gelato and a hand-pulled espresso tuile.'
            ),
          ],
        },
        {
          title: 'Set 3 · The Tuscan Hearth',
          image: cuisineBlockImage('italian-cuisine', 3),
          items: [
            item(
              'Appetizer',
              'Vitello Tonnato Moderne - Shaved veal tenderloin, creamy caper-tuna emulsion, micro-arugula, and salt-cured egg yolk.'
            ),
            item(
              'The Bakery',
              'Stone-Baked Focaccia Barese - High-hydration, hand-stretched dough topped with cherry tomatoes, olives, and cold-pressed Puglia olive oil.'
            ),
            item(
              'Intermezzo',
              'Aperol & Ruby Grapefruit Sorbet - A sophisticated, slightly bitter-sweet citrus zest to prepare for the main event.'
            ),
            item(
              'Main Entree',
              'Herb-Roasted Veal Medallions - Porcini mushroom ragu, truffle-infused polenta, and garlic-sauteed kale.'
            ),
            item(
              'Grand Finale',
              'Pistachio Semifreddo - A frozen Italian mousse served with freshly churned Amarena cherry gelato and a toasted almond brittle.'
            ),
          ],
        },
      ],
    },
    'greek-cuisine': {
      intro:
        'Three Greek coastal menu directions built around clarity, herbs, citrus, and polished Aegean hospitality.',
      blocks: [
        {
          title: 'Set 1 · The Aegean Odyssey',
          image: cuisineBlockImage('greek-cuisine', 1),
          items: [
            item(
              'Appetizer',
              'Charred Aegean Octopus - Smoked over grapevine, served with fava puree, caper berries, and a lemon-oregano vinaigrette.'
            ),
            item(
              'The Bakery',
              'Sourdough Pita & Whipped Feta - Hand-stretched, stone-fired sourdough pita served with a spicy Tirokafteri dip and Kalamata olives.'
            ),
            item(
              'Intermezzo',
              'Watermelon & Ouzo Sorbet - A unique, refreshing sorbet with a subtle anise finish, echoing the spirit of the islands.'
            ),
            item(
              'Main Entree',
              'Herb-Crusted Rack of Lamb - Pistachio and mint crust, served with lemon-garlic roasted potatoes and a honey-red wine reduction.'
            ),
            item(
              'Grand Finale',
              'Greek Yogurt & Wild Honey Ice Cream - Tangy, creamy frozen yogurt churned in-house, topped with caramelized walnuts and thyme-infused honey.'
            ),
          ],
        },
        {
          title: 'Set 2 · The Hellenic Coast',
          image: cuisineBlockImage('greek-cuisine', 2),
          items: [
            item(
              'Appetizer',
              'Shrimp Saganaki Elevated - Tiger prawns in a rich tomato-ouzo broth, finished with barrel-aged feta pearls.'
            ),
            item(
              'The Bakery',
              'Sesame-Crusted Koulouri Rolls - Soft, braided Greek bread served with a whipped Kalamata olive butter.'
            ),
            item('Intermezzo', 'Lemon & Fresh Garden Mint Sorbet - An ultra-refreshing, botanical palate cleanser.'),
            item(
              'Main Entree',
              'Salt-Crusted Mediterranean Sea Bass - Whole-baked and deboned, served with an extra virgin olive oil-lemon emulsion and wild-foraged greens.'
            ),
            item(
              'Grand Finale',
              'Honey-Orange Portokalopita - Traditional syrupy orange cake served with small-batch Greek yogurt & wild honey ice cream and toasted pistachio crumble.'
            ),
          ],
        },
        {
          title: 'Set 3 · The Cretan Spirit',
          image: cuisineBlockImage('greek-cuisine', 3),
          items: [
            item(
              'Appetizer',
              'Grilled Calamari Ink-Stained - Charred over open flame, served with a squid-ink risotto base and a citrus-ouzo glaze.'
            ),
            item(
              'The Bakery',
              'Semolina-Crusted Sourdough Loaf - Long-fermentation artisanal bread with a golden crust, served with whipped salted butter and sea fennel.'
            ),
            item(
              'Intermezzo',
              'Pomegranate & Fresh Mint Sorbet - House-spun vibrant crimson sorbet with a cool, refreshing herbal finish.'
            ),
            item(
              'Main Entree',
              'Pan-Roasted Mediterranean Sea Bream - Served with horta, lemon-oil emulsion, and roasted artichoke hearts.'
            ),
            item(
              'Grand Finale',
              'Deconstructed Baklava Cheesecake - Silky cream cheese mousse, honey-walnut crumble, and house-made cinnamon & thyme honey gelato.'
            ),
          ],
        },
      ],
    },
    'turkish-cuisine': {
      intro:
        'Three luxury Turkish menu directions that reinterpret Anatolian and Ottoman references with modern fine-dining structure.',
      blocks: [
        {
          title: 'Set 1 · Ottoman Grandeur',
          image: cuisineBlockImage('turkish-cuisine', 1),
          items: [
            item(
              'Appetizer',
              'Smoked Eggplant Hunkar Bites - Silky eggplant puree with aged kashar cheese, topped with slow-cooked pulled lamb and pomegranate arils.'
            ),
            item(
              'The Bakery',
              'Black Cumin Infused Pide Rolls - Traditional tirnak pidesi reimagined as artisanal rolls, served with cultured sheep’s milk butter and honeycomb.'
            ),
            item(
              'Intermezzo',
              'Pomegranate & Rosewater Sorbet - A floral and exotic crimson sorbet inspired by the gardens of Topkapi Palace.'
            ),
            item(
              'Main Entree',
              'Slow-Roasted Ishak Pasa Short Rib - 12-hour braised beef over a bed of creamy smoked artichoke hearts and a rich pan jus.'
            ),
            item(
              'Grand Finale',
              'Mastic & Pistachio Ice Cream - Elastic and aromatic mastic ice cream served with warm kabak tatlisi and a tahini-walnut brittle.'
            ),
          ],
        },
        {
          title: 'Set 2 · The Sultan’s Table',
          image: cuisineBlockImage('turkish-cuisine', 2),
          items: [
            item(
              'Appetizer',
              'Micro-Manti with Smoked Yogurt - Hand-rolled tiny dumplings served with burnt Aleppo-pepper butter and garlic-infused yogurt.'
            ),
            item(
              'The Bakery',
              'Truffle-Scented Artisanal Simit - Molasses-dipped sesame rings served with cultured sheep’s milk butter.'
            ),
            item('Intermezzo', 'Black Mulberry Sorbet - An intense berry sorbet with a sharp, sophisticated acidity.'),
            item(
              'Main Entree',
              'Slow-Roasted Kuyu Kebabi Lamb Shank - 14-hour braised lamb served over a bed of buttery ic pilav with pine nuts and currants.'
            ),
            item(
              'Grand Finale',
              'Warm Caramelized Pumpkin Confit - Served with a tahini-walnut brittle and artisanal roasted walnut & mastic gelato for a perfect balance of temperatures.'
            ),
          ],
        },
        {
          title: 'Set 3 · Anatolian Silk',
          image: cuisineBlockImage('turkish-cuisine', 3),
          items: [
            item(
              'Appetizer',
              'Aegean Seabass Ceviche - Cured in lime and raki, served with pomegranate pearls, fresh dill, and extra virgin olive oil.'
            ),
            item(
              'The Bakery',
              'Stone-Fired Lavash Air Bread - Hand-rolled and puffed to perfection, served with a trio of artisanal mezze: truffle hummus, muhammara, and smoked yogurt.'
            ),
            item(
              'Intermezzo',
              'Quince & Clove Sorbet - A unique, aromatic, and sophisticated palate cleanser inspired by Ottoman palace gardens.'
            ),
            item(
              'Main Entree',
              'Alinazik Reimagined - Filet mignon tips served over a bed of wood-fire smoked eggplant mousse and burnt brown-pepper butter.'
            ),
            item(
              'Grand Finale',
              'Crispy Kadayif Nest - Golden hand-shredded phyllo served with warm roasted apricots and small-batch mastic-infused clotted cream gelato.'
            ),
          ],
        },
      ],
    },
    'middle-eastern-cuisine': {
      intro:
        'Three international fusion menu directions that blend borderless flavor references with precise private-chef execution.',
      blocks: [
        {
          title: 'Set 1 · The Global Gastronome',
          image: cuisineBlockImage('middle-eastern-cuisine', 1),
          items: [
            item(
              'Appetizer',
              'Ahi Tuna Sashimi & Avocado Silk - Togarashi-crusted tuna, ginger-soy emulsion, and wasabi-infused cucumber ribbons.'
            ),
            item(
              'The Bakery',
              'Hokkaido Milk Bread & Miso Butter - Ultra-soft Japanese-style rolls hand-kneaded to perfection, served with an umami-rich miso-infused butter.'
            ),
            item(
              'Intermezzo',
              'Yuzu & Fresh Ginger Sorbet - An electric, citrusy zing with a hint of ginger spice to reset the taste buds.'
            ),
            item(
              'Main Entree',
              'Miso-Glazed Chilean Sea Bass - Pan-seared and glazed with sweet white miso, served over forbidden black rice and a coconut-lemongrass reduction.'
            ),
            item(
              'Grand Finale',
              'Salted Caramel & Espresso Gelato - A rich, bold fusion of dark-roast espresso and buttery caramel, served with a sea-salt chocolate tuile.'
            ),
          ],
        },
        {
          title: 'Set 2 · The Continental Fusion',
          image: cuisineBlockImage('middle-eastern-cuisine', 2),
          items: [
            item(
              'Appetizer',
              'Braised Kurobuta Pork Belly - Miso-maple glaze, ginger-pickled daikon, and toasted furikake.'
            ),
            item(
              'The Bakery',
              'Sourdough French Baguette - Long-fermented, crispy-crust bread served with seaweed-infused cultured butter.'
            ),
            item(
              'Intermezzo',
              'Pineapple & Pink Peppercorn Sorbet - A tropical burst with a subtle, sophisticated spicy kick.'
            ),
            item(
              'Main Entree',
              'Butter-Poached Australian Lobster Tail - Saffron-coconut reduction, forbidden black rice, and wok-fired bok choy.'
            ),
            item(
              'Grand Finale',
              'White Chocolate & Passion Fruit Tart - A delicate pastry shell with tart curd, paired with freshly churned ginger-lime gelato and a coconut-lime tuile.'
            ),
          ],
        },
        {
          title: 'Set 3 · The Silk Road Fusion',
          image: cuisineBlockImage('middle-eastern-cuisine', 3),
          items: [
            item(
              'Appetizer',
              'Duck Confit Dumplings - Hand-folded skins filled with five-spice duck, served in a delicate lemongrass-ginger consomme.'
            ),
            item(
              'The Bakery',
              'Black Garlic Infused Sourdough Rolls - Slow-kneaded dark artisanal rolls served with a creamy salted miso-butter.'
            ),
            item(
              'Intermezzo',
              'Lychee & Lemongrass Sorbet - Freshly churned exotic sorbet with a bright, electric zing to reset the palate.'
            ),
            item(
              'Main Entree',
              'Korean-Style Glazed Lamb Chops - Charred over high heat with a gochujang-honey glaze, served with kimchi-fried forbidden rice and baby bok choy.'
            ),
            item(
              'Grand Finale',
              'Matcha & White Chocolate Fondant - A molten core of Japanese green tea chocolate, served with house-made toasted black sesame gelato and a ginger-snap crumble.'
            ),
          ],
        },
      ],
    },
  },
  services: {
    'anniversary-celebrations': {
      intro: "Quiet luxury for milestone nights — paced courses, discreet service, and a table that feels like a private dining room at home.",
      blocks: [
        {
          title: "Evening arc",
          image: "images/services-and-occasions/anniversary-celebrations/gallery/01.jpg",
          items: [
            item("Arrival champagne bites", "Light canapés and a calm welcome while guests settle in."),
            item("Course pacing", "A deliberate rhythm from first plate to dessert, without rush."),
          ],
        },
        {
          title: "Menu storytelling",
          image: "images/services-and-occasions/anniversary-celebrations/gallery/02.jpg",
          items: [
            item("Shared memory course", "A dish shaped around a favorite cuisine, travel, or year together."),
            item("Dietary precision", "Allergies and preferences woven in without calling attention."),
          ],
        },
        {
          title: "Table & ambiance",
          image: "images/services-and-occasions/anniversary-celebrations/gallery/03.jpg",
          items: [
            item("Intimate plating", "Gold accents, pastry finales, and plates built for photographs."),
            item("Service style", "Quiet plating nearby — conversation stays at the center."),
          ],
        },
        {
          title: "Finishing notes",
          image: "images/services-and-occasions/anniversary-celebrations/gallery/04.jpg",
          items: [
            item("Dessert celebration", "A composed dessert course or cake moment timed to the toast."),
            item("Take-home keepsake", "Printed menu card and leftover notes when it fits the night."),
          ],
        },
      ],
    },
    'birthday-events': {
      intro: "Chef-led birthdays with energy, timing, and a menu that feels festive without turning dinner into a catering line.",
      blocks: [
        {
          title: "Celebration flow",
          image: "images/services-and-occasions/birthday-events/gallery/01.jpg",
          items: [
            item("Welcome bites", "Passed or plated starters while guests arrive and photos happen."),
            item("Seat-and-serve timing", "Main courses hit the table when the room is ready — not before."),
          ],
        },
        {
          title: "Festive menu",
          image: "images/services-and-occasions/birthday-events/gallery/02.jpg",
          items: [
            item("Crowd-pleasing courses", "Familiar comforts elevated with fine-dining technique."),
            item("Surprise dessert", "Powdered plates, chocolate work, or a showpiece dessert for the birthday guest."),
          ],
        },
        {
          title: "Guest experience",
          image: "images/services-and-occasions/birthday-events/gallery/03.jpg",
          items: [
            item("Kids & mixed diets", "Parallel plates when the guest list spans ages and preferences."),
            item("Toast window", "A clear pause for speeches without cold food."),
          ],
        },
        {
          title: "Hosting support",
          image: "images/services-and-occasions/birthday-events/gallery/04.jpg",
          items: [
            item("Kitchen takeover", "Chef and service handle production so the host stays with guests."),
            item("Cleanup handoff", "Stations reset so the night ends as calmly as it began."),
          ],
        },
      ],
    },
    'family-dinners': {
      intro: "Generous family tables — restaurant-level cooking with the warmth of home, built for sharing and second helpings.",
      blocks: [
        {
          title: "Family-style service",
          image: "images/services-and-occasions/family-dinners/gallery/01.jpg",
          items: [
            item("Shared platters", "Focaccia, proteins, and sides meant to pass down the table."),
            item("Flexible pacing", "Courses that wait for late arrivals and long conversations."),
          ],
        },
        {
          title: "Comfort, elevated",
          image: "images/services-and-occasions/family-dinners/gallery/02.jpg",
          items: [
            item("Signature mains", "Short rib, roast, or fish prepared for a full household."),
            item("Seasonal sides", "Vegetables and grains that feel abundant, not fussy."),
          ],
        },
        {
          title: "Kitchen fit",
          image: "images/services-and-occasions/family-dinners/gallery/03.jpg",
          items: [
            item("Home kitchen workflow", "Menus sized to your stove, oven, and counter space."),
            item("Allergy-aware plates", "Clear labeling when the family table mixes restrictions."),
          ],
        },
        {
          title: "After dinner",
          image: "images/services-and-occasions/family-dinners/gallery/04.jpg",
          items: [
            item("Simple dessert", "A composed sweet or communal pastry to close the meal."),
            item("Leftovers plan", "Pack-up guidance so tomorrow’s lunch is part of the gift."),
          ],
        },
      ],
    },
    'special-events': {
      intro: "Corporate evenings, community gatherings, and private productions — polished flow from first reception bite to the last plated course.",
      blocks: [
        {
          title: "Event production",
          image: "images/services-and-occasions/special-events/gallery/01.jpg",
          items: [
            item("Reception to seating", "Passed apps, then a clean transition into the dining program."),
            item("Volume with craft", "Identical plates executed at guest-count scale."),
          ],
        },
        {
          title: "Menu architecture",
          image: "images/services-and-occasions/special-events/gallery/02.jpg",
          items: [
            item("Stations or plated", "Hybrid formats when mingling matters as much as the meal."),
            item("Brand & dietary notes", "Corporate or host requirements folded into the tasting path."),
          ],
        },
        {
          title: "Service choreography",
          image: "images/services-and-occasions/special-events/gallery/03.jpg",
          items: [
            item("Timeline ownership", "Kitchen cues locked to speeches, AV, and venue rules."),
            item("Staffing plan", "Enough hands for hot food and quiet resets."),
          ],
        },
        {
          title: "Signature moments",
          image: "images/services-and-occasions/special-events/gallery/04.jpg",
          items: [
            item("Hero course", "A plated main designed to photograph and impress at scale."),
            item("Closing pass", "Dessert or late-night bites that keep energy high."),
          ],
        },
      ],
    },
    'special-occasion-dining': {
      intro: "Proposals, reunions, and chef’s-table nights — intimate arcs where every course earns the occasion.",
      blocks: [
        {
          title: "Intimate framing",
          image: "images/services-and-occasions/special-occasion-dining/gallery/01.jpg",
          items: [
            item("Small-party focus", "Menus written for two to twelve, not a banquet hall."),
            item("Chef’s-table energy", "Courses presented with short stories, not a script."),
          ],
        },
        {
          title: "Course design",
          image: "images/services-and-occasions/special-occasion-dining/gallery/02.jpg",
          items: [
            item("Tasting progression", "Appetizer through dessert with clear peaks and palate resets."),
            item("Luxury details", "Coral tuiles, precise sauces, and plating built for close viewing."),
          ],
        },
        {
          title: "The moment",
          image: "images/services-and-occasions/special-occasion-dining/gallery/03.jpg",
          items: [
            item("Cue coordination", "A timed pause for a proposal, gift, or family toast."),
            item("Discreet service", "Staff presence that supports the room without crowding it."),
          ],
        },
        {
          title: "Afterglow",
          image: "images/services-and-occasions/special-occasion-dining/gallery/04.jpg",
          items: [
            item("Digestif or dessert wine notes", "Optional pairings to linger after the final plate."),
            item("Memory keepers", "Menu cards and a photo-ready final course."),
          ],
        },
      ],
    },
    'chef-education': {
      intro: "A placeholder education section reserved for Chef Fikret’s upcoming workshop and lesson formats. This space is ready for his teaching philosophy, class flow, and signature topics.",
      blocks: [
        {
          title: "Program overview",
          image: "images/services-and-occasions/chef-education/gallery/01.jpg",
          items: [
            item("Core concept", "Space reserved for Chef Fikret to introduce the education experience."),
            item("Ideal audience", "Add whether this section is built for home cooks, private groups, team events, or executive clients."),
          ],
        },
        {
          title: "Format options",
          image: "images/services-and-occasions/chef-education/gallery/02.jpg",
          items: [
            item("Hands-on class", "Placeholder for class length, participation level, station setup, and the guest experience."),
            item("Demonstration session", "Placeholder for tasting flow, Q&A structure, and how the chef presents the lesson live."),
          ],
        },
        {
          title: "Topics & curriculum",
          image: "images/services-and-occasions/chef-education/gallery/03.jpg",
          items: [
            item("Signature subjects", "Reserve this block for techniques, menus, plating topics, or specialty cuisines Chef Fikret wants to teach."),
            item("Customization", "Add how sessions can adapt to experience level, dietary focus, private events, or corporate goals."),
          ],
        },
        {
          title: "Materials & next steps",
          image: "images/services-and-occasions/chef-education/gallery/04.jpg",
          items: [
            item("What’s included", "Placeholder for prep lists, ingredient sourcing, printed notes, tasting components, or take-home references."),
            item("Booking the session", "Use this area to explain lead time, group size, service area, and any kitchen requirements."),
          ],
        },
      ],
    },
  },
  availability: {
    note: '',
    blockedDates: [],
  },
};

function cloneDefaultContent() {
  return JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT));
}

module.exports = { DEFAULT_SITE_CONTENT, cloneDefaultContent };
