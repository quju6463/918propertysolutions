const GST_RATE = 0.15;
const STORAGE_KEY = "propertyInvestmentGuru.flipDeals.v1";
const byId = (id) => document.querySelector(`#${id}`);
const fieldIds = [
  "resaleValue", "targetProfit", "incomeTaxRate", "projectMonths", "renovationCost",
  "renoDesign", "renoDemolition", "renoBuilding", "renoPlumbing", "renoElectrical",
  "renoKitchen", "renoBathrooms", "renoFlooring", "renoPainting", "renoExterior",
  "renoLandscaping", "renoOther",
  "contingencyRate", "legalCost", "limCost", "buildersReportCost", "otherAcquisitionCost",
  "sellingRate", "sellingFixed", "marketingCost", "stagingCost", "otherSaleCost",
  "ratesMonthly", "insuranceMonthly", "utilitiesMonthly", "securityMonthly",
  "otherHoldingMonthly", "holdingTotalCost", "interestMonthly", "financeFees", "financeTotalCost",
];
const fields = Object.fromEntries(fieldIds.map((id) => [id, byId(id)]));
fields.agencyFeeMode = byId("agencyFeeMode");
fields.renovationBudgetMode = byId("renovationBudgetMode");
fields.holdingCostMode = byId("holdingCostMode");
fields.financeCostMode = byId("financeCostMode");
fields.gstRegistered = byId("gstRegistered");
fields.purchaseGstClaimable = byId("purchaseGstClaimable");

const currency = new Intl.NumberFormat("en-NZ", {
  style: "currency", currency: "NZD", maximumFractionDigits: 0,
});
const numberFromText = (text) => Number(String(text).replace(/,/g, "")) || 0;
const value = (field) => Math.max(0, numberFromText(field.value));
const negativeCurrency = (amount) => `−${currency.format(Math.max(0, amount))}`;
const signedCurrencyWithPlus = (amount) => `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${currency.format(Math.abs(amount))}`;
const netOfGst = (gross, gstRegistered, gstEligible = true) =>
  gstRegistered && gstEligible ? gross / (1 + GST_RATE) : gross;
let currentSummary = {};
let activeDealId = null;
let activeDealAddress = "";

function formatMoneyValue(rawValue) {
  const digits = String(rawValue).replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("en-NZ") : "";
}

function formatMoneyInput(input) {
  input.value = formatMoneyValue(input.value);
}

function formatAllMoneyInputs() {
  document.querySelectorAll(".money-field input").forEach(formatMoneyInput);
}

function setupMoneyInputs() {
  document.querySelectorAll(".money-field input").forEach((input) => {
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    formatMoneyInput(input);
    input.addEventListener("input", () => formatMoneyInput(input));
  });
}

function updateAgencyFields() {
  const fixed = fields.agencyFeeMode.value === "fixed";
  byId("agencyPercentField").classList.toggle("is-hidden", fixed);
  byId("agencyFixedField").classList.toggle("is-hidden", !fixed);
}

function updateRenovationFields() {
  const itemised = fields.renovationBudgetMode.value === "itemised";
  byId("renovationTotalField").classList.toggle("is-hidden", itemised);
  byId("itemisedRenovation").classList.toggle("is-hidden", !itemised);
}

function updateCostModeFields() {
  const totalHolding = fields.holdingCostMode.value === "total";
  byId("holdingMonthlyFields").classList.toggle("is-hidden", totalHolding);
  byId("holdingTotalField").classList.toggle("is-hidden", !totalHolding);
  const totalFinance = fields.financeCostMode.value === "total";
  byId("financeMonthlyFields").classList.toggle("is-hidden", totalFinance);
  byId("financeTotalField").classList.toggle("is-hidden", !totalFinance);
}

function updateFlipCalculator() {
  const resale = value(fields.resaleValue);
  const months = Math.max(1, value(fields.projectMonths));
  const gstRegistered = fields.gstRegistered.checked;
  const purchaseGstClaimable = gstRegistered && fields.purchaseGstClaimable.checked;
  const taxRate = Math.min(value(fields.incomeTaxRate) / 100, 0.9);

  const itemisedRenovationGross = [
    fields.renoDesign, fields.renoDemolition, fields.renoBuilding, fields.renoPlumbing,
    fields.renoElectrical, fields.renoKitchen, fields.renoBathrooms, fields.renoFlooring,
    fields.renoPainting, fields.renoExterior, fields.renoLandscaping, fields.renoOther,
  ].reduce((total, field) => total + value(field), 0);
  const renovationGross = fields.renovationBudgetMode.value === "itemised"
    ? itemisedRenovationGross
    : value(fields.renovationCost);
  const contingencyGross = renovationGross * value(fields.contingencyRate) / 100;
  const acquisitionGross = value(fields.legalCost) + value(fields.limCost)
    + value(fields.buildersReportCost) + value(fields.otherAcquisitionCost);
  const agencyGross = fields.agencyFeeMode.value === "fixed"
    ? value(fields.sellingFixed)
    : resale * value(fields.sellingRate) / 100;
  const saleCostsGross = agencyGross + value(fields.marketingCost)
    + value(fields.stagingCost) + value(fields.otherSaleCost);

  const gstEligibleHoldingGross = (
    value(fields.ratesMonthly) + value(fields.insuranceMonthly) + value(fields.utilitiesMonthly)
    + value(fields.securityMonthly) + value(fields.otherHoldingMonthly)
  ) * months;
  const holdingGross = fields.holdingCostMode.value === "total"
    ? value(fields.holdingTotalCost)
    : gstEligibleHoldingGross;
  const financeNet = fields.financeCostMode.value === "total"
    ? value(fields.financeTotalCost)
    : value(fields.interestMonthly) * months + value(fields.financeFees);

  const saleNet = netOfGst(resale, gstRegistered);
  const saleGst = resale - saleNet;
  const renovationInclusive = renovationGross + contingencyGross;
  const transactionInclusive = acquisitionGross + saleCostsGross;
  const carryInclusive = holdingGross + financeNet;
  const gstEligibleGross = renovationInclusive + transactionInclusive + holdingGross;
  const gstCredits = gstRegistered ? gstEligibleGross - netOfGst(gstEligibleGross, true) : 0;
  const gstWashupBeforePurchase = gstCredits - saleGst;
  const targetAfterTaxProfit = value(fields.targetProfit);
  const requiredPreTaxProfit = targetAfterTaxProfit / (1 - taxRate);
  const incomeTaxProvision = requiredPreTaxProfit - targetAfterTaxProfit;
  const purchaseAllowanceBeforePurchaseGst = resale - renovationInclusive - transactionInclusive
    - carryInclusive + gstWashupBeforePurchase - requiredPreTaxProfit;
  const purchaseGstCredit = purchaseGstClaimable ? purchaseAllowanceBeforePurchaseGst * GST_RATE : 0;
  const maxOffer = purchaseAllowanceBeforePurchaseGst + purchaseGstCredit;
  const renovationNet = netOfGst(renovationInclusive, gstRegistered);
  const acquisitionNet = netOfGst(acquisitionGross, gstRegistered);
  const saleCostsNet = netOfGst(saleCostsGross, gstRegistered);
  const holdingNet = netOfGst(holdingGross, gstRegistered);
  const netProjectCosts = renovationNet + acquisitionNet + saleCostsNet + holdingNet + financeNet;
  const offerRatio = resale > 0 ? maxOffer / resale * 100 : 0;
  currentSummary = {
    maxOffer, resale, offerRatio, months, renovationNet, acquisitionNet, saleCostsNet,
    holdingNet, financeNet, netProjectCosts, targetAfterTaxProfit, requiredPreTaxProfit,
    gstCredits, incomeTaxProvision, gstRegistered,
  };

  byId("maxOffer").textContent = currency.format(Math.max(0, maxOffer));
  byId("renovationSubtotal").textContent = currency.format(itemisedRenovationGross);
  byId("offerRatio").textContent = `${Math.max(0, offerRatio).toFixed(1)}% of resale value`;
  byId("resaleOutput").textContent = currency.format(resale);
  byId("saleGstOutput").textContent = currency.format(saleGst);
  byId("renovationOutput").textContent = negativeCurrency(renovationInclusive);
  byId("acquisitionOutput").textContent = negativeCurrency(acquisitionGross);
  byId("saleCostsOutput").textContent = negativeCurrency(saleCostsGross);
  byId("holdingOutput").textContent = negativeCurrency(holdingGross);
  byId("financeOutput").textContent = negativeCurrency(financeNet);
  const totalGstWashup = gstWashupBeforePurchase + purchaseGstCredit;
  byId("gstWashupLabel").textContent = totalGstWashup >= 0 ? "Add GST refund" : "Less GST payable";
  byId("gstWashupOutput").textContent = signedCurrencyWithPlus(totalGstWashup);
  byId("gstWashupOutput").classList.toggle("is-refund", totalGstWashup > 0);
  byId("gstWashupOutput").classList.toggle("is-payable", totalGstWashup < 0);
  byId("monthsOutput").textContent = fields.holdingCostMode.value === "total"
    ? "total"
    : `${months} ${months === 1 ? "month" : "months"}`;
  byId("preTaxProfitOutput").textContent = negativeCurrency(requiredPreTaxProfit);
  byId("netPurchaseOutput").textContent = currency.format(Math.max(0, maxOffer));
  byId("gstCreditsOutput").textContent = currency.format(gstCredits + purchaseGstCredit);
  byId("incomeTaxOutput").textContent = currency.format(incomeTaxProvision);
  byId("afterTaxOutput").textContent = currency.format(targetAfterTaxProfit);

  byId("purchaseGstRow").classList.toggle("is-disabled", !gstRegistered);
  fields.purchaseGstClaimable.disabled = !gstRegistered;
  const isUnworkable = maxOffer <= 0;
  byId("resultAlert").classList.toggle("is-negative", isUnworkable);
  byId("resultAlert").querySelector("strong").textContent =
    isUnworkable ? "Deal does not stack up." : "Offer guardrail set.";
  byId("resultAlert").querySelector("span").textContent = isUnworkable
    ? "The target profit and project costs exceed the net resale proceeds."
    : "This is the highest price that preserves your target profit under these assumptions.";
}

function getSavedDeals() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function storeSavedDeals(deals) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
    return true;
  } catch {
    return false;
  }
}

function captureFormValues() {
  return Object.fromEntries(
    [...byId("flipForm").querySelectorAll("input, select")]
      .filter((element) => element.id)
      .map((element) => [element.id, element.type === "checkbox" ? element.checked : element.value])
  );
}

function restoreFormValues(values) {
  Object.entries(values).forEach(([id, savedValue]) => {
    const element = byId(id);
    if (!element) return;
    if (element.type === "checkbox") element.checked = Boolean(savedValue);
    else element.value = savedValue;
  });
  formatAllMoneyInputs();
  updateAgencyFields();
  updateRenovationFields();
  updateCostModeFields();
  updateFlipCalculator();
  window.scrollTo({ top: document.querySelector(".flip-workbench").offsetTop, behavior: "smooth" });
}

function saveCurrentDeal() {
  const address = byId("propertyAddress").value.trim();
  const message = byId("saveMessage");
  if (!address) {
    message.textContent = "Enter a property address before saving.";
    message.classList.remove("is-success");
    byId("propertyAddress").focus();
    return;
  }

  const deals = getSavedDeals();
  const isUpdatingActiveDeal = activeDealId && address === activeDealAddress;
  const deal = {
    id: isUpdatingActiveDeal ? activeDealId : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    address,
    name: byId("dealName").value.trim(),
    savedAt: new Date().toISOString(),
    values: captureFormValues(),
    summary: currentSummary,
  };
  const existingIndex = deals.findIndex((saved) => saved.id === deal.id);
  if (existingIndex >= 0) deals[existingIndex] = deal;
  else deals.push(deal);
  activeDealId = deal.id;
  activeDealAddress = address;
  if (!storeSavedDeals(deals)) {
    message.textContent = "This browser is blocking local storage, so the deal could not be saved.";
    message.classList.remove("is-success");
    return;
  }
  message.textContent = existingIndex >= 0 ? "Saved deal updated." : "Deal saved for comparison.";
  message.classList.add("is-success");
  byId("saveDeal").textContent = "Update saved deal";
  renderSavedDeals();
}

function formatNumber(amount) {
  return currency.format(Math.max(0, Number(amount) || 0));
}

function renderSavedDeals() {
  const deals = getSavedDeals();
  byId("savedCount").textContent = `${deals.length} saved ${deals.length === 1 ? "deal" : "deals"}`;
  byId("emptyDeals").classList.toggle("is-hidden", deals.length > 0);
  byId("comparisonWrap").classList.toggle("is-hidden", deals.length === 0);
  const head = byId("comparisonHead");
  const body = byId("comparisonBody");
  head.replaceChildren();
  body.replaceChildren();
  const metricHeader = document.createElement("th");
  metricHeader.textContent = "Metric";
  head.append(metricHeader);

  deals.forEach((deal) => {
    const th = document.createElement("th");
    const title = document.createElement("strong");
    title.textContent = deal.address;
    const note = document.createElement("span");
    note.textContent = deal.name || "Saved property deal";
    const duration = document.createElement("em");
    const savedMonths = deal.summary?.months || deal.values?.projectMonths || 0;
    duration.textContent = `${savedMonths} ${Number(savedMonths) === 1 ? "month" : "months"} project`;
    const actions = document.createElement("div");
    actions.className = "deal-actions";
    actions.innerHTML = `<button type="button" class="deal-action" data-load="${deal.id}">Load</button><button type="button" class="deal-action delete" data-delete="${deal.id}">Delete</button>`;
    th.append(title, note, duration, actions);
    head.append(th);
  });

  const rows = [
    ["Maximum offer", (s) => formatNumber(s.maxOffer)],
    ["Project length", (s) => `${s.months || 0} ${Number(s.months) === 1 ? "month" : "months"}`],
    ["Expected resale", (s) => formatNumber(s.resale)],
    ["Offer / resale", (s) => `${(s.offerRatio || 0).toFixed(1)}%`],
    ["Renovation + contingency", (s) => formatNumber(s.renovationNet)],
    ["Acquisition costs", (s) => formatNumber(s.acquisitionNet)],
    ["Costs of sale", (s) => formatNumber(s.saleCostsNet)],
    ["Holding costs", (s) => formatNumber(s.holdingNet)],
    ["Finance + interest", (s) => formatNumber(s.financeNet)],
    ["Total project costs", (s) => formatNumber(s.netProjectCosts)],
    ["Target profit after tax", (s) => formatNumber(s.targetAfterTaxProfit)],
    ["Income tax provision", (s) => formatNumber(s.incomeTaxProvision)],
    ["GST treatment", (s) => s.gstRegistered ? "GST registered" : "Not GST registered"],
  ];
  rows.forEach(([label, formatter]) => {
    const tr = document.createElement("tr");
    const metric = document.createElement("td");
    metric.textContent = label;
    tr.append(metric);
    deals.forEach((deal) => {
      const td = document.createElement("td");
      td.textContent = formatter(deal.summary || {});
      tr.append(td);
    });
    body.append(tr);
  });
}

function handleSavedDealAction(event) {
  const loadId = event.target.dataset.load;
  const deleteId = event.target.dataset.delete;
  const deals = getSavedDeals();
  if (loadId) {
    const deal = deals.find((saved) => saved.id === loadId);
    if (!deal) return;
    activeDealId = deal.id;
    activeDealAddress = deal.address;
    restoreFormValues(deal.values);
    byId("saveDeal").textContent = "Update saved deal";
    byId("saveMessage").textContent = "Saved deal loaded. Changes are not saved until updated.";
    byId("saveMessage").classList.remove("is-success");
  }
  if (deleteId) {
    if (!storeSavedDeals(deals.filter((saved) => saved.id !== deleteId))) return;
    if (activeDealId === deleteId) {
      activeDealId = null;
      activeDealAddress = "";
      byId("saveDeal").textContent = "Save this deal";
    }
    renderSavedDeals();
  }
}

function startNewDeal() {
  activeDealId = null;
  activeDealAddress = "";
  byId("propertyAddress").value = "";
  byId("dealName").value = "";
  byId("saveDeal").textContent = "Save this deal";
  byId("saveMessage").textContent = "New deal started. Current calculation assumptions have been kept.";
  byId("saveMessage").classList.remove("is-success");
  byId("propertyAddress").focus();
}

byId("flipForm").addEventListener("input", () => {
  if (activeDealId && byId("propertyAddress").value.trim() !== activeDealAddress) {
    byId("saveDeal").textContent = "Save as new deal";
    byId("saveMessage").textContent = "Address changed. Saving will create a new deal.";
    byId("saveMessage").classList.remove("is-success");
  } else if (activeDealId) {
    byId("saveDeal").textContent = "Update saved deal";
  }
  updateAgencyFields();
  updateRenovationFields();
  updateCostModeFields();
  updateFlipCalculator();
});
byId("flipForm").addEventListener("reset", () => window.setTimeout(() => {
  activeDealId = null;
  activeDealAddress = "";
  byId("saveDeal").textContent = "Save this deal";
  byId("saveMessage").textContent = "Saved deals stay in this browser.";
  byId("saveMessage").classList.remove("is-success");
  formatAllMoneyInputs();
  updateAgencyFields();
  updateRenovationFields();
  updateCostModeFields();
  updateFlipCalculator();
}, 0));
byId("saveDeal").addEventListener("click", saveCurrentDeal);
byId("newDeal").addEventListener("click", startNewDeal);
byId("comparisonWrap").addEventListener("click", handleSavedDealAction);
setupMoneyInputs();
updateAgencyFields();
updateRenovationFields();
updateCostModeFields();
updateFlipCalculator();
renderSavedDeals();
