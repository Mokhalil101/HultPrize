/* Startup Tycoon — local game content. No external APIs. */
(function (g) {
  const O = (t, cost, risk, score, fx, why, extra) => Object.assign({ t, cost, risk, score, fx, why }, extra || {});
  const Dc = (id, ch, title, scenario, related, options) => ({ id, ch, title, scenario, related, options });
  const E = (id, title, text, when, opts) => ({ id, title, text, when: when || {}, options: opts.map(o => ({ t: o[0], cash: o[1], fx: o[2] || {}, why: o[3], delayed: o[4] })) });

  const DIFFICULTY = {
    easy: { id: "easy", name: "Easy", capital: 150000, sev: 0.7, eventChance: 0.45, label: "Low event severity" },
    normal: { id: "normal", name: "Normal", capital: 100000, sev: 1, eventChance: 0.6, label: "Medium event severity" },
    hard: { id: "hard", name: "Hard", capital: 70000, sev: 1.3, eventChance: 0.75, label: "High event severity" }
  };

  const CHALLENGES = [
    {
      id: "food-security", name: "Food Security & Waste", icon: "🌾", noun: "food waste and hunger", difficulty: "medium",
      description: "A large share of food is lost between farm and fork while many families struggle to eat well. Reduce waste and improve access to food.",
      beneficiaries: "Low-income families, small restaurants, farmers and grocers",
      market: "Every grocer, restaurant and household is a potential partner. Margins are thin, volumes are huge.",
      research: "Surplus is concentrated in bakeries, hotels and wholesale markets; logistics (cold chain, pickup times) is the main bottleneck.",
      directions: ["Food Redistribution Platform", "Smart Food Expiration System", "AI Food Waste Prediction", "Surplus Food Marketplace"],
      metrics: { people: "People with improved food access", extra: "Food saved (kg)", extraPerPerson: 3.2 },
      benFactor: 12, impactCost: 40, startingBonus: { reputation: 5 }, availableModels: ["marketplace", "commission", "subscription"]
    },
    {
      id: "quality-education", name: "Quality Education", icon: "📚", noun: "unequal access to learning", difficulty: "medium",
      description: "Many students lack access to good teachers, materials and personalised support. Improve access to learning opportunities.",
      beneficiaries: "Students, parents, teachers and community schools",
      market: "Parents already pay for tutoring. Schools and NGOs buy tools at scale but sales cycles are slow.",
      research: "Students value affordable, Arabic-friendly content that works on low-end phones and weak connections.",
      directions: ["Digital Learning Platform", "AI Personalized Learning", "Affordable Education Marketplace", "Educational Accessibility Tools"],
      metrics: { people: "Students reached", extra: "Learning hours delivered", extraPerPerson: 18 },
      benFactor: 25, impactCost: 30, startingBonus: { innovation: 5 }, availableModels: ["freemium", "subscription", "b2b"]
    },
    {
      id: "clean-water", name: "Clean Water", icon: "💧", noun: "unsafe and wasted water", difficulty: "hard",
      description: "Millions lack reliable safe water, and leaks and overuse waste what exists. Improve access to clean water and cut waste.",
      beneficiaries: "Rural households, farmers, municipalities and schools",
      market: "Municipalities and utilities are big buyers; households buy filters when trust is built.",
      research: "Hardware costs are real and maintenance is the hidden problem: devices fail without local technicians.",
      directions: ["Smart Water Monitoring", "Affordable Filtration Systems", "Water Leak Detection", "Water Management Platforms"],
      metrics: { people: "People with safer water", extra: "Water saved (litres)", extraPerPerson: 900 },
      benFactor: 8, impactCost: 55, startingBonus: { research: 5 }, availableModels: ["direct", "b2b", "subscription"]
    },
    {
      id: "clean-energy", name: "Clean Energy", icon: "☀️", noun: "expensive and polluting energy", difficulty: "medium",
      description: "Energy costs rise while solar potential is huge. Improve access to renewable energy and energy efficiency.",
      beneficiaries: "Households, small factories, shops and farms",
      market: "Rising electricity prices create demand; upfront cost is the barrier customers mention first.",
      research: "Financing (pay-as-you-go, leasing) unlocks adoption far more than better technology.",
      directions: ["Solar Energy Marketplace", "Smart Energy Monitoring", "Renewable Energy Management", "Energy Optimization Systems"],
      metrics: { people: "People with cleaner energy", extra: "CO2 avoided (kg)", extraPerPerson: 120 },
      benFactor: 10, impactCost: 50, startingBonus: { sustainability: 5 }, availableModels: ["marketplace", "direct", "subscription"]
    },
    {
      id: "accessible-healthcare", name: "Accessible Healthcare", icon: "🩺", noun: "limited access to healthcare", difficulty: "hard",
      description: "Distance, cost and long queues keep many people from seeing a doctor. Improve access to healthcare services.",
      beneficiaries: "Rural patients, elderly people, clinics and pharmacies",
      market: "Clinics need patients and scheduling help; patients need trust and affordability.",
      research: "Trust and regulation shape everything: patients want a real doctor, and health data must be protected.",
      directions: ["Telemedicine Platform", "Healthcare Access Marketplace", "Medical Appointment Management", "Rural Healthcare Solutions"],
      metrics: { people: "Patients served", extra: "Clinic visits avoided", extraPerPerson: 0.6 },
      benFactor: 15, impactCost: 60, startingBonus: { reputation: 3, research: 3 }, availableModels: ["commission", "marketplace", "b2b"]
    }
  ];

  const MODELS = [
    { id: "subscription", name: "Subscription", icon: "🔁", arpu: 290, cac: 260, varCost: 40, opCost: 800, scal: 75, credit: 0, accDiff: "Medium", desc: "Customers pay a recurring fee. Predictable revenue, but churn punishes poor quality.", revenue: "Recurring monthly", costs: "Moderate", acquisition: "Medium" },
    { id: "freemium", name: "Freemium", icon: "🎁", arpu: 110, cac: 110, varCost: 22, opCost: 600, scal: 85, credit: 0, accDiff: "Easy", desc: "Free for most people, paid for a few. Great for reach and impact, slow on revenue.", revenue: "Low per user", costs: "Low-moderate", acquisition: "Easy" },
    { id: "commission", name: "Commission-Based", icon: "🤝", arpu: 240, cac: 240, varCost: 25, opCost: 700, scal: 70, credit: 0, accDiff: "Medium", desc: "You earn a cut of each transaction you enable. Revenue grows only when your users succeed.", revenue: "Per transaction", costs: "Low", acquisition: "Medium" },
    { id: "direct", name: "Direct Sales", icon: "🛒", arpu: 530, cac: 380, varCost: 190, opCost: 1200, scal: 45, credit: 0.2, accDiff: "Hard", desc: "You sell products straight to customers. High revenue per sale, but heavy inventory and delivery costs.", revenue: "One-off, high ticket", costs: "High", acquisition: "Hard" },
    { id: "b2b", name: "B2B Contracts", icon: "🏢", arpu: 2400, cac: 1300, varCost: 450, opCost: 1500, scal: 55, credit: 0.5, accDiff: "Hard", desc: "Few big customers on contracts. Large revenue, long sales cycles and customers who pay late.", revenue: "Large contracts, paid late", costs: "Moderate-high", acquisition: "Hard" },
    { id: "marketplace", name: "Marketplace", icon: "🧺", arpu: 210, cac: 200, varCost: 30, opCost: 900, scal: 90, credit: 0, accDiff: "Hard", desc: "You connect buyers and sellers. Huge scale potential, but you must attract both sides.", revenue: "Take rate", costs: "Moderate", acquisition: "Hard (two sides)" }
  ];

  const ROLES = [
    { id: "engineer", name: "Software Engineer", icon: "💻", hire: 2000, salary: 3200, key: "eng", skills: ["Coding", "Automation"], productivity: "+20% product development efficiency", bonus: 0.2 },
    { id: "marketer", name: "Marketing Specialist", icon: "📣", hire: 1500, salary: 2400, key: "mkt", skills: ["Campaigns", "Branding"], productivity: "+25% customer acquisition", bonus: 0.25 },
    { id: "analyst", name: "Business Analyst", icon: "📊", hire: 1800, salary: 2700, key: "analyst", skills: ["Research", "Strategy"], productivity: "+30% research output", bonus: 0.3 },
    { id: "ops", name: "Operations Manager", icon: "⚙️", hire: 1800, salary: 2700, key: "ops", skills: ["Logistics", "Process"], productivity: "+5 satisfaction, smoother scaling", bonus: 0.1 },
    { id: "sales", name: "Sales Executive", icon: "🤝", hire: 1500, salary: 2500, key: "sales", skills: ["Negotiation", "Closing"], productivity: "+12% revenue per customer", bonus: 0.12 },
    { id: "finance", name: "Financial Analyst", icon: "🧮", hire: 1800, salary: 2800, key: "fin", skills: ["Budgeting", "Forecasting"], productivity: "-12% variable costs", bonus: 0.12 },
    { id: "designer", name: "Product Designer", icon: "🎨", hire: 1700, salary: 2600, key: "design", skills: ["UX", "Prototyping"], productivity: "+0.8 quality/month, +4 satisfaction", bonus: 0.1 },
    { id: "impact", name: "Social Impact Specialist", icon: "🌍", hire: 1700, salary: 2500, key: "soc", skills: ["Measurement", "Partnerships"], productivity: "+25% impact results", bonus: 0.25 }
  ];

  const FEATURES = [
    { id: "core", name: "Core solution", cost: 1800, quality: 8, innov: 1, note: "The minimum that solves the problem." },
    { id: "mobile", name: "Mobile-first design", cost: 1500, quality: 5, innov: 1, note: "Most users are on phones." },
    { id: "offline", name: "Offline / low-data mode", cost: 2100, quality: 4, innov: 4, note: "Reaches people with poor connectivity." },
    { id: "arabic", name: "Arabic interface", cost: 900, quality: 4, innov: 0, note: "Removes a language barrier." },
    { id: "analytics", name: "Impact dashboard", cost: 1800, quality: 3, innov: 5, note: "Lets you measure and prove impact." },
    { id: "payments", name: "Mobile payments", cost: 2400, quality: 5, innov: 2, note: "Needed to earn revenue smoothly." }
  ];

  const TARGETS = [
    { id: "consumers", name: "Everyday consumers", mult: 1.0, note: "Large market, lower willingness to pay." },
    { id: "students", name: "Students & young adults", mult: 1.1, note: "Adopt fast, price-sensitive." },
    { id: "businesses", name: "Small businesses", mult: 0.7, note: "Fewer but more valuable customers." },
    { id: "institutions", name: "NGOs & institutions", mult: 0.45, note: "Few contracts, big impact, slow decisions." }
  ];

  const STRATEGIES = [
    { id: "soft", name: "Soft launch", cost: 500, note: "Quietly release to a small group. Low risk, slow start." },
    { id: "partner", name: "Partner pilot", cost: 2000, note: "Launch with a trusted organisation. Credibility and impact." },
    { id: "big", name: "Big bang campaign", cost: 8000, note: "High reward if the product is ready, damaging if it is not." }
  ];

  const DECISIONS = [
    // Chapter 1: The Problem
    Dc("field-research", 1, "How will you study the problem?", "Before building anything, you need to understand {p}. Your time and budget are limited.", ["research", "reputation"], [
      O("Run a 200-person survey with volunteers", 1500, "low", 7, { research: 10, rep: 1 }, "Surveys give breadth fast, but numbers alone hide the 'why' behind behaviour."),
      O("Spend two weeks interviewing affected people", 3500, "low", 9, { research: 16, rep: 3, impact: 2 }, "Deep discovery is the best predictor of product-market fit: you learn real pains, not assumptions."),
      O("Rely on online reports and skip fieldwork", 0, "med", 4, { research: 4 }, "Desk research is good context but misses what is happening on the ground.")
    ]),
    Dc("first-users", 1, "Who do you serve first?", "You cannot solve everything at once. Whom do you design for first?", ["reach", "impact", "research"], [
      O("A narrow group you can reach in person", 500, "low", 8, { research: 6, sat: 3, impact: 2, reach: 2 }, "Starting narrow lets you learn fast and build something people love before widening."),
      O("Everyone affected by the problem", 1000, "med", 5, { reach: 6, research: -2 }, "Trying to serve everyone usually means serving no one well."),
      O("Whoever can pay the most", 0, "high", 3, { cash: 3000, impact: -4, rep: -2 }, "Chasing money first can pull you away from your mission and the people who need you.")
    ]),
    Dc("mentor", 1, "Finding guidance", "You are new to entrepreneurship. Where do you get guidance?", ["reputation", "morale"], [
      O("Join the university incubator and find a mentor", 0, "low", 8, { rep: 4, morale: 3, research: 3 }, "Mentors shorten your learning curve and open doors, and it costs only your time."),
      O("Pay a consultant for a strategy report", 6000, "med", 5, { research: 8, rep: 1 }, "Consultants bring expertise, but an expensive generic report rarely beats a mentor who knows you."),
      O("Go it alone to save money", 0, "med", 3, { morale: -3 }, "Isolation costs more than it saves: founders who seek advice avoid avoidable mistakes.")
    ]),
    // Chapter 2: The Idea
    Dc("value-prop", 2, "Defining your value proposition", "{s} needs a clear promise to customers about {p}.", ["quality", "innovation", "reputation"], [
      O("Start from the user's biggest pain and design backwards", 1000, "low", 9, { innov: 5, sat: 3, quality: 3 }, "Problem-first thinking creates solutions people actually want."),
      O("Lead with the coolest technology you can build", 2000, "med", 4, { innov: 8, quality: 2, sat: -2 }, "Technology-first ideas impress engineers and confuse customers. Innovation must serve a need."),
      O("Copy the most successful competitor", 0, "med", 3, { innov: -3, quality: 3 }, "Copying avoids risk but gives users no reason to switch and no advantage to defend.")
    ]),
    Dc("prototype", 2, "How do you prototype?", "You want users to react to something real, quickly and cheaply.", ["quality", "capital"], [
      O("Build a clickable no-code prototype", 1500, "low", 9, { quality: 6, innov: 3, research: 4 }, "Cheap prototypes test the idea before you spend heavily on code."),
      O("Build the full custom product from scratch", 9000, "high", 4, { quality: 12 }, "A big upfront build is risky: you may perfect something nobody wants.", { delayed: { in: 2, fx: { quality: -5, morale: -3 }, note: "Unforeseen bugs from the rushed full build arrived." } }),
      O("Buy a white-label solution and rebrand it", 4000, "med", 5, { quality: 8, innov: -3 }, "Fast and decent, but it limits differentiation and your control over the product."),
      O("Sketch screens on paper and test them with users", 0, "low", 7, { quality: 2, research: 4, innov: 1 }, "Paper prototypes cost nothing and still reveal whether people understand your idea.")
    ]),
    Dc("partnerships", 2, "Early partnerships and IP", "Others want to work with {s}. How do you protect and grow your idea?", ["reputation", "impact", "sustainability"], [
      O("Partner with a respected NGO", 0, "low", 8, { rep: 5, impact: 4, reach: 3 }, "Partnerships with trusted organisations give credibility and access to communities."),
      O("File a patent right away", 5000, "med", 5, { innov: 6, sust: -2 }, "Patents are slow and costly; early on, speed and learning usually matter more."),
      O("Open-source everything", 0, "med", 6, { innov: 3, rep: 3, sust: -4, impact: 2 }, "Open sharing builds goodwill but you must still find a way to fund yourself.")
    ]),
    // Chapter 3: The Business Model
    Dc("pricing", 3, "Setting your prices", "How you charge decides who you can serve and whether {s} survives.", ["revenue", "impact", "sustainability"], [
      O("Tiered pricing: paying customers cross-subsidise free access", 1000, "low", 9, { sust: 7, impact: 3, rep: 2 }, "Cross-subsidy balances profit and purpose: those who can pay help those who cannot."),
      O("Very low prices for everyone", 0, "med", 4, { impact: 3, reach: 4, sust: -6 }, "Cheap prices attract users, but if each customer loses you money, growth speeds up your failure."),
      O("Premium pricing for maximum margin", 0, "med", 4, { sust: 5, impact: -5, rep: -2 }, "High margins help finances but exclude the people you set out to help.")
    ]),
    Dc("revenue-streams", 3, "Additional revenue streams", "A single revenue stream is fragile. A friend suggests a few ideas.", ["sustainability", "reputation", "impact"], [
      O("Seek corporate CSR sponsorships", 500, "low", 8, { rep: 2, sust: 5 }, "Sponsorships fit social ventures: companies pay to be part of your impact story.", { delayed: { in: 2, cash: 9000, note: "A corporate sponsor paid out." } }),
      O("Sell anonymised user data to advertisers", 0, "high", 1, { cash: 6000, rep: -12, impact: -6, sust: -3 }, "Selling user data breaks trust, especially with vulnerable people. A great example of profit hurting purpose."),
      O("Rely on donations only", 0, "med", 4, { impact: 2, sust: -4 }, "Donations are unpredictable; relying on them alone makes you dependent, not sustainable.")
    ]),
    Dc("unit-economics", 3, "Understanding unit economics", "Does each customer make or lose you money? You need to know.", ["sustainability", "capital"], [
      O("Hire a freelancer to model your unit economics", 2500, "low", 9, { sust: 7, research: 4 }, "Knowing your cost to acquire and serve a customer is the foundation of every sustainable business."),
      O("Estimate on the back of an envelope", 0, "med", 5, { sust: 2 }, "A rough estimate is better than nothing, but small errors compound as you scale."),
      O("Assume it will work out", 0, "high", 2, { sust: -4 }, "Hope is not a strategy. Many startups die by growing customers who cost more than they pay.")
    ]),
    // Chapter 4: Build Your Team
    Dc("first-hire", 4, "Your first hiring approach", "You are ready to grow the team beyond yourself.", ["morale", "capital", "quality"], [
      O("Hire a motivated junior who shares the mission", 1000, "low", 8, { morale: 5, quality: 2, rep: 1 }, "Mission fit and learning attitude often outweigh experience in early teams."),
      O("Hire an expensive senior expert", 4000, "med", 5, { quality: 6, morale: 1, sust: -3 }, "Experts add skill but high salaries burn your limited runway."),
      O("Use unpaid volunteers only", 0, "med", 4, { morale: -4, quality: 1 }, "Volunteers help, but without commitment or pay, reliability is hard to manage.")
    ]),
    Dc("equity", 4, "Rewarding the team", "A talented person wants to join but you cannot match market salaries.", ["morale", "sustainability"], [
      O("Offer a small equity share plus fair pay", 500, "low", 8, { morale: 6, sust: 2 }, "Equity aligns incentives: everyone benefits when the startup grows."),
      O("Pay full market rate from your savings", 3000, "med", 5, { morale: 3, sust: -4 }, "Fair pay is good, but paying beyond your means shortens your runway."),
      O("Promise future rewards without writing them down", 0, "high", 2, { morale: -6, rep: -2 }, "Vague promises create conflict later. Agree on terms in writing early.")
    ]),
    Dc("culture", 4, "Team culture", "As a small team, your habits become your culture.", ["morale", "quality"], [
      O("Weekly check-ins and shared goals", 0, "low", 9, { morale: 5, quality: 2 }, "Regular alignment is the cheapest way to prevent misunderstandings."),
      O("Run a hackathon weekend", 1500, "low", 7, { morale: 4, innov: 5 }, "Hackathons spark ideas and bonding but burn energy if overused."),
      O("Leave everyone fully on their own", 0, "med", 3, { morale: -4, quality: -2 }, "Total freedom without structure leads to duplicated work and missed deadlines.")
    ]),
    Dc("workspace", 4, "Where do you work?", "The team is growing and needs a place to work.", ["morale", "capital"], [
      O("Rent a coworking desk", 3000, "low", 7, { morale: 4, rep: 2, research: 2 }, "Coworking spaces are flexible and full of networking."),
      O("Work from homes and cafes", 0, "low", 6, { morale: -1, sust: 2 }, "Zero rent keeps costs low; communication and focus are the trade-off."),
      O("Rent a private office", 12000, "high", 3, { morale: 5, rep: 3, sust: -7 }, "A nice office feels professional but locks in costs before you have revenue.")
    ]),
    // Chapter 5: The Launch
    Dc("beta-test", 5, "Testing before launch", "You are nearly ready to launch. How do you test?", ["quality", "satisfaction"], [
      O("Recruit 50 real target users for a beta", 1500, "low", 9, { quality: 5, sat: 5, research: 4 }, "Real users from your target group find problems friends and family never will."),
      O("Test only with friends and family", 0, "med", 4, { quality: 1, sat: 1 }, "Friends are polite. Their feedback is rarely the hard truth you need."),
      O("Skip testing and launch to move fast", 0, "high", 2, { reach: 2 }, "Skipping tests saves a few days and can cost your reputation.", { delayed: { in: 1, fx: { rep: -5, sat: -5 }, note: "Early users hit avoidable bugs." } })
    ]),
    Dc("launch-channel", 5, "How do you reach first users?", "Your launch needs its first customers.", ["reach", "customers", "reputation"], [
      O("Partner with a community organisation", 1500, "low", 8, { reach: 5, rep: 3, impact: 2, customers: 8 }, "Trusted intermediaries convert faster than ads.", { ctx: { stat: "quality", min: 30, mult: 0.5, note: "Your product quality is still low, so fewer users stuck around." } }),
      O("Paid social media campaign", 5000, "med", 6, { reach: 8, customers: 12, rep: 1 }, "Ads scale quickly but cost money, and conversion depends on product quality.", { ctx: { stat: "quality", min: 40, mult: 0.4, note: "Your product was not ready; ad money was wasted." } }),
      O("Rely on word of mouth only", 0, "low", 5, { reach: 2, customers: 3 }, "Word of mouth is free but slow, and only works once users love the product.")
    ]),
    Dc("security", 5, "Data and trust", "Users will share personal information with {s}.", ["reputation", "sustainability"], [
      O("Do a basic security and privacy review", 3000, "low", 8, { rep: 3, sust: 3 }, "Trust is your most valuable asset in social impact work."),
      O("Use a template privacy policy only", 300, "med", 5, { rep: 1 }, "Legal text is not protection. Do the minimum, but know it is the minimum."),
      O("Ignore it for now", 0, "high", 2, {}, "Ignoring risk postpones the cost and raises it.", { delayed: { in: 3, fx: { rep: -8, sat: -4 }, note: "A privacy scare damaged your reputation." } })
    ]),
    Dc("support", 5, "Customer support", "Early customers have questions and problems.", ["satisfaction", "morale"], [
      O("Founders personally answer every message", 0, "low", 8, { sat: 5, rep: 2, morale: -2 }, "Early support is the best research you can do. It is time-intensive but priceless."),
      O("Set up an automated chatbot only", 1500, "med", 5, { sat: 1, morale: 1 }, "Automation scales but cold replies hurt trust when users are anxious."),
      O("Ignore tickets until later", 0, "high", 2, { sat: -8, rep: -4 }, "Unanswered users churn, and they tell others.")
    ]),
    // Chapter 6: Investor Day
    Dc("pitch-prep", 6, "Preparing for Investor Day", "Investors arrive soon. How do you prepare?", ["reputation", "morale"], [
      O("Rehearse with mentors and refine answers", 500, "low", 9, { rep: 2, morale: 3, pb_problem: 4, pb_business: 3 }, "Practice with critical listeners shows you the holes in your story."),
      O("Hire a pitch coach", 4000, "med", 6, { rep: 1, pb_innovation: 4, pb_impact: 2 }, "Polish helps but cannot replace a strong business."),
      O("Wing it, you know the product", 0, "high", 3, { morale: -2 }, "Investors forgive rough edges but not unclear answers.")
    ]),
    Dc("deck-focus", 6, "What story do you lead with?", "You have limited time. What takes centre stage?", ["impact", "innovation", "sustainability"], [
      O("Lead with impact backed by numbers", 0, "low", 8, { pb_impact: 6, pb_problem: 3 }, "Impact stories land best when numbers prove them.", { ctx: { stat: "impact", min: 25, mult: 0.4, note: "Your impact numbers are still small, so the story was less convincing." } }),
      O("Lead with the financial model", 0, "low", 7, { pb_financial: 6, pb_business: 3 }, "Investors check whether you can sustain growth. Clear economics build confidence.", { ctx: { stat: "sustainability", min: 40, mult: 0.4, note: "Your finances are fragile, so the model drew questions." } }),
      O("Lead with your technology", 0, "med", 5, { pb_innovation: 6, pb_scalability: 3 }, "Tech is exciting, but without a clear problem and business, it is a hobby.")
    ]),
    Dc("demo-booth", 6, "Investor Day showcase", "You can invest in how {s} shows up at the event.", ["reputation", "capital"], [
      O("Bring real customer stories and a live demo", 1500, "low", 9, { rep: 3, pb_problem: 3, pb_impact: 2 }, "Real people and live products beat slides every time."),
      O("Build an elaborate branded booth", 7000, "high", 3, { rep: 2, sust: -5 }, "Flashy spending when you are not profitable signals poor judgement."),
      O("Simple slides only", 0, "med", 5, {}, "Simple is fine if the content is strong.")
    ]),
    // Chapter 7: Global Impact
    Dc("expansion", 7, "How do you scale?", "{s} is ready to grow. What is your expansion plan?", ["reach", "scalability", "capital"], [
      O("Deepen impact in your current region first", 2500, "low", 8, { sat: 4, impact: 4, reach: 3, sust: 3 }, "Depth before breadth builds a strong base to expand from."),
      O("Open a new city with a local partner", 6000, "med", 7, { reach: 8, customers: 15, impact: 3, sust: -3 }, "Local partners reduce risk when entering new markets.", { ctx: { stat: "sustainability", min: 35, mult: 0.6, note: "Weak finances limited how well you could support the expansion." } }),
      O("Wait a quarter and only fix what breaks", 0, "low", 4, { sat: 1, morale: 1 }, "Waiting protects cash but lets momentum fade and rivals move in."),
      O("Launch in a new country immediately", 15000, "high", 3, { reach: 12, customers: 10, sust: -10, morale: -4 }, "Moving too fast stretches teams and cash. Many promising startups die scaling early.")
    ]),
    Dc("impact-measure", 7, "Measuring your impact", "Funders and users want evidence that {s} works.", ["impact", "reputation"], [
      O("Commission an independent impact assessment", 5000, "low", 9, { rep: 4, impact: 4, pb_impact: 4, research: 4 }, "Independent evidence is what separates real impact from marketing."),
      O("Publish self-reported numbers", 500, "med", 5, { rep: 1, impact: 1 }, "Self-reporting is cheap but easy to doubt."),
      O("Do not measure, the benefits are obvious", 0, "high", 2, { rep: -2, impact: -2 }, "What gets measured gets improved. Without evidence, you cannot find what is working.")
    ]),
    Dc("scale-ops", 7, "Operating at scale", "More customers mean more complexity.", ["quality", "sustainability", "morale"], [
      O("Invest in automating repeat tasks", 6000, "low", 8, { sust: 6, quality: 3, morale: 3 }, "Automation lowers cost per customer and frees the team for what matters."),
      O("Hire quickly to keep up", 4000, "med", 5, { quality: 2, morale: 2, sust: -4 }, "More people solve today's problem and raise tomorrow's costs."),
      O("Do nothing and hope", 0, "high", 2, { sat: -6, morale: -6 }, "Ignoring scale problems leads to burnout and unhappy customers.")
    ]),
    Dc("public-sector", 7, "Large partnerships", "A government agency and a large company both offer partnerships.", ["impact", "capital", "reputation"], [
      O("Public-sector pilot to serve more people", 2000, "med", 8, { impact: 5, reach: 5, rep: 3 }, "Public partners offer reach and legitimacy, but move slowly.", { delayed: { in: 2, cash: 14000, note: "The public pilot grant was paid." } }),
      O("Corporate partnership for revenue", 1000, "med", 7, { sust: 5, rep: 2, impact: 1 }, "Corporates fund growth but may pull you toward their priorities.", { delayed: { in: 2, cash: 9000, note: "The corporate contract was paid." } }),
      O("Decline both and stay independent", 0, "low", 4, { morale: 1 }, "Independence has value, but saying no to every partnership slows your mission.")
    ])
  ];

  const EV_WHEN = { launched: true };
  const EVENTS = [
    E("competitor", "A new competitor appears", "A well-funded rival just launched something similar to {s}.", { min: 4 }, [
      ["Cut prices to defend your customers", -4000, { customers: -2, sust: -3, sat: 2 }, "Price wars favour whoever has more cash. Rarely you."],
      ["Double down on your impact and community", -2000, { impact: 3, rep: 3, sat: 2 }, "Differentiate where competitors cannot follow: mission and trust."],
      ["Ignore them", 0, { reach: -4, customers: -3 }, "Ignoring competitors is a gamble that may work, but rarely does."]
    ]),
    E("supplier-price", "Supplier price increase", "A key supplier raised costs by 20%.", { min: 3 }, [
      ["Absorb the cost", -3000, { sust: -3 }, "Protects customers but shrinks your margin."],
      ["Pass costs on to customers", 0, { sat: -5, customers: -3, sust: 2 }, "Protects the margin but risks losing price-sensitive users."],
      ["Switch to a new supplier", -1500, { sust: 3, quality: -2 }, "Switching costs a little now and builds resilience."]
    ]),
    E("investor-interest", "An angel investor reaches out", "A local angel investor heard about {s} and wants a coffee.", { min: 3 }, [
      ["Take the meeting and share your numbers", 0, { rep: 3, morale: -1 }, "Even if nothing comes of it, investor relationships take time to build.", { in: 2, cash: 10000, note: "The angel invested after the follow-up meeting." }],
      ["Decline politely, you are focused", 0, { morale: 1 }, "Focus is good, but staying closed to opportunities has a cost."]
    ]),
    E("team-conflict", "Conflict in the team", "Two team members disagree about priorities and it is affecting the mood.", { min: 4, team: 1 }, [
      ["Mediate a calm, honest conversation", -500, { morale: 6 }, "Conflict handled early becomes clarity. Conflict ignored becomes resignation."],
      ["Ignore it, they will work it out", 0, { morale: -10, quality: -2 }, "Unresolved tension spreads and hurts productivity."],
      ["Reassign work to separate them", -1000, { morale: -2, quality: -1 }, "Avoiding the issue works only until they must work together again."]
    ]),
    E("product-bug", "A serious product bug", "A bug is affecting many users of {s}.", { min: 6, launched: true }, [
      ["Hotfix over the weekend", 0, { morale: -5, quality: 3, rep: 1 }, "Fast fixes protect trust but burn the team."],
      ["Pause features and fix properly", -2000, { quality: 4, morale: -1, reach: -2 }, "A slower, thorough fix prevents repeats."],
      ["Publicly apologise and give a timeline", 0, { rep: 3, sat: -2 }, "Honesty keeps trust even when the product fails."]
    ]),
    E("unexpected-demand", "Unexpected demand", "A news mention drove a wave of new users to {s}.", { min: 6, launched: true }, [
      ["Scale up support and infrastructure quickly", -5000, { customers: 25, sat: -3, reach: 4 }, "Capturing the wave costs money now but may pay back."],
      ["Cap sign-ups and manage a waiting list", 0, { customers: 8, rep: -1, reach: 2 }, "Controlled growth protects quality but may lose momentum."]
    ]),
    E("government-grant", "A government grant opens", "A social innovation grant opens applications.", { min: 3 }, [
      ["Apply (it takes weeks of effort)", 0, { morale: -2, rep: 1 }, "Grants are non-dilutive money but demand paperwork.", { in: 1, cash: 12000, note: "The grant was awarded." }],
      ["Skip it, you are too busy", 0, {}, "Sometimes focus wins, but free money is rare."]
    ]),
    E("complaints", "Customer complaints", "Several customers are complaining on social media.", { min: 6, launched: true }, [
      ["Reply personally and fix the issues", -800, { sat: 5, rep: 3 }, "Complaints are free feedback. Responding turns critics into advocates."],
      ["Send an automated reply", 0, { sat: 1, rep: -1 }, "Automation is efficient but feels cold."],
      ["Ignore the noise", 0, { sat: -8, rep: -4 }, "Public silence is read as indifference."]
    ]),
    E("market-expansion", "A neighbouring region asks you to come", "A community leader in another governorate invites {s} to pilot there.", { min: 7, launched: true }, [
      ["Run a small pilot", -4000, { reach: 8, customers: 10, impact: 3 }, "Pilots let you test new markets with limited risk."],
      ["Decline for now", 0, {}, "Staying focused protects quality."]
    ]),
    E("economic-crisis", "Economic turbulence", "Inflation is squeezing households and your costs.", { min: 4 }, [
      ["Cut non-essential costs and tighten", 2000, { morale: -4, sust: 3 }, "Fast cost control buys runway but can hurt morale."],
      ["Raise prices modestly", 4000, { sat: -6, customers: -3 }, "Price increases bring cash but test loyalty."],
      ["Take a short-term bridge loan", 10000, { sust: -6 }, "A loan helps today and creates a bill tomorrow.", { in: 3, cash: -12000, note: "The bridge loan repayment fell due." }]
    ]),
    E("media-feature", "A journalist wants your story", "A local journalist wants to feature {s}.", { min: 3 }, [
      ["Tell the honest story, including failures", 0, { rep: 6, reach: 4 }, "Authenticity earns lasting trust."],
      ["Exaggerate your results", 0, { rep: 3, reach: 5 }, "Short-term hype hides long-term risk.", { in: 2, fx: { rep: -8 }, note: "Your exaggerated claims were challenged publicly." }]
    ]),
    E("data-scare", "Data security scare", "A researcher found a weakness in how {s} stores user data.", { min: 6, launched: true }, [
      ["Fix it and openly tell affected users", -1500, { rep: -1, sat: 1, sust: 1 }, "Transparency is painful short term but builds trust."],
      ["Quietly fix it and say nothing", -500, { rep: 0 }, "Hiding incidents works until it is discovered.", { in: 2, fx: { rep: -14 }, note: "The hidden security issue leaked." }]
    ]),
    E("volunteers", "University volunteers want to help", "A group of students wants to volunteer for {s}.", { min: 2 }, [
      ["Onboard them with clear tasks", -700, { morale: 3, impact: 3, reach: 2 }, "Volunteers multiply impact if you invest in guiding them."],
      ["Politely decline", 0, {}, "Saying no saves time but loses allies."]
    ]),
    E("poaching", "A job offer for your best person", "A bigger company is trying to hire your key team member.", { min: 5, team: 1 }, [
      ["Make a counter-offer", -2000, { morale: 3 }, "Retention costs less than replacement."],
      ["Let them go with thanks", 0, { morale: -5, quality: -4 }, "Departures hurt output and morale, but handled kindly, keep a relationship."]
    ]),
    E("viral-post", "A post about {s} goes viral", "A post about your startup is spreading fast.", { min: 5, launched: true }, [
      ["Capitalise with a quick campaign", -1500, { customers: 20, reach: 6 }, "Virality fades fast; act while attention lasts."],
      ["Thank people and carry on", 0, { customers: 8, reach: 3, rep: 1 }, "Low effort, low reward."]
    ]),
    E("regulation", "New compliance rules", "A new regulation affects how startups like {s} operate.", { min: 5 }, [
      ["Comply fully and early", -3500, { rep: 2, sust: 3 }, "Compliance is a cost and a trust signal."],
      ["Do the minimum", -1000, { sust: -1 }, "Minimum compliance saves cash, risking trouble later.", { in: 3, fx: { rep: -4 }, cash: -2500, note: "A compliance audit found gaps and fined you." }]
    ]),
    E("ngo-offer", "An NGO offers a co-branded project", "A respected NGO proposes a joint project with {s}.", { min: 4 }, [
      ["Accept and co-brand", -2000, { impact: 5, reach: 5, rep: 3 }, "Partners expand reach and credibility."],
      ["Decline to stay independent", 0, {}, "Independence is fine, but trust is borrowed from good partners."]
    ]),
    E("hackathon", "A national hackathon invites you", "A national social-innovation hackathon is accepting teams.", { min: 3 }, [
      ["Enter the competition", -1000, { rep: 4, innov: 3, morale: 2 }, "Visibility and feedback in one weekend.", { in: 2, cash: 5000, note: "Your hackathon prize arrived." }],
      ["Skip it", 0, {}, "Missing opportunities has a quiet cost."]
    ]),
    E("burnout", "Founder burnout", "You have been working non-stop and feel exhausted.", { min: 5 }, [
      ["Take a proper weekend off", 0, { morale: 8, quality: -1 }, "Rest is productive. Burnt-out founders make poor decisions."],
      ["Push through, there is too much to do", 0, { morale: -8, quality: 2 }, "Short-term output, long-term damage."]
    ]),
    E("skepticism", "Community leader is sceptical", "A respected local leader doubts whether {s} will really help.", { min: 1, max: 5 }, [
      ["Host an open community meeting", -1500, { rep: 4, impact: 2, research: 3 }, "Listening in person converts sceptics into allies."],
      ["Send a brochure", -200, { rep: 1 }, "A brochure rarely wins hearts."]
    ]),
    E("cloud-costs", "Infrastructure costs spike", "Your hosting and tools bill jumped this month.", { min: 4 }, [
      ["Optimise and renegotiate", -2000, { sust: 3, quality: 1 }, "Optimisation pays back every month."],
      ["Pay it and move on", -4500, { sust: -2 }, "Quick, but costly."]
    ]),
    E("partner-delay", "A partner cancels last minute", "A partner you counted on pulls out of a project.", { min: 4 }, [
      ["Find a replacement quickly", -2500, { reach: -1, morale: -1 }, "Backup options protect timelines."],
      ["Postpone the project", 0, { reach: -4, impact: -2, rep: -1 }, "Delays are cheap in cash, and expensive in momentum."]
    ]),
    E("local-festival", "Chance to present at a local festival", "A festival offers a free stall for local startups.", { min: 4, launched: true }, [
      ["Take the stall", -600, { customers: 10, reach: 4, rep: 2 }, "Face-to-face contact builds trust with new customers."],
      ["Pass", 0, {}, "No cost, no gain."]
    ])
  ];

  const INVESTORS = [
    { id: "salma", name: "Dr. Salma Hassan", title: "Impact angel investor", icon: "🌱", bio: "Former NGO director. Asks: 'Who is actually better off because of you?'", focus: { impact: 8, financial: -4, scalability: -4 }, max: 150000 },
    { id: "karim", name: "Karim Fouad", title: "Venture capitalist", icon: "🚀", bio: "Backs fast-scaling startups. Asks: 'How big can this get, and how fast?'", focus: { scalability: 8, business: 4, impact: -6, problem: -6 }, max: 220000 },
    { id: "nadine", name: "Nadine Habib", title: "Social-impact fund CFO", icon: "📈", bio: "Obsessed with numbers. Asks: 'Show me the unit economics.'", focus: { financial: 8, business: 4, innovation: -6, scalability: -6 }, max: 180000 },
    { id: "omar", name: "Prof. Omar El-Sayed", title: "University incubator lead", icon: "🎓", bio: "Loves bold, evidence-based ideas. Asks: 'What do you know that others do not?'", focus: { innovation: 8, problem: 5, financial: -6, scalability: -7 }, max: 120000 }
  ];

  const PITCH_QUESTIONS = [
    { q: "How do you know this problem is real?", a: [
      { t: "Show the field research and quotes from real users", fx: { problem: 10 }, req: { stat: "research", min: 30, fail: { problem: -6 }, note: "You have not done much fieldwork yet." } },
      { t: "Cite global statistics about the problem", fx: { problem: 4 } },
      { t: "Say it is obvious to anyone who looks", fx: { problem: -6 } }
    ] },
    { q: "How will you earn money without hurting the people you serve?", a: [
      { t: "Cross-subsidy: paying users fund free access", fx: { business: 8, impact: 3 }, req: { stat: "sustainability", min: 40, fail: { business: -4 }, note: "Your finances do not yet prove it works." } },
      { t: "Charge a premium and serve fewer people", fx: { business: 4, impact: -5 } },
      { t: "Rely on grants and donations", fx: { business: -3, financial: -4, impact: 2 } }
    ] },
    { q: "What happens if demand grows ten times?", a: [
      { t: "Walk through the operations and hiring plan", fx: { scalability: 8 }, req: { stat: "team", min: 3, fail: { scalability: -5 }, note: "Your team is too small for this to be credible." } },
      { t: "Hire fast and raise money", fx: { scalability: 4, financial: -4 } },
      { t: "Stay small and focused", fx: { scalability: -6, impact: 2 } }
    ] }
  ];

  const CHAPTERS = [
    { id: 1, name: "THE PROBLEM", months: [1, 1], desc: "Identify a social problem and understand the people affected.", objective: "Resolve the month's decision, then run the month." },
    { id: 2, name: "THE IDEA", months: [2, 2], desc: "Develop an innovative solution and define the value proposition.", objective: "Resolve the decision and set your product budget." },
    { id: 3, name: "THE BUSINESS MODEL", months: [3, 3], desc: "Make the business model sustainable and find revenue sources.", objective: "Validate your pricing and economics." },
    { id: 4, name: "BUILD YOUR TEAM", months: [4, 5], desc: "Hire team members and manage operational resources.", objective: "Hire at least one teammate (Team tab)." },
    { id: 5, name: "THE LAUNCH", months: [6, 7], desc: "Build an MVP, test it and launch to the market.", objective: "Launch your MVP (Product tab) before the end of month 7." },
    { id: 6, name: "INVESTOR DAY", months: [8, 8], desc: "Present the startup and receive an investment evaluation.", objective: "Pitch to the investor on the Overview tab." },
    { id: 7, name: "GLOBAL IMPACT", months: [9, 12], desc: "Scale, expand to new markets and measure impact.", objective: "Grow responsibly through month 12." }
  ];

  const ENDINGS = [
    { id: "bankrupt", name: "Out of Cash", text: "The money ran out. Most startups that fail do so for the same reason: cash, not ideas." },
    { id: "pivot", name: "Back to the Drawing Board", text: "You survived, but the startup is not yet sustainable or impactful. Learn, pivot and try again." },
    { id: "sustainable", name: "Sustainable Venture", text: "Your startup stands on its own feet and helps real people. A solid foundation to grow." },
    { id: "hero", name: "Global Impact Hero", text: "Profitable, scalable and changing lives. This is the Hult Prize dream." }
  ];

  const RANKS = [
    { min: 900, name: "Global Impact Legend" }, { min: 750, name: "Unicorn Founder" }, { min: 550, name: "Rising Entrepreneur" },
    { min: 350, name: "Early Stage Startup" }, { min: 0, name: "Startup Needs Help" }
  ];

  const ACHIEVEMENTS = [
    { id: "launch", name: "Liftoff", icon: "🚀", desc: "Launch your MVP.", check: s => s.mvp.launched },
    { id: "profit", name: "In The Green", icon: "💚", desc: "Make a profitable month.", check: s => s.history.some(h => h.profit > 0) },
    { id: "cust100", name: "Hundred Strong", icon: "👥", desc: "Reach 100 customers.", check: s => s.resources.customers >= 100 },
    { id: "ben1000", name: "A Thousand Lives", icon: "🌍", desc: "Reach 1,000 people.", check: s => s.resources.beneficiaries >= 1000 },
    { id: "team5", name: "Dream Team", icon: "🧑‍🤝‍🧑", desc: "Hire 5 team members.", check: s => s.team.length >= 5 },
    { id: "investor", name: "Backed", icon: "💼", desc: "Win investor funding.", check: s => !!s.pitch && s.pitch.result && s.pitch.result !== "rejected" },
    { id: "impact50", name: "Changemaker", icon: "✨", desc: "Reach 50 Social Impact.", check: s => s.resources.impact >= 50 },
    { id: "quality70", name: "Craftsmanship", icon: "🛠️", desc: "Reach 70 Product Quality.", check: s => s.resources.quality >= 70 },
    { id: "ethical", name: "Ethical Founder", icon: "🧭", desc: "Make 8 decisions without a bad choice.", check: s => s.decisions.length >= 8 && s.decisions.every(d => d.score > 2) },
    { id: "research", name: "Customer Obsessed", icon: "🔎", desc: "Reach 60 Research.", check: s => s.resources.research >= 60 },
    { id: "media", name: "Trusted Name", icon: "⭐", desc: "Reach 70 Reputation.", check: s => s.resources.reputation >= 70 },
    { id: "crisis", name: "Crisis Manager", icon: "🧯", desc: "Handle 5 events.", check: s => s.events.length >= 5 },
    { id: "runway", name: "Careful Spender", icon: "🏦", desc: "Never drop below 20,000 EGP capital.", check: s => s.currentMonth >= 9 && s.history.length >= 8 && s.history.every(h => h.capital >= 20000) },
    { id: "sustain", name: "Built To Last", icon: "♻️", desc: "Reach 70 Sustainability.", check: s => s.resources.sustainability >= 70 },
    { id: "finish", name: "Survivor", icon: "🏁", desc: "Complete all 12 months.", check: s => s.status === "ended" && s.currentMonth >= 12 && s.endReason !== "bankrupt" }
  ];

  g.ST = g.ST || {};
  g.ST.Data = { DIFFICULTY, CHALLENGES, MODELS, ROLES, FEATURES, TARGETS, STRATEGIES, DECISIONS, EVENTS, INVESTORS, PITCH_QUESTIONS, CHAPTERS, ENDINGS, RANKS, ACHIEVEMENTS };
  if (typeof module !== "undefined") module.exports = g.ST.Data;
})(typeof window !== "undefined" ? window : globalThis);
