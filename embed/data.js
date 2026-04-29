/**
 * Editable copy for detail panels (English).
 * Each cuisine / service has: intro + blocks (Starters, Hot appetizers, Mains, Desserts
 * OR Events, Training, Invitations-style columns for services).
 */
(function (global) {
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  /** One illustrative image per course block; paths resolve under each cuisine folder. */
  function cuisineBlockImage(slug, index1Based) {
    return 'images/cuisines/' + slug + '/gallery/' + pad2(index1Based) + '.jpg';
  }

  function serviceBlockImage(slug, index1Based) {
    return 'images/services-and-occasions/' + slug + '/gallery/' + pad2(index1Based) + '.jpg';
  }

  function cuisineDefaults(slug, themeLabel) {
    return {
      intro:
        'Curated courses inspired by ' +
        themeLabel +
        '. Selections below are representative — Chef Siler tailors every menu to your occasion.',
      blocks: [
        {
          title: 'Starters & Cold Appetizers',
          image: cuisineBlockImage(slug, 1),
          items: [
            {
              name: 'Seasonal crudités & artisan board',
              desc: 'Market vegetables, aged cheese, house preserves, and herb oils.',
            },
            {
              name: 'Chilled soup presentation',
              desc: 'Silky texture, bright acidity, micro herbs — served as an elegant opener.',
            },
          ],
        },
        {
          title: 'Hot Appetizers',
          image: cuisineBlockImage(slug, 2),
          items: [
            {
              name: 'Pass-around small plates',
              desc: 'Perfectly timed bites — crisp, aromatic, and balanced for ' + themeLabel + '.',
            },
            {
              name: 'Skillet & roast accents',
              desc: 'Depth of flavor without heaviness; composed for the pace of your gathering.',
            },
          ],
        },
        {
          title: 'Main Courses',
          image: cuisineBlockImage(slug, 3),
          items: [
            {
              name: 'Chef’s centerpiece plate',
              desc: 'Proteins and accompaniments composed with precision — seasonal and refined.',
            },
            {
              name: 'Vegetable-forward option',
              desc: 'A complete plate celebrating texture, jus, and garnish at the same standard.',
            },
          ],
        },
        {
          title: 'Desserts',
          image: cuisineBlockImage(slug, 4),
          items: [
            {
              name: 'Plated sweet finale',
              desc: 'Balanced sweetness, temperature contrast, and a memorable last impression.',
            },
            {
              name: 'Petits & sharing dessert',
              desc: 'Optional closing course styled for your table and pacing.',
            },
          ],
        },
      ],
    };
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
            {
              name: 'Timeline & flow',
              desc: 'Arrival bites, seated courses or stations, and a clear rhythm for guests.',
            },
            {
              name: 'Venue coordination notes',
              desc: 'Buffet, plated, or hybrid — aligned with your space and guest count.',
            },
          ],
        },
        {
          title: 'Workshops & Culinary Training',
          image: serviceBlockImage(slug, 2),
          items: [
            {
              name: 'Hands-on sessions',
              desc: 'Technique-focused modules — knife skills, sauces, plating — paced for your group.',
            },
            {
              name: 'Demonstration format',
              desc: 'Chef-led narrative with tasting flights and Q&A.',
            },
          ],
        },
        {
          title: 'Invitations & Private Gatherings',
          image: serviceBlockImage(slug, 3),
          items: [
            {
              name: 'Intimate dining format',
              desc: 'Chef’s table energy with discreet service and conversational pacing.',
            },
            {
              name: 'Welcome reception styling',
              desc: 'Passed bites and beverage pairing cadence before the main experience.',
            },
          ],
        },
        {
          title: 'Signature Experiences',
          image: serviceBlockImage(slug, 4),
          items: [
            {
              name: 'Custom menu arc',
              desc: 'Story-led courses reflecting your occasion from first bite to dessert.',
            },
            {
              name: 'Add-on enhancements',
              desc: 'Wine coordination notes, printed menus, and dietary accommodations.',
            },
          ],
        },
      ],
    };
  }

  global.SC_SITE = {
    cuisines: {
      'american-cuisine': cuisineDefaults('american-cuisine', 'American cuisine'),
      'french-cuisine': cuisineDefaults('french-cuisine', 'French cuisine'),
      'greek-cuisine': cuisineDefaults('greek-cuisine', 'Greek cuisine'),
      'italian-cuisine': cuisineDefaults('italian-cuisine', 'Italian cuisine'),
      'middle-eastern-cuisine': cuisineDefaults('middle-eastern-cuisine', 'Middle Eastern cuisine'),
      'turkish-cuisine': cuisineDefaults('turkish-cuisine', 'Turkish cuisine'),
    },
    services: {
      'anniversary-celebrations': serviceDefaults('anniversary-celebrations', 'anniversary celebrations'),
      'birthday-events': serviceDefaults('birthday-events', 'birthday gatherings'),
      'family-dinners': serviceDefaults('family-dinners', 'family dinners'),
      'special-events': serviceDefaults('special-events', 'special events'),
      'special-occasion-dining': serviceDefaults('special-occasion-dining', 'special-occasion dining'),
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
