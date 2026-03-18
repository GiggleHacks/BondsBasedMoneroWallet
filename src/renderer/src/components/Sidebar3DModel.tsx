import React, { useRef, useState, useEffect, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import modelUrl from '@/assets/model.glb'
import thatsGoodSound from '@/assets/sounds/thatsgoodsmall.wav'
import { playSound } from '@/lib/playSound'

const AUTO_SPEED = 0.003 // slow museum rotation
const DAMPING = 0.95 // how fast flick momentum decays
const RETURN_SPEED = 0.02 // how fast it returns to auto-rotation axis

function Model() {
  const { scene } = useGLTF(modelUrl)
  const groupRef = useRef<THREE.Group>(null!)
  const velocityRef = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const lastTime = useRef(0)
  const autoAngle = useRef(0)
  const flicking = useRef(false)
  const lastSoundTime = useRef(0)

  const { gl } = useThree()

  // Center and scale the model
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 2.2 / maxDim
    scene.scale.setScalar(scale)
    scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
  }, [scene])

  const onPointerDown = useCallback((e: PointerEvent) => {
    isDragging.current = true
    flicking.current = false
    lastMouse.current = { x: e.clientX, y: e.clientY }
    lastTime.current = performance.now()
    velocityRef.current = { x: 0, y: 0 }
    gl.domElement.setPointerCapture(e.pointerId)
  }, [gl])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return
    const now = performance.now()
    const dt = Math.max(now - lastTime.current, 1)
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y

    // Apply rotation directly while dragging
    if (groupRef.current) {
      groupRef.current.rotation.y += dx * 0.01
      groupRef.current.rotation.x += dy * 0.01
    }

    // Track velocity for flick
    velocityRef.current = {
      x: (dx / dt) * 16,
      y: (dy / dt) * 16,
    }

    lastMouse.current = { x: e.clientX, y: e.clientY }
    lastTime.current = now
  }, [])

  const onPointerUp = useCallback((e: PointerEvent) => {
    isDragging.current = false
    gl.domElement.releasePointerCapture(e.pointerId)

    const speed = Math.sqrt(
      velocityRef.current.x ** 2 + velocityRef.current.y ** 2
    )
    if (speed > 0.5) {
      flicking.current = true
    }
    const now = Date.now()
    if (speed > 8 && now - lastSoundTime.current > 30_000) {
      lastSoundTime.current = now
      playSound(thatsGoodSound, 'spinModel', 0.8)
    }
  }, [gl])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.style.cursor = 'grab'
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl, onPointerDown, onPointerMove, onPointerUp])

  // Spin the model when a new payment is detected
  useEffect(() => {
    const unsub = window.api.wallet.onNewPayment(() => {
      // Fast celebratory spin — drag down-right at high speed
      velocityRef.current = { x: 30, y: 15 }
      flicking.current = true
    })
    return unsub
  }, [])

  useFrame(() => {
    if (!groupRef.current) return

    if (isDragging.current) {
      gl.domElement.style.cursor = 'grabbing'
      return
    }

    gl.domElement.style.cursor = 'grab'

    if (flicking.current) {
      // Apply flick momentum
      groupRef.current.rotation.y += velocityRef.current.x * 0.01
      groupRef.current.rotation.x += velocityRef.current.y * 0.01

      // Dampen velocity
      velocityRef.current.x *= DAMPING
      velocityRef.current.y *= DAMPING

      // Gradually return X rotation to 0 (upright)
      groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * RETURN_SPEED

      // Stop flicking when velocity is tiny
      const speed = Math.sqrt(
        velocityRef.current.x ** 2 + velocityRef.current.y ** 2
      )
      if (speed < 0.01 && Math.abs(groupRef.current.rotation.x) < 0.01) {
        flicking.current = false
        autoAngle.current = groupRef.current.rotation.y
      }
    } else {
      // Slow auto-rotation — museum piece
      autoAngle.current += AUTO_SPEED
      groupRef.current.rotation.y = autoAngle.current

      // Ease X back to neutral
      groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * RETURN_SPEED
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  )
}

// Error boundary for 3D loading failures
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export default function Sidebar3DModel() {
  const [hasError, setHasError] = useState(false)

  if (hasError) return null

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '160px',
      position: 'relative',
    }}>
      <ErrorBoundary onError={() => setHasError(true)}>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 40 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 3, 5]} intensity={1.2} />
          <directionalLight position={[-2, -1, -3]} intensity={0.3} color="#f26822" />
          <Suspense fallback={null}>
            <Model />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}
