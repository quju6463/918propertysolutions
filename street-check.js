const scoreInputs = Array.from(document.querySelectorAll("[data-score]"));
const scoreOutput = document.querySelector("#streetScore");
const scoreText = document.querySelector("#streetScoreText");
const scoreBar = document.querySelector("#streetScoreBar");

const planForm = document.querySelector("#streetPlanForm");
const planCouncil = document.querySelector("#planCouncil");
const planSummary = document.querySelector("#planSummary");
const planSearchTerms = document.querySelector("#planSearchTerms");
const sourceLinks = document.querySelector("#sourceLinks");
const checkPlanGrid = document.querySelector("#checkPlanGrid");
const dueDiligenceGrid = document.querySelector("#dueDiligenceGrid");

const councilSources = {
  wellington: {
    name: "Wellington City Council",
    propertyMap: "https://wcc.maps.arcgis.com/apps/webappviewer/index.html?id=21936b59f6674da5b3b0ba7f86f1d3e4",
    lim: "https://wellington.govt.nz/property-rates-and-building/property/property-searches-and-lims"
  },
  hutt: {
    name: "Hutt City Council",
    propertyMap: "https://maps.huttcity.govt.nz/",
    lim: "https://www.huttcity.govt.nz/property-and-building/land-information-memorandum-lim"
  },
  "upper-hutt": {
    name: "Upper Hutt City Council",
    propertyMap: "https://maps.upperhuttcity.com/",
    lim: "https://www.upperhuttcity.com/Services/Building-and-resource-consents/Land-information-memoranda"
  },
  porirua: {
    name: "Porirua City Council",
    propertyMap: "https://maps.poriruacity.govt.nz/",
    lim: "https://poriruacity.govt.nz/services/building-consents/land-information-memorandum-lim/"
  },
  auckland: {
    name: "Auckland Council",
    propertyMap: "https://geomapspublic.aucklandcouncil.govt.nz/viewer/index.html",
    lim: "https://www.aucklandcouncil.govt.nz/buying-property/order-property-report/Pages/order-lim.aspx"
  },
  christchurch: {
    name: "Christchurch City Council",
    propertyMap: "https://ccc.govt.nz/consents-and-licences/property-information-and-lims/property-search",
    lim: "https://ccc.govt.nz/consents-and-licences/property-information-and-lims/land-information-memorandum"
  },
  tauranga: {
    name: "Tauranga City Council",
    propertyMap: "https://www.tauranga.govt.nz/council/about-your-council/maps",
    lim: "https://www.tauranga.govt.nz/property/rates/property-searches-and-lims"
  },
  hamilton: {
    name: "Hamilton City Council",
    propertyMap: "https://www.hamilton.govt.nz/property-rates-and-building/property-information/maps",
    lim: "https://www.hamilton.govt.nz/property-rates-and-building/property-information/land-information-memorandum"
  },
  dunedin: {
    name: "Dunedin City Council",
    propertyMap: "https://www.dunedin.govt.nz/services/property-information/property-search",
    lim: "https://www.dunedin.govt.nz/services/property-information/land-information-memorandum"
  },
  other: {
    name: "Your local council",
    propertyMap: "https://www.google.com/search?q=local+council+property+map+LIM+New+Zealand",
    lim: "https://www.google.com/search?q=local+council+LIM+property+information+New+Zealand"
  }
};

const checkCategories = [
  {
    title: "Community fit",
    source: "Stats NZ census",
    question: "Does the property match the people and households who already live in the area?",
    how: "Search the suburb or statistical area. Compare age profile, household type, income bands, tenure, dwelling type and population change.",
    good: "The dwelling type, price point and layout fit the dominant buyer or tenant pool.",
    redFlags: "The suburb story does not match the actual property, or demand relies on a very narrow buyer/tenant group."
  },
  {
    title: "Schools and family appeal",
    source: "Education Counts, ERO, school zones",
    question: "Would a family see this street as practical and desirable?",
    how: "Find nearby schools, enrolment zones, childcare, parks, crossings, bus routes and walkability.",
    good: "Useful school access, safe walking routes, parks or family amenities nearby.",
    redFlags: "Busy roads, awkward school access, unclear zones, limited parks or repeated traffic problems."
  },
  {
    title: "Safety and nuisance",
    source: "NZ Police data and street visits",
    question: "Does the street feel safe and quiet enough at the times people actually live there?",
    how: "Use Police area data, then visit weekday morning, school pickup, Friday night and Sunday afternoon.",
    good: "Street feel matches or improves on the area data; noise, parking and lighting are acceptable.",
    redFlags: "Uncomfortable night feel, regular nuisance, speeding, poor lighting, dumped rubbish or difficult neighbours."
  },
  {
    title: "Hazards, LIM and title",
    source: "Council GIS, LIM, LINZ, Natural Hazards Portal",
    question: "Could hidden land, consent, service, insurance or hazard issues affect value?",
    how: "Check council hazard layers, LIM, title, easements, flood, landslip, coastal risk, services and consent history.",
    good: "No obvious hazard concerns, clean title context, normal services and no unexplained consent gaps.",
    redFlags: "Flood/landslip overlays, unconsented work, major easements, difficult access, or insurance hesitation."
  },
  {
    title: "Transport and convenience",
    source: "Maps, transport sites, council maps",
    question: "Is daily life easy from this street?",
    how: "Check commute times, public transport, shops, healthcare, parking, walking routes, traffic speed and congestion.",
    good: "Good access to work, shops, schools and transport without obvious traffic or parking pain.",
    redFlags: "Long peak commute, poor transport, unsafe walking routes, limited parking or cut-through traffic."
  },
  {
    title: "Market and rental demand",
    source: "Tenancy Services, realestate.co.nz, comparable listings",
    question: "Do sale and rent numbers support the property story?",
    how: "Compare recent and active listings, asking prices, rent evidence, days on market, competing stock and rent-to-value fit.",
    good: "Multiple comparable properties support price/rent, and demand is not based on one optimistic listing.",
    redFlags: "Many stale listings, weak rent evidence, unrealistic asking prices or too few comparable properties."
  }
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function scoreMessage(score) {
  if (score >= 82) return "Strong street profile. Still verify hazards, schools, nuisance and market evidence before relying on it.";
  if (score >= 65) return "Promising. The street looks workable, but inspect the lower-scoring areas before making an offer.";
  if (score >= 45) return "Balanced. Worth investigating, but check the weaker areas before relying on the suburb story.";
  return "High caution. Do more due diligence before treating this as a good street or investment location.";
}

function buildSourceLinks(councilKey = "wellington") {
  const councilData = councilSources[councilKey] || councilSources.wellington;

  return [
    {
      category: "Street view",
      title: "Google Maps",
      url: "https://www.google.com/maps",
      note: "Search the street yourself to inspect layout, travel times, nearby services and street view."
    },
    {
      category: "Census",
      title: "Stats NZ",
      url: "https://www.stats.govt.nz/",
      note: "Search by suburb or statistical area for people and household data."
    },
    {
      category: "Schools",
      title: "Education Counts",
      url: "https://www.educationcounts.govt.nz/find-school",
      note: "Find nearby schools, zones and school details."
    },
    {
      category: "ERO",
      title: "Education Review Office",
      url: "https://ero.govt.nz/review-reports",
      note: "Read school review reports where school appeal matters."
    },
    {
      category: "Safety",
      title: "NZ Police data",
      url: "https://www.police.govt.nz/about-us/publications-statistics/data-and-statistics/policedatanz",
      note: "Compare area-level safety data, then verify street feel in person."
    },
    {
      category: "Hazards",
      title: "Natural Hazards Portal",
      url: "https://www.naturalhazardsportal.govt.nz/",
      note: "Check known hazard records and combine with council maps and LIM."
    },
    {
      category: "Council map",
      title: `${councilData.name} map`,
      url: councilData.propertyMap,
      note: "Check zoning, flood, services, planning layers and property information."
    },
    {
      category: "LIM",
      title: `${councilData.name} LIM`,
      url: councilData.lim,
      note: "Use LIM for consents, hazards, services and council records."
    },
    {
      category: "Title and land",
      title: "LINZ Data Service",
      url: "https://data.linz.govt.nz/",
      note: "Check parcels, addresses, boundaries and land records."
    },
    {
      category: "Rent",
      title: "Tenancy Services market rent",
      url: "https://www.tenancy.govt.nz/rent-bond-and-bills/market-rent/",
      note: "Search the suburb for bond-based rent evidence."
    },
    {
      category: "Market",
      title: "realestate.co.nz insights",
      url: "https://www.realestate.co.nz/insights",
      note: "Check sale, rent, price and supply context."
    }
  ];
}

function renderSourceLinks(links) {
  sourceLinks.innerHTML = links.map((link) => `
    <a href="${link.url}" target="_blank" rel="noopener">
      <span>${escapeHtml(link.category)}</span>
      <strong>${escapeHtml(link.title)}</strong>
      <small>${escapeHtml(link.note)}</small>
    </a>
  `).join("");
}

function renderCheckPlan() {
  checkPlanGrid.innerHTML = checkCategories.map((item, index) => `
    <article>
      <span>Step ${index + 1} / ${escapeHtml(item.source)}</span>
      <h4>${escapeHtml(item.title)}</h4>
      <p><strong>Question:</strong> ${escapeHtml(item.question)}</p>
      <p><strong>How:</strong> ${escapeHtml(item.how)}</p>
      <small>Use this step after checking the relevant source.</small>
    </article>
  `).join("");
}

function renderDueDiligenceGuide() {
  dueDiligenceGrid.innerHTML = checkCategories.map((item) => `
    <article>
      <span>${escapeHtml(item.source)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p><strong>How to check:</strong> ${escapeHtml(item.how)}</p>
      <p><strong>Good signs:</strong> ${escapeHtml(item.good)}</p>
      <p><strong>Red flags:</strong> ${escapeHtml(item.redFlags)}</p>
    </article>
  `).join("");
}

function updateSourcePack(event) {
  event?.preventDefault();
  const councilKey = planCouncil.value;
  const councilData = councilSources[councilKey] || councilSources.wellington;
  planSummary.textContent = `${councilData.name} source pack`;
  planSearchTerms.innerHTML = `No address is required on this page. Open the relevant source, then search there using the suburb, school name, street, or property details if that source asks for it. Council source selected: <strong>${escapeHtml(councilData.name)}</strong>.`;
  renderSourceLinks(buildSourceLinks(councilKey));
  if (event) {
    document.querySelector("#planResult").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function updateStreetScore() {
  const total = scoreInputs.reduce((sum, input) => sum + Number(input.value), 0);
  const max = scoreInputs.length * 5;
  const score = Math.round((total / max) * 100);

  scoreInputs.forEach((input) => {
    const label = input.closest(".score-slider");
    const value = label?.querySelector("b");
    if (value) value.textContent = input.value;
  });

  scoreOutput.textContent = `${score}%`;
  scoreText.textContent = scoreMessage(score);
  scoreBar.style.width = `${score}%`;
}

planForm?.addEventListener("submit", updateSourcePack);
scoreInputs.forEach((input) => input.addEventListener("input", updateStreetScore));

renderCheckPlan();
renderDueDiligenceGuide();
updateSourcePack();
updateStreetScore();
