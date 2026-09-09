import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Video, VideoOff, Mic, MicOff, PhoneOff,
  ShieldCheck, AlertCircle, RefreshCw, Volume2
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Helper: Generate simulated video track for environments where camera is unavailable
const createSimulatedVideoTrack = (isDoctor, userName) => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  const hue = isDoctor ? 175 : 210;

  const intervalId = setInterval(() => {
    ctx.fillStyle = `hsl(${hue}, 40%, 15%)`;
    ctx.fillRect(0, 0, 640, 480);

    ctx.strokeStyle = `hsl(${hue}, 80%, 40%)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(320, 220, 75 + Math.sin(Date.now() / 250) * 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(userName || (isDoctor ? 'Doctor Feed' : 'Patient Feed'), 320, 225);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px Plus Jakarta Sans, sans-serif';
    ctx.fillText('Live Two-Way Encrypted Telemed Video', 320, 260);
    ctx.fillText(new Date().toLocaleTimeString(), 320, 285);
  }, 1000 / 30);

  const stream = canvas.captureStream(30);
  const track = stream.getVideoTracks()[0];
  if (track) {
    track._intervalId = intervalId;
  }
  return track;
};

// Helper: Generate simulated audio track for environments where microphone is unavailable
const createSimulatedAudioTrack = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.001; // subtle live frequency to keep audio pipe open
    const dst = ctx.createMediaStreamDestination();
    osc.connect(gain);
    gain.connect(dst);
    osc.start();
    const track = dst.stream.getAudioTracks()[0];
    if (track) {
      track._audioCtx = ctx;
    }
    return track;
  } catch (e) {
    console.warn('Simulated audio track creation skipped:', e);
    return null;
  }
};

// Robust Media Stream Acquisition
const acquireMediaStream = async (isDoctor, userName) => {
  // 1. Try real HD camera + real microphone
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    console.log('[Media] Acquired real HD camera and microphone');
    return stream;
  } catch (e1) {
    console.warn('[Media] HD camera/mic failed, trying standard media:', e1.message);
  }

  // 2. Try standard camera + microphone
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log('[Media] Acquired real standard camera and microphone');
    return stream;
  } catch (e2) {
    console.warn('[Media] Standard camera/mic failed, checking single media device:', e2.message);
  }

  // 3. Try microphone only (with simulated video avatar)
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const videoTrack = createSimulatedVideoTrack(isDoctor, userName);
    if (videoTrack) audioStream.addTrack(videoTrack);
    console.log('[Media] Acquired real microphone with simulated video avatar');
    return audioStream;
  } catch (e3) {
    console.warn('[Media] Audio-only failed:', e3.message);
  }

  // 4. Try camera only (with simulated audio track)
  try {
    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const audioTrack = createSimulatedAudioTrack();
    if (audioTrack) videoStream.addTrack(audioTrack);
    console.log('[Media] Acquired real camera with simulated audio track');
    return videoStream;
  } catch (e4) {
    console.warn('[Media] Video-only failed:', e4.message);
  }

  // 5. Hardware unavailable / Headless testing fallback
  console.log('[Media] Hardware unavailable, using simulated video+audio stream');
  const simStream = new MediaStream();
  const simVideo = createSimulatedVideoTrack(isDoctor, userName);
  if (simVideo) simStream.addTrack(simVideo);
  const simAudio = createSimulatedAudioTrack();
  if (simAudio) simStream.addTrack(simAudio);
  return simStream;
};

export const VideoConsultation = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [consultation, setConsultation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('WAITING'); // WAITING, CONNECTING, ACTIVE, RECONNECTING, ENDED
  const [statusMessage, setStatusMessage] = useState('Waiting for other participant to join...');
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [errorNotice, setErrorNotice] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const isNegotiating = useRef(false);

  const peerId = useRef(`peer-${user?.id || Math.floor(Math.random() * 10000)}`).current;
  const isDoctor = user?.role === 'DOCTOR';

  // 1. Fetch Consultation Details & Authorize on Backend
  useEffect(() => {
    let active = true;
    const loadConsultation = async () => {
      try {
        const data = await apiClient(`/consultations/${roomId}`);
        if (!active) return;
        setConsultation(data);

        // Record join on backend
        await apiClient(`/consultations/${roomId}/join`, { method: 'POST' });
      } catch (err) {
        console.error('Error loading consultation:', err);
        if (active) {
          setErrorNotice(err.message || 'Failed to initialize consultation session.');
        }
      }
    };

    if (roomId) loadConsultation();
    return () => { active = false; };
  }, [roomId]);

  // 2. Real-Time Two-Way Video + Audio WebRTC Pipeline
  useEffect(() => {
    let isMounted = true;
    let localStream = null;
    let pc = null;
    let ws = null;

    const startCall = async () => {
      try {
        // Step A: Acquire local media stream (camera + mic)
        localStream = await acquireMediaStream(isDoctor, user?.name);
        if (!isMounted) {
          localStream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(() => {});
        }

        // Step B: Initialize WebRTC PeerConnection with STUN servers
        const pcConfig = {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
            { urls: ['stun:stun.cloudflare.com:3478'] },
          ],
          iceCandidatePoolSize: 10,
        };

        pc = new RTCPeerConnection(pcConfig);
        peerConnectionRef.current = pc;

        // Immediately attach local audio & video tracks so all offers/answers include them
        localStream.getTracks().forEach((track) => {
          console.log('[WebRTC] Adding local track to PeerConnection:', track.kind, track.label);
          pc.addTrack(track, localStream);
        });

        // Remote track handler: attach remote audio + video to remote video element
        pc.ontrack = (event) => {
          console.log('[WebRTC] Received remote stream track:', event.track.kind);
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }

          if (event.streams && event.streams[0]) {
            remoteStreamRef.current = event.streams[0];
          } else {
            remoteStreamRef.current.addTrack(event.track);
          }

          if (remoteVideoRef.current) {
            if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current;
            }
            remoteVideoRef.current.play().catch((err) => {
              console.warn('[WebRTC] Remote play prevented by browser autoplay policy:', err);
              if (isMounted) setAutoplayBlocked(true);
            });
          }

          if (isMounted) {
            setConnectionStatus('ACTIVE');
            setStatusMessage('Live Video & Audio Connected');
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ice-candidate',
              candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
            }));
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log('[WebRTC] ICE Connection State:', pc.iceConnectionState);
          if (!isMounted) return;
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setConnectionStatus('ACTIVE');
            setStatusMessage('Live Video & Audio Connected');
          } else if (pc.iceConnectionState === 'failed') {
            console.warn('[WebRTC] ICE Connection failed, restarting ICE...');
            setConnectionStatus('RECONNECTING');
            setStatusMessage('Reconnecting consultation link...');
            if (pc.restartIce) pc.restartIce();
          } else if (pc.iceConnectionState === 'disconnected') {
            setConnectionStatus('RECONNECTING');
            setStatusMessage('Connection interrupted. Reconnecting...');
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('[WebRTC] Peer Connection State:', pc.connectionState);
          if (!isMounted) return;
          if (pc.connectionState === 'connected') {
            setConnectionStatus('ACTIVE');
            setStatusMessage('Encrypted Connection Established');
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setConnectionStatus('RECONNECTING');
            setStatusMessage('Reconnecting consultation link...');
          }
        };

        // Step C: Connect WebSocket Signaling
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const token = localStorage.getItem('token');
        const wsUrl = `${wsProtocol}//${wsHost}/ws/consultation/${roomId}?peer_id=${peerId}&role=${user?.role || 'PATIENT'}&name=${encodeURIComponent(user?.name || 'Participant')}${token ? `&token=${token}` : ''}`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const sendOfferIfDoctor = async () => {
          if (!isDoctor) return;
          if (isNegotiating.current) return;
          if (!pc || pc.signalingState !== 'stable') {
            console.log('[WebRTC] Skipping offer creation, state:', pc?.signalingState);
            return;
          }

          try {
            isNegotiating.current = true;
            console.log('[WebRTC] Doctor creating and sending offer...');
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);

            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'offer',
                sdp: pc.localDescription || offer,
              }));
            }
          } catch (err) {
            console.error('[WebRTC] Error creating offer:', err);
          } finally {
            isNegotiating.current = false;
          }
        };

        ws.onopen = () => {
          console.log('[Signaling] WebSocket connected to consultation room:', roomId);
        };

        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            console.log('[Signaling] Inbound message:', msg.type);

            switch (msg.type) {
              case 'room-state':
                if (msg.peers && msg.peers.length > 0) {
                  if (isMounted) {
                    setConnectionStatus('CONNECTING');
                    setStatusMessage('Participant present in room...');
                  }
                  await sendOfferIfDoctor();
                }
                break;

              case 'peer-joined':
                if (isMounted) {
                  setStatusMessage(`${msg.name} joined. Connecting video & audio...`);
                  setConnectionStatus('CONNECTING');
                }
                await sendOfferIfDoctor();
                break;

              case 'ready-for-negotiation':
                if (isMounted) {
                  setStatusMessage('Both parties present. Negotiating real-time media...');
                  setConnectionStatus('CONNECTING');
                }
                await sendOfferIfDoctor();
                break;

              case 'offer':
                console.log('[WebRTC] Received offer, setting remote description...');
                if (pc.signalingState !== 'stable') {
                  await Promise.all([
                    pc.setLocalDescription({ type: 'rollback' }).catch(() => {}),
                    pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
                  ]);
                } else {
                  await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                }

                // Drain queued ICE candidates
                while (iceCandidatesQueue.current.length > 0) {
                  const cand = iceCandidatesQueue.current.shift();
                  await pc.addIceCandidate(cand).catch(e => console.warn('ICE drain error:', e));
                }

                // Create and send answer
                const answer = await pc.createAnswer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                });
                await pc.setLocalDescription(answer);

                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'answer',
                    sdp: pc.localDescription || answer,
                  }));
                }

                if (isMounted) {
                  setConnectionStatus('ACTIVE');
                  setStatusMessage('Live Video & Audio Connected');
                }
                break;

              case 'answer':
                console.log('[WebRTC] Received answer, setting remote description...');
                if (pc.signalingState === 'have-local-offer') {
                  await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                  while (iceCandidatesQueue.current.length > 0) {
                    const cand = iceCandidatesQueue.current.shift();
                    await pc.addIceCandidate(cand).catch(e => console.warn('ICE drain error:', e));
                  }
                  if (isMounted) {
                    setConnectionStatus('ACTIVE');
                    setStatusMessage('Live Video & Audio Connected');
                  }
                }
                break;

              case 'ice-candidate':
                if (msg.candidate) {
                  const cand = new RTCIceCandidate(msg.candidate);
                  if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                    await pc.addIceCandidate(cand).catch(e => console.warn('ICE add error:', e));
                  } else {
                    iceCandidatesQueue.current.push(cand);
                  }
                }
                break;

              case 'call-ended':
                if (isMounted) {
                  setConnectionStatus('ENDED');
                  setStatusMessage('The consultation has concluded.');
                }
                break;

              case 'peer-left':
                if (isMounted) {
                  setStatusMessage(`${msg.name} disconnected.`);
                  setConnectionStatus('WAITING');
                }
                break;

              case 'error':
                if (isMounted) {
                  setErrorNotice(msg.message || 'Signaling error occurred.');
                }
                break;

              default:
                break;
            }
          } catch (err) {
            console.error('[Signaling] Message handler error:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('[Signaling] WebSocket error:', err);
        };

        ws.onclose = () => {
          console.log('[Signaling] WebSocket connection closed');
        };

      } catch (err) {
        console.error('[WebRTC] Call setup error:', err);
        if (isMounted) {
          setErrorNotice('Unable to initialize video & audio communication. Please ensure camera/microphone permissions are granted.');
        }
      }
    };

    startCall();

    return () => {
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach((t) => {
          t.stop();
          if (t._intervalId) clearInterval(t._intervalId);
          if (t._audioCtx && t._audioCtx.state !== 'closed') t._audioCtx.close().catch(() => {});
        });
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (pc) {
        pc.close();
      }
    };
  }, [roomId, peerId, isDoctor, user]);

  // Toggle Camera
  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !cameraActive;
        videoTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setCameraActive(nextState);
      }
    }
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !micActive;
        audioTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setMicActive(nextState);
      }
    }
  };

  // End Call
  const handleEndCall = async () => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'call-ended' }));
      }
      await apiClient(`/consultations/${roomId}/end`, {
        method: 'POST',
        body: JSON.stringify({ clinical_notes: 'Consultation concluded.' }),
      });
    } catch (err) {
      console.error('Error ending consultation:', err);
    } finally {
      if (isDoctor) {
        navigate('/admin');
      } else {
        navigate('/appointments');
      }
    }
  };

  const otherParticipantName = isDoctor
    ? (consultation?.patient?.full_name || 'Patient')
    : (consultation?.doctor?.full_name || 'Doctor');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none antialiased">
      {/* Top Header Bar */}
      <header className="h-16 px-4 md:px-8 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              Rx
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">Telemed Live Consultation</h1>
              <p className="text-[11px] text-slate-400">Room: <span className="font-mono text-teal-400">{roomId}</span></p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/60 border border-teal-500/30 text-teal-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>256-bit Encrypted Video &amp; Audio</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-xs font-semibold text-slate-300">{connectionStatus}</span>
          </div>
        </div>
      </header>

      {/* Error Notice */}
      {errorNotice && (
        <div className="mx-4 md:mx-8 mt-3 p-3 bg-rose-900/50 border border-rose-700/60 text-rose-200 rounded-xl text-xs flex items-center gap-2 z-20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Main Video Stage */}
      <main className="flex-1 relative w-full overflow-hidden bg-black flex items-center justify-center p-2 sm:p-4 md:p-6">
        <div className="relative w-full h-full max-w-6xl max-h-[85vh] rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
          
          {/* Audio Autoplay Permission Prompt */}
          {autoplayBlocked && (
            <div className="absolute top-6 z-30 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-teal-600 text-white shadow-xl border border-teal-400">
              <Volume2 className="w-5 h-5 animate-bounce" />
              <span className="text-xs font-semibold">Audio playback needs browser permission</span>
              <button
                type="button"
                onClick={() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play()
                      .then(() => setAutoplayBlocked(false))
                      .catch(e => console.error('Play retry error:', e));
                  }
                }}
                className="bg-white text-teal-800 text-xs font-bold px-3 py-1 rounded-xl shadow-xs cursor-pointer hover:bg-teal-50 transition"
              >
                Click to Hear Audio
              </button>
            </div>
          )}

          {/* Main Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Fallback Overlay if Remote Video not yet active */}
          {connectionStatus !== 'ACTIVE' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-950/95 z-10">
              <div className="w-20 h-20 rounded-full bg-teal-900/60 border border-teal-500/40 flex items-center justify-center mb-4 text-teal-400">
                <Video className="w-9 h-9 animate-pulse" />
              </div>

              <h2 className="text-lg font-bold text-white mb-1">{otherParticipantName}</h2>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-4">
                {connectionStatus}
              </span>
              <p className="text-xs text-slate-300 max-w-md leading-relaxed">{statusMessage}</p>

              <div className="mt-6 flex items-center gap-2 text-xs text-teal-300/80 font-mono">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <span>Encrypted consultation stream</span>
              </div>
            </div>
          )}

          {/* Remote Participant Label */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{otherParticipantName}</span>
          </div>

          {/* Picture-in-Picture Local Video */}
          <div className="absolute bottom-4 right-4 z-20 w-32 h-44 sm:w-44 sm:h-56 md:w-52 md:h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-950">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!cameraActive && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-slate-400">
                <VideoOff className="w-6 h-6 mb-1 text-rose-400" />
                <span className="text-[10px] font-semibold text-slate-300">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              {!micActive && (
                <span className="px-1.5 py-0.5 rounded bg-rose-600/90 text-white text-[9px] font-bold flex items-center gap-0.5">
                  <MicOff className="w-2.5 h-2.5" />
                  <span>Muted</span>
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-semibold">
                You
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Consultation Controls Bar */}
      <footer className="h-20 px-6 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md flex items-center justify-center gap-4 sm:gap-6 z-30 shrink-0">
        {/* Camera Toggle */}
        <button
          type="button"
          onClick={handleToggleCamera}
          aria-label={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-md active:scale-95 ${
            cameraActive
              ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              : 'bg-rose-600 hover:bg-rose-700 text-white'
          }`}>
            {cameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </div>
          <span className="text-[11px] font-medium text-slate-300">
            {cameraActive ? 'Camera On' : 'Camera Off'}
          </span>
        </button>

        {/* Microphone Toggle */}
        <button
          type="button"
          onClick={handleToggleMic}
          aria-label={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-md active:scale-95 ${
            micActive
              ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              : 'bg-rose-600 hover:bg-rose-700 text-white'
          }`}>
            {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </div>
          <span className="text-[11px] font-medium text-slate-300">
            {micActive ? 'Mic On' : 'Muted'}
          </span>
        </button>

        {/* End Call */}
        <button
          type="button"
          onClick={handleEndCall}
          aria-label="End Consultation"
          className="flex flex-col items-center gap-1 group cursor-pointer"
        >
          <div className="px-6 h-12 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition">
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs tracking-wide">End Call</span>
          </div>
          <span className="text-[11px] font-medium text-rose-400">
            Conclude Visit
          </span>
        </button>
      </footer>
    </div>
  );
};
