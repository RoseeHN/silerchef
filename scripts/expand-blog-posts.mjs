#!/usr/bin/env node
/**
 * Full SEO body copy for all Journal posts (run from repo root).
 * node scripts/expand-blog-posts.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = path.join(root, 'embed/data/blog-posts.json');
const updatedOn = '2026-05-28';
const MIN_WORDS = 520;

const aboutChef = `<h2>About Siler Chef</h2><p>Siler Chef LLC is led by <strong>Chef Fikret Siler</strong>, whose career spans Istanbul fine-dining hotels (including Michelin-guide environments), eight years at Vakko Patisserie alongside MOF-trained mentors, and leadership roles in Northern Nevada kitchens. That background informs how private events are paced: sauces finished with patience, pastry that lands cleanly, and service that feels calm rather than chaotic.</p><p>We serve <strong>Reno</strong>, <strong>Lake Tahoe</strong>, and the <strong>San Francisco Bay Area</strong> for private chef dinners, celebrations, corporate hosting, and chef-led education. Sample menus on the site are starting directions — every course can be rebuilt around your guest list, allergies, and the equipment in your home or rental kitchen.</p>`;

const serviceArea = `<h2>Service area and travel</h2><p>Core scheduling is based in Reno, Nevada. We regularly travel to Tahoe homes and qualified Bay Area addresses when dates allow. Share your neighborhood, property type (primary home, rental, estate), and any access notes (gates, elevators, HOA quiet hours) in your first inquiry so travel and load-in are quoted accurately — not guessed the week of the event.</p>`;

const cta = `<h2>Request availability</h2><p>Tell us your <strong>date</strong>, <strong>location</strong>, <strong>guest count</strong>, and any dietary restrictions. We follow up by phone, email, or WhatsApp with timing and menu direction. <a href="/#contact">Submit your reservation request</a>, explore <a href="/#cuisines">cuisine portfolios</a>, or browse the <a href="/gallery">gallery</a> for plating tone.</p>`;

/** @param {{ title: string, paragraphs: string[], list?: string[] }} block */
function block({ title, paragraphs, list }) {
  let html = `<h2>${title}</h2>`;
  for (const p of paragraphs) {
    html += `<p>${p}</p>`;
  }
  if (list?.length) {
    html += `<ul>${list.map((li) => `<li>${li}</li>`).join('')}</ul>`;
  }
  return html;
}

function timelineBlock(topicLabel) {
  return block({
    title: `Booking timeline for ${topicLabel}`,
    paragraphs: [
      `For ${topicLabel}, inquire two to eight weeks ahead when possible — longer for Thanksgiving week, New Year’s Eve, and peak Tahoe summer Saturdays. Your first reply includes questions about kitchen setup, realistic guest count, and service style rather than a one-size quote.`,
      `Menu direction is confirmed before groceries are ordered. One week out we reconfirm allergies, arrival window, bar coordination (if separate), and any rental delivery times. Event-day load-in is scheduled to stay quiet during guest arrival.`,
      `After service, kitchen reset scope is completed as written in your proposal — you should know in advance whether dish handling, trash consolidation, and tray removal are included.`,
    ],
  });
}

/**
 * @param {string[]} lead
 * @param {Array<{ title: string, paragraphs: string[], list?: string[] }>} sections
 * @param {string} topicLabel
 */
function article(lead, sections, topicLabel) {
  const intro = lead.map((p) => `<p>${p}</p>`).join('');
  const body = sections.map((s) => block(s)).join('') + timelineBlock(topicLabel);
  return `${intro}${body}${aboutChef}${serviceArea}${cta}`;
}

/** @type {Record<string, string>} */
const bodies = {
  'private-chef-reno-guide': article(
    [
      'If you are searching for a <strong>private chef in Reno</strong>, you are usually planning something more personal than a restaurant reservation: a home you love, guests you want to see, and a menu that fits the night instead of a fixed card. Chef-led in-home dining removes the split focus — you stay with guests while courses arrive with intention.',
      'Siler Chef is based in Northern Nevada and serves Reno, the Truckee Meadows, Spanish Springs, South Meadows, and surrounding neighborhoods for private dinners, milestones, and chef-led entertaining.',
    ],
    [
      {
        title: 'What a Reno private chef handles end-to-end',
        paragraphs: [
          'Menu design, sourcing, prep, cooking, plating, timing, and discreet clearing. Courses are sequenced like a fine-dining line: hold times, resting proteins, and sauce work are planned before service — not improvised while guests wait in the living room.',
          'Before anyone picks up a knife we confirm guest count, allergies, service style (plated vs. family-style), and what your kitchen can support realistically.',
        ],
        list: [
          '<strong>Consultation:</strong> occasion, cuisine direction, and dietary documentation',
          '<strong>Menu draft:</strong> customized from our <a href="/#cuisines">cuisine portfolios</a>',
          '<strong>Day-of:</strong> load-in, service, and kitchen reset agreed in advance',
        ],
      },
      {
        title: 'Plated vs. family-style in Reno homes',
        paragraphs: [
          'Smaller tables and anniversaries often suit plated courses — pauses between wines, quieter clearing, and a chef’s-table feel. Larger birthdays and family weekends often work better with shared mains and composed sides.',
          'There is no universal “right” answer; guest count and how formal you want the rhythm determines the format. Many hosts blend both: passed bites, shared centerpiece, plated dessert.',
        ],
      },
      {
        title: 'Kitchens, rentals, and equipment',
        paragraphs: [
          'Primary homes, townhouses, and mountain-weekend properties all differ. We ask about oven size, burner count, refrigeration, and outdoor grill access before locking proteins and pastry.',
          'If you are between homes or hosting at a family member’s house, photos of the kitchen help — but a short description of burners and counter space is often enough.',
        ],
      },
      {
        title: 'Dietary needs on mixed Reno tables',
        paragraphs: [
          'Vegetarian, gluten-free, dairy-free, and severe allergy paths are designed at the recipe level. The goal is parallel courses that feel equal in care — not one alternate plate rushed at the pass.',
          'Include severity notes when you inquire (for example airborne nut exposure vs. preference).',
        ],
      },
      {
        title: 'How far in advance to book',
        paragraphs: [
          'Popular weekends, holidays, and ski-season overlap fill early. Sharing your date and headcount before the menu is final helps hold the calendar.',
          'Last-minute requests are sometimes possible but should never be assumed for peak Saturdays or major holidays.',
        ],
      },
    ],
    'a Reno private chef dinner'
  ),

  'lake-tahoe-private-dining': article(
    [
      '<strong>Lake Tahoe private dining</strong> should protect the reason you came — the view, the people, and the pace of a mountain weekend — not turn you into the person missing from the deck because every dish fights for the same oven.',
      'Siler Chef travels to Tahoe homes and vacation rentals for intimate dinners, family gatherings, rehearsal meals, and small celebrations across the basin.',
    ],
    [
      {
        title: 'Rental kitchens and realistic mountain timing',
        paragraphs: [
          'Properties range from chef-grade kitchens to tight galley layouts. We confirm burners, oven capacity, refrigeration, and outdoor grill access before proteins are chosen.',
          'Elevation, sunset, drive time from skiing or the lake, and whether guests are in formal attire all influence when hot food should land.',
        ],
      },
      {
        title: 'Indoor, deck, and weather backup plans',
        paragraphs: [
          'Wind, temperature drops, and smoke restrictions can move service indoors with little notice. We build backup timing so the meal still feels intentional — not like a scramble.',
          'Share HOA quiet hours, bear-box rules, and whether gear must load through a garage so arrival stays discreet during cocktails.',
        ],
      },
      {
        title: 'Menu directions that match Tahoe weekends',
        paragraphs: [
          'Some hosts want fire-and-smoke energy — premium casual plates after a day outside. Others want a calmer plated arc: seafood, bright vegetables, and dessert that finishes clean.',
          'Kids, mixed ages, and wine you already purchased are all inputs we plan around — not surprises mid-service.',
        ],
      },
      {
        title: 'Rehearsals, birthdays, and multi-family weeks',
        paragraphs: [
          'Tahoe weeks often stack events: welcome dinner Friday, celebration Saturday, brunch-style lunch Sunday. Ask about coordinated menus if you are hosting across multiple nights.',
          'Guest counts from eight to forty are common; format recommendations change with headcount more than with “fancy” vs. “casual” labels.',
        ],
      },
      {
        title: 'What to send when booking Tahoe',
        paragraphs: [
          'Property area (Incline, South Shore, West Shore, Truckee-side), date, guest count, indoor vs. deck preference, and known allergies.',
          'Gate codes, parking for load-in, and planner contact (if you have one) prevent day-of delays.',
        ],
      },
    ],
    'Lake Tahoe private chef dining'
  ),

  'bay-area-in-home-chef': article(
    [
      'Hiring an <strong>in-home chef in the Bay Area</strong> keeps the room, the playlist, and the guest list you want — without parking stress, reservation limits, or splitting a group across two restaurant tables.',
      'Siler Chef serves qualified private events in the San Francisco Bay Area in addition to Reno and Lake Tahoe, with menus built using fine-dining discipline: sourcing, prep timelines, and service cues that protect conversation.',
    ],
    [
      {
        title: 'Why Bay Area hosts choose private chef service',
        paragraphs: [
          'Client entertainment, product launches at home, birthdays, anniversaries, and multi-family gatherings all suffer when the host plates in the kitchen.',
          'Chef-led service times courses, handles dietary flags before anyone sits, and keeps clearing discreet during business or personal conversation.',
        ],
      },
      {
        title: 'Condos, townhomes, and suburban estates',
        paragraphs: [
          'Urban buildings may need elevator reservations and quiet-hour awareness. Suburban homes may need driveway space for temperature-controlled load-in.',
          'Include access notes in your first message — doorman details, loading dock rules, and whether service must conclude by a fixed hour.',
        ],
      },
      {
        title: 'Menu design for mixed Bay Area guest lists',
        paragraphs: [
          'Neutral coursed menus work for client dinners; heritage cuisines work for family milestones. Dietary layers — vegetarian, gluten-free, halal-friendly adaptations — are mapped during booking.',
          'Explore <a href="/#cuisines">global menu directions</a> for flavor families; every sample set can be redesigned from scratch.',
        ],
      },
      {
        title: 'Wine, pacing, and event length',
        paragraphs: [
          'If you are pouring bottles yourself, share what you are opening and we can align acidity and weight course by course.',
          'Shorter coursed menus often outperform oversized ones for business entertaining — guests stay engaged and the night ends on time.',
        ],
      },
      {
        title: 'Travel, staffing, and proposals',
        paragraphs: [
          'Bay Area proposals include travel and load-in so you can compare chef-led service to restaurant buyouts fairly.',
          'Larger groups may benefit from an additional server for plated service — we mention this early so rentals are ordered once.',
        ],
      },
    ],
    'Bay Area in-home chef events'
  ),

  'anniversary-dinner-private-chef': article(
    [
      'An <strong>anniversary dinner with a private chef</strong> works when the night feels intentional — not like a crowded Saturday restaurant, and not like you spent the afternoon panicking over sauce timing.',
      'The right arc is short enough to stay romantic, strong enough to remember: a bright opener, one interlude, a main that carries the story, and dessert that lands softly.',
    ],
    [
      {
        title: 'Formal vs. relaxed luxury at home',
        paragraphs: [
          'Some couples want candlelit tasting portions and quiet clearing between courses. Others want shared mains, a favorite bottle on the table, and time for long conversation.',
          'Tell us which energy you want; we recommend plateware, timing, and whether passed bites make sense during greeting.',
        ],
      },
      {
        title: 'Music, lighting, and surprises',
        paragraphs: [
          'We coordinate with your timeline — when candles are lit, when the main should land, and whether the kitchen stays closed off visually.',
          'Favorite flavors from a trip, a shared heritage cuisine, or a lighter dessert finisher are easiest when we know early.',
        ],
      },
      {
        title: 'Wine and non-alcoholic pairings',
        paragraphs: [
          'You do not need a cellar. Share what you are pouring and we can note per-course suggestions, or keep the menu flexible for a mixed case.',
          'Zero-proof pairings and sparkling mocktails can be part of the brief when guests do not drink alcohol.',
        ],
      },
      {
        title: 'Dietary needs on a two-top (or small table)',
        paragraphs: [
          'Even small tables have allergies. We document restrictions during booking and build substitutions at the recipe level.',
          'Gluten-free, dairy-free, and pescatarian paths can still feel indulgent — not like an afterthought.',
        ],
      },
      {
        title: 'Reserve your anniversary date',
        paragraphs: [
          'Weekend dates in Reno and Tahoe fill early. Share location, guest count (if close friends join), and preferred service style.',
          'See <a href="/#services">anniversary formats</a> on the site for how we frame the evening.',
        ],
      },
    ],
    'an anniversary private chef dinner'
  ),

  'corporate-dinner-chef-home': article(
    [
      'A <strong>corporate dinner at home</strong> or leased residence keeps focus on the relationship — not on whether service interrupted the pitch. Chef-led timing creates natural pauses; dietary flags are handled before anyone sits.',
      'Executive entertaining, client thank-yous, team milestones, and board-adjacent gatherings are common across Reno, Tahoe, and the Bay Area.',
    ],
    [
      {
        title: 'Structuring the evening for conversation',
        paragraphs: [
          'We coordinate guest arrival, optional passed bites during mingling, and when seated service begins.',
          'Many groups perform better with three strong courses than six — guests stay engaged and the night ends on schedule.',
        ],
        list: [
          'Passed canapés during reception',
          'Timed seated courses with quiet clearing',
          'Alternate plates for documented restrictions',
          'Optional coffee or dessert only if the room has energy',
        ],
      },
      {
        title: 'Menus that stay neutral or tell a story',
        paragraphs: [
          'Neutral menus work for mixed client tastes. Cuisine stories work when hospitality and attention to detail are part of the message.',
          'We avoid overly polarizing ingredients unless you explicitly want a bold direction.',
        ],
      },
      {
        title: 'Privacy, discretion, and presentation',
        paragraphs: [
          'Client dinners often need low-key arrival and minimal branding. We dress for residential service and keep table-side conversation about food — not sales talk — unless you prefer otherwise.',
          'Plating stays composed for photography when you want content for internal recaps.',
        ],
      },
      {
        title: 'Logistics hosts forget',
        paragraphs: [
          'Parking for load-in, kitchen access, trash handling, hard stop times, and whether AV/setup teams need the dining room clear.',
          'Share those details when you inquire so proposals match reality.',
        ],
      },
      {
        title: 'Comparing chef-led vs. restaurant buyout',
        paragraphs: [
          'Restaurants cap headcount and noise. Homes let you control guest list and timing — chef-led service brings restaurant pacing without losing the room.',
          'We will say honestly if your brief fits private chef service or another format.',
        ],
      },
    ],
    'a corporate private chef dinner'
  ),

  'birthday-party-private-chef': article(
    [
      'A <strong>birthday party with a private chef</strong> lets you celebrate at home without becoming line cook for twenty people. Speeches, cake, and photos get space because food rhythm is planned — not guessed.',
      'Kids, parents, and friends can share one table while courses or shared platters arrive on cue.',
    ],
    [
      {
        title: 'Formats for mixed guest lists',
        paragraphs: [
          '<strong>Seated coursed dinner</strong> for smaller milestones. <strong>Family-style mains</strong> when everyone wants to graze and talk. <strong>Hybrid</strong> — passed bites, shared centerpiece, plated dessert — when ages and schedules differ.',
          'Structure matters more than theme; allergies and cake timing are built into prep lists.',
        ],
      },
      {
        title: 'Flavor and formality',
        paragraphs: [
          'Playful comfort, global cuisine, or polished plating can all fit a birthday. Tell us the tone you want when you inquire.',
          'We plan vegetarian layers and kid-friendly sides without automatically running a separate kids menu unless you want one.',
        ],
      },
      {
        title: 'Cake, candles, and dessert timing',
        paragraphs: [
          'If you are bringing a celebration cake, tell us when candles should happen — we pace savory courses so guests still have energy for the moment.',
          'House desserts can complement (not compete with) cake if you want a chocolate or fruit finisher before candles.',
        ],
      },
      {
        title: 'Backyard, rental, and Reno/Tahoe parties',
        paragraphs: [
          'Outdoor heat lamps, wind, and holding temps matter for deck service. We coordinate rentals if platters need chafing or if service is indoors-only backup.',
          'Guest counts from ten to fifty change staffing recommendations — share realistic headcount early.',
        ],
      },
      {
        title: 'Check availability',
        paragraphs: [
          'Weekend dates fill early. Browse <a href="/#services">birthday formats</a>, then send date, location, and headcount.',
          'Sample <a href="/#cuisines">menus</a> are easy starting points for flavor direction.',
        ],
      },
    ],
    'a birthday party with a private chef'
  ),

  'plated-vs-family-style-private-chef': article(
    [
      'Choosing between <strong>plated and family-style private chef service</strong> shapes formality, staffing, plateware, and how long guests stay seated. Neither is universally better — the fit depends on guest count and the story of the night.',
      'Siler Chef serves Reno, Lake Tahoe, and the Bay Area with both formats daily; we recommend a flow after we know your headcount and vibe.',
    ],
    [
      {
        title: 'Plated service: when it shines',
        paragraphs: [
          'Each course is composed, timed, and cleared with intention. Anniversaries, client dinners, and smaller tables benefit from pauses between courses and wine.',
          'Plated reads as calm luxury because the room slows down with the menu.',
        ],
      },
      {
        title: 'Family-style service: when it shines',
        paragraphs: [
          'Larger platters and shared sides keep the table communal. Birthdays, casual premium hosting, and groups that want interaction often prefer family-style.',
          'Without added staff, very large groups may wait longer for individual plating — family-style can be the practical choice.',
        ],
      },
      {
        title: 'Blended formats many hosts choose',
        paragraphs: [
          'Passed bites during arrival, shared mains in the middle, plated dessert to finish with focus — hybrids are common and often optimal.',
          'Tell us if you want a speech window between courses; we hold timing accordingly.',
        ],
      },
      {
        title: 'Staffing, rentals, and plateware',
        paragraphs: [
          'Plated service for more than twelve guests may benefit from an additional server. Family-style needs larger platters and table space for passing.',
          'We mention rentals early so you order once, not in a panic two days before.',
        ],
      },
      {
        title: 'How to decide quickly',
        paragraphs: [
          'Under ten guests and milestone tone → lean plated. Over sixteen and social tone → lean family-style or hybrid.',
          '<a href="/#contact">Describe your guest count and occasion</a> and we will recommend a flow before you finalize courses.',
        ],
      },
    ],
    'choosing plated vs. family-style service'
  ),

  'how-to-hire-private-chef': article(
    [
      'Knowing <strong>how to hire a private chef</strong> saves you from vague quotes, last-minute menu panic, and the wrong service style for your guest list. Start with date, location, and realistic headcount — everything else branches from there.',
      'This checklist reflects how Siler Chef scopes Reno, Tahoe, and Bay Area events; use it to compare any provider fairly.',
    ],
    [
      {
        title: 'Questions to ask before you book',
        paragraphs: [
          'How are allergies and severe restrictions documented? What happens with limited rental kitchens? When is the menu finalized?',
          'Is service plated, family-style, or mixed — and what do you recommend for my headcount?',
        ],
        list: [
          'What is included vs. quoted separately (rentals, extra staff, premium proteins)',
          'Travel and load-in rules for Tahoe or Bay Area addresses',
          'Cancellation, weather backup, and illness policies',
          'Kitchen reset and trash scope after service',
        ],
      },
      {
        title: 'What to send in your first inquiry',
        paragraphs: [
          'Occasion, cuisine preferences, dietary needs, service style instinct, and best phone number for follow-up.',
          'Photos help for unusual rentals but are not required for most Reno homes — burner count and counter space often suffice.',
        ],
      },
      {
        title: 'Red flags vs. green flags',
        paragraphs: [
          'Green: clear answers on allergens, written menu timeline, honest format recommendation. Red: one flat per-head price with no questions about travel or kitchen.',
          'Green: willingness to say catering might fit better for your brief. Red: no mention of how guest-count changes affect labor.',
        ],
      },
      {
        title: 'Contracts, deposits, and date holds',
        paragraphs: [
          'Peak weekends and holidays may require a deposit. Proposals should outline ingredients, labor, travel, and rentals separately enough to compare options.',
          'Guest-count changes within agreed windows should be discussed upfront — not surprised at invoice time.',
        ],
      },
      {
        title: 'Working with Siler Chef',
        paragraphs: [
          'Submit your request with cuisine preferences; we follow up by phone or email with timing and next steps.',
          'Explore <a href="/#cuisines">sample menus</a> while you wait — they are starting points, not fixed packages.',
        ],
      },
    ],
    'hiring a private chef'
  ),

  'private-chef-dietary-restrictions': article(
    [
      '<strong>Private chef menus for allergies and dietary preferences</strong> only work when restrictions are design inputs — not a single alternate plate rushed at the pass. Mixed tables are normal; parallel courses should feel equal in care.',
      'Siler Chef documents allergens during booking and builds prep lists, boards, and service timing to reduce cross-contact risk.',
    ],
    [
      {
        title: 'How we capture restrictions',
        paragraphs: [
          'During inquiry we record allergens, severity, faith-based needs, vegetarian or vegan guests, and ingredients to avoid entirely.',
          'Severity matters: airborne nut exposure is planned differently from preference.',
        ],
      },
      {
        title: 'Common paths we build',
        paragraphs: [
          'Gluten-free fry and sauce steps when needed. Dairy-free desserts that still feel finished. Vegetarian courses with the same rigor as protein-centered plates.',
          'Halal-friendly or pork-free menus when the whole table needs alignment.',
        ],
        list: [
          'Parallel prep boards for severe allergies',
          'Recipe-level substitutions, not garnish swaps',
          'Clear communication to servers (or host) about which plate goes where',
        ],
      },
      {
        title: 'When the whole table shares one restriction',
        paragraphs: [
          'If everyone is gluten-free or pork-free, the menu is one coherent arc. If one guest has a severe allergy, we often design parallel paths rather than isolating one plate last minute.',
          'Buffet-style events need labeling and placement discipline — we plan that in advance.',
        ],
      },
      {
        title: 'What guests should never have to do',
        paragraphs: [
          'Guests should not need to explain their allergy repeatedly to every server. Hosts should not apologize for “complicated” tables — documentation upfront is the professional standard.',
          'We welcome ingredient lists from guests when it helps everyone relax.',
        ],
      },
      {
        title: 'Start with clarity in your request',
        paragraphs: [
          'Include restriction notes when you <a href="/#contact">contact us</a>. Browse <a href="/#cuisines">cuisine portfolios</a> for flavor families we can adapt.',
          'Serving Reno, Lake Tahoe, and the Bay Area.',
        ],
      },
    ],
    'private chef menus with dietary restrictions'
  ),

  'private-chef-vs-catering': article(
    [
      'Understanding <strong>private chef vs. catering</strong> helps you pick the right experience before budget and guest expectations lock in. Catering optimizes for volume and hold times; chef-led service optimizes for finish, heat, and sequence.',
      'Both can be excellent — for different kinds of events.',
    ],
    [
      {
        title: 'When catering may be enough',
        paragraphs: [
          'Long open-house formats, self-serve buffets up for hours, or events where food is secondary to logistics sometimes fit traditional catering.',
          'If guests are comfortable with chafers and you want minimal service staff, catering can be practical.',
        ],
      },
      {
        title: 'When a private chef is the better match',
        paragraphs: [
          'You want courses timed like a restaurant table in your dining room: composed plates, quiet clearing, dietary paths planned in advance.',
          'You want the host in the room — not coordinating warming trays.',
        ],
      },
      {
        title: 'Heat, holding, and food quality',
        paragraphs: [
          'Chef-led food is meant to be eaten now — proteins rested, sauces finished, pastry crisp where it should be.',
          'Long holds change texture; we design menus that survive your timeline or we shorten the arc honestly.',
        ],
      },
      {
        title: 'Cleanup and reset',
        paragraphs: [
          'Chef-led proposals should state kitchen reset scope — not trays left at midnight without clarity.',
          'Catering drop-off may leave different cleanup expectations; compare fairly.',
        ],
      },
      {
        title: 'Honest guidance from Siler Chef',
        paragraphs: [
          'We will tell you if chef-led dining fits or if another format makes more sense.',
          '<a href="/#contact">Share your occasion</a>, guest count, and location.',
        ],
      },
    ],
    'private chef vs. catering decisions'
  ),

  'private-chef-cost-factors': article(
    [
      '<strong>Private chef pricing</strong> follows labor, ingredients, and logistics — not a meaningless per-head sticker. Transparent factors help you compare proposals and plan a night that matches the experience you want.',
      'Siler Chef does not publish one flat rate online because tables vary too much; this overview explains what typically moves quotes.',
    ],
    [
      {
        title: 'Guest count and service style',
        paragraphs: [
          'Headcount changes plate volume, staffing, and timeline. Plated multi-course service for eighteen guests is different labor than family-style for eighteen.',
          'Passed bites plus seated dinner extend service length — and cost — compared to dinner only.',
        ],
      },
      {
        title: 'Menu complexity and prep days',
        paragraphs: [
          'Pastry-heavy menus, tasting arcs, and premium proteins increase prep time before arrival.',
          'Simple elegant menus can be stunning without unnecessary complexity — we recommend honestly for your occasion.',
        ],
      },
      {
        title: 'Travel, load-in, and rentals',
        paragraphs: [
          'Tahoe and Bay Area addresses include travel planning. Rentals — platters, extra servers, outdoor setup — are line items discussed early.',
          'Proposals should separate ingredients, labor, travel, and rentals enough to compare catering quotes fairly.',
        ],
      },
      {
        title: 'Deposits and peak dates',
        paragraphs: [
          'Holiday weeks and peak Saturdays may require a deposit to hold the calendar.',
          'Last-minute bookings may carry rush constraints on menu depth — another reason to inquire early.',
        ],
      },
      {
        title: 'Request a tailored follow-up',
        paragraphs: [
          'Send date, location, and headcount — we reply with questions and next steps, not a generic auto-quote.',
          'No surprise fees for documented guest-count windows agreed upfront.',
        ],
      },
    ],
    'private chef pricing and proposals'
  ),

  'wine-pairing-private-dinner': article(
    [
      '<strong>Wine pairing for a private chef dinner</strong> does not require a cellar — it requires matching weight, acidity, and rhythm to the menu you are actually serving. At home you can pause, revisit a bottle, and adjust without a sommelier standing over the table.',
      'Siler Chef can align courses to bottles you already own or keep menus flexible for a mixed case.',
    ],
    [
      {
        title: 'Weight and acidity basics',
        paragraphs: [
          'Match weight: lighter wines with seafood and vegetable-forward courses; fuller reds with braised, grilled, or sauced mains.',
          'Acidity refreshes rich sauces; sweetness balances spice — a little goes a long way.',
        ],
      },
      {
        title: 'Course-by-course vs. flexible case',
        paragraphs: [
          'If you know your bottles, share them and we can note suggestions per course.',
          'If guests bring wine, we can stagger richness so unexpected bottles still work.',
        ],
      },
      {
        title: 'Sparkling, rosé, and dessert',
        paragraphs: [
          'Sparkling works for arrival and fried openings. Rosé bridges fish and light poultry.',
          'Dessert wine or coffee with finisher — avoid crushing pastry with overly tannic reds.',
        ],
      },
      {
        title: 'Non-alcoholic and low-alcohol tables',
        paragraphs: [
          'Zero-proof pairings, sparkling mocktails, and thoughtful teas can be part of the brief.',
          'Tell us when the table is mixed so no guest feels like an afterthought.',
        ],
      },
      {
        title: 'Plan the menu first',
        paragraphs: [
          'Browse <a href="/#cuisines">sample menus</a> for flavor families, then discuss bottles during booking.',
          'Private chef service in Reno, Tahoe, and the Bay Area.',
        ],
      },
    ],
    'wine pairing with a private chef menu'
  ),

  'turkish-cuisine-private-chef': article(
    [
      '<strong>Turkish cuisine at home</strong> with a private chef should respect mezze pacing: small bright openings, shared warmth in the middle, a main that earns its place. Siler Chef draws on Istanbul fine-dining training — pastry, grills, yogurt sauces — adapted to your kitchen.',
      'Reno and Tahoe gatherings use Turkish menus for birthdays, cultural celebrations, and hosts who want distinct flavor from standard steak-or-pasta private dining.',
    ],
    [
      {
        title: 'What guests recognize on the table',
        paragraphs: [
          'Balance of acid and fat, bread that matters, vegetables with intent, spice curves that build instead of shout.',
          'Modern plating can still feel generous for American home entertaining.',
        ],
      },
      {
        title: 'Bread, grill, and mezze on one timeline',
        paragraphs: [
          'Multiple hot elements compete for attention; we sequence ovens and burners so cold mezze, grilled proteins, and warm bread arrive in order.',
          'Rental grills and indoor ovens are both workable when prep is planned honestly.',
        ],
      },
      {
        title: 'Dietary layers on Turkish tables',
        paragraphs: [
          'Vegetarian guests, halal-friendly paths, and gluten-free adaptations can be parallel from booking — not patched mid-service.',
          'Tell us restrictions when you inquire.',
        ],
      },
      {
        title: 'Occasions that fit Turkish menus',
        paragraphs: [
          'Family weekends, engagement dinners, and cultural holidays. Also “we want something different” milestone nights.',
          'See the <a href="/#cuisines">Turkish portfolio</a> for three sample arcs.',
        ],
      },
      {
        title: 'Request a custom Turkish arc',
        paragraphs: [
          'Every course can be redesigned from scratch around your brief.',
          '<a href="/#contact">Request your date</a> with guest count and location.',
        ],
      },
    ],
    'Turkish private chef menus at home'
  ),

  'french-cuisine-private-dinner': article(
    [
      'A <strong>French private chef dinner</strong> is about clarity: stocks reduced with patience, proteins rested correctly, sauces that shine without heaviness, desserts that finish clean. At home that discipline reads as calm luxury.',
      'Chef Siler’s background includes pastry-forward French environments and mentorship under MOF-level craftsmen — techniques that inform private tables.',
    ],
    [
      {
        title: 'Tasting menu or shorter gala arc',
        paragraphs: [
          'We can run a compact four-course anniversary menu or a longer entertaining arc depending on your evening.',
          'Vegetarian French courses receive the same rigor as protein-centered plates.',
        ],
      },
      {
        title: 'Sauce work and timing at home',
        paragraphs: [
          'Home burners and ovens limit simultaneous sauces; we prioritize what must be finished à la minute vs. what can be held professionally.',
          'That planning is why French menus feel effortless to guests when they were anything but backstage.',
        ],
      },
      {
        title: 'Pastry and dessert finisher',
        paragraphs: [
          'French dinners often end with texture contrast — not supermarket sweetness. Chocolate, fruit, or lighter finisher depending on your preference.',
          'Tell us if you are pouring dessert wine or coffee so pacing matches.',
        ],
      },
      {
        title: 'Wine-friendly structure',
        paragraphs: [
          'Classical arcs leave room for champagne opening, white with fish, red with meat — share your case when you inquire.',
          'We avoid menu choices that fight tannic reds if you already committed to a bold bottle.',
        ],
      },
      {
        title: 'Book a French direction at home',
        paragraphs: [
          'Open <a href="/#cuisines">French sample menus</a>, then hold your date when ready to personalize.',
          'Reno, Lake Tahoe, and Bay Area travel for qualified events.',
        ],
      },
    ],
    'French private chef dinners'
  ),

  'italian-private-chef-menu': article(
    [
      '<strong>Italian private chef menus</strong> fail when everything lands at once. Sequence matters: pasta al dente, fish or meat with space to breathe, contorni that support, sauces that cling instead of pool.',
      'Italian private dining should feel warm, not weighed down — portion rhythm and cheese placement keep guests ready for dessert.',
    ],
    [
      {
        title: 'Regional cues, one coherent arc',
        paragraphs: [
          'Menus can lean northern butter-and-risotto warmth or southern brightness; structure stays conversational.',
          'Family-style mains work for larger tables when prep supports simultaneous plating.',
        ],
      },
      {
        title: 'Pasta timing at home',
        paragraphs: [
          'Fresh and dried pasta need different water chemistry and pan finishing. We build sauces to receive pasta so starch emulsifies and plates stay glossy.',
          'Pre-cooked pasta held too long is a common home mistake — we plan around that explicitly.',
        ],
      },
      {
        title: 'Seafood, meat, and contorni',
        paragraphs: [
          'Italian menus are not only pasta. Grilled fish, braised meat, and seasonal vegetables can anchor the story.',
          'Tell us if you want a lighter summer arc or a winter truffle-forward direction.',
        ],
      },
      {
        title: 'Dietary adaptations',
        paragraphs: [
          'Gluten-free pasta paths, dairy-free sauces, and pescatarian menus are planned early — not improvised.',
          'Mixed tables are common; parallel courses should feel equally cared for.',
        ],
      },
      {
        title: 'Explore Italian sample sets',
        paragraphs: [
          'See <a href="/#cuisines">Italian portfolios</a> and the <a href="/gallery">gallery</a>, then share guest count and date.',
          'Custom arcs available for Reno, Tahoe, and Bay Area homes.',
        ],
      },
    ],
    'Italian private chef menus'
  ),

  'greek-mediterranean-dinner-party': article(
    [
      'A <strong>Greek and Mediterranean dinner party</strong> with a private chef favors brightness: olive oil with intent, herbs at the right moment, seafood that stays delicate, shared plates that keep the table social.',
      'Even a Reno winter dining room can feel sun-lit — citrus, yogurt, grilled vegetables, and mains that photograph well without losing restraint.',
    ],
    [
      {
        title: 'Shared plates plus a composed anchor',
        paragraphs: [
          'Mezze-style openings and shared middle courses keep conversation moving; a composed main gives the meal a clear peak.',
          'Dietary layers are planned in parallel from booking.',
        ],
      },
      {
        title: 'Seasonal produce in Northern Nevada',
        paragraphs: [
          'Winter menus lean on citrus, olives, quality oil, and fish timed carefully. Summer Tahoe decks favor lighter grills and salads that hold in mountain air.',
          'We do not pretend tomatoes are peak in January — menus stay honest and delicious.',
        ],
      },
      {
        title: 'Seafood, grill, and vegetarian paths',
        paragraphs: [
          'Pescatarian guests, gluten-free needs, and meat lovers can coexist when prep is separated intelligently.',
          'Tell us your guest mix when you inquire.',
        ],
      },
      {
        title: 'Entertaining rhythm',
        paragraphs: [
          'Mediterranean hosting is social — we pace courses so you are not stuck in the kitchen during the best conversations.',
          'Outdoor service is possible with weather backup for Tahoe properties.',
        ],
      },
      {
        title: 'View Greek sample menus',
        paragraphs: [
          'Browse <a href="/#cuisines">Greek portfolios</a> and tell us about your table when dates are set.',
          'Private chef service across Reno, Tahoe, and the Bay Area.',
        ],
      },
    ],
    'Greek and Mediterranean dinner parties'
  ),

  'middle-eastern-fusion-private-dining': article(
    [
      '<strong>Middle Eastern fusion private dining</strong> works when spice curves are controlled — heat that builds, acidity that resets, fat used with precision. Fusion is a pacing problem, not a garnish problem.',
      'Passed bites can lean Levantine while mains borrow broader global references; balance keeps conversation-friendly plates that still photograph well.',
    ],
    [
      {
        title: 'Spice level and guest comfort',
        paragraphs: [
          'We confirm heat tolerance during booking. Pickles, herb salads, and yogurt sauces give relief between richer bites.',
          'Not every guest eats spicy food daily — menus should welcome them too.',
        ],
      },
      {
        title: 'Shared tables and passing space',
        paragraphs: [
          'Fusion menus often shine family-style. We account for table size and whether platters can sit centrally without crowding glassware.',
          'Rentals for larger platters can be discussed early.',
        ],
      },
      {
        title: 'Who this menu style fits',
        paragraphs: [
          'Multicultural guest lists, engagement dinners, and hosts who want energy without formality.',
          'Also teams tired of the same steak-and-potato private dinner template.',
        ],
      },
      {
        title: 'Halal-friendly and vegetarian planning',
        paragraphs: [
          'Faith-based needs and vegetarian guests are mapped during inquiry — not at the door.',
          'See <a href="/#cuisines">Global Fusion portfolios</a> for starting flavors.',
        ],
      },
      {
        title: 'Start with your occasion brief',
        paragraphs: [
          'Tell us date, headcount, and location — we recommend format and menu direction.',
          '<a href="/#contact">Contact Siler Chef</a> to begin.',
        ],
      },
    ],
    'Middle Eastern fusion private dining'
  ),

  'holiday-private-chef-dinner': article(
    [
      'A <strong>holiday private chef dinner</strong> fixes the real Thanksgiving or Christmas problem: every dish fighting for the same oven while the host misses the toast. We sequence roasting, resting, sides, and dessert so you stay in the room.',
      'Reno and Tahoe holiday dates fill early — inquire as soon as headcount is firm.',
    ],
    [
      {
        title: 'Traditional center, upgraded execution',
        paragraphs: [
          'Honor the bird or roast you want while sauces, vegetables, and starches are timed like a restaurant line.',
          'Fully custom holiday arcs work when your table prefers prime rib, seafood, or global flavors instead of turkey.',
        ],
      },
      {
        title: 'Oven load and timing discipline',
        paragraphs: [
          'Holiday failure mode is competing dishes. We plan holds, rest times, and what can be finished on burners vs. oven.',
          'You should not baste in isolation while guests wonder where the host went.',
        ],
      },
      {
        title: 'Leftovers and second-day tables',
        paragraphs: [
          'Packaging and gentle reheating notes can be discussed if you want a relaxed follow-up meal.',
          'Tell us if disposable containers should be stocked for guests.',
        ],
      },
      {
        title: 'Multiple homes on Tahoe holidays',
        paragraphs: [
          'Families sometimes split across two rentals the same weekend — ask about coordinated menus or staggered service.',
          'Guest counts often swell beyond normal dinners; family-style may outperform plated for twenty-plus.',
        ],
      },
      {
        title: 'Hold your holiday date',
        paragraphs: [
          'Thanksgiving, Christmas, New Year, and other hosted holidays at home.',
          '<a href="/#contact">Send preferred date and headcount</a> as soon as plans firm up.',
        ],
      },
    ],
    'holiday private chef dinners'
  ),

  'rehearsal-dinner-private-chef': article(
    [
      'A <strong>rehearsal dinner with a private chef</strong> sets tone before the wedding: intimate scale, tight service, food memorable without overshadowing speeches and family introductions.',
      'Twenty guests can feel full when pacing is right — courses short enough for conversation, strong enough to remember.',
    ],
    [
      {
        title: 'Family-style vs. plated for wedding weekends',
        paragraphs: [
          'Rehearsal dinners often feel better family-style so both families mingle. Wedding day itself may be more formal — we can match each night to the energy you want.',
          'Tell us if you want heritage cuisines on the rehearsal menu.',
        ],
      },
      {
        title: 'Coordination with planners and photographers',
        paragraphs: [
          'We align course holds with planners or photographers when you have them — golden hour should not leave guests hungry for ninety minutes.',
          'Backup indoor timing for Tahoe weather is part of professional planning.',
        ],
      },
      {
        title: 'Toasts, speeches, and pacing',
        paragraphs: [
          'We build pauses where you want them — not accidental cold plates during long speeches.',
          'Dessert can wait for champagne if that matches your timeline.',
        ],
      },
      {
        title: 'Venue types we serve',
        paragraphs: [
          'Primary homes, rentals, and estates around Reno and Tahoe are common. Share gate, kitchen, and rental rules early.',
          'Bar service can be separate; we coordinate timing if cocktails run before seated dinner.',
        ],
      },
      {
        title: 'Inquire for your rehearsal date',
        paragraphs: [
          'Share date, venue type, and expected headcount.',
          'See <a href="/#services">special-occasion dining</a> for related formats.',
        ],
      },
    ],
    'rehearsal dinner private chef service'
  ),

  'chef-led-cooking-class-reno': article(
    [
      '<strong>Chef-led cooking classes in Reno</strong> work best with a clear goal: knife skills, sauce foundations, pastry tempering, or recreating a full menu together. Siler Chef offers private culinary training for small groups at home.',
      'Sessions are paced so guests cook, taste, and ask questions without feeling rushed — demonstration or hands-on depending on layout.',
    ],
    [
      {
        title: 'Demonstration vs. hands-on',
        paragraphs: [
          'Tight kitchens suit demonstration with tasting portions for everyone. Larger islands allow true hands-on participation.',
          'We recommend format after we know group size and equipment.',
        ],
      },
      {
        title: 'Group size sweet spot',
        paragraphs: [
          'Four to ten participants usually allows real instruction. Larger groups can work as demo with structured tasting stations.',
          'Corporate team events and family milestones both book classes — goals differ, pacing principles do not.',
        ],
      },
      {
        title: 'Curriculum examples',
        paragraphs: [
          'Mother sauces and pan finishing. Pasta from scratch. Pastry tempering and chocolate work. Full Turkish or French mini-menu recreation.',
          'Tell us what you want guests to leave knowing — not just what you want to eat.',
        ],
      },
      {
        title: 'Dietary needs in classes',
        paragraphs: [
          'Allergies are planned upfront like private dinners — not improvised mid-class.',
          'Classes can end with a seated meal if you want celebration after instruction.',
        ],
      },
      {
        title: 'Propose a class date',
        paragraphs: [
          'Ask about <a href="/#services">education formats</a> or propose date and group size.',
          'Based in Northern Nevada; travel considered for qualified groups.',
        ],
      },
    ],
    'chef-led cooking classes in Reno'
  ),

  'small-wedding-private-chef': article(
    [
      'A <strong>small wedding private chef</strong> reception fits micro-weddings, backyard vows, and Tahoe properties where you want restaurant-level food without venue minimums. Guest counts under fifty are a sweet spot for chef-led precision.',
      'Choreography matters: ceremony overlap, photo windows, and meals that do not leave guests hungry during long golden-hour gaps.',
    ],
    [
      {
        title: 'Timing with photography and planners',
        paragraphs: [
          'We align course holds with planners or photographers when you have them. Backup indoor timing if weather moves service.',
          'Passed bites can bridge long photo blocks without feeling like filler.',
        ],
      },
      {
        title: 'Plated, family-style, and hybrid reception',
        paragraphs: [
          'Plated coursed dining signals formality. Family-style encourages mingling. Hybrids are common for mixed ages.',
          'Rentals, staffing, and table layout recommendations come with honest headcount.',
        ],
      },
      {
        title: 'Bar service and non-alcoholic paths',
        paragraphs: [
          'We coordinate with bar setup if drinks are separate. Mocktails and zero-proof pairings can be part of the menu brief.',
          'Tell us if cake is external so savory pacing preserves appetite for candles.',
        ],
      },
      {
        title: 'Tahoe vs. Reno home weddings',
        paragraphs: [
          'Travel, load-in, weather backup, and rental kitchen limits are scoped upfront.',
          'Share property rules about noise, propane, and hour restrictions.',
        ],
      },
      {
        title: 'Tell us about your wedding date',
        paragraphs: [
          'Date, location, expected headcount, and service style instinct.',
          'Browse <a href="/#cuisines">cuisine portfolios</a> for flavor direction.',
        ],
      },
    ],
    'small wedding private chef receptions'
  ),

  'american-cuisine-private-chef-home': article(
    [
      '<strong>American cuisine with a private chef</strong> is heat, rest, and confident plates — premium cuts, smoke where it belongs, sides that earn space, sauces with backbone. It is not diner casual unless you want it to be.',
      'Reno and Tahoe hosts often want steakhouse energy, fire-forward weekends, or lighter coastal American depending on the crowd.',
    ],
    [
      {
        title: 'Steakhouse, smoke, and holiday roasts',
        paragraphs: [
          'Steakhouse-style plated mains with composed sides. Smoke-forward celebrations with shared platters. Holiday roasts with timed sides and dessert.',
          'Rental grills and indoor ovens are both workable when prep is built around your kitchen.',
        ],
      },
      {
        title: 'Equipment we plan around',
        paragraphs: [
          'Tell us about burners, oven size, outdoor propane, and smoker boxes on decks.',
          'Proteins rest correctly only when the timeline accounts for your gear — not an ideal restaurant pass.',
        ],
      },
      {
        title: 'Premium casual vs. formal American',
        paragraphs: [
          'Board-style steak presentations read premium casual. Plated tenderloin with reduction reads formal. Same cuisine family — different service choices.',
          'Guest count helps us recommend which lane fits.',
        ],
      },
      {
        title: 'Dietary adaptations',
        paragraphs: [
          'Gluten-free, dairy-free, and pescatarian paths are planned early.',
          'Tell us if any guests avoid red meat or need halal-friendly proteins.',
        ],
      },
      {
        title: 'Personalize your American menu',
        paragraphs: [
          'Browse <a href="/#cuisines">American sample menus</a>, then share date and guest count.',
          'Every course can be adjusted or redesigned from scratch.',
        ],
      },
    ],
    'American cuisine private chef dinners'
  ),

  'family-dinner-private-chef-guide': article(
    [
      'A <strong>family dinner with a private chef</strong> keeps generations at one table without one person missing for an hour at the stove. Shared platters, timed sides, and dessert that lands cleanly make hosting look effortless.',
      'Holiday weekends, reunions, and “everyone is in town” nights are common across Reno and Tahoe.',
    ],
    [
      {
        title: 'Mixed ages, one rhythm',
        paragraphs: [
          'Milder options for younger guests, fuller flavors for adults, allergens documented before prep.',
          'Family-style and semi-plated formats both work when agreed upfront — warmth beats chaos.',
        ],
      },
      {
        title: 'What to prep before the chef arrives',
        paragraphs: [
          'Clear counter space, empty dishwasher, and knowing which rooms are for plating keep load-in quiet.',
          'We arrive with mise en place largely complete — on-site work is finishing and service, not chopping while guests sit.',
        ],
      },
      {
        title: 'Heritage menus and neutral formats',
        paragraphs: [
          'Turkish, Italian, American, or French arcs can all fit family tone depending on your crowd.',
          'Neutral menus work when in-laws and friend groups mix — tell us the dynamic.',
        ],
      },
      {
        title: 'Leftovers and relaxed second helpings',
        paragraphs: [
          'Family-style naturally creates leftovers; packaging can be discussed if you want send-home portions.',
          'Timing for coffee and dessert respects older guests who prefer earlier finishes.',
        ],
      },
      {
        title: 'Shape your family menu',
        paragraphs: [
          'See <a href="/#services">family dinner formats</a>, then tell us headcount and date.',
          'We serve from your home kitchen with the same discipline as formal dinners.',
        ],
      },
    ],
    'family dinners with a private chef'
  ),

  'graduation-private-chef-celebration': article(
    [
      'A <strong>graduation party with a private chef</strong> needs food that keeps moving: staggered arrivals, long photo blocks, guests snacking before they sit. We build passed bites, a clear seated or buffet moment, and desserts that photograph well.',
      'Indoor and backyard Reno/Tahoe parties both need holding temps and speech-friendly pauses — planned upfront, not guessed day-of.',
    ],
    [
      {
        title: 'Sample flow for a home graduation',
        paragraphs: [
          'Many hosts choose ninety minutes of passed bites during arrival and photos, then seated main and dessert with a speech pause.',
          'Continuous buffet with hot replenishment fits larger informal crowds.',
        ],
      },
      {
        title: 'Mixed generations at one party',
        paragraphs: [
          'Richer flavors for adults with approachable sides younger guests will actually eat — without a separate kids menu unless you want one.',
          'Vegetarian and allergy paths planned in parallel.',
        ],
      },
      {
        title: 'Backyard, tent, and indoor backup',
        paragraphs: [
          'Wind and evening temperature drops affect deck service; we plan hot holding and indoor backup.',
          'Rentals for chafing or extra platters can be discussed when headcount is firm.',
        ],
      },
      {
        title: 'Content-friendly plating',
        paragraphs: [
          'Milestone parties often want photos — menus can include composed plates and shareable moments that still taste better than delivery trays.',
          'Tell us if you need a pause for cap-and-gown photos before dinner.',
        ],
      },
      {
        title: 'Send your milestone date',
        paragraphs: [
          'Location, guest count, dietary notes, and whether you prefer buffet or coursed service.',
          'Explore <a href="/gallery">celebration plating</a> for visual tone.',
        ],
      },
    ],
    'graduation parties with a private chef'
  ),
};

function normalizeHtml(html) {
  return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
}

function wordCount(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
let count = 0;
const report = [];

for (const post of data.posts) {
  const html = bodies[post.slug];
  if (!html) {
    console.warn('Missing body for', post.slug);
    continue;
  }
  post.bodyHtml = normalizeHtml(html);
  post.updated = updatedOn;
  const words = wordCount(post.bodyHtml);
  report.push({ slug: post.slug, words });
  count++;
}

writeFileSync(jsonPath, JSON.stringify(data, null, 4) + '\n', 'utf8');

const min = Math.min(...report.map((r) => r.words));
const max = Math.max(...report.map((r) => r.words));
const avg = Math.round(report.reduce((s, r) => s + r.words, 0) / report.length);

console.log(`Updated ${count} posts (updated: ${updatedOn})`);
console.log(`Words — min: ${min}, avg: ${avg}, max: ${max}`);
for (const r of report.sort((a, b) => a.words - b.words)) {
  const flag = r.words < MIN_WORDS ? ' ⚠' : '';
  console.log(`  ${r.words}\t${r.slug}${flag}`);
}
