const GST_RATE = 0.15;
const STORAGE_KEY = "propertyInvestmentGuru.profitDeals.v1";
const byId = (id) => document.querySelector(`#${id}`);
const moneyIds = [
  "purchasePrice", "resaleValue", "renovationCost", "renoDesign", "renoDemolition",
  "renoBuilding", "renoPlumbing", "renoElectrical", "renoKitchen", "renoBathrooms",
  "renoFlooring", "renoPainting", "renoExterior", "renoLandscaping", "renoOther",
  "legalCost", "limCost", "buildersReportCost", "otherAcquisitionCost", "sellingFixed",
  "marketingCost", "stagingCost", "otherSaleCost", "holdingTotalCost", "ratesMonthly",
  "insuranceMonthly", "utilitiesMonthly", "securityMonthly", "otherHoldingMonthly",
  "financeTotalCost", "interestMonthly", "financeFees",
];
const fields = Object.fromEntries([
  ...moneyIds,
  "incomeTaxRate", "projectMonths", "contingencyRate", "sellingRate",
].map((id) => [id, byId(id)]));
fields.gstRegistered = byId("gstRegistered");
fields.purchaseGstClaimable = byId("purchaseGstClaimable");
fields.renovationBudgetMode = byId("renovationBudgetMode");
fields.agencyFeeMode = byId("agencyFeeMode");
fields.holdingCostMode = byId("holdingCostMode");
fields.financeCostMode = byId("financeCostMode");

const currency = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-NZ", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const numberFromText = (text) => Number(String(text).replace(/,/g, "")) || 0;
const value = (field) => Math.max(0, numberFromText(field.value));
const netOfGst = (gross, gstRegistered, gstEligible = true) => gstRegistered && gstEligible ? gross / (1 + GST_RATE) : gross;
const signedCurrency = (amount) => `${amount < 0 ? "-" : ""}${currency.format(Math.abs(amount))}`;
const signedCurrencyWithPlus = (amount) => `${amount > 0 ? "+" : amount < 0 ? "-" : ""}${currency.format(Math.abs(amount))}`;
const negativeCurrency = (amount) => `-${currency.format(Math.max(0, amount))}`;
let currentSummary = {};
let activeDealId = null;
let activeDealAddress = "";

function formatMoneyValue(rawValue) {
  const digits = String(rawValue).replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("en-NZ") : "";
}

function setupMoneyInputs() {
  moneyIds.forEach((id) => {
    const input = byId(id);
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.value = formatMoneyValue(input.value);
    input.addEventListener("input", () => {
      input.value = formatMoneyValue(input.value);
    });
  });
}

function updateVisibleFields() {
  const itemised = fields.renovationBudgetMode.value === "itemised";
  byId("renovationTotalField").classList.toggle("is-hidden", itemised);
  byId("itemisedRenovation").classList.toggle("is-hidden", !itemised);
  const fixedAgency = fields.agencyFeeMode.value === "fixed";
  byId("agencyPercentField").classList.toggle("is-hidden", fixedAgency);
  byId("agencyFixedField").classList.toggle("is-hidden", !fixedAgency);
  const totalHolding = fields.holdingCostMode.value === "total";
  byId("holdingMonthlyFields").classList.toggle("is-hidden", totalHolding);
  byId("holdingTotalField").classList.toggle("is-hidden", !totalHolding);
  const totalFinance = fields.financeCostMode.value === "total";
  byId("financeMonthlyFields").classList.toggle("is-hidden", totalFinance);
  byId("financeTotalField").classList.toggle("is-hidden", !totalFinance);
  byId("purchaseGstRow").classList.toggle("is-disabled", !fields.gstRegistered.checked);
  fields.purchaseGstClaimable.disabled = !fields.gstRegistered.checked;
}

function calculateProfit() {
  const gstRegistered = fields.gstRegistered.checked;
  const purchaseGstClaimable = gstRegistered && fields.purchaseGstClaimable.checked;
  const months = Math.max(1, value(fields.projectMonths));
  const taxRate = Math.min(value(fields.incomeTaxRate) / 100, 0.9);
  const purchaseGross = value(fields.purchasePrice);
  const resaleGross = value(fields.resaleValue);

  const itemisedRenovationGross = [
    "renoDesign", "renoDemolition", "renoBuilding", "renoPlumbing", "renoElectrical",
    "renoKitchen", "renoBathrooms", "renoFlooring", "renoPainting", "renoExterior",
    "renoLandscaping", "renoOther",
  ].reduce((total, id) => total + value(fields[id]), 0);
  const renovationGross = fields.renovationBudgetMode.value === "itemised"
    ? itemisedRenovationGross
    : value(fields.renovationCost);
  const contingencyGross = renovationGross * value(fields.contingencyRate) / 100;
  const acquisitionGross = value(fields.legalCost) + value(fields.limCost)
    + value(fields.buildersReportCost) + value(fields.otherAcquisitionCost);
  const agencyGross = fields.agencyFeeMode.value === "fixed"
    ? value(fields.sellingFixed)
    : resaleGross * value(fields.sellingRate) / 100;
  const saleCostsGross = agencyGross + value(fields.marketingCost)
    + value(fields.stagingCost) + value(fields.otherSaleCost);
  const monthlyHoldingGross = (
    value(fields.ratesMonthly) + value(fields.insuranceMonthly) + value(fields.utilitiesMonthly)
    + value(fields.securityMonthly) + value(fields.otherHoldingMonthly)
  ) * months;
  const holdingGross = fields.holdingCostMode.value === "total" ? value(fields.holdingTotalCost) : monthlyHoldingGross;
  const financeNet = fields.financeCostMode.value === "total"
    ? value(fields.financeTotalCost)
    : value(fields.interestMonthly) * months + value(fields.financeFees);

  const saleNet = netOfGst(resaleGross, gstRegistered);
  const saleGst = resaleGross - saleNet;
  const purchaseNet = purchaseGstClaimable ? netOfGst(purchaseGross, gstRegistered) : purchaseGross;
  const purchaseGstCredit = purchaseGstClaimable ? purchaseGross - purchaseNet : 0;
  const projectGstEligibleGross = renovationGross + contingencyGross + acquisitionGross + saleCostsGross + holdingGross;
  const projectGstCredits = gstRegistered ? projectGstEligibleGross - netOfGst(projectGstEligibleGross, true) : 0;
  const gstCredits = purchaseGstCredit + projectGstCredits;
  const gstWashup = gstCredits - saleGst;
  const renovationInclusive = renovationGross + contingencyGross;
  const transactionInclusive = acquisitionGross + saleCostsGross;
  const carryInclusive = holdingGross + financeNet;
  const totalCashCosts = purchaseGross + renovationInclusive + transactionInclusive + carryInclusive;
  const profitBeforeGst = resaleGross - totalCashCosts;
  const taxableProfit = profitBeforeGst + gstWashup;
  const incomeTax = Math.max(0, taxableProfit * taxRate);
  const afterTaxProfit = taxableProfit - incomeTax;
  const margin = resaleGross > 0 ? afterTaxProfit / resaleGross * 100 : 0;
  const roi = totalCashCosts > 0 ? afterTaxProfit / totalCashCosts * 100 : 0;
  currentSummary = {
    afterTaxProfit, taxableProfit, incomeTax, resaleGross, purchaseGross, months,
    margin, roi, totalCashCosts, profitBeforeGst, gstWashup, gstCredits, saleGst, gstRegistered,
  };

  byId("renovationSubtotal").textContent = currency.format(itemisedRenovationGross);
  byId("afterTaxProfit").textContent = signedCurrency(afterTaxProfit);
  byId("profitMargin").textContent = `${percent.format(margin)}% of resale value`;
  byId("stepResale").textContent = currency.format(resaleGross);
  byId("stepPurchase").textContent = negativeCurrency(purchaseGross);
  byId("stepRenovation").textContent = negativeCurrency(renovationInclusive);
  byId("stepTransaction").textContent = negativeCurrency(transactionInclusive);
  byId("stepCarry").textContent = negativeCurrency(carryInclusive);
  byId("profitBeforeGstTax").textContent = signedCurrency(profitBeforeGst);
  byId("stepGstLabel").textContent = gstWashup >= 0 ? "Add GST refund" : "Less GST payable";
  byId("stepGstWashup").textContent = signedCurrencyWithPlus(gstWashup);
  byId("stepGstWashup").classList.toggle("is-refund", gstWashup > 0);
  byId("stepGstWashup").classList.toggle("is-payable", gstWashup < 0);
  byId("taxableProfit").textContent = signedCurrency(taxableProfit);
  byId("incomeTaxOutput").textContent = negativeCurrency(incomeTax);
  byId("gstCreditsOutput").textContent = currency.format(gstCredits);
  byId("saleGstSummary").textContent = currency.format(saleGst);
  byId("totalCostsOutput").textContent = currency.format(totalCashCosts);
  byId("roiOutput").textContent = `${percent.format(roi)}%`;

  const isLoss = afterTaxProfit < 0;
  byId("resultAlert").classList.toggle("is-loss", isLoss);
  byId("resultAlert").querySelector("strong").textContent = isLoss ? "Projected loss." : "Profit estimate ready.";
  byId("resultAlert").querySelector("span").textContent = isLoss
    ? "The current assumptions produce a loss after project costs and tax."
    : "Follow the numbered steps to see where the money goes.";
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
    [...byId("profitForm").querySelectorAll("input, select")]
      .filter((element) => element.id)
      .map((element) => [element.id, element.type === "checkbox" ? element.checked : element.value])
  );
}

function formatAllMoneyInputs() {
  moneyIds.forEach((id) => {
    byId(id).value = formatMoneyValue(byId(id).value);
  });
}

function restoreFormValues(values) {
  Object.entries(values).forEach(([id, savedValue]) => {
    const element = byId(id);
    if (!element) return;
    if (element.type === "checkbox") element.checked = Boolean(savedValue);
    else element.value = savedValue;
  });
  formatAllMoneyInputs();
  updateAll();
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

function formatCurrencyMetric(amount) {
  return signedCurrency(Number(amount) || 0);
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
    note.textContent = deal.name || "Saved profit scenario";
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
    ["Profit after tax", (s) => formatCurrencyMetric(s.afterTaxProfit)],
    ["Project length", (s) => `${s.months || 0} ${Number(s.months) === 1 ? "month" : "months"}`],
    ["Purchase price", (s) => currency.format(Math.max(0, s.purchaseGross || 0))],
    ["Expected resale", (s) => currency.format(Math.max(0, s.resaleGross || 0))],
    ["Profit before GST and tax", (s) => formatCurrencyMetric(s.profitBeforeGst)],
    ["Taxable profit", (s) => formatCurrencyMetric(s.taxableProfit)],
    ["Income tax provision", (s) => currency.format(Math.max(0, s.incomeTax || 0))],
    ["GST payable / refund", (s) => signedCurrencyWithPlus(s.gstWashup || 0)],
    ["GST on sale", (s) => currency.format(Math.max(0, s.saleGst || 0))],
    ["GST credits", (s) => currency.format(Math.max(0, s.gstCredits || 0))],
    ["Total cash costs", (s) => currency.format(Math.max(0, s.totalCashCosts || 0))],
    ["Profit margin", (s) => `${percent.format(s.margin || 0)}%`],
    ["Return on cash cost", (s) => `${percent.format(s.roi || 0)}%`],
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

function updateAll() {
  updateVisibleFields();
  calculateProfit();
}

byId("profitForm").addEventListener("input", () => {
  if (activeDealId && byId("propertyAddress").value.trim() !== activeDealAddress) {
    byId("saveDeal").textContent = "Save as new deal";
    byId("saveMessage").textContent = "Address changed. Saving will create a new deal.";
    byId("saveMessage").classList.remove("is-success");
  } else if (activeDealId) {
    byId("saveDeal").textContent = "Update saved deal";
  }
  updateAll();
});
byId("profitForm").addEventListener("reset", () => window.setTimeout(() => {
  activeDealId = null;
  activeDealAddress = "";
  byId("saveDeal").textContent = "Save this deal";
  byId("saveMessage").textContent = "Saved deals stay in this browser.";
  byId("saveMessage").classList.remove("is-success");
  formatAllMoneyInputs();
  updateAll();
}, 0));
byId("saveDeal").addEventListener("click", saveCurrentDeal);
byId("newDeal").addEventListener("click", startNewDeal);
byId("comparisonWrap").addEventListener("click", handleSavedDealAction);
setupMoneyInputs();
updateAll();
renderSavedDeals();
