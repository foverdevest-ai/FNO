const STORAGE_KEY = "fno-wealth-planner";

const demoState = {
  profile: {
    monthlyIncome: 6200,
    cashReserve: 18000,
    projectionYears: 10,
  },
  expenses: [
    { id: crypto.randomUUID(), label: "Mortgage", category: "Housing", amount: 1450 },
    { id: crypto.randomUUID(), label: "Groceries", category: "Food", amount: 520 },
    { id: crypto.randomUUID(), label: "Car + fuel", category: "Transport", amount: 430 },
    { id: crypto.randomUUID(), label: "Insurance", category: "Insurance", amount: 260 },
    { id: crypto.randomUUID(), label: "Subscriptions", category: "Lifestyle", amount: 95 },
  ],
  assets: [
    {
      id: crypto.randomUUID(),
      label: "Bitcoin stack",
      type: "Crypto",
      currentValue: 18000,
      monthlyContribution: 350,
      annualReturn: 18,
    },
    {
      id: crypto.randomUUID(),
      label: "ETF portfolio",
      type: "Stocks",
      currentValue: 42000,
      monthlyContribution: 900,
      annualReturn: 8,
    },
    {
      id: crypto.randomUUID(),
      label: "Rental property equity",
      type: "Real Estate",
      currentValue: 85000,
      monthlyContribution: 400,
      annualReturn: 5.5,
    },
    {
      id: crypto.randomUUID(),
      label: "Cash savings",
      type: "Cash",
      currentValue: 18000,
      monthlyContribution: 300,
      annualReturn: 1.5,
    },
  ],
};

const state = loadState();

const profileForm = document.querySelector("#profile-form");
const expenseForm = document.querySelector("#expense-form");
const assetForm = document.querySelector("#asset-form");
const summaryCards = document.querySelector("#summary-cards");
const expenseList = document.querySelector("#expense-list");
const assetList = document.querySelector("#asset-list");
const projectionHighlights = document.querySelector("#projection-highlights");
const projectionTable = document.querySelector("#projection-table");
const projectionChart = document.querySelector("#projection-chart");
const rowTemplate = document.querySelector("#item-row-template");
const loadDemoButton = document.querySelector("#load-demo");
const resetButton = document.querySelector("#reset-data");

profileForm.addEventListener("submit", handleProfileSubmit);
expenseForm.addEventListener("submit", handleExpenseSubmit);
assetForm.addEventListener("submit", handleAssetSubmit);
loadDemoButton.addEventListener("click", () => {
  Object.assign(state, structuredClone(demoState));
  saveState();
  render();
});
resetButton.addEventListener("click", () => {
  if (!window.confirm("Reset all stored planner data?")) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, createDefaultState());
  render();
});

render();

function createDefaultState() {
  return {
    profile: {
      monthlyIncome: 0,
      cashReserve: 0,
      projectionYears: 10,
    },
    expenses: [],
    assets: [],
  };
}

function loadState() {
  const rawState = localStorage.getItem(STORAGE_KEY);

  if (!rawState) {
    return createDefaultState();
  }

  try {
    return { ...createDefaultState(), ...JSON.parse(rawState) };
  } catch {
    return createDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function handleProfileSubmit(event) {
  event.preventDefault();

  const formData = new FormData(profileForm);
  state.profile.monthlyIncome = toNumber(formData.get("monthlyIncome"));
  state.profile.cashReserve = toNumber(formData.get("cashReserve"));
  state.profile.projectionYears = Math.max(1, Math.min(40, toNumber(formData.get("projectionYears"))));

  saveState();
  render();
}

function handleExpenseSubmit(event) {
  event.preventDefault();

  const formData = new FormData(expenseForm);
  state.expenses.push({
    id: crypto.randomUUID(),
    label: String(formData.get("label")).trim(),
    category: String(formData.get("category")).trim(),
    amount: toNumber(formData.get("amount")),
  });

  expenseForm.reset();
  saveState();
  render();
}

function handleAssetSubmit(event) {
  event.preventDefault();

  const formData = new FormData(assetForm);
  state.assets.push({
    id: crypto.randomUUID(),
    label: String(formData.get("label")).trim(),
    type: String(formData.get("type")).trim(),
    currentValue: toNumber(formData.get("currentValue")),
    monthlyContribution: toNumber(formData.get("monthlyContribution")),
    annualReturn: toNumber(formData.get("annualReturn")),
  });

  assetForm.reset();
  saveState();
  render();
}

function render() {
  hydrateProfileForm();
  renderSummary();
  renderExpenseList();
  renderAssetList();
  renderProjection();
  saveState();
}

function hydrateProfileForm() {
  profileForm.elements.monthlyIncome.value = state.profile.monthlyIncome;
  profileForm.elements.cashReserve.value = state.profile.cashReserve;
  profileForm.elements.projectionYears.value = state.profile.projectionYears;
}

function renderSummary() {
  const monthlyExpenses = sumBy(state.expenses, "amount");
  const monthlyInvestments = sumBy(state.assets, "monthlyContribution");
  const investedAssets = sumBy(state.assets, "currentValue");
  const totalNetWorth = state.profile.cashReserve + investedAssets;
  const freeCashFlow = state.profile.monthlyIncome - monthlyExpenses - monthlyInvestments;
  const projected = buildProjection(state.profile.projectionYears);
  const finalProjection = projected.at(-1)?.total ?? totalNetWorth;

  const cards = [
    { label: "Current net worth", value: formatCurrency(totalNetWorth) },
    { label: "Monthly expenses", value: formatCurrency(monthlyExpenses) },
    { label: "Monthly free cash flow", value: formatCurrency(freeCashFlow) },
    { label: `${state.profile.projectionYears}-year projection`, value: formatCurrency(finalProjection) },
  ];

  summaryCards.innerHTML = "";

  for (const card of cards) {
    const element = document.createElement("article");
    element.className = "summary-card";
    element.innerHTML = `<p>${card.label}</p><strong>${card.value}</strong>`;
    summaryCards.append(element);
  }
}

function renderExpenseList() {
  expenseList.innerHTML = "";

  if (state.expenses.length === 0) {
    expenseList.innerHTML = `<p class="item-meta">No recurring payments added yet.</p>`;
    return;
  }

  for (const expense of state.expenses) {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".item-title").textContent = expense.label;
    row.querySelector(".item-meta").textContent = `${expense.category} payment`;
    row.querySelector(".item-value").textContent = formatCurrency(expense.amount);
    row.querySelector(".delete-button").addEventListener("click", () => {
      state.expenses = state.expenses.filter((item) => item.id !== expense.id);
      render();
    });
    expenseList.append(row);
  }
}

function renderAssetList() {
  assetList.innerHTML = "";

  if (state.assets.length === 0) {
    assetList.innerHTML = `<p class="item-meta">No assets added yet.</p>`;
    return;
  }

  for (const asset of state.assets) {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".item-title").textContent = asset.label;
    row.querySelector(".item-meta").textContent =
      `${asset.type} • ${formatPercent(asset.annualReturn)} expected return • ${formatCurrency(asset.monthlyContribution)}/month`;
    row.querySelector(".item-value").textContent = formatCurrency(asset.currentValue);
    row.querySelector(".delete-button").addEventListener("click", () => {
      state.assets = state.assets.filter((item) => item.id !== asset.id);
      render();
    });
    assetList.append(row);
  }
}

function renderProjection() {
  const points = buildProjection(state.profile.projectionYears);
  const firstYear = getNearestProjection(points, 12);
  const fifthYear = getNearestProjection(points, 60);
  const finalYear = points.at(-1);

  projectionHighlights.innerHTML = "";
  [
    `1 year: ${formatCurrency(firstYear.total)}`,
    `5 years: ${formatCurrency(fifthYear.total)}`,
    `${state.profile.projectionYears} years: ${formatCurrency(finalYear.total)}`,
  ].forEach((label) => {
    const pill = document.createElement("span");
    pill.className = "highlight-pill";
    pill.textContent = label;
    projectionHighlights.append(pill);
  });

  projectionTable.innerHTML = "";

  const breakdowns = [
    { label: "Cash reserve + cash assets", value: finalYear.breakdown.Cash + state.profile.cashReserve },
    { label: "Stocks", value: finalYear.breakdown.Stocks },
    { label: "Crypto + Real Estate", value: finalYear.breakdown.Crypto + finalYear.breakdown["Real Estate"] },
  ];

  for (const item of breakdowns) {
    const metric = document.createElement("article");
    metric.className = "projection-metric";
    metric.innerHTML = `<p>${item.label}</p><strong>${formatCurrency(item.value)}</strong>`;
    projectionTable.append(metric);
  }

  drawChart(points);
}

function buildProjection(years) {
  const months = years * 12;
  const assets = state.assets.map((asset) => ({ ...asset, projectedValue: asset.currentValue }));
  const points = [{ month: 0, total: state.profile.cashReserve + sumBy(assets, "projectedValue"), breakdown: breakdownByType(assets) }];

  for (let month = 1; month <= months; month += 1) {
    for (const asset of assets) {
      const monthlyRate = Math.pow(1 + asset.annualReturn / 100, 1 / 12) - 1;
      asset.projectedValue = asset.projectedValue * (1 + monthlyRate) + asset.monthlyContribution;
    }

    points.push({
      month,
      total: state.profile.cashReserve + sumBy(assets, "projectedValue"),
      breakdown: breakdownByType(assets),
    });
  }

  return points;
}

function breakdownByType(assets) {
  const breakdown = {
    Cash: 0,
    Crypto: 0,
    Stocks: 0,
    "Real Estate": 0,
  };

  for (const asset of assets) {
    if (!(asset.type in breakdown)) {
      breakdown[asset.type] = 0;
    }

    breakdown[asset.type] += asset.projectedValue;
  }

  return breakdown;
}

function getNearestProjection(points, month) {
  return points[Math.min(month, points.length - 1)];
}

function drawChart(points) {
  const width = 960;
  const height = 320;
  const padding = 28;
  const maxValue = Math.max(...points.map((point) => point.total), 1);
  const minValue = 0;

  const xFor = (index) => padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
  const yFor = (value) => height - padding - ((value - minValue) / (maxValue - minValue || 1)) * (height - padding * 2);

  const polylinePoints = points.map((point, index) => `${xFor(index)},${yFor(point.total)}`).join(" ");
  const lastPoint = points.at(-1);

  projectionChart.innerHTML = `
    <defs>
      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(13,122,99,0.35)" />
        <stop offset="100%" stop-color="rgba(13,122,99,0.02)" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="transparent"></rect>
    ${buildGrid(width, height, padding)}
    <polygon
      fill="url(#areaGradient)"
      points="${polylinePoints} ${xFor(points.length - 1)},${height - padding} ${xFor(0)},${height - padding}"
    ></polygon>
    <polyline
      fill="none"
      stroke="#0d7a63"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="${polylinePoints}"
    ></polyline>
    <circle cx="${xFor(points.length - 1)}" cy="${yFor(lastPoint.total)}" r="6" fill="#0d7a63"></circle>
    <text x="${xFor(points.length - 1) - 12}" y="${yFor(lastPoint.total) - 14}" text-anchor="end" fill="#1b2230" font-size="14" font-weight="700">
      ${escapeHtml(formatCurrency(lastPoint.total))}
    </text>
  `;
}

function buildGrid(width, height, padding) {
  const rows = 4;
  let grid = "";

  for (let index = 0; index <= rows; index += 1) {
    const y = padding + ((height - padding * 2) / rows) * index;
    grid += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(27,34,48,0.08)" stroke-width="1" />`;
  }

  return grid;
}

function sumBy(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function toNumber(value) {
  return Number(value) || 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
