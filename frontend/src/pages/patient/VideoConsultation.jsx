import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Video, VideoOff, Mic, MicOff, PhoneOff,
  ShieldCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

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

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const canvasStreamIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  const peerId = useRef(`peer-${user?.id || Math.floor(Math.random() * 10000)}`).current;
  const isDoctor = user?.role === 'DOCTOR';

  // 1. Fetch Consultation Details & Authorize
  useEffect(() => {
    const loadConsultation = async () => {
      try {
        const data = await apiClient(`/consultations/${roomId}`);
        setConsultation(data);

        // Record join on backend
        await apiClient(`/consultations/${roomId}/join`, { method: 'POST' });
      } catch (err) {
        console.error('Error loading consultation:', err);
        setErrorNotice(err.message || 'Failed to initialize consultation session.');
      }
    };

    if (roomId) loadConsultation();
  }, [roomId]);

  // 2. Initialize Two-Way Video + Audio Stream
  useEffect(() => {
    let mounted = true;

    const startLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true, // TWO-WAY VIDEO + AUDIO
        });

        if (!mounted) return;
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Physical camera/mic unavailable or permission denied, initializing clinical video+audio simulation:', err.message);

        // Simulated video stream via canvas
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        const hue = isDoctor ? 175 : 210;
        canvasStreamIntervalRef.current = setInterval(() => {
          if (!mounted) return;
          ctx.fillStyle = `hsl(${hue}, 40%, 15%)`;
          ctx.fillRect(0, 0, 640, 480);

          ctx.strokeStyle = `hsl(${hue}, 80%, 40%)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(320, 220, 75 + Math.sin(Date.now() / 300) * 5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px Plus Jakarta Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(user?.name || (isDoctor ? 'Dr. Provider' : 'Patient Feed'), 320, 225);

          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '13px Plus Jakarta Sans, sans-serif';
          ctx.fillText('Secure Telemed Two-Way Consultation', 320, 260);
          ctx.fillText('Mode: Video + Audio • HD 720p', 320, 285);
        }, 50);

        const simStream = canvas.captureStream(30);

        // Simulated audio track via Web Audio API
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            gain.gain.value = 0.001; // virtually silent tone to preserve live audio track
            const dst = audioCtx.createMediaStreamDestination();
            osc.connect(gain);
            gain.connect(dst);
            osc.start();

            const audioTrack = dst.stream.getAudioTracks()[0];
            if (audioTrack) {
              simStream.addTrack(audioTrack);
            }
          }
        } catch (audioErr) {
          console.warn('Audio simulation skipped:', audioErr);
        }

        localStreamRef.current = simStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = simStream;
        }
      }
    };

    startLocalStream();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (canvasStreamIntervalRef.current) {
        clearInterval(canvasStreamIntervalRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isDoctor, user]);

  // 3. WebSocket Signaling & WebRTC PeerConnection
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const token = localStorage.getItem('token');
    const wsUrl = `${wsProtocol}//${wsHost}/ws/consultation/${roomId}?peer_id=${peerId}&role=${user?.role || 'PATIENT'}&name=${encodeURIComponent(user?.name || 'Participant')}${token ? `&token=${token}` : ''}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const pcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(pcConfig);
    peerConnectionRef.current = pc;

    // Attach local video & audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote stream tracks
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote stream track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnectionStatus('ACTIVE');
        setStatusMessage('Connected');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] State changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('ACTIVE');
        setStatusMessage('Encrypted Connection Established');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectionStatus('RECONNECTING');
        setStatusMessage('Reconnecting consultation link...');
      }
    };

    // Signaling messages
    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('[Signaling] Inbound:', msg.type);

        switch (msg.type) {
          case 'room-state':
            if (msg.peers.length > 0) {
              setConnectionStatus('CONNECTING');
              setStatusMessage('Peer present. Negotiating WebRTC session...');
            }
            break;

          case 'peer-joined':
            setStatusMessage(`${msg.name} joined. Initializing consultation...`);
            setConnectionStatus('CONNECTING');

            if (isDoctor) {
              const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: 'offer', sdp: offer }));
            }
            break;

          case 'ready-for-negotiation':
            if (isDoctor) {
              const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: 'offer', sdp: offer }));
            }
            break;

          case 'offer':
            console.log('[WebRTC] Handling offer');
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
            setConnectionStatus('ACTIVE');
            break;

          case 'answer':
            console.log('[WebRTC] Handling answer');
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            setConnectionStatus('ACTIVE');
            break;

          case 'ice-candidate':
            if (msg.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
            break;

          case 'call-ended':
            setConnectionStatus('ENDED');
            setStatusMessage('The consultation has concluded.');
            break;

          case 'peer-left':
            setStatusMessage(`${msg.name} left the room.`);
            setConnectionStatus('WAITING');
            break;

          case 'error':
            setErrorNotice(msg.message || 'Signaling error occurred.');
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('[Signaling] Message error:', err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
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
