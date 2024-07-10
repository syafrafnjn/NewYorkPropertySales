// Sidebar Toggle Functions
function showSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.style.display = "flex";
}

function hideSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.style.display = "none";
}

// Scroll Effects
const title = document.querySelector(".title");
const b2 = document.querySelector(".b2");
const m1 = document.querySelector(".m1");
const m2 = document.querySelector(".m2");

document.addEventListener("scroll", function () {
  let value = window.scrollY;
  title.style.marginTop = value * 1.1 + "px";
  b2.style.marginBottom = -value + "px";
  m1.style.marginBottom = -value * 1.1 + "px";
  m2.style.marginBottom = -value * 1.3 + "px";
});

// Swiper Initialization
var swiper = new Swiper(".mySwiper", {
  effect: "coverflow",
  grabCursor: true,
  centeredSlides: true,
  slidesPerView: "auto",
  loop: true,
  coverflowEffect: {
    rotate: 50,
    stretch: 0,
    depth: 100,
    modifier: 1,
    slideShadows: true,
  },
  pagination: {
    el: ".swiper-pagination",
  },
});

// Data Fetching Function
async function fetchData() {
  const response = await fetch(
    "https://raw.githubusercontent.com/wulannw/NYCdataset/main/NYCTeam10.json"
  );
  const data = await response.json();
  return data.Sheet1;
}

// Helper Function to Sum Data
function sum(data, key) {
  return data.reduce((acc, curr) => acc + Number(curr[key]), 0);
}

// Month Names for Formatting
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Data Filtering and Processing Functions
function createFilter(
  data,
  startDate,
  endDate,
  selectedBoroughs = [],
  selectedZipCode = []
) {
  const uniqueBorough = Array.from(
    new Set(data.map((item) => item["BOROUGH NAME"]))
  ).filter(
    (borough) =>
      selectedBoroughs.length === 0 || selectedBoroughs.includes(borough)
  );

  const filteredData = data
    .map((item) => {
      const [date, month, year] = item["SALE DATE"]
        .split("/")
        .map((val) => Number(val));
      const convertedDate = new Date(year, month - 1, date);

      return {
        ...item,
        date: convertedDate,
        dateValue: { date, month: month - 1, year },
      };
    })
    .filter(
      (item) =>
        selectedBoroughs.length === 0 ||
        selectedBoroughs.includes(item["BOROUGH NAME"])
    )
    .filter(
      (item) =>
        selectedZipCode.length === 0 ||
        selectedZipCode.includes(item["ZIP CODE"])
    )
    .filter((item) => item.date >= startDate && item.date <= endDate);

  function getMonthlySales() {
    const scale = d3
      .scaleUtc()
      .domain([startDate, endDate])
      .ticks(d3.utcMonth.every(1));
    const formattedScale = scale.map(
      (date) => `${monthNames[date.getMonth()]} ${date.getFullYear()}`
    );

    const monthlySales = uniqueBorough.map((borough) => {
      const sales = scale.map((date) => {
        const month = date.getMonth();
        const year = date.getFullYear();

        const dataForMonth = filteredData.filter(
          (data) =>
            data["BOROUGH NAME"] === borough &&
            data.dateValue.month === month &&
            data.dateValue.year === year
        );

        return sum(dataForMonth, "SALE PRICE");
      });

      return { borough, sales };
    });

    return { data: monthlySales, scales: formattedScale };
  }

  return { getMonthlySales, data: filteredData };
}

function processData(data) {
  const boroughData = {};

  data.forEach((item) => {
    const borough = item["BOROUGH NAME"];
    const residentialUnits = Number(item["RESIDENTIAL UNITS"]);
    const commercialUnits = Number(item["COMMERCIAL UNITS"]);
    const salePrice = Number(item["SALE PRICE"]);

    if (!boroughData[borough]) {
      boroughData[borough] = {
        totalSalePrice: 0,
        totalResidentialUnits: 0,
        totalCommercialUnits: 0,
      };
    }

    boroughData[borough].totalSalePrice += salePrice;
    boroughData[borough].totalResidentialUnits += residentialUnits;
    boroughData[borough].totalCommercialUnits += commercialUnits;
  });

  return boroughData;
}

function sortDataBySalePrice(boroughData) {
  return Object.keys(boroughData)
    .sort(
      (a, b) => boroughData[b].totalSalePrice - boroughData[a].totalSalePrice
    )
    .map((borough) => ({ name: borough, ...boroughData[borough] }));
}

function processYearBuiltData(data) {
  const yearBuiltData = {};

  data.forEach((item) => {
    const yearBuilt = item["GROUP YEAR BUILT"];
    const totalUnits = Number(item["TOTAL UNITS"]);

    if (!yearBuiltData[yearBuilt]) {
      yearBuiltData[yearBuilt] = { totalUnits: 0 };
    }

    yearBuiltData[yearBuilt].totalUnits += totalUnits;
  });

  return Object.keys(yearBuiltData)
    .sort((a, b) => Number(a) - Number(b))
    .map((yearBuilt) => ({
      yearBuilt,
      totalUnits: yearBuiltData[yearBuilt].totalUnits,
    }));
}

function processSalePriceData(data) {
  const salePriceData = {};

  data.forEach((item) => {
    const buildingClass = item["BUILDING CLASS CATEGORY"];
    const salePrice = Number(item["SALE PRICE"]);

    if (!salePriceData[buildingClass]) {
      salePriceData[buildingClass] = { totalSalePrice: 0, count: 0 };
    }

    salePriceData[buildingClass].totalSalePrice += salePrice;
    salePriceData[buildingClass].count++;
  });

  return Object.keys(salePriceData)
    .map((key) => ({
      category: key,
      averageSalePrice:
        salePriceData[key].totalSalePrice / salePriceData[key].count,
    }))
    .sort((a, b) => b.averageSalePrice - a.averageSalePrice)
    .slice(0, 10);
}

function processNeighborhoodData(data) {
  const neighborhoodData = {};

  data.forEach((item) => {
    const neighborhood = item["NEIGHBORHOOD"];
    const salePrice = Number(item["SALE PRICE"]);

    if (!neighborhoodData[neighborhood]) {
      neighborhoodData[neighborhood] = { totalSalePrice: 0, count: 0 };
    }

    neighborhoodData[neighborhood].totalSalePrice += salePrice;
    neighborhoodData[neighborhood].count++;
  });

  return Object.keys(neighborhoodData)
    .map((key) => ({
      neighborhood: key,
      averageSalePrice:
        neighborhoodData[key].totalSalePrice / neighborhoodData[key].count,
    }))
    .sort((a, b) => b.averageSalePrice - a.averageSalePrice)
    .slice(0, 10);
}

// Borough Select Creation
let selectedBoroughs = [];
let selectedZipCode = [];
let startDate = new Date("2016-09-01");
let endDate = new Date("2017-08-31");

function createBoroughSelect(chartData) {
  const boroughs = Array.from(
    new Set(chartData.map((item) => item["BOROUGH NAME"]))
  );

  console.log({ boroughs });

  VirtualSelect.init({
    ele: "#boroughSelect",
    options: boroughs.map((borough) => ({
      label: borough,
      value: borough,
    })),
  });

  document
    .getElementById("boroughSelect")
    .addEventListener("change", function () {
      // 1. Statenya diset dulu
      selectedBoroughs = this.value;
      // 2. Create filter
      const filter = createFilter(
        chartData,
        startDate,
        endDate,
        this.value,
        selectedZipCode
      );
      // 3. render chart
      renderCharts(filter);
    });
}

function createDatePicker(chartData) {
  let input = document.getElementById("litepicker");
  new Litepicker({
    element: input,
    format: "DD MMM YYYY",
    singleMode: false,
    numberOfMonths: 2,
    numberOfColumns: 2,
    showTooltip: true,
    scrollToDate: true,
    startDate: new Date("2016-09-1"),
    endDate: new Date("2017-08-31"),
    minDate: new Date("2016-09-1"),
    maxDate: new Date("2017-08-31"),
    setup: function (picker) {
      picker.on("selected", function (date1, date2) {
        // 1. set statenya
        startDate = date1.dateInstance;
        endDate = date2.dateInstance;

        // 2. create filternya
        const filter = createFilter(
          chartData,
          date1.dateInstance,
          date2.dateInstance,
          selectedBoroughs,
          selectedZipCode
        );

        // 3. render chart
        renderCharts(filter);
      });
    },
  });
}

function createZipCodeSelect(chartData) {
  const zipcodes = Array.from(
    new Set(chartData.map((item) => item["ZIP CODE"]))
  );

  console.log({ zipcodes });

  VirtualSelect.init({
    ele: "#zipcodeSelect",
    options: zipcodes.map((zipcode) => ({
      label: zipcode,
      value: zipcode,
    })),
  });

  document
    .getElementById("zipcodeSelect")
    .addEventListener("change", function () {
      // 1. Statenya diset dulu
      selectedZipCode = this.value;
      console.log(selectedZipCode);
      // 2. Create filter
      const filter = createFilter(
        chartData,
        startDate,
        endDate,
        selectedBoroughs,
        selectedZipCode
      );
      // 3. render chart
      renderCharts(filter);
    });
}

// TODO: untuk filter zip code
// 1. set state zip code
// 2. craete filternya
// 3. render chart

// Main Function to Initialize and Render Charts
(async function main() {
  const chartData = await fetchData();

  createBoroughSelect(chartData);
  createDatePicker(chartData);
  createZipCodeSelect(chartData);

  const filter = createFilter(chartData, startDate, endDate);
  renderCharts(filter);
})();

function renderCharts(filter) {
  createSalesTable(filter.data);

  const monthlySalesData = filter.getMonthlySales();
  console.log(monthlySalesData);

  createMonthlySaleChart(monthlySalesData);

  const processedData = processData(filter.data);
  const sortedData = sortDataBySalePrice(processedData);

  const labels = sortedData.map((data) => data.name);
  const totalResidentialUnits = sortedData.map(
    (data) => data.totalResidentialUnits
  );
  const totalCommercialUnits = sortedData.map(
    (data) => data.totalCommercialUnits
  );

  createPropertySalesChart(labels, totalResidentialUnits, totalCommercialUnits);

  const yearBuiltData = processYearBuiltData(filter.data);
  const labelsYearBuilt = yearBuiltData.map((data) => data.yearBuilt);
  const totalUnitsYearBuilt = yearBuiltData.map((data) => data.totalUnits);

  createBarChart(labelsYearBuilt, totalUnitsYearBuilt);

  const salePriceData = processSalePriceData(filter.data);
  const labelsBuildingClass = salePriceData.map((item) => item.category);
  const averageSalePriceData = salePriceData.map(
    (item) => item.averageSalePrice
  );

  createTopBuildingClassCategorySales(
    labelsBuildingClass,
    averageSalePriceData
  );

  const neighborhoodData = processNeighborhoodData(filter.data);
  const labelsNeighborhood = neighborhoodData.map((item) => item.neighborhood);
  const averageSalePriceNeighborhood = neighborhoodData.map(
    (item) => item.averageSalePrice
  );

  createTopNeighborhoodCategorySales(
    labelsNeighborhood,
    averageSalePriceNeighborhood
  );

  const Sales = sum(filter.data, "SALE PRICE").toLocaleString();
  const Units = sum(filter.data, "TOTAL UNITS").toLocaleString();
  const ResidentialUnits = sum(
    filter.data,
    "RESIDENTIAL UNITS"
  ).toLocaleString();
  const CommercialUnits = sum(filter.data, "COMMERCIAL UNITS").toLocaleString();

  // Update scorecard elements
  document.getElementById("totalSales").textContent = Sales;
  document.getElementById("totalUnits").textContent = Units;
  document.getElementById("totalResidentialUnits").textContent =
    ResidentialUnits;
  document.getElementById("totalCommercialUnits").textContent = CommercialUnits;
}

function formatNumber(num) {
  if (num >= 1e9) return `${num / 1e9}B`;
  if (num >= 1e6) return `${num / 1e6}M`;
  if (num >= 1e3) return `${num / 1e3}K`;
  return num;
}

const totalMonthlySalesCtx = document.getElementById("totalMonthlySales");

// Chart Creation Functions
function createMonthlySaleChart(monthlySalesData) {
  const color = ["#302de0", "#49084f", "#b51818", "#0e758c", "#fa3981"];
  const scale = monthlySalesData.scales;

  const datasets = monthlySalesData.data.map((item, i) => ({
    label: item.borough,
    data: item.sales,
    fill: false,
    borderColor: color[i % color.length],
    backgroundColor: color[i % color.length],
    tension: 0.3,
  }));

  if (totalMonthlySalesCtx.chart) {
    totalMonthlySalesCtx.chart.destroy();
  }

  totalMonthlySalesCtx.chart = new Chart(totalMonthlySalesCtx, {
    type: "line",
    data: {
      labels: scale,
      datasets: datasets,
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (data) => {
              return formatNumber(data);
            },
          },
        },
      },
    },
  });
}

const propertyTypeChartCtx = document.getElementById("PropertyTypeSales");

function createPropertySalesChart(
  labels,
  totalResidentialUnits,
  totalCommercialUnits
) {
  if (propertyTypeChartCtx.chart) {
    propertyTypeChartCtx.chart.destroy();
  }
  propertyTypeChartCtx.chart = new Chart(propertyTypeChartCtx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total Residential Units",
          data: totalResidentialUnits,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          stack: "Stack 0",
        },
        {
          label: "Total Commercial Units",
          data: totalCommercialUnits,
          backgroundColor: "rgba(255, 159, 64, 0.6)",
          stack: "Stack 0",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            callback: (data) => {
              return formatNumber(data);
            },
          },
        },
      },
    },
  });
}

const mostOrdersByYearBuiltCtx = document.getElementById(
  "MostOrdersbyYearBuilt"
);

function createBarChart(labels, data) {
  if (mostOrdersByYearBuiltCtx.chart) {
    mostOrdersByYearBuiltCtx.chart.destroy();
  }

  mostOrdersByYearBuiltCtx.chart = new Chart(mostOrdersByYearBuiltCtx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total Units",
          data: data,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            callback: (data) => {
              return formatNumber(data);
            },
          },
        },
      },
    },
  });
}

const topBuildingClassCategoryCtx = document.getElementById(
  "topBuildingClassCategorySales"
);

function createTopBuildingClassCategorySales(labels, data) {
  if (topBuildingClassCategoryCtx.chart) {
    topBuildingClassCategoryCtx.chart.destroy();
  }

  topBuildingClassCategoryCtx.chart = new Chart(topBuildingClassCategoryCtx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Average Sale Price",
          data: data,
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (data) => {
              return formatNumber(data);
            },
          },
        },
      },
    },
  });
}

const topNeighborhoodCategorySalesCtx = document.getElementById(
  "TopNeighborhoodCategorySales"
);

function createTopNeighborhoodCategorySales(labels, data) {
  if (topNeighborhoodCategorySalesCtx.chart) {
    topNeighborhoodCategorySalesCtx.chart.destroy();
  }

  topNeighborhoodCategorySalesCtx.chart = new Chart(
    topNeighborhoodCategorySalesCtx,
    {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Average Sale Price",
            data: data,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (data) => {
                return formatNumber(data);
              },
            },
          },
        },
      },
    }
  );
}

//  Function Data Table
function createSalesTable(data) {
  return new DataTable("#salesTable", {
    data: data,
    scrollX: true,
    destroy: true,
    columns: [
      { data: "BOROUGH NAME" },
      { data: "BUILDING CLASS CATEGORY" },
      { data: "NEIGHBORHOOD" },
      { data: "COMMERCIAL UNITS" },
      { data: "RESIDENTIAL UNITS" },
      {
        data: "SALE PRICE",
        render: (data, type) => {
          const number = DataTable.render
            .number(",", ".", 0, "$")
            .display(data);

          if (type === "display") {
            return number;
          }

          return data;
        },
      },
      { data: "TOTAL UNITS" },
      { data: "YEAR BUILT" },
      { data: "ZIP CODE" },
    ],
  });
}
