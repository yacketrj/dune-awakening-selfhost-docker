// Resource requirements for buildings/placeables sourced from https://dune.gaming.tools/placeables
export const PLACEABLE_RESOURCES: Record<string, { name: string; qty: number }[]> = {
  "AdvancedWearablesFabricator_Patent": [
    { name: "Plastanium Ingot", qty: 140 },
    { name: "Silicone Block", qty: 180 },
    { name: "Complex Machinery", qty: 100 },
    { name: "Spice Melange", qty: 45 },
    { name: "Cobalt Paste", qty: 150 },
    { name: "Armor Plating", qty: 115 }
  ],
  "AdvancedSurvivalFabricator_Patent": [
    { name: "Duraluminum Ingot", qty: 120 },
    { name: "Silicone Block", qty: 150 },
    { name: "Complex Machinery", qty: 80 },
    { name: "Spice Melange", qty: 30 },
    { name: "Cobalt Paste", qty: 100 },
    { name: "Armor Plating", qty: 80 }
  ],
  "AdvancedWeaponsFabricator_Patent": [
    { name: "Plastanium Ingot", qty: 150 },
    { name: "Silicone Block", qty: 180 },
    { name: "Complex Machinery", qty: 120 },
    { name: "Spice Melange", qty: 50 },
    { name: "Cobalt Paste", qty: 160 },
    { name: "Armor Plating", qty: 130 }
  ],
  "AdvancedVehicleFabricator_Patent": [
    { name: "Plastanium Ingot", qty: 160 },
    { name: "Silicone Block", qty: 200 },
    { name: "Complex Machinery", qty: 140 },
    { name: "Spice Melange", qty: 55 },
    { name: "Cobalt Paste", qty: 180 },
    { name: "Armor Plating", qty: 150 }
  ],
  "BasicFabricator_Patent": [
    { name: "Iron Ingot", qty: 60 },
    { name: "Silicone Block", qty: 50 },
    { name: "Basic Machinery", qty: 30 },
    { name: "Cobalt Paste", qty: 40 },
    { name: "Armor Plating", qty: 30 }
  ],
  "WearablesFabricator_Patent": [
    { name: "Steel Ingot", qty: 80 },
    { name: "Silicone Block", qty: 80 },
    { name: "Basic Machinery", qty: 50 },
    { name: "Cobalt Paste", qty: 60 },
    { name: "Armor Plating", qty: 50 }
  ],
  "SurvivalFabricator_Patent": [
    { name: "Steel Ingot", qty: 80 },
    { name: "Silicone Block", qty: 90 },
    { name: "Basic Machinery", qty: 50 },
    { name: "Spice Melange", qty: 10 },
    { name: "Cobalt Paste", qty: 70 },
    { name: "Armor Plating", qty: 50 }
  ],
  "WeaponsFabricator_Patent": [
    { name: "Aluminum Ingot", qty: 100 },
    { name: "Silicone Block", qty: 100 },
    { name: "Basic Machinery", qty: 70 },
    { name: "Spice Melange", qty: 15 },
    { name: "Cobalt Paste", qty: 80 },
    { name: "Armor Plating", qty: 70 }
  ],
  "VehicleFabricator_Patent": [
    { name: "Aluminum Ingot", qty: 100 },
    { name: "Silicone Block", qty: 110 },
    { name: "Basic Machinery", qty: 70 },
    { name: "Spice Melange", qty: 15 },
    { name: "Cobalt Paste", qty: 90 },
    { name: "Armor Plating", qty: 70 }
  ],
  "PersonalFabricator_Patent": [
    { name: "Iron Ingot", qty: 30 },
    { name: "Basic Machinery", qty: 15 },
    { name: "Plant Fiber", qty: 50 },
    { name: "Armor Plating", qty: 15 }
  ],
  "SmallChemicalRefinery": [
    { name: "Iron Ingot", qty: 50 },
    { name: "Basic Machinery", qty: 25 },
    { name: "Plant Fiber", qty: 40 },
    { name: "Concrete", qty: 30 }
  ],
  "MediumChemicalRefinery_Patent": [
    { name: "Steel Ingot", qty: 80 },
    { name: "Basic Machinery", qty: 40 },
    { name: "Plant Fiber", qty: 60 },
    { name: "Concrete", qty: 50 }
  ],
  "SmallOreRefinery": [
    { name: "Iron Ingot", qty: 60 },
    { name: "Basic Machinery", qty: 30 },
    { name: "Plant Fiber", qty: 40 },
    { name: "Concrete", qty: 40 }
  ],
  "MediumOreRefinery_Patent": [
    { name: "Steel Ingot", qty: 90 },
    { name: "Basic Machinery", qty: 45 },
    { name: "Plant Fiber", qty: 60 },
    { name: "Concrete", qty: 60 }
  ],
  "LargeOreRefinery_Patent": [
    { name: "Aluminum Ingot", qty: 120 },
    { name: "Complex Machinery", qty: 60 },
    { name: "Plant Fiber", qty: 80 },
    { name: "Concrete", qty: 80 }
  ],
  "BloodWaterExtraction_Patent": [
    { name: "Steel Ingot", qty: 70 },
    { name: "Basic Machinery", qty: 35 },
    { name: "Plant Fiber", qty: 50 },
    { name: "Concrete", qty: 40 }
  ],
  "BloodWaterExtractionAdvanced_Patent": [
    { name: "Aluminum Ingot", qty: 100 },
    { name: "Complex Machinery", qty: 50 },
    { name: "Plant Fiber", qty: 60 },
    { name: "Concrete", qty: 60 },
    { name: "Spice Melange", qty: 15 }
  ],
  "FremenDeathstill_Patent": [
    { name: "Aluminum Ingot", qty: 100 },
    { name: "Complex Machinery", qty: 50 },
    { name: "Plant Fiber", qty: 60 },
    { name: "Concrete", qty: 60 },
    { name: "Spice Melange", qty: 10 }
  ],
  "AdvancedFremenDeathstill_Patent": [
    { name: "Plastanium Ingot", qty: 140 },
    { name: "Complex Machinery", qty: 80 },
    { name: "Plant Fiber", qty: 80 },
    { name: "Concrete", qty: 80 },
    { name: "Spice Melange", qty: 25 }
  ],
  "RepairStation_Patent": [
    { name: "Iron Ingot", qty: 40 },
    { name: "Basic Machinery", qty: 20 },
    { name: "Plant Fiber", qty: 30 },
    { name: "Armor Plating", qty: 20 }
  ],
  "AugmentStation_Patent": [
    { name: "Plastanium Ingot", qty: 120 },
    { name: "Complex Machinery", qty: 80 },
    { name: "Spice Melange", qty: 30 },
    { name: "Cobalt Paste", qty: 100 },
    { name: "Armor Plating", qty: 80 }
  ],
  "FuelPoweredGenerator_Patent": [
    { name: "Iron Ingot", qty: 50 },
    { name: "Copper Bar", qty: 30 },
    { name: "Basic Machinery", qty: 25 },
    { name: "Concrete", qty: 30 }
  ],
  "SolarGenerator_Patent": [
    { name: "Aluminum Ingot", qty: 60 },
    { name: "Copper Bar", qty: 40 },
    { name: "Complex Machinery", qty: 30 },
    { name: "Concrete", qty: 30 }
  ],
  "Windtrap_Patent": [
    { name: "Iron Ingot", qty: 60 },
    { name: "Silicone Block", qty: 40 },
    { name: "Basic Machinery", qty: 25 },
    { name: "Concrete", qty: 40 }
  ],
  "LargeWindtrap_Patent": [
    { name: "Aluminum Ingot", qty: 100 },
    { name: "Silicone Block", qty: 80 },
    { name: "Complex Machinery", qty: 50 },
    { name: "Concrete", qty: 60 }
  ],
  "MediumStorageContainer_Patent": [
    { name: "Plastanium Ingot", qty: 70 },
    { name: "Silicone Block", qty: 14 },
    { name: "Spice Melange", qty: 4 }
  ],
  "StorageContainer_Patent": [
    { name: "Aluminum Ingot", qty: 45 },
    { name: "Silicone Block", qty: 8 }
  ],
  "Developer_Storage_Container_Patent": [
    { name: "Plastanium Ingot", qty: 100 },
    { name: "Silicone Block", qty: 20 },
    { name: "Spice Melange", qty: 8 }
  ],
  "MediumWaterCistern_Patent": [
    { name: "Iron Ingot", qty: 50 },
    { name: "Silicone Block", qty: 30 },
    { name: "Plant Fiber", qty: 40 },
    { name: "Concrete", qty: 30 }
  ],
  "LargeWaterCistern_Patent": [
    { name: "Aluminum Ingot", qty: 80 },
    { name: "Silicone Block", qty: 60 },
    { name: "Plant Fiber", qty: 60 },
    { name: "Concrete", qty: 50 }
  ],
  "PentashieldSurfaceHorizontal_Patent": [
    { name: "Aluminum Ingot", qty: 80 },
    { name: "Complex Machinery", qty: 40 },
    { name: "Spice Melange", qty: 15 },
    { name: "Armor Plating", qty: 50 }
  ],
  "PentashieldSurfaceVertical_Patent": [
    { name: "Aluminum Ingot", qty: 80 },
    { name: "Complex Machinery", qty: 40 },
    { name: "Spice Melange", qty: 15 },
    { name: "Armor Plating", qty: 50 }
  ],
  "AdvancedSubFiefConsole_Patent": [
    { name: "Plastanium Ingot", qty: 100 },
    { name: "Complex Machinery", qty: 60 },
    { name: "Spice Melange", qty: 20 },
    { name: "Cobalt Paste", qty: 80 },
    { name: "Armor Plating", qty: 60 }
  ],
  "Recycler_Patent": [
    { name: "Iron Ingot", qty: 40 },
    { name: "Basic Machinery", qty: 20 },
    { name: "Plant Fiber", qty: 30 },
    { name: "Concrete", qty: 20 }
  ],
  "BasicContainer_Patent": [
    { name: "Iron Ingot", qty: 20 },
    { name: "Plant Fiber", qty: 20 },
    { name: "Concrete", qty: 10 }
  ],
  "SpiceSilo_Patent": [
    { name: "Steel Ingot", qty: 50 },
    { name: "Concrete", qty: 40 },
    { name: "Plant Fiber", qty: 30 }
  ]
};

// Map admin-items.json building IDs to placeable resource keys
export function placeableRecipeKey(itemId: string): string | null {
  const id = String(itemId || "");
  if (PLACEABLE_RESOURCES[id]) return id;
  const lower = id.toLowerCase().replace(/_patent$|_placeable$/, "");
  for (const key of Object.keys(PLACEABLE_RESOURCES)) {
    const keyLower = key.toLowerCase().replace(/_patent$|_placeable$/, "");
    if (keyLower === lower || keyLower.includes(lower) || lower.includes(keyLower)) return key;
  }
  return null;
}
