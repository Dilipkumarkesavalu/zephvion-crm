/**
 * Curated sample data for the demo: fictional Indian client businesses of a
 * digital agency. All names, numbers and identifiers are made up.
 */

export interface SampleCity {
  city: string;
  state: string;
  stateCode: string;
  zipcode: string;
}

export const CITIES: SampleCity[] = [
  { city: "Bengaluru", state: "Karnataka", stateCode: "29", zipcode: "560034" },
  { city: "Mysuru", state: "Karnataka", stateCode: "29", zipcode: "570009" },
  { city: "Mumbai", state: "Maharashtra", stateCode: "27", zipcode: "400050" },
  { city: "Pune", state: "Maharashtra", stateCode: "27", zipcode: "411001" },
  { city: "Chennai", state: "Tamil Nadu", stateCode: "33", zipcode: "600017" },
  {
    city: "Coimbatore",
    state: "Tamil Nadu",
    stateCode: "33",
    zipcode: "641002",
  },
  { city: "Hyderabad", state: "Telangana", stateCode: "36", zipcode: "500033" },
  { city: "Kochi", state: "Kerala", stateCode: "32", zipcode: "682016" },
  { city: "New Delhi", state: "Delhi", stateCode: "07", zipcode: "110017" },
  { city: "Jaipur", state: "Rajasthan", stateCode: "08", zipcode: "302001" },
  { city: "Ahmedabad", state: "Gujarat", stateCode: "24", zipcode: "380009" },
  { city: "Kolkata", state: "West Bengal", stateCode: "19", zipcode: "700016" },
];

export interface SampleCompany {
  name: string;
  domain: string;
  sector: string;
  size: 1 | 10 | 50 | 250 | 500;
  revenue: string;
  description: string;
  street: string;
}

export const COMPANIES: SampleCompany[] = [
  {
    name: "Kaveri Organics",
    domain: "kaveriorganics.in",
    sector: "consumer-staples",
    size: 50,
    revenue: "₹12 Cr",
    street: "14, 5th Cross, Indiranagar",
    description:
      "Farm-to-home organic groceries with a subscription model across South India.",
  },
  {
    name: "Nimbus Fintech",
    domain: "nimbusfin.in",
    sector: "financials",
    size: 50,
    revenue: "₹25 Cr",
    street: "Level 3, Prestige Tower",
    description:
      "UPI-first lending platform for small retailers and kirana stores.",
  },
  {
    name: "UrbanNest Realty",
    domain: "urbannestrealty.in",
    sector: "real-estate",
    size: 10,
    revenue: "₹8 Cr",
    street: "201, Linking Road",
    description: "Boutique real-estate developer of mid-segment apartments.",
  },
  {
    name: "Saffron Table Restaurants",
    domain: "saffrontable.in",
    sector: "consumer-discretionary",
    size: 250,
    revenue: "₹40 Cr",
    street: "22, Park Street",
    description:
      "Chain of 14 regional-cuisine restaurants planning online ordering.",
  },
  {
    name: "Medhya Health Clinics",
    domain: "medhyahealth.in",
    sector: "health-care",
    size: 50,
    revenue: "₹18 Cr",
    street: "8-2-293, Road No. 12",
    description:
      "Multi-speciality clinics needing online appointments and patient follow-ups.",
  },
  {
    name: "Indus Freight Logistics",
    domain: "indusfreight.in",
    sector: "industrials",
    size: 250,
    revenue: "₹60 Cr",
    street: "Plot 31, MIDC Industrial Area",
    description: "Road freight and warehousing operator with 300+ trucks.",
  },
  {
    name: "Pragati EduTech",
    domain: "pragatiedu.in",
    sector: "communication-services",
    size: 10,
    revenue: "₹4 Cr",
    street: "3rd Floor, Anna Salai",
    description: "Online coaching for competitive exams in Tamil and English.",
  },
  {
    name: "Vayu Solar Energy",
    domain: "vayusolar.in",
    sector: "energy",
    size: 50,
    revenue: "₹30 Cr",
    street: "SG Highway, Bodakdev",
    description: "Rooftop solar installer for homes and factories.",
  },
  {
    name: "Tanvi Jewellers",
    domain: "tanvijewellers.in",
    sector: "consumer-discretionary",
    size: 10,
    revenue: "₹15 Cr",
    street: "MI Road",
    description: "Family-run jewellery brand moving into e-commerce.",
  },
  {
    name: "GreenLeaf Ayurveda",
    domain: "greenleafayurveda.in",
    sector: "health-care",
    size: 10,
    revenue: "₹6 Cr",
    street: "MG Road, Ernakulam",
    description: "Ayurvedic wellness products and resort packages.",
  },
  {
    name: "Neelgiri Tea Estates",
    domain: "neelgiritea.in",
    sector: "consumer-staples",
    size: 250,
    revenue: "₹45 Cr",
    street: "Race Course Road",
    description: "Single-estate tea producer launching a D2C brand.",
  },
  {
    name: "Orbit Coworking",
    domain: "orbitcowork.in",
    sector: "real-estate",
    size: 10,
    revenue: "₹9 Cr",
    street: "HSR Layout, Sector 2",
    description:
      "Coworking spaces in three cities with a member app in planning.",
  },
  {
    name: "PixelPlay Studios",
    domain: "pixelplay.in",
    sector: "communication-services",
    size: 10,
    revenue: "₹3 Cr",
    street: "Baner Road",
    description: "Animation and game art studio.",
  },
  {
    name: "Shakti Steel Fabricators",
    domain: "shaktisteel.in",
    sector: "materials",
    size: 250,
    revenue: "₹80 Cr",
    street: "Peenya Industrial Area",
    description: "Structural steel fabrication for infrastructure projects.",
  },
  {
    name: "Ivora Home Decor",
    domain: "ivorahome.in",
    sector: "consumer-discretionary",
    size: 10,
    revenue: "₹5 Cr",
    street: "Banjara Hills",
    description: "Handcrafted furniture and decor sold through showrooms.",
  },
  {
    name: "Mitra Legal Associates",
    domain: "mitralegal.in",
    sector: "financials",
    size: 10,
    revenue: "₹2 Cr",
    street: "Defence Colony",
    description: "Corporate law firm serving startups and SMEs.",
  },
  {
    name: "Rasoi Cloud Kitchens",
    domain: "rasoikitchens.in",
    sector: "consumer-discretionary",
    size: 50,
    revenue: "₹11 Cr",
    street: "Koramangala 6th Block",
    description: "Delivery-only kitchens running five food brands.",
  },
  {
    name: "Suryodaya Hospitals",
    domain: "suryodayahospitals.in",
    sector: "health-care",
    size: 500,
    revenue: "₹120 Cr",
    street: "Gachibowli Main Road",
    description: "300-bed hospital group digitising patient experience.",
  },
  {
    name: "Kalpa Architects",
    domain: "kalpaarchitects.in",
    sector: "industrials",
    size: 10,
    revenue: "₹2.5 Cr",
    street: "Vijayanagar",
    description: "Award-winning residential and hospitality architects.",
  },
  {
    name: "FitNation Gyms",
    domain: "fitnationgyms.in",
    sector: "consumer-discretionary",
    size: 50,
    revenue: "₹14 Cr",
    street: "Andheri West",
    description:
      "Chain of 9 gyms needing memberships and class booking online.",
  },
  {
    name: "Veda Skincare",
    domain: "vedaskincare.in",
    sector: "consumer-staples",
    size: 10,
    revenue: "₹7 Cr",
    street: "Salt Lake, Sector V",
    description: "Clean-beauty skincare brand selling on marketplaces.",
  },
  {
    name: "Chennai Auto Components",
    domain: "chennaiauto.in",
    sector: "industrials",
    size: 500,
    revenue: "₹150 Cr",
    street: "Oragadam Industrial Corridor",
    description: "Tier-2 automotive supplier modernising its dealer portal.",
  },
  {
    name: "Lotus Event Management",
    domain: "lotusevents.in",
    sector: "communication-services",
    size: 10,
    revenue: "₹4 Cr",
    street: "C-Scheme",
    description: "Destination weddings and corporate events.",
  },
  {
    name: "Trikon Infra Projects",
    domain: "trikoninfra.in",
    sector: "industrials",
    size: 250,
    revenue: "₹95 Cr",
    street: "Navrangpura",
    description: "Civil contractor for roads and municipal projects.",
  },
  {
    name: "Bloom Florist Co.",
    domain: "bloomflorist.in",
    sector: "consumer-discretionary",
    size: 1,
    revenue: "₹60 L",
    street: "Brigade Road",
    description: "Premium florist with same-day delivery.",
  },
  {
    name: "Aarohan Fintech Advisors",
    domain: "aarohanadvisors.in",
    sector: "financials",
    size: 10,
    revenue: "₹3 Cr",
    street: "Bandra Kurla Complex",
    description: "Wealth advisory firm for salaried professionals.",
  },
  {
    name: "Himalayan Trails Travel",
    domain: "himalayantrails.in",
    sector: "consumer-discretionary",
    size: 10,
    revenue: "₹6 Cr",
    street: "Hauz Khas",
    description: "Trekking and adventure travel operator.",
  },
  {
    name: "Coastal Craft Brewing",
    domain: "coastalcraft.in",
    sector: "consumer-staples",
    size: 50,
    revenue: "₹20 Cr",
    street: "Kalyani Nagar",
    description: "Craft brewery with taprooms in Pune and Goa.",
  },
];

export const MALE_FIRST_NAMES = [
  "Arjun",
  "Rahul",
  "Vikram",
  "Karthik",
  "Rohan",
  "Aditya",
  "Siddharth",
  "Nikhil",
  "Manoj",
  "Suresh",
  "Harish",
  "Pranav",
  "Varun",
  "Abhishek",
  "Imran",
  "Rajesh",
  "Deepak",
  "Anand",
  "Gautam",
  "Farhan",
];
export const FEMALE_FIRST_NAMES = [
  "Priya",
  "Ananya",
  "Sneha",
  "Kavya",
  "Divya",
  "Meera",
  "Pooja",
  "Lakshmi",
  "Nandini",
  "Aishwarya",
  "Ritu",
  "Shreya",
  "Neha",
  "Fatima",
  "Swathi",
  "Tanya",
  "Ishita",
  "Rekha",
  "Bhavana",
  "Sana",
];
export const LAST_NAMES = [
  "Sharma",
  "Iyer",
  "Reddy",
  "Nair",
  "Menon",
  "Kulkarni",
  "Patel",
  "Mehta",
  "Rao",
  "Gupta",
  "Shetty",
  "Joshi",
  "Pillai",
  "Banerjee",
  "Khan",
  "Desai",
  "Chatterjee",
  "Agarwal",
  "Krishnan",
  "Hegde",
];

export const JOB_TITLES = [
  "Founder & CEO",
  "Co-founder",
  "Managing Director",
  "Marketing Head",
  "Brand Manager",
  "Operations Manager",
  "IT Manager",
  "Head of Growth",
  "Digital Marketing Lead",
  "Purchase Manager",
  "Finance Controller",
  "Product Manager",
];

export const CONTACT_BACKGROUNDS = [
  "Met at the Bengaluru Startup Summit. Prefers WhatsApp for quick updates.",
  "Referred by an existing client. Decision maker for all digital spend.",
  "Came in through the website contact form after reading our case study.",
  "Very detail oriented, likes to see wireframes before approving budgets.",
  "Handles vendor onboarding and purchase orders.",
  "Responds fastest on email in the mornings.",
  "Long-standing relationship, worked with us on two earlier projects.",
  "Interested in a long-term retainer once the first project is live.",
];

export interface ServiceLine {
  description: string;
  hsnSac: string;
  /** Share of the deal value this line represents. */
  share: number;
}

/** Service packages quoted per deal category. */
export const SERVICE_PACKAGES: Record<string, ServiceLine[]> = {
  website: [
    {
      description: "UI/UX design – up to 12 page templates",
      hsnSac: "998314",
      share: 0.35,
    },
    {
      description: "Website development (responsive, CMS)",
      hsnSac: "998314",
      share: 0.45,
    },
    {
      description: "On-page SEO setup & analytics",
      hsnSac: "998361",
      share: 0.12,
    },
    {
      description: "Hosting, SSL & maintenance – 12 months",
      hsnSac: "998315",
      share: 0.08,
    },
  ],
  branding: [
    { description: "Brand strategy workshop", hsnSac: "998311", share: 0.25 },
    {
      description: "Logo & visual identity system",
      hsnSac: "998391",
      share: 0.5,
    },
    {
      description: "Brand guidelines & stationery",
      hsnSac: "998391",
      share: 0.25,
    },
  ],
  "digital-system": [
    {
      description: "Discovery & solution architecture",
      hsnSac: "998313",
      share: 0.15,
    },
    {
      description: "Custom web application development",
      hsnSac: "998314",
      share: 0.6,
    },
    {
      description: "Integrations (payments, WhatsApp, ERP)",
      hsnSac: "998314",
      share: 0.15,
    },
    {
      description: "Training, deployment & 3 months support",
      hsnSac: "998316",
      share: 0.1,
    },
  ],
  "mobile-app": [
    {
      description: "App UX/UI design (Android & iOS)",
      hsnSac: "998314",
      share: 0.25,
    },
    {
      description: "Cross-platform app development",
      hsnSac: "998314",
      share: 0.55,
    },
    { description: "Admin panel & APIs", hsnSac: "998314", share: 0.15 },
    {
      description: "Play Store / App Store publishing",
      hsnSac: "998316",
      share: 0.05,
    },
  ],
  marketing: [
    {
      description: "Social media management – monthly",
      hsnSac: "998361",
      share: 0.5,
    },
    {
      description: "Performance ads management – monthly",
      hsnSac: "998361",
      share: 0.3,
    },
    {
      description: "Content & creatives – 12 posts",
      hsnSac: "998391",
      share: 0.2,
    },
  ],
  consulting: [
    {
      description: "Digital audit & growth roadmap",
      hsnSac: "998311",
      share: 0.7,
    },
    {
      description: "Stakeholder workshops (2 sessions)",
      hsnSac: "998311",
      share: 0.3,
    },
  ],
  other: [{ description: "Professional services", hsnSac: "998319", share: 1 }],
};

/** Typical deal value ranges (₹) per category. */
export const DEAL_VALUE_RANGES: Record<string, [number, number]> = {
  website: [90_000, 450_000],
  branding: [60_000, 300_000],
  "digital-system": [400_000, 1_800_000],
  "mobile-app": [500_000, 2_200_000],
  marketing: [40_000, 180_000],
  consulting: [30_000, 150_000],
  other: [25_000, 100_000],
};

export const DEAL_NAMES: Record<string, string[]> = {
  website: [
    "Website redesign",
    "Corporate website",
    "E-commerce storefront",
    "Landing pages & SEO",
  ],
  branding: ["Brand refresh", "New brand identity", "Packaging & brand system"],
  "digital-system": [
    "Customer portal",
    "Booking & billing system",
    "Dealer management portal",
    "Internal operations dashboard",
  ],
  "mobile-app": ["Customer mobile app", "Member app", "Field sales app"],
  marketing: [
    "Social media retainer",
    "Performance marketing",
    "Festive campaign",
  ],
  consulting: ["Digital growth audit", "Tech roadmap consulting"],
  other: ["Photography & video shoot"],
};

export const DEAL_NOTES: Record<string, string[]> = {
  lead: [
    "Inbound enquiry from the website. Asked for a quick call this week.",
    "Shared our portfolio deck on WhatsApp, waiting for a slot.",
  ],
  discovery: [
    "Discovery call done. Their main gap is that leads come in on WhatsApp and get lost.",
    "Walked through their current site, mobile speed score is 31. Big opportunity.",
    "They want Tamil and English versions plus online booking.",
  ],
  "proposal-sent": [
    "Proposal sent with two options. They are comparing with one other agency.",
    "Founder liked the case study, finance team reviewing the payment terms.",
  ],
  "in-negociation": [
    "Asked for 10% off if we start before month end. Offered phased billing instead.",
    "Scope trimmed: blog moved to phase 2. Revised quote shared.",
  ],
  won: [
    "PO received. Kick-off scheduled for Monday, advance invoice raised.",
    "Signed! Project channel created and access to their hosting received.",
  ],
  lost: [
    "Went with an in-house team for now. Keep in touch next quarter.",
    "Budget frozen till next financial year.",
  ],
};

export const CONTACT_NOTES: string[] = [
  "Quick call: happy with the new homepage, wants the product pages next.",
  "Sent the monthly analytics report. Organic traffic up 38% month on month.",
  "Asked about adding Razorpay and UPI payments to checkout.",
  "Met at their office, toured the new showroom. Good rapport.",
  "Shared moodboards for the festive campaign, approved option B.",
  "Flagged a delay on their side: content will arrive next week.",
  "Requested a quote for a WhatsApp chatbot integration.",
  "Followed up on the pending invoice, payment promised by Friday.",
  "Introduced us to their sister company that needs a website.",
  "Reviewed the staging site together, sent a list of 6 small changes.",
  "Very positive feedback on the brand guidelines document.",
  "Discussed an annual maintenance contract after go-live.",
];

export const TASK_TEMPLATES: Array<{ type: string; text: string }> = [
  { type: "call", text: "Call to walk through the proposal" },
  { type: "email", text: "Send revised quote with phased billing" },
  { type: "follow-up", text: "Follow up on the pending invoice" },
  { type: "meeting", text: "Kick-off meeting with the project team" },
  { type: "demo", text: "Demo the staging site" },
  { type: "email", text: "Share the monthly performance report" },
  { type: "follow-up", text: "Check if content and photos are ready" },
  { type: "meeting", text: "Quarterly review and upsell discussion" },
  { type: "thank-you", text: "Send a thank-you note after go-live" },
  { type: "call", text: "Discovery call to understand requirements" },
  { type: "lunch", text: "Lunch meeting to discuss the annual retainer" },
  { type: "ship", text: "Deliver final brand assets" },
];

export const TAGS = [
  { id: 0, name: "decision-maker", color: "#cfe5fb" },
  { id: 1, name: "referral", color: "#d4f7f2" },
  { id: 2, name: "repeat-client", color: "#e2f0d9" },
  { id: 3, name: "vip", color: "#fde3cf" },
  { id: 4, name: "budget-approved", color: "#e7e0f7" },
  { id: 5, name: "event-lead", color: "#fbe0e6" },
];
