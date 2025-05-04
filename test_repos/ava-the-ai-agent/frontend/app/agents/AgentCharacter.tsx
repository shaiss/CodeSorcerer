'use client'

import { useEffect, useRef, useState } from 'react';

// Constants for sprite rendering
const SPRITE_SIZE = 100;
const ANIMATION_FRAMES = 4;
const FRAME_DURATION = 200;
const CHARACTER_SCALE = 2.4;

// Direction mapping for sprite sheets
const DIRECTION_ORDER = ['down', 'left', 'right', 'up'] as const;
type Direction = typeof DIRECTION_ORDER[number];

interface AgentCharacterProps {
  name: string;
  spriteSrc: string;
  position: { x: number; y: number };
  message?: string;
  isMoving?: boolean;
  direction?: Direction;
}

export function AgentCharacter({
  name,
  spriteSrc,
  position,
  message,
  isMoving = false,
  direction = 'down'
}: AgentCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLImageElement>();
  const [animationFrame, setAnimationFrame] = useState(0);
  const [spriteLoaded, setSpriteLoaded] = useState(false);

  // Load sprite image
  useEffect(() => {
    const sprite = new Image();
    sprite.src = spriteSrc;
    sprite.onload = () => {
      spriteRef.current = sprite;
      setSpriteLoaded(true);
    };
    sprite.onerror = (error) => {
      console.error(`Failed to load sprite image for ${name}:`, error);
    };
  }, [spriteSrc, name]);

  // Animation loop
  useEffect(() => {
    if (!isMoving) {
      setAnimationFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % ANIMATION_FRAMES);
    }, FRAME_DURATION);

    return () => clearInterval(interval);
  }, [isMoving]);

  // Render character
  useEffect(() => {
    if (!canvasRef.current || !spriteRef.current || !spriteLoaded) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Calculate sprite position
    const directionIndex = DIRECTION_ORDER.indexOf(direction);
    const sourceX = directionIndex * SPRITE_SIZE;
    const sourceY = isMoving ? animationFrame * SPRITE_SIZE : 0;

    // Draw character sprite
    ctx.drawImage(
      spriteRef.current,
      sourceX,
      sourceY,
      SPRITE_SIZE,
      SPRITE_SIZE,
      0,
      0,
      SPRITE_SIZE * CHARACTER_SCALE,
      SPRITE_SIZE * CHARACTER_SCALE
    );

    // Draw speech bubble if there's a message
    if (message) {
      drawSpeechBubble(ctx, message);
    }
  }, [spriteLoaded, animationFrame, direction, isMoving, message]);

  // Draw speech bubble
  const drawSpeechBubble = (ctx: CanvasRenderingContext2D, text: string) => {
    const padding = 10;
    const fontSize = 14;
    const lineHeight = 18;
    const borderRadius = 8;
    const maxWidth = 200;

    ctx.font = `${fontSize}px Arial`;
    ctx.textBaseline = 'top';

    // Word wrap text
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    // Calculate bubble dimensions
    const bubbleWidth = Math.min(maxWidth, Math.max(...lines.map(line => ctx.measureText(line).width))) + padding * 2;
    const bubbleHeight = lines.length * lineHeight + padding * 2;
    const bubbleX = (SPRITE_SIZE * CHARACTER_SCALE - bubbleWidth) / 2;
    const bubbleY = -bubbleHeight - 10;

    // Draw bubble background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, borderRadius);
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = 'black';
    lines.forEach((line, i) => {
      const x = bubbleX + padding;
      const y = bubbleY + padding + (i * lineHeight);
      ctx.fillText(line, x, y);
    });

    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleWidth / 2 - 5, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight + 5);
    ctx.lineTo(bubbleX + bubbleWidth / 2 + 5, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <canvas
        ref={canvasRef}
        width={SPRITE_SIZE * CHARACTER_SCALE}
        height={SPRITE_SIZE * CHARACTER_SCALE}
        className="pixelated"
      />
      <div className="text-center mt-2 font-medium text-sm">{name}</div>
    </div>
  );
}
