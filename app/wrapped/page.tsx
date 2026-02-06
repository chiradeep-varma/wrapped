'use client'

import { useEffect, useState, useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { Stars, Grid } from '@react-three/drei'
import { ContributionCalendar } from '@/components/3d/ContributionCity'

// --- Data Types ---
interface LanguageNode { name: string; color: string }
interface RepositoryNode {
    name: string
    stargazerCount: number
    forkCount: number
    diskUsage: number
    createdAt: string
    isFork: boolean
    primaryLanguage?: { name: string; color: string }
    languages: { nodes: LanguageNode[] }
    owner: { login: string }
}
interface ViewerData {
    login: string
    createdAt: string
    avatarUrl: string
    following: { totalCount: number }
    pullRequests: { totalCount: number }
    issues: { totalCount: number }
    starredRepositories: {
        totalCount: number
        nodes: { name: string; owner: { login: string }; stargazerCount: number }[]
    }
    contributionsCollection: {
        totalCommitContributions: number
        totalPullRequestContributions: number
        totalIssueContributions: number
        totalPullRequestReviewContributions: number
        contributionCalendar: ContributionCalendar
        commitContributionsByRepository: {
            repository: { name: string }
            contributions: { totalCount: number }
        }[]
    }
    repositories: {
        totalCount: number
        nodes: RepositoryNode[]
    }
    activityStats?: {
        peakDay: number
        peakHour: number
        maxCommits: number
    }
}

type Stage = 'loading' | 'countdown' | 'launch' | 'sun' | 'planet' | 'galaxy' | 'stars' | 'city' | 'outro'

// --- Flight Path Configuration ---
// Total journey: 90 seconds (slowed down from 60)
// Each sector gets more time for animations and focus
const JOURNEY_DURATION = 90 // seconds
const TOTAL_DISTANCE = 3000 // total Z units to travel

// Sector positions along the journey
const SECTORS = {
    launch: { z: 0, duration: 10 },          // 0-10s
    sun: { z: -400, duration: 14 },          // 10-24s
    planet: { z: -1000, duration: 14 },      // 24-38s
    galaxy: { z: -1600, duration: 14 },      // 38-52s
    stars: { z: -2200, duration: 14 },       // 52-66s
    city: { z: -2800, duration: 14 },        // 66-80s
    outro: { z: -3000, duration: 10 }        // 80-90s
}

// Helper: Deterministic Random
const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000
    return x - Math.floor(x)
}

// --- 3D Scene Components ---

function WireframeSun({ position }: { position: [number, number, number] }) {
    const ref = useRef<THREE.Group>(null)
    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.elapsedTime * 0.1
        }
    })

    return (
        <group position={position} ref={ref}>
            <mesh>
                <icosahedronGeometry args={[18, 2]} />
                <meshBasicMaterial color="#fbbf24" wireframe />
            </mesh>
            <mesh scale={1.2}>
                <sphereGeometry args={[16, 16, 16]} />
                <meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.1} />
            </mesh>
        </group>
    )
}

function LanguagePlanet({ color, position }: { color: string, position: [number, number, number] }) {
    const mesh = useRef<THREE.Group>(null)
    useFrame((state) => { if (mesh.current) mesh.current.rotation.y = state.clock.elapsedTime * 0.1 })

    return (
        <group position={position} ref={mesh}>
            <mesh>
                <icosahedronGeometry args={[20, 2]} />
                <meshBasicMaterial color={color} wireframe />
            </mesh>
            <mesh position={[30, 0, 0]}>
                <dodecahedronGeometry args={[3]} />
                <meshBasicMaterial color="white" wireframe />
            </mesh>
        </group>
    )
}

function BlackHoleGalaxy({ repos, position }: { repos: RepositoryNode[], position: [number, number, number] }) {
    const ref = useRef<THREE.Group>(null)
    const diskRef = useRef<THREE.Mesh>(null)

    useFrame((state) => {
        if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.05
        if (diskRef.current) diskRef.current.rotation.z = -state.clock.elapsedTime * 0.2
    })

    const repoStars = useMemo(() => {
        return repos.slice(0, 50).map((r, i) => ({
            pos: [
                Math.cos(i * 0.5) * (25 + i * 0.2),
                (seededRandom(i) - 0.5) * 5,
                Math.sin(i * 0.5) * (25 + i * 0.2)
            ] as [number, number, number],
            color: r.primaryLanguage?.color || '#a855f7'
        }))
    }, [repos])

    return (
        <group position={position} ref={ref}>
            <mesh>
                <sphereGeometry args={[8, 32, 32]} />
                <meshBasicMaterial color="black" />
            </mesh>
            <mesh scale={1.05}>
                <sphereGeometry args={[8, 32, 32]} />
                <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.5} />
            </mesh>
            <mesh ref={diskRef} rotation={[1.6, 0, 0]}>
                <torusGeometry args={[16, 2, 16, 100]} />
                <meshBasicMaterial color="#a855f7" wireframe />
            </mesh>
            {repoStars.map((s, i) => (
                <mesh key={i} position={s.pos}>
                    <octahedronGeometry args={[0.4]} />
                    <meshBasicMaterial color={s.color} wireframe />
                </mesh>
            ))}
        </group>
    )
}

function StarStation({ position }: { position: [number, number, number] }) {
    const ref = useRef<THREE.Group>(null)
    useFrame((state) => { if (ref.current) ref.current.rotation.y = -state.clock.elapsedTime * 0.2 })

    return (
        <group position={position} ref={ref}>
            <mesh>
                <octahedronGeometry args={[8, 0]} />
                <meshBasicMaterial color="#c026d3" wireframe />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[20, 0.4, 16, 100]} />
                <meshBasicMaterial color="#c026d3" wireframe />
            </mesh>
        </group>
    )
}

// Shooting stars that streak diagonally across the sky (stars RECEIVED)
function ShootingStars({ count, active }: { count: number; active: boolean }) {
    const starsRef = useRef<THREE.Group>(null)
    const startTimeRef = useRef<number | null>(null)

    const stars = useMemo(() => {
        const numStars = Math.min(Math.max(count, 5), 25)
        return new Array(numStars).fill(0).map((_, i) => ({
            id: i,
            delay: i * 0.3,
            speed: 0.8 + seededRandom(i) * 0.6,
            startX: -60 - seededRandom(i + 100) * 40,
            startY: 40 + seededRandom(i + 200) * 30,
            startZ: -30 + seededRandom(i + 300) * 20,
            angle: -Math.PI / 6 + seededRandom(i + 500) * 0.3, // Diagonal angle variation
            size: 0.5 + seededRandom(i + 400) * 0.3
        }))
    }, [count])

    useFrame((state) => {
        if (!starsRef.current || !active) return

        if (startTimeRef.current === null) {
            startTimeRef.current = state.clock.elapsedTime
        }

        const elapsed = state.clock.elapsedTime - startTimeRef.current

        starsRef.current.children.forEach((child, i) => {
            const star = stars[i]
            if (!star) return

            const starElapsed = elapsed - star.delay
            if (starElapsed < 0) {
                child.position.set(-200, 200, 0)
                return
            }

            // Diagonal streak motion - like real shooting stars
            const progress = starElapsed * star.speed * 15
            const dirX = Math.cos(star.angle)
            const dirY = Math.sin(star.angle)

            child.position.x = star.startX + progress * dirX
            child.position.y = star.startY + progress * dirY
            child.position.z = star.startZ - progress * 0.3

            // Fade in at start, fade out at end
            const fadeIn = Math.min(starElapsed * 3, 1)
            const fadeOut = Math.max(1 - (starElapsed - 2) * 0.5, 0)
            const opacity = fadeIn * fadeOut

            // Apply opacity to materials
            if (child.children.length > 0) {
                child.children.forEach((mesh) => {
                    if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.Material) {
                        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.9
                    }
                })
            }

            // Reset when out of view or faded out
            if (child.position.x > 80 || child.position.y < -50 || opacity <= 0.01) {
                child.position.set(star.startX, star.startY, star.startZ)
                stars[i].delay = elapsed + seededRandom(i + elapsed * 100) * 0.5
            }
        })
    })

    useEffect(() => {
        if (active) {
            startTimeRef.current = null
        }
    }, [active])

    return (
        <group ref={starsRef}>
            {stars.map((s) => (
                <group key={s.id} position={[-200, 200, 0]} rotation={[0, 0, s.angle]}>
                    {/* Main star body - elongated for streak effect */}
                    <mesh>
                        <boxGeometry args={[s.size * 3, s.size * 0.5, s.size * 0.5]} />
                        <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.9} />
                    </mesh>
                    {/* Trailing streak elements */}
                    {[...Array(5)].map((_, j) => (
                        <mesh key={j} position={[-(j + 1) * 0.8, 0, 0]} scale={1 - j * 0.15}>
                            <boxGeometry args={[s.size * 1.5, s.size * 0.3, s.size * 0.3]} />
                            <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.7 - j * 0.12} />
                        </mesh>
                    ))}
                    {/* Glow point */}
                    <mesh position={[s.size * 1.5, 0, 0]}>
                        <sphereGeometry args={[s.size * 0.6, 4, 4]} />
                        <meshBasicMaterial color="#fff" wireframe transparent opacity={0.8} />
                    </mesh>
                </group>
            ))}
        </group>
    )
}

function GridCity({ contributions, position }: { contributions: ContributionCalendar, position: [number, number, number] }) {
    const buildings = useMemo(() => {
        const b: { pos: [number, number, number]; h: number; color: string }[] = []
        const weeks = contributions?.weeks || []
        const renderWeeks = weeks.slice(-26)
        const centerOffset = renderWeeks.length / 2

        for (let w = 0; w < renderWeeks.length; w++) {
            const week = renderWeeks[w]
            if (!week?.contributionDays) continue

            for (let d = 0; d < week.contributionDays.length; d++) {
                const day = week.contributionDays[d]
                if (day?.contributionCount > 0) {
                    const height = Math.max(1, day.contributionCount * 1.5)
                    b.push({
                        pos: [(w - centerOffset) * 4, 0, (d - 3) * 4] as [number, number, number],
                        h: height,
                        color: day.color || '#00ff00'
                    })
                }
            }
        }
        return b
    }, [contributions])

    return (
        <group position={position}>
            <Grid
                args={[150, 50]}
                cellSize={4}
                sectionSize={20}
                fadeDistance={120}
                sectionColor="#00ff00"
                cellColor="#003300"
                position={[0, 0, 0]}
            />
            {buildings.map((b, i) => (
                <mesh key={i} position={[b.pos[0], b.h / 2, b.pos[2]]}>
                    <boxGeometry args={[3, b.h, 3]} />
                    <meshBasicMaterial color={b.color} wireframe />
                </mesh>
            ))}
        </group>
    )
}

// Classic Sci-Fi UFO Design
function WireframeUFO() {
    const group = useRef<THREE.Group>(null)
    const ringRef = useRef<THREE.Group>(null)
    const lightsRef = useRef<THREE.Group>(null)

    useFrame((state) => {
        if (!group.current) return
        const t = state.clock.elapsedTime

        // Slow, majestic rotation for the main body
        group.current.rotation.y = t * 0.2
        group.current.rotation.z = Math.sin(t * 0.5) * 0.05 // Very subtle tilt

        // Counter-rotating ring
        if (ringRef.current) {
            ringRef.current.rotation.y = -t * 0.8
        }

        // Pulsing lights
        if (lightsRef.current) {
            lightsRef.current.children.forEach((light, i) => {
                if (light instanceof THREE.Mesh) {
                    const material = light.material as THREE.MeshBasicMaterial
                    material.opacity = 0.5 + Math.sin(t * 5 + i) * 0.5
                }
            })
        }
    })

    return (
        <group ref={group}>
            {/* Cockpit Dome */}
            <mesh position={[0, 0.8, 0]}>
                <sphereGeometry args={[1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.8} />
            </mesh>

            {/* Main Hull */}
            <mesh position={[0, 0, 0]} scale={[1, 0.4, 1]}>
                <sphereGeometry args={[3.5, 24, 12]} />
                <meshBasicMaterial color="#00d9ff" wireframe />
            </mesh>

            {/* Rotating Ring */}
            <group ref={ringRef}>
                <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[4.2, 0.1, 4, 32]} />
                    <meshBasicMaterial color="#ff00ff" wireframe />
                </mesh>
                <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[3.8, 0.1, 4, 32]} />
                    <meshBasicMaterial color="#ff00ff" wireframe />
                </mesh>
            </group>

            {/* Bottom Thruster/Core */}
            <mesh position={[0, -0.8, 0]}>
                <cylinderGeometry args={[1, 0.5, 1, 16]} />
                <meshBasicMaterial color="#00d9ff" wireframe />
            </mesh>

            {/* Navigation Lights Ring */}
            <group ref={lightsRef} position={[0, -0.2, 0]}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <mesh key={i} position={[
                        Math.sin(i * Math.PI / 4) * 3.5,
                        0,
                        Math.cos(i * Math.PI / 4) * 3.5
                    ]}>
                        <sphereGeometry args={[0.2]} />
                        <meshBasicMaterial color="#ff00ff" />
                    </mesh>
                ))}
            </group>

            {/* Energy Glow */}
            <pointLight position={[0, 0, 0]} color="#00ffff" intensity={2} distance={10} />
            <pointLight position={[0, -2, 0]} color="#ff00ff" intensity={4} distance={8} />
        </group>
    )
}

// Smooth flight controller - Linear interpolation for stable movement
function FlightController({
    isActive,
    onStageChange,
    startTime,
    onCameraZUpdate
}: {
    isActive: boolean
    onStageChange: (stage: Stage) => void
    startTime: number | null
    onCameraZUpdate: (z: number) => void
}) {
    const rig = useRef<THREE.Group>(null)
    const { camera } = useThree()

    // Smooth position tracking
    // Start at a "Launch Pad" position
    const startPos = new THREE.Vector3(0, 5, 20)
    const currentPos = useRef(startPos.clone())
    const targetPos = useRef(startPos.clone())
    const currentLookAt = useRef(new THREE.Vector3(0, 5, -50))
    const previousStage = useRef<Stage>('launch')

    // Fix Initial Zoom: Force camera position immediately on mount
    useEffect(() => {
        if (rig.current) {
            rig.current.position.copy(startPos)
            rig.current.lookAt(0, 5, -50)

            // Set initial camera behind the ship
            const offset = new THREE.Vector3(0, 4, 18)
            const camPos = startPos.clone().add(offset)
            camera.position.copy(camPos)
            camera.lookAt(0, 5, -50)
        }
    }, [camera])

    useFrame((state) => {
        if (!rig.current || !isActive || startTime === null) return

        const elapsed = state.clock.elapsedTime - startTime
        const journeyProgress = Math.min(elapsed / JOURNEY_DURATION, 1)

        // LINEAR SPEED - "Director's Cut" Pacing
        // No acceleration/deceleration. Just constant, cinematic forward movement.
        // We actally use a VERY subtle ease-out just at the absolute end (last 5%) for a soft landing.
        const t = journeyProgress
        const progress = t > 0.95 ? 1 - 20 * (1 - t) * (1 - t) : t // Linear until 95%
        const baseZ = -progress * TOTAL_DISTANCE

        // Determine current sector
        let currentStage: Stage = 'launch'
        if (baseZ <= SECTORS.outro.z) currentStage = 'outro'
        else if (baseZ <= SECTORS.city.z + 100) currentStage = 'city'
        else if (baseZ <= SECTORS.stars.z + 100) currentStage = 'stars'
        else if (baseZ <= SECTORS.galaxy.z + 100) currentStage = 'galaxy'
        else if (baseZ <= SECTORS.planet.z + 100) currentStage = 'planet'
        else if (baseZ <= SECTORS.sun.z + 100) currentStage = 'sun'
        else currentStage = 'launch'

        if (currentStage !== previousStage.current) {
            previousStage.current = currentStage
            onStageChange(currentStage)
        }

        // CINEMATIC WAYPOINTS SYSTEM
        let targetX = 0
        let targetY = 5

        let lookOffsetX = 0
        let lookOffsetY = 0

        // Sector-specific Cinematic Angles
        if (currentStage === 'sun') {
            // Sweep LEFT to frame Sun on the Right
            targetX = -30
            targetY = 0
            lookOffsetX = 40 // Look right towards the sun
        } else if (currentStage === 'planet') {
            // Sweep RIGHT to pass Planet on the Left
            targetX = 30
            targetY = -10
            lookOffsetX = -40 // Look left towards planet
        } else if (currentStage === 'galaxy') {
            // Dive DOWN to look UP at the galaxy
            targetX = 0
            targetY = -15
            lookOffsetY = 15 // Look up
        } else if (currentStage === 'stars') {
            // Center out for the star shower
            targetX = 0
            targetY = 0
        } else if (currentStage === 'city') {
            // Climb HIGH to look DOWN at the city
            targetX = 0
            targetY = 40
            lookOffsetY = -40 // Look down
        }

        // Heavy, majestic spaceship physics (Linear Interpolation)
        targetPos.current.set(targetX, targetY, baseZ)
        // 0.01 factor gives it a lot of "weight" and delay, smoothing out any jerks
        currentPos.current.lerp(targetPos.current, 0.01)

        // Apply to rig
        rig.current.position.copy(currentPos.current)

        // Camera Logic
        const lookAheadZ = -60 // Look further ahead
        const lookTgt = new THREE.Vector3(
            targetX + lookOffsetX,
            targetY + lookOffsetY,
            baseZ + lookAheadZ
        )
        currentLookAt.current.lerp(lookTgt, 0.01) // Smooth gaze

        // Banking logic
        const bankAmount = (currentPos.current.x - targetX) * 0.015
        rig.current.rotation.z = THREE.MathUtils.lerp(rig.current.rotation.z, bankAmount, 0.03)
        rig.current.rotation.x = THREE.MathUtils.lerp(rig.current.rotation.x, (targetY - currentPos.current.y) * 0.01, 0.03)

        // Cinematic Camera Follow
        const camOffset = new THREE.Vector3(0, 5, 25)
        // We don't rotate the camera offset as much to prevent motion sickness, 
        // keeping it relatively level while the ship banks.
        const camPos = currentPos.current.clone().add(camOffset)
        camera.position.lerp(camPos, 0.02)
        camera.lookAt(currentLookAt.current)

        onCameraZUpdate(currentPos.current.z)
    })

    return (
        <group ref={rig} position={[0, 5, 20]}>
            <WireframeUFO />
        </group>
    )
}

function WrappedContent() {
    const [data, setData] = useState<ViewerData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [started, setStarted] = useState(false)
    // Countdown removed
    const [stage, setStage] = useState<Stage>('loading')
    const [flightStartTime, setFlightStartTime] = useState<number | null>(null)
    const [cameraZ, setCameraZ] = useState(0)
    const summaryRef = useRef<HTMLDivElement>(null)

    // Calculate text opacity based on distance to sector
    const getTextOpacity = (sectorZ: number) => {
        const distance = Math.abs(cameraZ - sectorZ)
        const fadeInDistance = 120 // Late fade in
        const fadeOutDistance = 180 // Fast fade out

        if (distance < 80) return 1
        else if (cameraZ > sectorZ && distance < fadeInDistance) {
            return 1 - (distance - 80) / (fadeInDistance - 80)
        } else if (cameraZ < sectorZ && distance < fadeOutDistance) {
            return 1 - (distance - 80) / (fadeOutDistance - 80)
        }
        return 0
    }

    // Calculate stats from actual API data
    const stats = useMemo(() => {
        if (!data) return null

        // Total stars RECEIVED (sum of stargazerCount on user's repos)
        const totalStarsReceived = data.repositories.nodes.reduce((acc, r) => acc + r.stargazerCount, 0)

        // Top language by repo count
        const langCounts: Record<string, number> = {}
        data.repositories.nodes.forEach(r => {
            r.languages.nodes.forEach(l => {
                langCounts[l.name] = (langCounts[l.name] || 0) + 1
            })
        })
        const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]

        // Most loved repo (by commits)
        let mostLovedRepo: RepositoryNode | null = null
        let maxCommits = -1

        if (data.contributionsCollection.commitContributionsByRepository) {
            data.contributionsCollection.commitContributionsByRepository.forEach(c => {
                if (c.contributions.totalCount > maxCommits) {
                    maxCommits = c.contributions.totalCount
                    const r = data.repositories.nodes.find(n => n.name === c.repository.name)
                    if (r) mostLovedRepo = r
                }
            })
        }

        if (!mostLovedRepo && data.repositories.nodes.length > 0) {
            mostLovedRepo = data.repositories.nodes.sort((a, b) => b.stargazerCount - a.stargazerCount)[0]
        }

        // Activity stats from API
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        let activeDay = "Wednesday"
        let activeTime = "Day Walker"
        let peakHourStr = "12:00 PM"

        if (data.activityStats) {
            activeDay = days[data.activityStats.peakDay]
            const h = data.activityStats.peakHour
            if (h === 0 || h === 24) peakHourStr = "Midnight"
            else if (h === 12) peakHourStr = "Noon"
            else peakHourStr = h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`

            if (h >= 5 && h < 12) activeTime = "Morning Bird"
            else if (h >= 12 && h < 17) activeTime = "Afternoon Builder"
            else if (h >= 17 && h < 22) activeTime = "Evening Hacker"
            else activeTime = "Night Owl"
        }

        return {
            totalStarsReceived,
            starsGiven: data.starredRepositories.totalCount,
            topLang: topLang ? topLang[0] : 'None',
            favRepo: mostLovedRepo,
            totalCommits: data.contributionsCollection.totalCommitContributions,
            totalContributions: data.contributionsCollection.contributionCalendar.totalContributions,
            activeDay,
            activeTime,
            peakHourStr,
            repoCount: data.repositories.totalCount
        }
    }, [data])

    const searchParams = useSearchParams()

    useEffect(() => {
        async function load() {
            const user = searchParams.get('user')
            const url = user ? `/api/wrapped?username=${user}` : '/api/wrapped'
            try {
                const res = await fetch(url)
                const json = await res.json()
                if (res.ok && json.data?.viewer) setData(json.data.viewer)
                else setError(json.message || "Failed to load")
            } catch { setError("Connection failed") }
        }
        load()
    }, [searchParams])

    // Instant Start
    useEffect(() => {
        if (data && !started) {
            // Small artificial delay just to ensure the canvas is ready and visually stable
            const t = setTimeout(() => setStarted(true), 500)
            return () => clearTimeout(t)
        }
    }, [data, started])

    // Track flight start time
    const canvasRef = useRef<HTMLDivElement>(null)

    if (error) return <div className="text-red-500 p-10 font-mono">{error}</div>
    if (!data || !stats) return <div className="text-cyan-500 p-10 font-mono animate-pulse">INITIALIZING...</div>

    const viewer = data

    return (
        <div className="h-screen w-full bg-black font-mono text-cyan-500 overflow-hidden relative selection:bg-cyan-900 selection:text-white">
            <div ref={canvasRef} className="absolute inset-0 z-0">
                <Canvas
                    gl={{ antialias: false }}
                    onCreated={({ clock }) => {
                        if (started && flightStartTime === null) {
                            setFlightStartTime(clock.elapsedTime)
                        }
                    }}
                >
                    <Stars radius={200} count={3000} factor={4} fade />
                    <ambientLight intensity={0.5} />

                    {/* Base grid */}
                    <group position={[0, -2, 0]}>
                        <Grid args={[100, 100]} cellSize={1} sectionSize={5} infiniteGrid fadeDistance={50} sectionColor="#444" cellColor="#222" />
                    </group>

                    {/* Scene objects at their sector positions */}
                    <WireframeSun position={[25, -20, SECTORS.sun.z]} />
                    <LanguagePlanet color="cyan" position={[-35, 5, SECTORS.planet.z]} />
                    <BlackHoleGalaxy repos={viewer.repositories.nodes} position={[0, 15, SECTORS.galaxy.z]} />

                    <group position={[15, -10, SECTORS.stars.z]}>
                        <StarStation position={[0, 0, 0]} />
                        <ShootingStars count={stats.totalStarsReceived} active={stage === 'stars'} />
                    </group>

                    <GridCity contributions={viewer.contributionsCollection.contributionCalendar} position={[0, -8, SECTORS.city.z]} />

                    {/* Flight controller */}
                    <FlightController
                        isActive={started && stage !== 'outro'}
                        onStageChange={setStage}
                        startTime={started ? flightStartTime : null}
                        onCameraZUpdate={setCameraZ}
                    />

                    {/* Update flight start time when started */}
                    <FlightTimeTracker started={started} onTimeSet={setFlightStartTime} currentTime={flightStartTime} />
                </Canvas>
            </div>

            {/* UI Overlay */}
            <div className="absolute inset-0 z-10 p-8 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between w-full opacity-80 text-xs font-bold tracking-widest">
                    <div className="text-cyan-500">PILOT // {viewer.login}</div>
                    <div className="text-cyan-500">SECTOR // {stage.toUpperCase()}</div>
                </div>

                <AnimatePresence mode="wait">
                    {/* Countdown Removed */}

                    {stage === 'launch' && started && (
                        <motion.div key="launch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }} transition={{ duration: 0.5 }} className="absolute bottom-24 left-24">
                            <h2 className="text-7xl font-black text-white mb-2 italic">WRAPPED</h2>
                            <p className="text-cyan-400 text-sm tracking-widest">LAST 12 MONTHS</p>
                        </motion.div>
                    )}

                    {stage === 'sun' && (
                        <motion.div
                            key="sun"
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: getTextOpacity(SECTORS.sun.z) }}
                            exit={{ x: -50, opacity: 0, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.3 }}
                            className="absolute top-1/3 left-24 max-w-sm"
                        >
                            <p className="text-yellow-500 text-xs tracking-widest mb-2 font-bold">PEAK ACTIVITY</p>
                            <h2 className="text-6xl font-black text-white mb-2">{stats.activeDay}s</h2>
                            <div className="text-2xl text-yellow-200">
                                at <span className="font-bold text-white">{stats.peakHourStr}</span>
                            </div>
                            <div className="mt-4 text-sm text-yellow-500/80 border-t border-yellow-500/30 pt-2">
                                Status: <span className="font-bold text-yellow-200">{stats.activeTime}</span>
                            </div>
                        </motion.div>
                    )}

                    {stage === 'planet' && (
                        <motion.div
                            key="planet"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: getTextOpacity(SECTORS.planet.z) }}
                            exit={{ x: 50, opacity: 0, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.3 }}
                            className="absolute top-1/3 right-24 text-right max-w-sm"
                        >
                            <p className="text-cyan-500 text-xs tracking-widest mb-2 font-bold">PRIMARY LANGUAGE</p>
                            <h2 className="text-7xl font-black text-white">{stats.topLang}</h2>
                        </motion.div>
                    )}

                    {stage === 'galaxy' && (
                        <motion.div
                            key="galaxy"
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: getTextOpacity(SECTORS.galaxy.z) }}
                            exit={{ x: -50, opacity: 0, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.3 }}
                            className="absolute bottom-1/3 left-24 max-w-sm"
                        >
                            <p className="text-fuchsia-500 text-xs tracking-widest mb-2 font-bold">MOST LOVED REPO</p>
                            {stats.favRepo ? (
                                <>
                                    <h2 className="text-5xl font-black text-white mb-2 leading-tight">{stats.favRepo.name}</h2>
                                    <div className="text-fuchsia-200 border-l-2 border-fuchsia-500 pl-4 mt-2">
                                        {stats.favRepo.stargazerCount > 0 && <div className="text-3xl font-bold">{stats.favRepo.stargazerCount} Stars</div>}
                                        <div className="text-xs mt-1">Highest Commit Density</div>
                                    </div>
                                </>
                            ) : (
                                <h2 className="text-4xl text-white">No Repo Data</h2>
                            )}
                        </motion.div>
                    )}

                    {stage === 'stars' && (
                        <motion.div
                            key="stars"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: getTextOpacity(SECTORS.stars.z) }}
                            exit={{ x: 50, opacity: 0, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.3 }}
                            className="absolute top-1/3 right-24 text-right"
                        >
                            <h2 className="text-7xl font-black text-yellow-400">{stats.totalStarsReceived}</h2>
                            <div className="text-2xl text-white font-bold mb-1">Stars Received</div>
                            <p className="text-yellow-200 text-sm opacity-70 tracking-widest">COMMUNITY APPRECIATION</p>
                        </motion.div>
                    )}

                    {stage === 'city' && (
                        <motion.div
                            key="city"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: getTextOpacity(SECTORS.city.z) }}
                            exit={{ y: 50, opacity: 0, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.3 }}
                            className="absolute bottom-24 left-24"
                        >
                            <h2 className="text-8xl font-black text-green-400 mb-2">{stats.totalContributions}</h2>
                            <p className="text-white text-xl tracking-[0.5em] font-bold">CONTRIBUTIONS</p>
                        </motion.div>
                    )}

                    {stage === 'outro' && (
                        <motion.div ref={summaryRef} key="outro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/98 backdrop-blur-lg flex flex-col items-center justify-center pointer-events-auto z-50 overflow-hidden">
                            {/* Decorative background */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-10 left-10 w-32 h-32 border border-cyan-500 rotate-45" />
                                <div className="absolute top-20 right-20 w-24 h-24 border border-fuchsia-500 rotate-12" />
                                <div className="absolute bottom-20 left-20 w-20 h-20 border border-cyan-500 -rotate-12" />
                                <div className="absolute bottom-10 right-10 w-28 h-28 border border-fuchsia-500 rotate-45" />
                            </div>

                            {/* Username */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-center mb-8"
                            >
                                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-400 uppercase tracking-tight">
                                    {viewer.login}
                                </h1>
                                <p className="text-gray-400 text-sm mt-2 tracking-widest">{stats.activeTime.toUpperCase()}</p>
                            </motion.div>

                            {/* Stats grid */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="grid grid-cols-4 gap-8 mb-12"
                            >
                                <div className="text-center px-8 py-6 border border-cyan-500/20 bg-cyan-500/5">
                                    <div className="text-5xl font-black text-cyan-400 mb-2">{stats.totalCommits}</div>
                                    <div className="text-xs text-cyan-300/70 font-bold tracking-widest">COMMITS</div>
                                </div>
                                <div className="text-center px-8 py-6 border border-white/20 bg-white/5">
                                    <div className="text-5xl font-black text-white mb-2">{stats.repoCount}</div>
                                    <div className="text-xs text-gray-400 font-bold tracking-widest">REPOSITORIES</div>
                                </div>
                                <div className="text-center px-8 py-6 border border-yellow-500/20 bg-yellow-500/5">
                                    <div className="text-5xl font-black text-yellow-400 mb-2">{stats.totalStarsReceived}</div>
                                    <div className="text-xs text-yellow-300/70 font-bold tracking-widest">STARS EARNED</div>
                                </div>
                                <div className="text-center px-8 py-6 border border-green-500/20 bg-green-500/5">
                                    <div className="text-5xl font-black text-green-400 mb-2">{stats.totalContributions}</div>
                                    <div className="text-xs text-green-300/70 font-bold tracking-widest">CONTRIBUTIONS</div>
                                </div>
                            </motion.div>

                            {/* Insights */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="flex gap-12 mb-12 text-center"
                            >
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-bold text-white">{stats.topLang}</span>
                                    <span className="text-xs text-gray-500 tracking-widest mt-1">TOP LANGUAGE</span>
                                </div>
                                <div className="w-px bg-gray-700" />
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-bold text-white">{stats.activeDay}s</span>
                                    <span className="text-xs text-gray-500 tracking-widest mt-1">MOST ACTIVE</span>
                                </div>
                                <div className="w-px bg-gray-700" />
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-bold text-white">{stats.peakHourStr}</span>
                                    <span className="text-xs text-gray-500 tracking-widest mt-1">PEAK HOUR</span>
                                </div>
                                {stats.favRepo && (
                                    <>
                                        <div className="w-px bg-gray-700" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl font-bold text-white truncate max-w-[150px]">{stats.favRepo.name}</span>
                                            <span className="text-xs text-gray-500 tracking-widest mt-1">MOST LOVED</span>
                                        </div>
                                    </>
                                )}
                            </motion.div>

                            {/* Tagline */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="text-gray-400 text-sm italic mb-8 max-w-md text-center"
                            >
                                {stats.totalCommits > 500
                                    ? "You're a coding machine! Keep pushing those commits."
                                    : stats.totalCommits > 200
                                        ? "Solid contributions. Your code is making an impact."
                                        : stats.totalCommits > 50
                                            ? "Every commit counts. You're building something great."
                                            : "Quality over quantity. Here's to more code adventures!"}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,black_120%)]" />
        </div>
    )
}

// Helper component to track flight start time
function FlightTimeTracker({ started, onTimeSet, currentTime }: { started: boolean; onTimeSet: (time: number) => void; currentTime: number | null }) {
    useFrame((state) => {
        if (started && currentTime === null) {
            onTimeSet(state.clock.elapsedTime)
        }
    })
    return null
}

export default function WrappedPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-cyan-500 font-mono animate-pulse">INITIALIZING...</div>}>
            <WrappedContent />
        </Suspense>
    )
}
