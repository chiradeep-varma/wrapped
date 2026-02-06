'use client'

import { useMemo } from 'react'
// import * as THREE from 'three' // unused

export interface ContributionDay {
    contributionCount: number
    color: string
    date: string
}

export interface ContributionWeek {
    contributionDays: ContributionDay[]
}

export interface ContributionCalendar {
    weeks: ContributionWeek[]
    totalContributions: number
}

interface ContributionCityProps {
    data: ContributionCalendar
}

interface BuildingData {
    position: [number, number, number]
    height: number
    color: string
}

export default function ContributionCity({ data }: ContributionCityProps) {
    const cityData = useMemo(() => {
        const weeks = data?.weeks || []
        const temp: BuildingData[] = []
        // Flatten the weeks data
        weeks.forEach((week, wIndex) => {
            week.contributionDays.forEach((day, dIndex) => {
                if (day.contributionCount > 0) {
                    temp.push({
                        position: [wIndex * 0.5 - 13, day.contributionCount * 0.1, dIndex * 0.5 - 2],
                        height: day.contributionCount * 0.2,
                        color: day.color
                    })
                }
            })
        })
        return temp
    }, [data])

    return (
        <group position={[0, -2, -20]}> {/* Position it further back in the "journey" */}
            {cityData.map((building, i) => (
                <mesh key={i} position={building.position}>
                    <boxGeometry args={[0.4, building.height, 0.4]} />
                    <meshStandardMaterial color={building.color} emissive={building.color} emissiveIntensity={0.5} />
                </mesh>
            ))}
        </group>
    )
}
