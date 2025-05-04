"use client"
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import * as THREE from 'three';
import { Code, Wallet, BarChart3, Shield } from 'lucide-react';

const MovingDotsBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true
    });
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200; // Reduced count for better visibility
    const posArray = new Float32Array(particlesCount * 3);

    // Create a more spread out grid of particles
    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * window.innerWidth * 0.05;
      posArray[i + 1] = (Math.random() - 0.5) * window.innerHeight * 0.05;
      posArray[i + 2] = Math.random() * 10;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Create material with larger, brighter particles
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.2,
      sizeAttenuation: true,
      color: 0xff69b4,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    // Create particle system
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    camera.position.z = 20;

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);

      // Update particle positions
      const positions = particlesGeometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        // Move particles upward
        positions[i + 1] += 0.01;

        // Reset position when particle goes too high
        if (positions[i + 1] > window.innerHeight * 0.05) {
          positions[i + 1] = -window.innerHeight * 0.05;
        }

        // Add subtle horizontal movement
        positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.01;
      }

      particlesGeometry.attributes.position.needsUpdate = true;
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="fixed top-0 left-0 -z-10" />;
};

// CSS Animation for dots (fallback/additional effect)
const DotBackground = () => {
  return (
    <div className="fixed inset-0 -z-20 bg-black">
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at center, #ff69b4 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
        opacity: 0.3,
      }} />
    </div>
  );
};

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white overflow-hidden relative">
      <MovingDotsBackground />
      <DotBackground /> {/* Fallback/additional dot effect */}
      
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className={`text-center transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
            <div className="mb-4 inline-block px-4 py-1 rounded-full bg-gray-800 bg-opacity-50 border border-pink-500">
              <span className="text-pink-500">🚀 Launching soon</span>
            </div>
            <h1 className="text-7xl font-bold mb-6 font-mono">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-500 to-pink-500">
                AVA
              </span>
            </h1>
            <p className="text-2xl mb-12 text-gray-300 font-mono max-w-2xl mx-auto">
              Your AI-Powered DeFi Portfolio Manager with Autonomous Agents
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {[
              {
                icon: <Wallet className="w-12 h-12 text-pink-400" />,
                title: "Multi-Chain Support",
                description: "Manage assets across Avalanche, Mode, Arbitrum & Sei"
              },
              {
                icon: <Code className="w-12 h-12 text-purple-400" />,
                title: "AI-Powered",
                description: "Powered by Brian AI and LangChain for optimal strategies"
              },
              {
                icon: <BarChart3 className="w-12 h-12 text-pink-400" />,
                title: "Real-Time Analytics",
                description: "Live feedback and execution status monitoring"
              },
              {
                icon: <Shield className="w-12 h-12 text-purple-400" />,
                title: "Risk Management",
                description: "User-defined parameters and portfolio goals"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className={`bg-gray-900 bg-opacity-50 p-6 rounded-xl border border-gray-800 hover:border-pink-500 transition-all duration-500 transform hover:scale-105 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 font-mono text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/app">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-12 py-6 rounded-xl text-xl font-mono font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-neon">
                Launch app
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .shadow-neon {
          box-shadow: 0 0 15px rgba(236, 72, 153, 0.7);
        }
      `}</style>
    </div>
  );
}