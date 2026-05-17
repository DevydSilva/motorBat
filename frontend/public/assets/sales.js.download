document.addEventListener("DOMContentLoaded", function () {
  // Initial Data
  let salesData = [120, 150, 170, 140, 180, 200, 220, 210, 230, 250, 270, 300];
  let revenueData = [3000, 3500, 4000, 3700, 4200, 4600, 4800, 4700, 5000, 5300, 5600, 6000];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Chart container
  let chartDiv = document.getElementById("sales");
  if (!chartDiv) {
    chartDiv = document.createElement("div");
    chartDiv.id = "sales";
    chartDiv.style.maxWidth = "800px";
    chartDiv.style.margin = "20px auto";
    document.body.appendChild(chartDiv);
  }

  const options = {
    chart: {
      height: 380,
      type: "line",
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: "linear",
        dynamicAnimation: { speed: 1000 }
      },
      dropShadow: {
        enabled: true,
        top: 2,
        left: 0,
        blur: 4,
        opacity: 0.08
      }
    },
    colors: ["#539bf9", "#1d8bf1"],
    stroke: {
      width: [0, 3],
      curve: "smooth"
    },
    plotOptions: {
      bar: {
        borderRadius: 20,
        columnWidth: "50%"
      }
    },
    series: [
      { name: "Sales", type: "column", data: salesData },
      { name: "Revenue", type: "area", data: revenueData }
    ],
    xaxis: {
      categories: months,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#ffffff", fontSize: "13px", fontFamily: "inherit" }
      }
    },
    yaxis: [
      {
        title: { text: "Sales", style: { color: "#539bf9", fontSize: "15px", fontWeight: 600 } },
        labels: { style: { colors: "#539bf9", fontSize: "13px", fontWeight: 600 } }
      },
      {
        opposite: true,
        title: { text: "Revenue ($)", style: { color: "#1d8bf1", fontSize: "15px", fontWeight: 600 } },
        labels: { style: { colors: "#1d8bf1", fontSize: "13px", fontWeight: 600 } }
      }
    ],
    fill: {
      opacity: [0.85, 0.25],
      gradient: {
        inverseColors: false,
        shade: "light",
        type: "vertical",
        opacityFrom: 0.6,
        opacityTo: 0.1,
        stops: [0, 100, 100, 100]
      }
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      markers: { radius: 2 },
      fontSize: "13px",
      labels: { colors: "#ffffff" }
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "rgba(255, 255, 255, 0.3)",
      strokeDashArray: 4
    },
    tooltip: {
      theme: "dark",
      shared: true,
      intersect: false,
      style: { fontSize: "15px" },
      y: [
        { formatter: val => `${val} Sales` },
        { formatter: val => `$${val.toLocaleString()}` }
      ]
    }
  };

  const chart = new ApexCharts(chartDiv, options);
  chart.render();

  // Live Update every 2s
  setInterval(() => {
    const newSale = Math.floor(Math.random() * 100) + 150;
    const newRevenue = Math.floor(Math.random() * 3000) + 3500;

    salesData.push(newSale);
    revenueData.push(newRevenue);
    salesData.shift();
    revenueData.shift();

    chart.updateSeries([
      { name: "Sales", type: "column", data: salesData },
      { name: "Revenue", type: "area", data: revenueData }
    ]);
  }, 2000);
});
