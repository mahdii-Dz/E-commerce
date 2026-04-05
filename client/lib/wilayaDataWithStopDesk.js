// This file contains the merged wilaya data with has_stop_desk information
// Based on the provided JSON data of Algerian communes

// Import the base wilayaData
import { wilayaData as baseWilayaData } from './wilayaData';

// Set of wilaya IDs (as numbers) that have at least one commune with stop desk service
// Based on analysis of the provided JSON: most wilayas have stop desk except: 50, 54, 56, 58
const stopDeskWilayaIds = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 55, 57
]);

// Merge has_stop_desk information
export const wilayaDataWithStopDesk = Object.entries(baseWilayaData).reduce((acc, [code, data]) => {
  const numericCode = parseInt(code, 10);
  acc[code] = {
    ...data,
    hasStopDesk: stopDeskWilayaIds.has(numericCode)
  };
  return acc;
}, {});

