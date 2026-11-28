// The 5th floor drawn as an SVG map.
//  - With onSelect: every room and area can be clicked (or picked with Tab + Enter), and the chosen one turns green.
//  - Without onSelect: read-only, used on the item page to show where the item was lost or found.

import { ATRIUM, FLOOR_NAME, PLACES, VIEW_BOX, type Place } from "../floorPlan"

interface Props {
  selected?: string | null // the place's name, as saved in item.location
  onSelect?: (name: string) => void
}

// The middle of a place: where its label goes
function centre(place: Place): [number, number] {
  if (place.labelAt) return place.labelAt
  if (place.rect) {
    const [left, top, right, bottom] = place.rect
    return [(left + right) / 2, (top + bottom) / 2]
  }
  const xs = place.points!.map((p) => p[0])
  const ys = place.points!.map((p) => p[1])
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
}

function Shape({ place }: { place: Place }) {
  if (place.rect) {
    const [left, top, right, bottom] = place.rect
    return <rect x={left} y={top} width={right - left} height={bottom - top} rx={4} />
  }
  return <polygon points={place.points!.map((p) => p.join(",")).join(" ")} />
}

export default function FloorMap({ selected, onSelect }: Props) {
  const canPick = onSelect !== undefined
  const [aLeft, aTop, aRight, aBottom] = ATRIUM

  return (
    <div className={`floor-map ${canPick ? "can-pick" : ""}`}>
      <svg viewBox={VIEW_BOX} role="img" aria-label={`Map of the ${FLOOR_NAME}`}>
        {/* the open atrium, only for orientation */}
        <g className="atrium">
          <rect x={aLeft} y={aTop} width={aRight - aLeft} height={aBottom - aTop} />
          <line x1={aLeft} y1={aTop} x2={aRight} y2={aBottom} />
          <line x1={aRight} y1={aTop} x2={aLeft} y2={aBottom} />
        </g>

        {PLACES.map((place) => {
          const [x, y] = centre(place)
          const isSelected = place.name === selected
          // long labels in thin places are written upwards
          const narrow = place.sideways || (place.rect !== undefined && place.rect[2] - place.rect[0] < 62 && place.short.length > 3)
          return (
            <g
              key={place.name}
              className={`place ${place.kind} ${isSelected ? "selected" : ""}`}
              role={canPick ? "button" : undefined}
              tabIndex={canPick ? 0 : undefined}
              aria-label={canPick ? place.name : undefined}
              aria-pressed={canPick ? isSelected : undefined}
              onClick={canPick ? () => onSelect(place.name) : undefined}
              onKeyDown={
                canPick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onSelect(place.name)
                      }
                    }
                  : undefined
              }
            >
              <title>{place.name}</title>
              <Shape place={place} />
              <text x={x} y={y} transform={narrow ? `rotate(-90 ${x} ${y})` : undefined}>
                {place.short}
              </text>
            </g>
          )
        })}

        <text className="map-title" x={1900} y={1320} textAnchor="end">
          {FLOOR_NAME}
        </text>
      </svg>
    </div>
  )
}
