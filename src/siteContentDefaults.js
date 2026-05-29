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
      location: '1555 N Sierra St, Reno, NV 89503',
      streetAddress: '1555 N Sierra St',
      addressLocality: 'Reno',
      addressRegion: 'NV',
      postalCode: '89503',
      googleMapsHref:
        'https://www.google.com/maps/place/Siler+Chef+LLC/@39.5433344,-119.8216659,17z/data=!3m1!4b1!4m6!3m5!1s0xa180e099e5f7d05b:0x5f23cef288df732e!8m2!3d39.5433344!4d-119.8216659!16s%2Fg%2F11z80y9ty7',
      googleMapsEmbedSrc:
        'https://maps.google.com/maps?q=Siler+Chef+LLC,+1555+N+Sierra+St,+Reno,+NV+89503&hl=en&z=16&output=embed',
      instagramHref: 'https://www.instagram.com/silerchef',
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
    'anniversary-celebrations': serviceDefaults('anniversary-celebrations', 'anniversary celebrations'),
    'birthday-events': serviceDefaults('birthday-events', 'birthday gatherings'),
    'family-dinners': serviceDefaults('family-dinners', 'family dinners'),
    'special-events': serviceDefaults('special-events', 'special events'),
    'special-occasion-dining': serviceDefaults('special-occasion-dining', 'special-occasion dining'),
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
