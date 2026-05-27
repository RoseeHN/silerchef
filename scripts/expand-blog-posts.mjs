#!/usr/bin/env node
/**
 * Expands blog-posts.json bodyHtml for SEO (run from repo root).
 * node scripts/expand-blog-posts.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = path.join(root, 'embed/data/blog-posts.json');
const updatedOn = '2026-05-28';

/** @type {Record<string, string>} */
const bodies = {
  'private-chef-reno-guide': `
<p>If you are searching for a <strong>private chef in Reno</strong>, you are usually planning something more personal than a restaurant reservation: a home you love, guests you actually want to see, and a menu that fits the night instead of a fixed tasting card. That is the gap chef-led in-home dining fills.</p>
<p>Siler Chef is based in Northern Nevada and serves Reno, the Truckee Meadows, and surrounding neighborhoods for private dinners, celebrations, and chef-led entertaining. Before anyone picks up a knife, we confirm guest count, service style, dietary needs, and what your kitchen can realistically support.</p>
<h2>What a Reno private chef handles for you</h2>
<p>Menu design, sourcing, prep, cooking, plating, timing, and discreet clearing — so you are not bouncing between the stove and the living room. Courses are sequenced the way they would be on a fine-dining line: hold times, rest, and sauce work are planned in advance, not improvised while guests wait.</p>
<ul>
<li><strong>Consultation:</strong> occasion, cuisine direction, allergies, and whether you want plated service or family-style sharing.</li>
<li><strong>Menu draft:</strong> sample arcs from our <a href="/#cuisines">cuisine portfolios</a>, customized to your brief.</li>
<li><strong>Day-of execution:</strong> load-in, cooking, service, and kitchen reset so the house still feels like yours afterward.</li>
</ul>
<h2>Plated dining vs. family-style at home</h2>
<p>Smaller tables and milestone nights often suit plated courses — anniversaries, client dinners, or a chef’s-table feel in your dining room. Larger groups, birthdays, and relaxed weekends often work better with shared mains and composed sides brought to the table together. Both formats are common for Reno hosts; the right choice depends on guest count and how formal you want the rhythm to feel.</p>
<h2>How far in advance to book</h2>
<p>Popular weekends, holidays, and ski-season Tahoe overlap fill early. Sharing your date, neighborhood, and headcount even before the menu is final helps us hold the calendar and advise on timing. <a href="/#contact">Send your request through the reservation form</a> and we follow up by phone, email, or WhatsApp with next steps.</p>`,

  'lake-tahoe-private-dining': `
<p><strong>Lake Tahoe private dining</strong> should feel like the view matters — not a logistics puzzle. Rentals, elevation, weather, and shared kitchens all change how a meal should be built. A private chef plans around those realities so you stay with guests instead of monitoring ovens between photo stops.</p>
<p>Siler Chef travels to Tahoe homes and vacation properties for intimate dinners, family weekends, rehearsal meals, and small celebrations. We coordinate indoor vs. deck service, equipment on site, and backup timing if wind or temperature shifts the plan.</p>
<h2>Rental kitchens and mountain timing</h2>
<p>Tahoe properties range from fully equipped chef’s kitchens to tight galley layouts. We ask about burners, oven size, refrigeration, and outdoor grill access before locking the menu. Sunset, drive time, and whether guests are arriving from skiing or the lake all influence when hot food should hit the table.</p>
<h2>Menu directions that match Tahoe weekends</h2>
<p>Some hosts want fire-and-smoke energy — premium casual plates that feel generous after a day outside. Others want a calmer plated arc: seafood, bright vegetables, and a dessert that finishes clean. Sample menus on our site are starting points; every course can be adjusted for allergies, kids at the table, or a wine you already committed to.</p>
<h2>Booking a chef for your Tahoe date</h2>
<p>Share property location (Incline, South Shore, West Shore, Truckee-side, etc.), guest count, and whether you need passed bites before a seated dinner. <a href="/#contact">Tell us about your Tahoe date</a> and we will map service flow and menu direction from there. Browse the <a href="/gallery">gallery</a> for plating tone if you are still deciding on formality.</p>`,

  'bay-area-in-home-chef': `
<p>Hiring an <strong>in-home chef in the Bay Area</strong> is often the simplest way to host well without parking stress, reservation limits, or splitting a group across two restaurant tables. You keep the room, the playlist, and the pace — with restaurant-level craft in your own dining space.</p>
<p>Siler Chef serves qualified private events in the San Francisco Bay Area in addition to Reno and Lake Tahoe. Menus are built with the same discipline used in fine-dining kitchens: intentional sourcing, prep timelines, and service cues that protect conversation.</p>
<h2>Why Bay Area hosts choose private chef service</h2>
<p>Client entertainment, birthdays, anniversaries, and multi-family gatherings all benefit when the host is not plating in the kitchen. Dietary layers — vegetarian, gluten-free, halal-friendly adaptations, or severe allergies — are mapped during booking so substitutions are designed at the recipe level, not patched at the pass.</p>
<h2>What to send when you inquire</h2>
<ul>
<li>Event date and city/neighborhood</li>
<li>Realistic guest count (including last-minute plus-ones you expect)</li>
<li>Cuisine direction or menus you liked from our <a href="/#cuisines">cuisine section</a></li>
<li>Known allergies and ingredients to avoid entirely</li>
<li>Whether you prefer plated courses, family-style, or a mix</li>
</ul>
<h2>Travel and timing</h2>
<p>Bay Area bookings include travel planning in the proposal so load-in, service length, and staffing match your address. When your date is firm, <a href="/#contact">request availability</a> and we will reply with timing and follow-up questions before you commit to a final menu.</p>`,

  'anniversary-dinner-private-chef': `
<p>An <strong>anniversary dinner with a private chef</strong> works when the night feels intentional — not like a busy restaurant on a Saturday, and not like you spent the afternoon stressing over sauce timing. The right menu arc is short enough to stay romantic, strong enough to remember.</p>
<p>We often build four movements for anniversaries: a bright opener, one interlude, a main that carries the story, and a dessert that lands softly. That can be fully plated or served family-style with composed plates — what matters is agreed pacing before guests sit down.</p>
<h2>Setting the tone: formal vs. relaxed luxury</h2>
<p>Some couples want candlelit tasting portions and quiet clearing between courses. Others want shared mains, a favorite bottle open on the table, and time for long conversation. Tell us which energy you want; we will recommend plateware, timing, and whether passed bites make sense during greeting.</p>
<h2>Wine, dietary needs, and surprises</h2>
<p>If you are pouring wine yourself, share what you are opening and we can align acidity and weight course by course. Allergies and preferences are documented during booking. Small touches — a favorite flavor from a trip, a shared heritage cuisine, or a lighter dessert — are easiest when we know early.</p>
<h2>Reserve your anniversary date</h2>
<p>Siler Chef serves Reno, Lake Tahoe, and the Bay Area for private celebrations. <a href="/#contact">Reserve your date</a> with guest count and location; we draft a direction before you commit to every course. See <a href="/#services">anniversary and special-occasion formats</a> for how we frame the evening.</p>`,

  'corporate-dinner-chef-home': `
<p>A <strong>corporate dinner at home</strong> (or at a leased residence) keeps the focus on the relationship — not on whether the server interrupted the pitch. Chef-led service times courses so conversation has natural pauses, dietary flags are handled before anyone sits, and clearing stays discreet.</p>
<p>Executive entertaining, client thank-yous, board-adjacent gatherings, and team milestones are common requests across Reno, Tahoe, and the Bay Area. Menus can stay neutral for mixed tastes or tell a deliberate cuisine story when you want the meal to signal hospitality and attention to detail.</p>
<h2>Structuring the evening for business conversation</h2>
<p>We coordinate arrival of guests, passed bites if you want a standing reception first, and when seated service begins. For many groups, a shorter coursed menu outperforms an oversized one — guests stay engaged, and the night ends on time.</p>
<ul>
<li>Passed canapés during mingling</li>
<li>Two or three seated courses instead of a long gala arc</li>
<li>Quiet clearing and reset between topics</li>
<li>Alternate plates planned for documented restrictions</li>
</ul>
<h2>Logistics hosts forget to mention</h2>
<p>Parking for load-in, kitchen access, trash and compost, and whether you need service to conclude before a hard departure time. Share those details when you <a href="/#contact">send your date, headcount, and address</a> — we will reply with timing and next steps.</p>`,

  'birthday-party-private-chef': `
<p>A <strong>birthday party with a private chef</strong> lets you celebrate in your own space without becoming the line cook for twenty people. Kids, parents, and friends can share one table while courses or shared platters arrive on a rhythm that fits speeches, cake, and photos.</p>
<p>We plan birthdays as a pacing problem first and a theme second. Allergies, vegetarian guests, and timing for candles are built into prep lists — not handled mid-service when the kitchen is already full.</p>
<h2>Formats that work for mixed guest lists</h2>
<p><strong>Seated coursed dinner</strong> for smaller groups who want a milestone feel. <strong>Family-style mains</strong> when everyone wants to graze and talk. <strong>Hybrid flow</strong> — passed bites, shared centerpiece, plated dessert — when you need flexibility for kids and adults on different schedules.</p>
<h2>Flavor and formality</h2>
<p>Playful comfort food, global cuisine, or polished fine-dining plating can all fit a birthday; structure matters more than novelty. Browse <a href="/#services">birthday and celebration formats</a> on the site, then tell us what tone you want when you inquire.</p>
<h2>Check availability</h2>
<p>Weekend dates in Reno and Tahoe fill early. <a href="/#contact">Check availability</a> with your party date, location, and realistic headcount. Sample menus on our <a href="/#cuisines">cuisine pages</a> are easy starting points for flavor direction.</p>`,

  'plated-vs-family-style-private-chef': `
<p>Choosing between <strong>plated and family-style private chef service</strong> shapes everything: formality, staffing, plateware, how long guests stay seated, and how much interaction you want from the chef at the table. Neither is “better” — the right fit depends on guest count and the story of the night.</p>
<h2>Plated service: when it shines</h2>
<p>Each course is composed individually, timed, and cleared with intention. Plated dining suits anniversaries, client dinners, smaller tables, and hosts who want pauses between courses for conversation and wine. It reads as calm luxury because the room slows down with the menu.</p>
<h2>Family-style service: when it shines</h2>
<p>Larger platters and shared sides keep the table communal. Birthdays, casual premium hosting, and groups that want movement and interaction often prefer family-style — especially when guest count makes individual plating slower without adding staff.</p>
<h2>Blended formats many hosts choose</h2>
<ul>
<li>Passed bites during arrival</li>
<li>Shared mains in the middle</li>
<li>Plated dessert to finish with focus</li>
</ul>
<p>Siler Chef serves Reno, Lake Tahoe, and the Bay Area. <a href="/#contact">Describe your guest count and vibe</a> and we will recommend a flow before you finalize courses.</p>`,

  'how-to-hire-private-chef': `
<p>Knowing <strong>how to hire a private chef</strong> saves you from vague quotes, last-minute menu panic, and the wrong service style for your guest list. Start with three facts: date, location, and realistic headcount. Everything else — staffing, rentals, menu complexity — branches from those answers.</p>
<h2>Questions worth asking before you book</h2>
<ul>
<li>How are allergies and severe restrictions documented and handled?</li>
<li>What happens if my kitchen is limited or I only have a rental setup?</li>
<li>When is the menu finalized, and how many revisions are typical?</li>
<li>Is service plated, family-style, or mixed — and what do you recommend for my guest count?</li>
<li>What is included vs. quoted separately (rentals, extra staff, premium proteins)?</li>
<li>How do travel and load-in work for Tahoe or Bay Area addresses?</li>
</ul>
<h2>What to send in your first inquiry</h2>
<p>Occasion, cuisine preferences, known dietary needs, whether you want a full coursed menu or shared tables, and the best phone number for follow-up. Photos of the kitchen are helpful for Tahoe rentals but not required for every Reno home.</p>
<h2>Working with Siler Chef</h2>
<p>We serve Reno, Lake Tahoe, and the San Francisco Bay Area for private chef dining and chef-led education. <a href="/#contact">Submit your request</a> with cuisine preferences; we follow up by phone or email with timing and next steps. Explore <a href="/#cuisines">sample menus</a> while you wait — they are starting points, not fixed packages.</p>`,

  'private-chef-dietary-restrictions': `
<p><strong>Private chef menus for allergies and dietary preferences</strong> only work when restrictions are treated as design inputs — not as a single alternate plate rushed at the end of service. Mixed tables are normal; the goal is parallel courses that feel equal in care.</p>
<h2>How we document restrictions</h2>
<p>During booking we capture allergens, severity, faith-based needs, vegetarian or vegan guests, and ingredients to avoid entirely. That information flows into prep lists, separate boards where needed, and service timing so cross-contact risk stays low.</p>
<h2>Common adaptations we plan for</h2>
<ul>
<li>Gluten-free paths with dedicated fry/sauce steps where required</li>
<li>Dairy-free sauces and desserts that still feel finished, not “without”</li>
<li>Vegetarian courses with the same rigor as protein-centered plates</li>
<li>Halal-friendly or pork-free menus when the whole table needs alignment</li>
</ul>
<h2>Start with clarity</h2>
<p>When you <a href="/#contact\">send your request</a>, include severity notes (for example airborne nut exposure vs. preference). Sample <a href="/#cuisines\">cuisine portfolios</a> show flavor families we can adapt. Serving Reno, Tahoe, and the Bay Area.</p>`,

  'private-chef-vs-catering': `
<p>Understanding <strong>private chef vs. catering</strong> helps you pick the right experience before you commit budget and guest expectations. Catering often optimizes for volume and hold times; chef-led service optimizes for finish, heat, and sequence — food meant to be eaten now.</p>
<h2>When catering may be enough</h2>
<p>Long open-house formats, self-serve buffets that stay up for hours, or events where food is secondary to logistics sometimes fit traditional catering. If guests are comfortable serving themselves from chafers, that can be the practical choice.</p>
<h2>When a private chef is the better match</h2>
<p>You want courses timed like a restaurant table moved into your home: composed plates, quiet clearing, dietary paths planned in advance, and a host who stays in the room. That is the pass mindset we bring — sourcing, prep, plating, and service rhythm included.</p>
<h2>Honest guidance</h2>
<p>We will tell you if your brief fits chef-led dining or if another format makes more sense. <a href="/#contact\">Share your occasion</a>, guest count, and location (Reno, Tahoe, or Bay Area) and we will recommend a direction.</p>`,

  'private-chef-cost-factors': `
<p><strong>Private chef pricing</strong> follows labor, ingredients, and logistics — not a one-size sticker that ignores travel, menu depth, or how many guests you actually have. Transparent factors help you compare proposals fairly.</p>
<h2>What typically moves the quote</h2>
<ul>
<li><strong>Guest count:</strong> plate volume, staffing, and timeline</li>
<li><strong>Menu complexity:</strong> prep days, pastry work, premium proteins</li>
<li><strong>Service style:</strong> plated multi-course vs. family-style vs. passed bites + seated</li>
<li><strong>Travel:</strong> Tahoe, Bay Area, or outside core Reno scheduling</li>
<li><strong>Rentals and support:</strong> extra servers, plateware, outdoor setup</li>
<li><strong>Event length:</strong> reception plus dinner vs. dinner only</li>
</ul>
<h2>Why we do not publish a single per-head rate online</h2>
<p>Tables vary too much — a twelve-guest plated anniversary is not the same labor as a forty-guest backyard celebration with shared mains. We prefer a tailored follow-up after we know date, location, and headcount.</p>
<h2>Request a tailored conversation</h2>
<p><a href="/#contact\">Send your date, location, and guest count</a>. We will reply with timing, questions, and next steps — serving Reno, Lake Tahoe, and the Bay Area.</p>`,

  'wine-pairing-private-dinner': `
<p><strong>Wine pairing for a private chef dinner</strong> does not require a cellar — it requires matching weight, acidity, and rhythm to the menu you are actually serving. At home you can pause between courses, revisit a bottle, and adjust without a sommelier standing over the table.</p>
<h2>Simple frameworks that work</h2>
<p><strong>Match weight:</strong> lighter wines with seafood and vegetable-forward courses; fuller reds with braised, grilled, or sauced mains. <strong>Use acidity</strong> to refresh rich sauces. <strong>Use sweetness carefully</strong> with spice or smoky heat — a little goes a long way.</p>
<h2>How we collaborate on pairings</h2>
<p>If you already own the bottles, tell us what you are opening and we can note suggestions per course. If you prefer flexibility, we keep the menu balanced for a mixed case — sparkling with opener, white or rosé with fish, red with meat, dessert wine or coffee with the finish.</p>
<h2>Plan the menu first</h2>
<p>Browse <a href="/#cuisines\">sample menus</a> for flavor families, then <a href="/#contact\">book a conversation</a> about your guests and bottles. Private chef service in Reno, Tahoe, and the Bay Area.</p>`,

  'turkish-cuisine-private-chef': `
<p><strong>Turkish cuisine at home</strong> with a private chef should respect mezze pacing: small bright openings, shared warmth in the middle, and a main that earns its place. Siler Chef draws on Istanbul fine-dining training — pastry discipline, grill work, and yogurt-based sauces — adapted to your kitchen and guest mix.</p>
<h2>What guests recognize on the table</h2>
<p>Balance of acid and fat, bread that matters, vegetables with intent, and spice curves that build instead of shouting. We translate Ottoman and Anatolian references into modern plating that still feels generous for American home entertaining.</p>
<h2>Reno and Tahoe gatherings</h2>
<p>Turkish menus work for birthdays, family weekends, and cultural celebrations when you want something distinct from standard steak-or-pasta private dining. Dietary paths can be planned in parallel from the start.</p>
<h2>Explore Turkish sample menus</h2>
<p>See the <a href="/#cuisines\">Turkish portfolio</a> for three sample arcs, then <a href="/#contact\">request a custom menu</a> for your date. Every course can be redesigned from scratch around your brief.</p>`,

  'french-cuisine-private-dinner': `
<p>A <strong>French private chef dinner</strong> is about clarity: stocks reduced with patience, proteins rested correctly, sauces that shine without heaviness, and desserts that finish clean. At home that discipline reads as calm luxury — not fussy theater.</p>
<p>Chef Siler’s training includes years in pastry-forward French environments and mentorship under MOF-level craftsmen — techniques that inform how we handle sauce work, timing, and presentation for private tables.</p>
<h2>Tasting menu or shorter gala arc</h2>
<p>We can run a compact four-course anniversary menu or a longer entertaining arc depending on your evening. Vegetarian French courses are built with the same rigor as protein-centered plates.</p>
<h2>Book a French direction at home</h2>
<p>Open the <a href="/#cuisines\">French sample menus</a>, then <a href="/#contact\">hold your date</a> when you are ready to personalize. Serving Reno, Lake Tahoe, and the Bay Area.</p>`,

  'italian-private-chef-menu': `
<p><strong>Italian private chef menus</strong> fail when everything lands at once. The point is sequence: pasta al dente, fish or meat with space to breathe, contorni that support instead of compete, and sauces that cling instead of pool.</p>
<h2>Regional cues, one coherent arc</h2>
<p>Menus can lean northern butter-and-risotto warmth or southern brightness — structure stays conversational. Family-style mains work for larger tables when prep supports simultaneous plating; smaller groups often prefer plated pasta and a composed secondo.</p>
<h2>Entertaining at home without heaviness</h2>
<p>Italian private dining should feel warm, not weighed down. We plan portion rhythm and cheese placement so guests still want dessert.</p>
<h2>Start with sample sets</h2>
<p>Explore <a href="/#cuisines\">Italian sample menus</a> or the <a href="/gallery">gallery</a> for visual tone, then <a href="/#contact\">share your guest count</a> and date.</p>`,

  'greek-mediterranean-dinner-party': `
<p>A <strong>Greek and Mediterranean dinner party</strong> with a private chef favors brightness: olive oil with intent, herbs at the right moment, seafood that stays delicate, and shared plates that keep the table social.</p>
<p>Even in a Reno winter dining room, the menu can feel sun-lit — citrus, yogurt, grilled vegetables, and mains that photograph well without losing restraint.</p>
<h2>Shared plates plus a composed anchor</h2>
<p>We often anchor the middle with shareable mezze-style plates, then land a composed main so the meal still has a clear peak. Dietary layers are common; we plan vegetarian and pescatarian paths in parallel from booking.</p>
<h2>Plan your table</h2>
<p>View <a href="/#cuisines\">Greek sample menus</a> and <a href="/#contact\">tell us about your occasion</a> when dates are set. Tahoe, Bay Area, and Reno service available.</p>`,

  'middle-eastern-fusion-private-dining': `
<p><strong>Middle Eastern fusion private dining</strong> works when spice curves are controlled — heat that builds, acidity that resets, fat used with precision. Fusion is a pacing problem, not a garnish problem.</p>
<p>Passed bites can lean Levantine while mains borrow broader global references; the thread is balance and shareability for conversation-heavy tables.</p>
<h2>Who this menu style fits</h2>
<p>Hosts who want food that photographs well but still feels easy to eat, multicultural guest lists, and evenings where people move between living room and table.</p>
<h2>See fusion portfolios</h2>
<p>Browse <a href="/#cuisines\">Global Fusion and Middle Eastern sample menus</a>, then <a href="/#contact\">start with your occasion brief</a>. Custom arcs available for Reno, Tahoe, and Bay Area homes.</p>`,

  'holiday-private-chef-dinner': `
<p>A <strong>holiday private chef dinner</strong> solves the real Thanksgiving or Christmas problem: every dish fighting for the same oven while the host misses the toast. We sequence roasting, resting, sides, and dessert so you stay in the room.</p>
<h2>Traditional center, upgraded execution</h2>
<p>Honor the bird or roast you want as the centerpiece while sauces, vegetables, and starch courses are timed like a restaurant line. Or design a fully custom holiday arc if your table prefers prime rib, seafood, or global flavors.</p>
<h2>Leftovers and second-day tables</h2>
<p>Packaging and gentle reheating notes can be discussed if you want a relaxed follow-up meal. Holiday dates across Reno and Tahoe fill early — share headcount as soon as plans firm up.</p>
<h2>Hold your holiday date</h2>
<p><a href="/#contact\">Send your preferred date and guest count</a>. We serve Thanksgiving, Christmas, New Year, and other hosted holidays at home.</p>`,

  'rehearsal-dinner-private-chef': `
<p>A <strong>rehearsal dinner with a private chef</strong> sets the tone before the wedding: intimate scale, tight service, and food strong enough to remember without stealing focus from speeches and family introductions.</p>
<p>Twenty guests can feel like a full room when pacing is right — courses short enough for conversation, clear timing for toasts, and menus that nod to family heritage or stay neutral for mixed tastes.</p>
<h2>Coordination with your timeline</h2>
<p>We align holds with planners or photographers when you have them, and build backup timing if weather moves Tahoe service indoors. House, rental, and estate properties are all common.</p>
<h2>Inquire for Tahoe or Reno</h2>
<p><a href="/#contact\">Share your date and venue type</a> — we map service style and menu direction from there. See <a href="/#services\">special-occasion dining</a> for related formats.</p>`,

  'chef-led-cooking-class-reno': `
<p><strong>Chef-led cooking classes in Reno</strong> work best with a clear goal: knife skills, sauce foundations, pastry tempering, or recreating a full menu together. Siler Chef offers private culinary training for small groups — paced so guests cook, taste, and ask questions without feeling rushed.</p>
<h2>Demonstration vs. hands-on</h2>
<p>Kitchen layout and group size determine format. Demonstration-heavy sessions suit larger living rooms; hands-on works when counters and burners can be shared safely.</p>
<h2>Same dietary discipline as private dinners</h2>
<p>Allergies and preferences are planned upfront — not improvised mid-class. Education sessions can pair with a seated meal afterward for birthdays or team events.</p>
<h2>Propose a class date</h2>
<p>Ask about <a href="/#services\">education formats</a> or <a href="/#contact\">propose a date and group size</a>. Based in Northern Nevada; travel considered for qualified groups.</p>`,

  'small-wedding-private-chef': `
<p>A <strong>small wedding private chef</strong> reception fits micro-weddings, backyard vows, and Tahoe properties where you want restaurant-level food without venue minimums. Guest counts under fifty are a sweet spot for chef-led precision.</p>
<h2>Choreography guests feel but do not notice</h2>
<p>Ceremony overlap, golden-hour photos, and long gaps between “I do” and dinner are planned for. We hold courses when you need flexibility, then resume service when the room is ready — including backup timing if weather moves everything indoors.</p>
<h2>Menu and service style</h2>
<p>Plated coursed dining, family-style sharing, or passed bites plus seated mains — we recommend a flow based on guest count, rentals, and whether you have a planner coordinating the night.</p>
<h2>Tell us about your wedding date</h2>
<p><a href="/#contact\">Share date, location, and expected headcount</a>. Browse <a href="/#cuisines\">cuisine portfolios</a> for flavor direction. Reno, Lake Tahoe, and Bay Area travel available for qualified events.</p>`,

  'american-cuisine-private-chef-home': `
<p><strong>American cuisine with a private chef</strong> is not diner casual — it is heat, rest, and confident plates: premium cuts, smoke where it belongs, sides that earn space, and sauces with backbone.</p>
<p>Reno and Tahoe hosts often want steakhouse energy, fire-forward weekend menus, or lighter coastal American depending on the crowd. Rental grills and indoor ovens are both workable when prep is built around your kitchen.</p>
<h2>Directions we build often</h2>
<ul>
<li>Steakhouse-style plated mains with composed sides</li>
<li>Smoke-forward celebrations with shared platters</li>
<li>Holiday roasts with timed sides and dessert</li>
</ul>
<h2>Personalize your menu</h2>
<p>Browse <a href="/#cuisines\">American sample menus</a>, then <a href="/#contact\">share your date and guest count</a>. Every course can be adjusted for dietary needs or redesigned from scratch.</p>`,

  'family-dinner-private-chef-guide': `
<p>A <strong>family dinner with a private chef</strong> keeps generations at the same table without one person missing for an hour at the stove. Shared platters, timed sides, and a dessert that lands cleanly make the host look effortless.</p>
<h2>Mixed ages, one rhythm</h2>
<p>Milder options for younger guests, fuller flavors for adults, allergens documented before prep — family-style and semi-plated formats both work when agreed upfront. The goal is warmth, not chaos.</p>
<h2>When families book us</h2>
<p>Holiday weekends, reunions, pre-wedding gatherings, and “everyone is in town” nights across Reno and Tahoe. We serve from your home kitchen with the same timing discipline as formal dinners.</p>
<h2>Shape your menu</h2>
<p>See <a href="/#services\">family dinner formats</a>, then <a href="/#contact\">tell us headcount and date</a>.</p>`,

  'graduation-private-chef-celebration': `
<p>A <strong>graduation party with a private chef</strong> needs food that keeps moving: staggered arrivals, long photo blocks, guests snacking before they sit. We build strong passed bites, a clear seated or buffet moment, and desserts that photograph well.</p>
<h2>Indoor and backyard Reno/Tahoe parties</h2>
<p>Holding temps, rentals, and speech-friendly pauses between courses are part of planning — not day-of guesses. Mixed guest lists get flexible menus with vegetarian paths planned early.</p>
<h2>Send your milestone date</h2>
<p><a href="/#contact\">Share location, guest count, and dietary notes</a> when your date is set. We reply with timing and menu direction. Explore <a href="/gallery">celebration plating</a> for visual tone.</p>`,
};

/** Extra sections for depth (unique per slug — avoids duplicate SEO blocks). */
/** @type {Record<string, string>} */
const supplemental = {
  'graduation-private-chef-celebration': `<h2>Sample flow for a home graduation party</h2><p>Many hosts choose a 90-minute window of passed bites while guests arrive and photos happen, followed by a seated main and dessert that can pause for speeches. We can also design a continuous buffet with hot replenishment if your crowd is larger and informal.</p><p>If parents and grandparents are on the guest list, we balance richer flavors for adults with approachable sides younger guests will actually eat — without running a separate “kids menu” unless you want one.</p>`,
  'family-dinner-private-chef-guide': `<h2>What to prep before the chef arrives</h2><p>Clear counter space, an empty dishwasher, and knowing which rooms you want used for plating help load-in stay quiet. We arrive with mise en place largely complete so on-site work is finishing, assembly, and service — not chopping twelve onions while guests are already seated.</p>`,
  'american-cuisine-private-chef-home': `<h2>Equipment we plan around</h2><p>Home ovens, standard burners, outdoor propane grills, and smoker boxes on Tahoe decks all change timing. Tell us what you have; we adjust the menu so proteins rest correctly and sides hit the table hot.</p>`,
  'middle-eastern-fusion-private-dining': `<h2>Spice level and guest comfort</h2><p>We confirm heat tolerance during booking. Bright pickles, herb salads, and yogurt-based sauces give guests relief between richer bites — especially helpful when not everyone at the table eats spicy food daily.</p>`,
  'greek-mediterranean-dinner-party': `<h2>Seasonal produce in Northern Nevada</h2><p>Winter dinners can still feel Mediterranean through citrus, olives, quality olive oil, and fish timed carefully. Summer Tahoe decks favor lighter grills and salads that hold well in mountain air.</p>`,
  'italian-private-chef-menu': `<h2>Pasta timing at home</h2><p>Fresh and dried pasta need different water chemistry and finishing in the pan. We build sauces to receive pasta — not the reverse — so starch emulsifies correctly and plates stay glossy.</p>`,
  'french-cuisine-private-dinner': `<h2>Pastry and dessert on the same night</h2><p>Because pastry is a core strength, French menus often end with something that showcases tempering and texture — not supermarket sweetness. Tell us if you prefer chocolate, fruit, or a lighter finisher.</p>`,
  'turkish-cuisine-private-chef': `<h2>Bread, grill, and mezze on one timeline</h2><p>Multiple hot elements compete for attention; we sequence ovens and burners so bread, grilled proteins, and cold mezze arrive in the right order — warm where it matters, cool where refreshment matters.</p>`,
  'wine-pairing-private-dinner': `<h2>When guests bring bottles</h2><p>Mixed cases are normal. We can stagger courses so lighter wines appear before heavier reds, and keep one course flexible if a guest opens something unexpected.</p>`,
  'private-chef-cost-factors': `<h2>Deposits and date holds</h2><p>Peak weekends and holiday weeks may require a deposit to hold the calendar. Your proposal outlines what is included so you can compare chef-led service to catering quotes fairly.</p>`,
  'private-chef-vs-catering': `<h2>Cleanup and reset</h2><p>Chef-led service includes kitchen reset agreed in advance — not trays left for you at midnight. Scope is confirmed during booking so expectations match the night.</p>`,
  'private-chef-dietary-restrictions': `<h2>When the whole table shares one restriction</h2><p>If every guest is gluten-free or pork-free, the menu is built as one arc. If only one guest has a severe allergy, we often design parallel prep paths rather than isolating one plate at the last second.</p>`,
  'plated-vs-family-style-private-chef': `<h2>Staffing and rentals</h2><p>Plated service for more than twelve guests may benefit from an additional server; family-style can reduce staff but needs larger platters and passing space. We mention this early so rentals are ordered once.</p>`,
  'corporate-dinner-chef-home': `<h2>Privacy and discretion</h2><p>Client dinners often need low-key arrival and minimal branding. We dress for residential service and keep conversation with guests about food only when you prefer — not table-side sales talk.</p>`,
  'chef-led-cooking-class-reno': `<h2>Group size sweet spot</h2><p>Four to ten participants usually allows real hands-on time. Larger groups can work as demonstration with tasting portions for everyone.</p>`,
  'rehearsal-dinner-private-chef': `<h2>Family-style vs. plated for wedding weekends</h2><p>Rehearsal dinners often feel better family-style so both families mingle; wedding day itself may be more formal. We can match each night to the energy you want.</p>`,
  'holiday-private-chef-dinner': `<h2>Multiple homes or guest houses</h2><p>Tahoe holidays sometimes split families across two rentals. Ask about coordinated menus or staggered service if you are hosting across properties the same weekend.</p>`,
  'birthday-party-private-chef': `<h2>Cake and dessert timing</h2><p>If you are bringing a celebration cake, tell us when candles should happen — we pace the savory menu so guests still have appetite and energy for the moment.</p>`,
  'small-wedding-private-chef': `<h2>Bar service and non-alcoholic paths</h2><p>We coordinate with your bar setup if drinks are separate. Sparkling mocktails and zero-proof pairings can be part of the menu brief when guests do not drink alcohol.</p>`,
  'private-chef-reno-guide': `<h2>Neighborhoods and travel we serve from Reno</h2><p>Beyond central Reno, we regularly serve Spanish Springs, South Meadows, Somersett, Galena, and Tahoe-bound homes when the calendar allows. Mention your ZIP or cross streets in the inquiry so travel is quoted accurately.</p>`,
  'lake-tahoe-private-dining': `<h2>Parking and load-in at rentals</h2><p>Steep driveways, HOA quiet hours, and limited kitchen parking affect arrival time. Share gate codes, bear-box rules, and whether gear must come through a garage — we plan load-in so guests are not watching boxes cross the living room during cocktails.</p>`,
  'bay-area-in-home-chef': `<h2>Parking, elevators, and building access</h2><p>Urban condos need elevator reservations and quiet-hour awareness. Suburban homes may need driveway space for temperature-controlled load-in. Include access notes in your first message to avoid delays.</p>`,
  'anniversary-dinner-private-chef': `<h2>Music, lighting, and table setup</h2><p>We coordinate with your timeline — when candles are lit, when you want the main to land, and whether you prefer the kitchen closed off. Small floral or rental plateware choices can be discussed once the menu arc is set.</p>`,
  'how-to-hire-private-chef': `<h2>Contracts and cancellation</h2><p>Ask any chef you hire about weather policies for outdoor Tahoe service, illness backup, and how guest-count changes affect price. Clarity upfront prevents awkward conversations the week of the event.</p>`,
};

const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
let count = 0;
for (const post of data.posts) {
  const html = bodies[post.slug];
  if (!html) {
    console.warn('Missing body for', post.slug);
    continue;
  }
  let combined = html;
  if (supplemental[post.slug]) {
    combined += supplemental[post.slug];
  }
  post.bodyHtml = combined.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
  post.updated = updatedOn;
  count++;
}
writeFileSync(jsonPath, JSON.stringify(data, null, 4) + '\n', 'utf8');
console.log(`Updated ${count} posts (updated: ${updatedOn})`);
