'use client'

import React, { useState, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Grid, Float } from '@react-three/drei'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'

// Rotating ring with decorative elements around planet
function SimpleTextRing({ radius, yOffset, rotationSpeed, color, segments }: {
    radius: number
    yOffset: number
    rotationSpeed: number
    color: string
    segments: number
}) {
    const groupRef = useRef<THREE.Group>(null)

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed
        }
    })

    const angleStep = (Math.PI * 2) / segments

    return (
        <group ref={groupRef} position={[0, yOffset, 0]}>
            {/* Ring base */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[radius, 0.02, 8, 64]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.3} />
            </mesh>
            {/* Decorative elements around ring */}
            {Array.from({ length: segments }).map((_, i) => {
                const angle = i * angleStep
                const x = Math.cos(angle) * radius
                const z = Math.sin(angle) * radius
                return (
                    <mesh key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
                        <boxGeometry args={[0.15, 0.15, 0.15]} />
                        <meshBasicMaterial color={color} wireframe transparent opacity={0.6} />
                    </mesh>
                )
            })}
        </group>
    )
}

// 3D Text component using wireframe shapes arranged in orbit
function WireframeText3D({ text, position, scale = 1, color }: { text: string, position: [number, number, number], scale?: number, color: string }) {
    const groupRef = useRef<THREE.Group>(null)

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.05
        }
    })

    // Create wireframe letter shapes in a circular arrangement
    const letters = text.split('')
    const radius = 9
    const angleStep = (Math.PI * 2) / letters.length

    return (
        <group ref={groupRef} position={position}>
            {letters.map((_, i) => {
                const angle = i * angleStep - Math.PI / 2
                const x = Math.cos(angle) * radius
                const z = Math.sin(angle) * radius

                return (
                    <mesh key={i} position={[x, 0, z]} rotation={[0, -angle + Math.PI / 2, 0]} scale={scale}>
                        <boxGeometry args={[0.8, 1.2, 0.1]} />
                        <meshBasicMaterial color={color} wireframe />
                    </mesh>
                )
            })}
        </group>
    )
}

function WireframePlanetWithRings() {
    const planetRef = useRef<THREE.Group>(null)

    useFrame((state) => {
        if (planetRef.current) {
            planetRef.current.rotation.y = state.clock.elapsedTime * 0.05
        }
    })

    return (
        <group>
            {/* Central planet */}
            <Float speed={2} rotationIntensity={0.3} floatIntensity={0.3}>
                <group ref={planetRef}>
                    {/* Main sphere */}
                    <mesh>
                        <icosahedronGeometry args={[2.5, 2]} />
                        <meshBasicMaterial color="cyan" wireframe />
                    </mesh>
                    {/* Inner glow sphere */}
                    <mesh scale={0.9}>
                        <icosahedronGeometry args={[2.5, 1]} />
                        <meshBasicMaterial color="magenta" wireframe transparent opacity={0.3} />
                    </mesh>
                </group>
            </Float>

            {/* Orbiting text rings with "GitHub" and "Wrapped" integrated */}
            <WireframeText3D text="GITHUB" position={[0, 1.5, 0]} scale={0.8} color="cyan" />
            <WireframeText3D text="WRAPPED" position={[0, -1.5, 0]} scale={0.8} color="magenta" />

            <SimpleTextRing radius={5} yOffset={0} rotationSpeed={0.15} color="cyan" segments={24} />
            <SimpleTextRing radius={6.5} yOffset={0.5} rotationSpeed={-0.1} color="magenta" segments={32} />
            <SimpleTextRing radius={8} yOffset={-0.3} rotationSpeed={0.08} color="cyan" segments={20} />

            {/* Additional orbital rings at angles */}
            <group rotation={[0.3, 0, 0.2]}>
                <SimpleTextRing radius={4} yOffset={0} rotationSpeed={0.2} color="white" segments={16} />
            </group>
            <group rotation={[-0.2, 0, -0.3]}>
                <SimpleTextRing radius={7} yOffset={0} rotationSpeed={-0.12} color="cyan" segments={28} />
            </group>

            {/* Scattered floating elements */}
            <Float speed={3} rotationIntensity={2} floatIntensity={0.8}>
                <mesh position={[-6, 2, -4]}>
                    <octahedronGeometry args={[0.5, 0]} />
                    <meshBasicMaterial color="cyan" wireframe transparent opacity={0.6} />
                </mesh>
            </Float>
            <Float speed={2.5} rotationIntensity={1.5} floatIntensity={0.6}>
                <mesh position={[5, -2, -3]}>
                    <tetrahedronGeometry args={[0.4, 0]} />
                    <meshBasicMaterial color="magenta" wireframe transparent opacity={0.5} />
                </mesh>
            </Float>
            <Float speed={2.8} rotationIntensity={1.8} floatIntensity={0.7}>
                <mesh position={[7, 3, -5]}>
                    <dodecahedronGeometry args={[0.6, 0]} />
                    <meshBasicMaterial color="white" wireframe transparent opacity={0.4} />
                </mesh>
            </Float>
            <Float speed={3.2} rotationIntensity={2} floatIntensity={0.5}>
                <mesh position={[-8, -1, -6]}>
                    <icosahedronGeometry args={[0.4, 0]} />
                    <meshBasicMaterial color="cyan" wireframe transparent opacity={0.5} />
                </mesh>
            </Float>
        </group>
    )
}

export default function Home() {
    const [username, setUsername] = useState('')
    const router = useRouter()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (username.trim()) router.push(`/wrapped?user=${username}`)
    }

    return (
        <div className="relative w-full h-screen bg-black text-cyan-500 font-mono overflow-hidden selection:bg-cyan-900 selection:text-white">

            {/* 3D Background with planet and rings */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                    <Stars radius={100} count={3000} factor={4} fade />
                    <ambientLight intensity={0.5} />
                    <WireframePlanetWithRings />
                    <Grid args={[100, 100]} position={[0, -6, 0]} cellSize={1} sectionSize={5} infiniteGrid fadeDistance={40} sectionColor="#333" cellColor="#1a1a1a" />
                </Canvas>
            </div>

            {/* UI Overlay with title */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="flex flex-col items-center justify-center h-full w-full pointer-events-auto"
                >
                    {/* Input at bottom */}
                    <form onSubmit={handleSubmit} className="absolute bottom-20 flex items-center gap-4">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="GitHub Username"
                            className="bg-transparent border-b border-cyan-500/50 text-white text-xl px-4 py-2 outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 w-64 text-center font-mono"
                        />
                        <button
                            type="submit"
                            disabled={!username}
                            className="text-cyan-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>
                        </button>
                    </form>
                </motion.div>

            </div>

            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,black_100%)]" />
        </div>
    )
}
