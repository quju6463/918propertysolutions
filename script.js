const inputs = {
  price: document.querySelector("#price"),
  deposit: document.querySelector("#deposit"),
  rent: document.querySelector("#rent"),
  rate: document.querySelector("#rate"),
};

const output = {
  priceLabel: document.querySelector("#priceLabel"),
  depositLabel: document.querySelector("#depositLabel"),
  rentLabel: document.querySelector("#rentLabel"),
  rateLabel: document.querySelector("#rateLabel"),
  cashflow: document.querySelector("#cashflow"),
  resultStatus: document.querySelector("#resultStatus"),
  yield: document.querySelector("#yield"),
  loan: document.querySelector("#loan"),
  weekly: document.querySelector("#weekly"),
  needed: document.querySelector("#needed"),
};

const rentPresets = {
  wellington: {
    area: "Wellington",
    lower: 560,
    median: 670,
    upper: 820,
    bonds: "Verify source",
    window: "Stored example - verify before relying",
    note: "Stored example only. Use Tenancy Services to confirm the exact suburb, dwelling type and latest six-month rent range.",
  },
  "lower-hutt": {
    area: "Lower Hutt",
    lower: 540,
    median: 650,
    upper: 780,
    bonds: "Verify source",
    window: "Stored example - verify before relying",
    note: "Stored example only. Verify the exact suburb on Tenancy Services before relying on yield.",
  },
  porirua: {
    area: "Porirua",
    lower: 560,
    median: 680,
    upper: 800,
    bonds: "Verify source",
    window: "Stored example - verify before relying",
    note: "Stored example only. Use the lower rent case to stress-test holding costs, then verify the suburb on Tenancy Services.",
  },
  "upper-hutt": {
    area: "Upper Hutt",
    lower: 520,
    median: 630,
    upper: 760,
    bonds: "Verify source",
    window: "Stored example - verify before relying",
    note: "Stored example only. Check the exact suburb and property type on Tenancy Services because rent ranges can move sharply by location.",
  },
  kapiti: {
    area: "Kapiti Coast",
    lower: 520,
    median: 640,
    upper: 780,
    bonds: "Verify source",
    window: "Stored example - verify before relying",
    note: "Stored example only. Confirm the current suburb data before making an offer.",
  },
  avondale: {
    area: "Avondale, Auckland",
    lower: 503,
    median: 620,
    upper: 710,
    bonds: "2,511",
    window: "01 Oct 2025 - 31 Mar 2026",
    note: "Stored example only. Use Tenancy Services to check the exact suburb for your deal.",
  },
};

const rentPanel = {
  areaSelect: document.querySelector("#rentAreaSelect"),
  areaName: document.querySelector("#rentAreaName"),
  dataWindow: document.querySelector("#rentDataWindow"),
  lowerValue: document.querySelector("#rentLowerValue"),
  medianValue: document.querySelector("#rentMedianValue"),
  upperValue: document.querySelector("#rentUpperValue"),
  lowerBar: document.querySelector("#rentLowerBar"),
  medianBar: document.querySelector("#rentMedianBar"),
  upperBar: document.querySelector("#rentUpperBar"),
  bonds: document.querySelector("#rentBondValue"),
  note: document.querySelector("#rentPanelNote"),
};

const currency = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

function signedCurrency(value) {
  return `${value >= 0 ? "+" : "−"}${currency.format(Math.abs(value))}`;
}

function updateCalculator() {
  const price = Number(inputs.price.value);
  const deposit = Number(inputs.deposit.value);
  const rent = Number(inputs.rent.value);
  const rate = Number(inputs.rate.value);

  const loan = price * (1 - deposit / 100);
  const annualRent = rent * 52;
  const operatingCosts = annualRent * 0.22;
  const interest = loan * (rate / 100);
  const annualCashflow = annualRent - operatingCosts - interest;
  const weeklyCashflow = annualCashflow / 52;
  const rentNeeded = (interest / 0.78) / 52;

  output.priceLabel.textContent = currency.format(price);
  output.depositLabel.textContent = `${deposit}%`;
  output.rentLabel.textContent = currency.format(rent);
  output.rateLabel.textContent = `${rate.toFixed(2)}%`;
  output.cashflow.textContent = signedCurrency(annualCashflow);
  output.yield.textContent = `${((annualRent / price) * 100).toFixed(2)}%`;
  output.loan.textContent = currency.format(loan);
  output.weekly.textContent = signedCurrency(weeklyCashflow);
  output.needed.textContent = `${currency.format(rentNeeded)}/wk`;

  output.resultStatus.textContent = annualCashflow >= 0 ? "Cash-flow positive" : "Top-up required";
}

function updateRentPanel() {
  if (!rentPanel.areaSelect) return;

  const preset = rentPresets[rentPanel.areaSelect.value] || rentPresets.wellington;
  const lower = preset.lower;
  const median = preset.median;
  const upper = preset.upper;
  const maxRent = Math.max(lower, median, upper, 1);

  rentPanel.lowerValue.textContent = currency.format(lower);
  rentPanel.medianValue.textContent = currency.format(median);
  rentPanel.upperValue.textContent = currency.format(upper);
  rentPanel.lowerBar.style.setProperty("--value", `${Math.max(36, (lower / maxRent) * 100)}%`);
  rentPanel.medianBar.style.setProperty("--value", `${Math.max(36, (median / maxRent) * 100)}%`);
  rentPanel.upperBar.style.setProperty("--value", `${Math.max(36, (upper / maxRent) * 100)}%`);
}

function applyRentPreset(key) {
  const preset = rentPresets[key] || rentPresets.wellington;
  rentPanel.areaSelect.value = key;
  rentPanel.areaName.textContent = preset.area;
  rentPanel.dataWindow.textContent = preset.window;
  rentPanel.bonds.textContent = preset.bonds;
  rentPanel.note.textContent = preset.note;
  updateRentPanel();
}

Object.values(inputs).forEach((input) => input.addEventListener("input", updateCalculator));
if (rentPanel.areaSelect) {
  rentPanel.areaSelect.addEventListener("change", () => applyRentPreset(rentPanel.areaSelect.value));
  window.updateRentArea = applyRentPreset;
  applyRentPreset("wellington");
}
updateCalculator();
