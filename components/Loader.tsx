"use client";

import { useEffect, useState } from "react";

export default function Loader() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <style>
        {`
          @keyframes coinFlip3D {
            0% {
              transform: rotateY(0deg);
            }
            100% {
              transform: rotateY(360deg);
            }
          }
          
          @keyframes dotBounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          
          @keyframes glowPulse {
            0%, 100% {
              filter: drop-shadow(0 0 15px rgba(138, 43, 226, 0.5));
            }
            50% {
              filter: drop-shadow(0 0 30px rgba(138, 43, 226, 0.9));
            }
          }
          
          .coin-container {
            perspective: 800px;
            width: 100px;
            height: 100px;
            margin: 0 auto 24px;
          }
          
          .coin-flipper {
            width: 100%;
            height: 100%;
            position: relative;
            transform-style: preserve-3d;
            animation: coinFlip3D 2s linear infinite;
          }
          
          .coin-side {
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            animation: glowPulse 2s ease-in-out infinite;
          }
          
          .coin-back {
            transform: rotateY(180deg);
          }
          
          .loading-dot {
            width: 10px;
            height: 10px;
            background-color: #8A2BE2;
            border-radius: 50%;
            animation: dotBounce 1.2s ease-in-out infinite;
          }
        `}
      </style>
      
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          {/* 3D Flipping Coin */}
          <div className="coin-container">
            <div className="coin-flipper">
              <div className="coin-side">
                <img
                  src="https://i.ibb.co/CsBL2xn6/shfl-logo.png"
                  alt="SHFL"
                  width={80}
                  height={80}
                  style={{ borderRadius: "50%" }}
                />
              </div>
              <div className="coin-side coin-back">
                <img
                  src="https://i.ibb.co/CsBL2xn6/shfl-logo.png"
                  alt="SHFL"
                  width={80}
                  height={80}
                  style={{ borderRadius: "50%" }}
                />
              </div>
            </div>
          </div>
          
          <p style={{ color: '#8A2BE2', fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
            SHFL<span style={{ color: '#fff' }}>Pro</span>
          </p>
          <p style={{ color: '#A0A0A0', fontSize: '14px' }}>
            Initializing terminal...
          </p>
          <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
            Fetching live data from CoinGecko & Shuffle.com
          </p>
          
          {/* Loading dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
            <div className="loading-dot" style={{ animationDelay: '0s' }} />
            <div className="loading-dot" style={{ animationDelay: '0.15s' }} />
            <div className="loading-dot" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    </>
  );
}
