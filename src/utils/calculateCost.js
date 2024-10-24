const calculateCost = (pages, isColor, createdAt, no_of_copies = 1) => {
  let baseCost, serviceFee;

  const totalPages = pages * no_of_copies;

  if (totalPages <= 5) {
    baseCost = isColor ? 6.64 : 5.53;
    serviceFee = isColor ? 0.73 : 0.61;
  } else if (totalPages <= 10) {
    baseCost = isColor ? 9.42 : 8.31;
    serviceFee = isColor ? 1.04 : 0.91;
  } else if (totalPages <= 15) {
    baseCost = isColor ? 12.19 : 11.08;
    serviceFee = isColor ? 1.34 : 1.22;
  } else if (totalPages <= 20) {
    baseCost = isColor ? 14.97 : 13.86;
    serviceFee = isColor ? 1.65 : 1.52;
  } else if (totalPages <= 25) {
    baseCost = isColor ? 17.74 : 16.63;
    serviceFee = isColor ? 1.95 : 1.83;
  } else {
    baseCost = isColor ? 0.75 * totalPages : 0.65 * totalPages;
    serviceFee = 0.11 * baseCost;
  }

  const totalCost = baseCost + serviceFee;
  return totalCost.toFixed(2);
};

module.exports = calculateCost;
