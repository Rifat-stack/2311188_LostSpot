// The 5th floor of the Academic Building, traced from the evacuation plan on the wall.
// Every place here can be picked as an item's location. The names must match
// backend/app/items/places.py exactly (a test checks that the two lists are the same).
//
// Coordinates are in the same units as the photo of the plan (x right, y down).
// rect = [left, top, right, bottom]; points = a polygon for places that aren't rectangles.

export type PlaceKind = "room" | "lab" | "lobby" | "corridor" | "washroom" | "exit"

export interface Place {
  name: string // saved as the item's location, shown everywhere
  short: string // the label drawn on the map
  kind: PlaceKind
  rect?: [number, number, number, number]
  points?: [number, number][]
  labelAt?: [number, number] // where to draw the label, when the middle isn't a good spot
  sideways?: boolean // write the label upwards (for long, thin places)
}

export const FLOOR_NAME = "5th floor, Academic Building"

// The part of the photo the map shows
export const VIEW_BOX = "285 245 1640 1090"

export const PLACES: Place[] = [
  // ---------- top row, left to right ----------
  { name: "Room 6020", short: "6020", kind: "room", rect: [312, 280, 533, 505] },
  { name: "West lobby", short: "West lobby", kind: "lobby", rect: [535, 280, 672, 520] },
  { name: "Room 6013", short: "6013", kind: "room", rect: [675, 268, 810, 500] },
  { name: "Space between 6013 and 6011", short: "Space", kind: "lobby", rect: [812, 295, 918, 500] },
  { name: "Room 6011", short: "6011", kind: "room", rect: [920, 268, 1057, 400] },
  { name: "Room 6010 (north)", short: "6010", kind: "room", rect: [920, 402, 1057, 500] },
  { name: "Room 6009", short: "6009", kind: "room", rect: [1060, 268, 1195, 500] },
  { name: "Space between 6009 and 5006", short: "Space", kind: "lobby", rect: [1197, 295, 1303, 500] },
  { name: "Room 5006", short: "5006", kind: "room", rect: [1305, 262, 1450, 335] },
  { name: "Washroom (north)", short: "WC", kind: "washroom", rect: [1305, 337, 1450, 447] },
  { name: "Room 5005", short: "5005", kind: "room", rect: [1305, 449, 1450, 505] },
  { name: "Zone 3 (east lobby)", short: "Zone 3", kind: "lobby", rect: [1455, 262, 1662, 600] },
  { name: "Fire exit (north-east)", short: "Fire exit", kind: "exit", rect: [1665, 262, 1715, 420] },
  { name: "Zone 1 (north-east corridor)", short: "Zone 1", kind: "corridor", rect: [1718, 252, 1900, 495], labelAt: [1866, 470] },
  { name: "Room 5001", short: "5001", kind: "room", rect: [1772, 300, 1830, 440] },

  // ---------- the long corridor and the west side ----------
  { name: "Main corridor", short: "Main corridor", kind: "corridor", rect: [500, 522, 1452, 600] },
  { name: "Exit stairs (west)", short: "Exit", kind: "exit", rect: [355, 515, 498, 588] },
  { name: "Washroom (west)", short: "WC", kind: "washroom", rect: [310, 592, 438, 798] },
  { name: "Lift lobby (west)", short: "Lifts", kind: "lobby", rect: [440, 592, 498, 700] },
  { name: "West corridor", short: "Corridor", kind: "corridor", rect: [440, 702, 590, 848] },
  { name: "Fire exit (south-west)", short: "Fire exit", kind: "exit", rect: [312, 800, 438, 848] },

  // ---------- bottom row, left to right ----------
  { name: "Room 6018", short: "6018", kind: "room", rect: [592, 720, 672, 835] },
  { name: "Room 6012", short: "6012", kind: "room", rect: [675, 605, 810, 835] },
  { name: "Space between 6012 and 6010", short: "Space", kind: "lobby", rect: [812, 630, 918, 835] },
  { name: "Room 6010 (south)", short: "6010", kind: "room", rect: [920, 605, 1057, 835] },
  { name: "Room 6008", short: "6008", kind: "room", rect: [1060, 605, 1195, 835] },
  { name: "Space between 6008 and 5003", short: "Space", kind: "lobby", rect: [1197, 630, 1303, 835] },
  { name: "Washroom (south)", short: "WC", kind: "washroom", rect: [1305, 605, 1440, 783] },
  { name: "Room 5003", short: "5003", kind: "room", rect: [1305, 785, 1440, 865] },
  { name: "Zone 2 (south-east lobby)", short: "Zone 2", kind: "lobby", rect: [1443, 603, 1513, 760] },
  { name: "Lift lobby (east)", short: "Lifts", kind: "lobby", rect: [1515, 603, 1625, 688] },
  {
    name: "Room 6003",
    short: "6003",
    kind: "room",
    labelAt: [1580, 780],
    points: [
      [1443, 762],
      [1515, 762],
      [1515, 690],
      [1640, 690],
      [1640, 865],
      [1443, 865],
    ],
  },
  { name: "Exit stairs (east)", short: "Exit", kind: "exit", rect: [1627, 603, 1703, 740] },

  // ---------- the computer lab wing (bottom left) ----------
  { name: "Computer Lab 1", short: "Lab 1", kind: "lab", rect: [312, 852, 527, 955] },
  { name: "Computer Lab 2 (6017A)", short: "Lab 2", kind: "lab", rect: [296, 957, 527, 1055] },
  { name: "Computer Lab 3 (6017)", short: "Lab 3", kind: "lab", rect: [300, 1057, 527, 1158] },
  { name: "Computer Lab 4 (6016)", short: "Lab 4", kind: "lab", rect: [312, 1160, 527, 1305] },
  {
    name: "Lab corridor",
    short: "Corridor",
    kind: "corridor",
    labelAt: [546, 1120],
    sideways: true,
    points: [
      [529, 850],
      [563, 850],
      [563, 997],
      [622, 997],
      [622, 1070],
      [563, 1070],
      [563, 1172],
      [607, 1172],
      [607, 1325],
      [529, 1325],
    ],
  },
  { name: "Room 3", short: "R3", kind: "room", rect: [565, 850, 607, 925] },
  { name: "Room 2", short: "R2", kind: "room", rect: [565, 927, 607, 995] },
  { name: "Room 1", short: "R1", kind: "room", rect: [565, 1072, 622, 1170] },
]

// Drawn for orientation only; nobody can pick it (it's open space)
export const ATRIUM: [number, number, number, number] = [1705, 497, 1910, 855]

export const KIND_NAMES: Record<PlaceKind, string> = {
  room: "Rooms",
  lab: "Computer labs",
  lobby: "Lobbies and open spaces",
  corridor: "Corridors",
  washroom: "Washrooms",
  exit: "Exits and stairs",
}

export function findPlace(name: string | null | undefined): Place | undefined {
  return PLACES.find((place) => place.name === name)
}
