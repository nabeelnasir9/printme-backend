const calculateCost = (pages, isColor, createdAt, no_of_copies = 1) => {
  let baseCost, serviceFee;

  // Calculate base cost and service fee based on number of pages and color option
  if (pages <= 5) {
    baseCost = isColor ? 6.64 : 5.53;
    serviceFee = isColor ? 0.73 : 0.61;
  } else if (pages <= 10) {
    baseCost = isColor ? 9.42 : 8.31;
    serviceFee = isColor ? 1.04 : 0.91;
  } else if (pages <= 15) {
    baseCost = isColor ? 12.19 : 11.08;
    serviceFee = isColor ? 1.34 : 1.22;
  } else if (pages <= 20) {
    baseCost = isColor ? 14.97 : 13.86;
    serviceFee = isColor ? 1.65 : 1.52;
  } else if (pages <= 25) {
    baseCost = isColor ? 17.74 : 16.63;
    serviceFee = isColor ? 1.95 : 1.83;
  } else {
    baseCost = isColor ? 0.75 * pages : 0.65 * pages;
    serviceFee = 0.11 * baseCost;
  }

  // Multiply base cost and service fee by the amount
  baseCost *= no_of_copies;
  serviceFee *= no_of_copies;

  // Calculate timing fee based on the hour of job creation
  // const hour = createdAt.getHours();
  // if (hour >= 20 && hour < 23) {
  //   timingFee = 6.99;
  // } else if (hour >= 23 || hour < 2) {
  //   timingFee = 9.99;
  // } else if (hour >= 2 && hour < 5) {
  //   timingFee = 12.99;
  // } else if (hour >= 5 && hour < 8) {
  //   timingFee = 9.99;
  // } else {
  //   timingFee = 0;
  // }

  // Calculate the total cost
  const totalCost = baseCost + serviceFee;
  return totalCost.toFixed(2);
};

module.exports = calculateCost;
